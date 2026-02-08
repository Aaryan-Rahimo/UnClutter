import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import {
  fetchLatestEmails,
  fetchEmailsByLabel,
  fetchEmailsByQuery,
  fetchDrafts,
  fetchLabelCounts,
  sendEmail,
  trashEmail,
  archiveEmail,
  toggleStarEmail,
  toggleReadEmail,
} from '../lib/gmail.js';
import { getAccountBySession } from '../lib/session.js';

export const gmailRouter = Router();
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

gmailRouter.use(async (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(401).json({ error: 'Missing X-Session-Id' });
  }
  const account = await getAccountBySession(supabase, sessionId, config);
  if (!account) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  req.account = account;
  next();
});

/* ── Default groups created on first sync ── */
const DEFAULT_GROUPS = [
  {
    name: 'Promotions',
    description: 'Deals, offers, and marketing emails',
    color: '#f4b400',
    match_keywords: [
      'sale', 'deal', 'offer', 'discount', 'coupon', 'promo',
      'limited time', 'special offer', 'shop now', 'buy now',
      'unsubscribe', 'newsletter', 'promotional', 'off your',
      'free shipping', 'exclusive', 'save', 'clearance',
    ],
    match_domains: [],
    sort_order: 1,
  },
  {
    name: 'Updates',
    description: 'Receipts, confirmations, and account updates',
    color: '#ab47bc',
    match_keywords: [
      'receipt', 'confirmation', 'order', 'shipped', 'delivered',
      'tracking', 'invoice', 'payment', 'statement', 'your account',
      'security alert', 'verify', 'password', 'signed in',
    ],
    match_domains: [],
    sort_order: 2,
  },
  {
    name: 'Social',
    description: 'Social media notifications',
    color: '#db4437',
    match_keywords: [
      'facebook', 'twitter', 'instagram', 'linkedin', 'reddit',
      'notification', 'commented', 'liked', 'mentioned you',
      'tagged you', 'friend request', 'new follower',
    ],
    match_domains: ['facebookmail.com', 'linkedin.com', 'twitter.com', 'reddit.com'],
    sort_order: 3,
  },
];

async function ensureDefaultGroups(accountId) {
  try {
    const { data: existing } = await supabase
      .from('user_groups')
      .select('id')
      .eq('account_id', accountId)
      .limit(1);

    // If user already has groups, skip
    if (existing && existing.length > 0) return;

    console.log('[sync] Creating default groups for account:', accountId);
    for (const g of DEFAULT_GROUPS) {
      const { error } = await supabase.from('user_groups').insert({
        account_id: accountId,
        name: g.name,
        description: g.description,
        color: g.color,
        match_keywords: g.match_keywords,
        match_domains: g.match_domains,
        match_senders: [],
        sort_order: g.sort_order,
        updated_at: new Date().toISOString(),
      });
      if (error && error.code !== '23505') {
        console.error('[sync] Error creating default group:', g.name, error.message);
      }
    }
    console.log('[sync] Default groups created');
  } catch (err) {
    console.error('[sync] ensureDefaultGroups error:', err.message);
  }
}

gmailRouter.post('/sync', async (req, res) => {
  const { account } = req;
  try {
    const emails = await fetchLatestEmails(account.access_token, 50);

    for (const e of emails) {
      await supabase.from('emails').upsert(
        {
          account_id: account.accountId,
          gmail_id: e.gmail_id,
          thread_id: e.thread_id,
          subject: e.subject,
          snippet: e.snippet,
          body_plain: e.body_plain,
          body_html: e.body_html,
          from_address: e.from_address,
          to_addresses: e.to_addresses,
          cc_addresses: e.cc_addresses,
          received_at: e.received_at,
          is_read: e.is_read,
          is_starred: e.is_starred,
          label_ids: e.label_ids,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id,gmail_id' }
      );
    }

    // Create default groups on first sync (non-blocking)
    ensureDefaultGroups(account.accountId).catch(() => {});

    res.json({ synced: emails.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

gmailRouter.get('/list', async (req, res) => {
  const { account } = req;
  const { data, error } = await supabase
    .from('emails')
    .select('id, gmail_id, thread_id, subject, snippet, from_address, received_at, is_read, is_starred, label_ids, ai_category, ai_summary')
    .eq('account_id', account.accountId)
    .order('received_at', { ascending: false })
    .limit(100);

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ emails: data });
});

gmailRouter.get('/email/:id', async (req, res) => {
  const { account } = req;
  const { id } = req.params;
  const { data, error } = await supabase
    .from('emails')
    .select('id, gmail_id, thread_id, subject, from_address, to_addresses, cc_addresses, received_at, body_plain, body_html, snippet, ai_summary, ai_category, is_starred, is_read')
    .eq('id', id)
    .eq('account_id', account.accountId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(data);
});

/* ── Fetch emails by Gmail label or special folder (archive) ── */
const VALID_LABELS = ['SENT', 'TRASH', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD'];

gmailRouter.get('/folder/:label', async (req, res) => {
  const { account } = req;
  const rawLabel = req.params.label;
  const label = rawLabel.toUpperCase();

  try {
    let emails;
    if (label === 'ARCHIVE') {
      // Archived = not in inbox (exclude trash/spam so it's "clean" archive)
      emails = await fetchEmailsByQuery(account.access_token, '-in:inbox', 30);
    } else if (VALID_LABELS.includes(label)) {
      emails = await fetchEmailsByLabel(account.access_token, label, 30);
    } else {
      return res.status(400).json({ error: `Invalid label: ${rawLabel}. Valid: ARCHIVE, ${VALID_LABELS.join(', ')}` });
    }
    res.json({ emails, label: label });
  } catch (err) {
    console.error('[gmail] Folder fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch folder' });
  }
});

/* ── Fetch drafts ── */
gmailRouter.get('/drafts', async (req, res) => {
  const { account } = req;
  try {
    const drafts = await fetchDrafts(account.access_token, 20);
    res.json({ emails: drafts });
  } catch (err) {
    console.error('[gmail] Drafts fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

/* ── Fetch label counts (for sidebar badges) ── */
gmailRouter.get('/label-counts', async (req, res) => {
  const { account } = req;
  try {
    const counts = await fetchLabelCounts(account.access_token);
    res.json({ counts });
  } catch (err) {
    console.error('[gmail] Label counts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch label counts' });
  }
});

/* ── Send new email ── */
gmailRouter.post('/send', async (req, res) => {
  const { account } = req;
  const { to, cc, bcc, subject, body } = req.body;
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }
  try {
    const result = await sendEmail(account.access_token, { to, cc, bcc, subject, body });
    res.json({ success: true, messageId: result.id, threadId: result.threadId });
  } catch (err) {
    console.error('[gmail] Send error:', err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

/* ── Reply to email ── */
gmailRouter.post('/reply/:id', async (req, res) => {
  const { account } = req;
  const { id } = req.params;
  const { body: replyBody, cc, bcc } = req.body;
  if (!replyBody) return res.status(400).json({ error: 'body is required' });

  // Fetch original email from DB
  const { data: original, error: dbErr } = await supabase
    .from('emails')
    .select('gmail_id, thread_id, subject, from_address')
    .eq('id', id)
    .eq('account_id', account.accountId)
    .single();

  if (dbErr || !original) return res.status(404).json({ error: 'Email not found' });

  try {
    const subject = original.subject?.startsWith('Re:') ? original.subject : `Re: ${original.subject}`;
    const inReplyTo = `<${original.gmail_id}@mail.gmail.com>`;
    const result = await sendEmail(account.access_token, {
      to: original.from_address,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      body: replyBody,
      threadId: original.thread_id,
      inReplyTo,
      references: inReplyTo,
    });
    res.json({ success: true, messageId: result.id, threadId: result.threadId });
  } catch (err) {
    console.error('[gmail] Reply error:', err.message);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

/* ── Delete (trash) email ── */
gmailRouter.delete('/email/:id', async (req, res) => {
  const { account } = req;
  const { id } = req.params;

  const { data: email, error: dbErr } = await supabase
    .from('emails')
    .select('gmail_id')
    .eq('id', id)
    .eq('account_id', account.accountId)
    .single();

  if (dbErr || !email) return res.status(404).json({ error: 'Email not found' });

  try {
    await trashEmail(account.access_token, email.gmail_id);
    // Remove from local DB
    await supabase.from('emails').delete().eq('id', id).eq('account_id', account.accountId);
    res.json({ success: true });
  } catch (err) {
    console.error('[gmail] Trash error:', err.message);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

/* ── Archive email ── */
gmailRouter.post('/email/:id/archive', async (req, res) => {
  const { account } = req;
  const { id } = req.params;

  const { data: email, error: dbErr } = await supabase
    .from('emails')
    .select('gmail_id, label_ids')
    .eq('id', id)
    .eq('account_id', account.accountId)
    .single();

  if (dbErr || !email) return res.status(404).json({ error: 'Email not found' });

  try {
    await archiveEmail(account.access_token, email.gmail_id);
    const newLabels = (email.label_ids || []).filter((l) => l !== 'INBOX');
    await supabase.from('emails').update({ label_ids: newLabels, updated_at: new Date().toISOString() }).eq('id', id);
    res.json({ success: true });
  } catch (err) {
    console.error('[gmail] Archive error:', err.message);
    res.status(500).json({ error: 'Failed to archive email' });
  }
});

/* ── Toggle star ── */
gmailRouter.post('/email/:id/star', async (req, res) => {
  const { account } = req;
  const { id } = req.params;

  const { data: email, error: dbErr } = await supabase
    .from('emails')
    .select('gmail_id, is_starred')
    .eq('id', id)
    .eq('account_id', account.accountId)
    .single();

  if (dbErr || !email) return res.status(404).json({ error: 'Email not found' });

  try {
    const newStarred = !email.is_starred;
    await toggleStarEmail(account.access_token, email.gmail_id, newStarred);
    await supabase.from('emails').update({ is_starred: newStarred, updated_at: new Date().toISOString() }).eq('id', id);
    res.json({ success: true, is_starred: newStarred });
  } catch (err) {
    console.error('[gmail] Star error:', err.message);
    res.status(500).json({ error: 'Failed to toggle star' });
  }
});

/* ── Toggle read/unread ── */
gmailRouter.post('/email/:id/read', async (req, res) => {
  const { account } = req;
  const { id } = req.params;

  const { data: email, error: dbErr } = await supabase
    .from('emails')
    .select('gmail_id, is_read')
    .eq('id', id)
    .eq('account_id', account.accountId)
    .single();

  if (dbErr || !email) return res.status(404).json({ error: 'Email not found' });

  try {
    const newRead = !email.is_read;
    await toggleReadEmail(account.access_token, email.gmail_id, newRead);
    await supabase.from('emails').update({ is_read: newRead, updated_at: new Date().toISOString() }).eq('id', id);
    res.json({ success: true, is_read: newRead });
  } catch (err) {
    console.error('[gmail] Read toggle error:', err.message);
    res.status(500).json({ error: 'Failed to toggle read status' });
  }
});
