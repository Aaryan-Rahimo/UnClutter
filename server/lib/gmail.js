import { google } from 'googleapis';

const GMAIL_LIST_MAX = 50;

function decodeBase64(data) {
  if (!data) return '';
  try {
    return Buffer.from(data, 'base64url').toString('utf-8');
  } catch {
    try {
      return Buffer.from(data, 'base64').toString('utf-8');
    } catch {
      return '';
    }
  }
}

function decodeQuotedPrintable(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/* ---------- Improved HTML-to-plain-text conversion ---------- */

const BOILERPLATE_PATTERNS = [
  /view\s+(this\s+)?(email\s+)?in\s+(your\s+)?browser/i,
  /unsubscribe/i,
  /update\s+preferences/i,
  /forward\s+to\s+a?\s*friend/i,
  /you\s+are\s+receiving\s+this/i,
  /you're\s+receiving\s+this/i,
  /this\s+email\s+was\s+sent\s+to/i,
  /click\s+here\s+to\s+unsubscribe/i,
  /manage\s+(your\s+)?subscription/i,
  /email\s+preferences/i,
  /all\s+rights\s+reserved/i,
  /^\s*https?:\/\/\S+\s*$/,
  /^(facebook|twitter|instagram|linkedin|youtube|tiktok)\s*$/i,
];

function isBoilerplateLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length < 5) return false;
  return BOILERPLATE_PATTERNS.some((p) => p.test(trimmed));
}

function htmlToPlainText(html) {
  if (!html) return '';

  let text = html;

  // Remove entire blocks that are never content
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');

  // Replace structural elements with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '\u2022 ');
  text = text.replace(/<\/blockquote>/gi, '\n');
  text = text.replace(/<blockquote[^>]*>/gi, '> ');
  text = text.replace(/<hr[^>]*>/gi, '\n---\n');

  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;|&apos;/gi, "'")
    .replace(/&rsquo;/gi, '\u2019')
    .replace(/&lsquo;/gi, '\u2018')
    .replace(/&rdquo;/gi, '\u201D')
    .replace(/&ldquo;/gi, '\u201C')
    .replace(/&mdash;/gi, '\u2014')
    .replace(/&ndash;/gi, '\u2013')
    .replace(/&hellip;/gi, '\u2026')
    .replace(/&copy;/gi, '\u00A9')
    .replace(/&reg;/gi, '\u00AE')
    .replace(/&trade;/gi, '\u2122')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));

  // Clean up whitespace per line
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');

  // Collapse excessive newlines to max 2
  text = text.replace(/\n{3,}/g, '\n\n');

  // Remove boilerplate lines
  text = text
    .split('\n')
    .filter((line) => !isBoilerplateLine(line))
    .join('\n');

  // Final trim
  return text.trim();
}

/* ---------- Post-processing: remove subject from body, clean newsletter cruft ---------- */

function cleanBody(text, subject) {
  if (!text) return '';
  let cleaned = text;

  // If body starts with the subject text, remove it
  if (subject) {
    const subjectTrimmed = subject.trim();
    if (cleaned.startsWith(subjectTrimmed)) {
      cleaned = cleaned.slice(subjectTrimmed.length).replace(/^\s*\n*/, '');
    }
    // Also check for close match (first line ~= subject)
    const firstLine = cleaned.split('\n')[0]?.trim() || '';
    if (firstLine && subjectTrimmed && firstLine.length < subjectTrimmed.length * 1.3 &&
        subjectTrimmed.toLowerCase().includes(firstLine.toLowerCase().slice(0, 30))) {
      cleaned = cleaned.slice(firstLine.length).replace(/^\s*\n*/, '');
    }
  }

  // Remove markdown-style bold asterisks: *text* -> text
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');

  // Collapse 3+ newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

function getPartHeaders(part) {
  const h = part.headers || [];
  return (name) => h.find((x) => x.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function extractBodyFromPart(part) {
  const getHeader = getPartHeaders(part);
  const encoding = (getHeader('Content-Transfer-Encoding') || '').toLowerCase();
  const mimeType = (part.mimeType || '').toLowerCase();

  let raw = '';
  if (part.body?.data) {
    raw = decodeBase64(part.body.data);
    if (encoding === 'quoted-printable') {
      raw = decodeQuotedPrintable(raw);
    }
  }

  if (mimeType === 'text/html') return { plain: htmlToPlainText(raw), html: raw };
  if (mimeType === 'text/plain') return { plain: raw, html: null };
  return { plain: '', html: null };
}

function walkParts(parts, acc) {
  for (const part of parts || []) {
    const mime = (part.mimeType || '').toLowerCase();
    if (mime === 'text/plain') {
      const { plain } = extractBodyFromPart(part);
      if (plain && plain.length > (acc.plain?.length || 0)) acc.plain = plain;
    } else if (mime === 'text/html') {
      const { plain, html } = extractBodyFromPart(part);
      if (html) acc.html = html;
      // Only use HTML-derived plain text if we don't already have a good plain text
      if (!acc.plain && plain) acc.plainFromHtml = plain;
    } else if (mime.startsWith('multipart/') && part.parts?.length) {
      walkParts(part.parts, acc);
    }
  }
}

export function getGmailClient(accessToken) {
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return oauth2;
}

export async function fetchLatestEmails(accessToken, maxResults = GMAIL_LIST_MAX) {
  const auth = getGmailClient(accessToken);
  const gmail = google.gmail({ version: 'v1', auth });

  const list = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
  });

  const messages = list.data.messages || [];
  const out = [];

  for (const msg of messages) {
    const id = msg.id;
    const full = await gmail.users.messages.get({ userId: 'me', id });
    const payload = full.data.payload || {};
    const headers = payload.headers || [];
    const getHeader = (name) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = (getHeader('To') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cc = (getHeader('Cc') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const dateStr = getHeader('Date');
    const receivedAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

    const acc = { plain: '', html: null, plainFromHtml: '' };

    if (payload.body?.data) {
      const getEnc = () => headers.find((h) => h.name?.toLowerCase() === 'content-transfer-encoding')?.value ?? '';
      let raw = decodeBase64(payload.body.data);
      if ((getEnc() || '').toLowerCase() === 'quoted-printable') {
        raw = decodeQuotedPrintable(raw);
      }
      const mime = (payload.mimeType || '').toLowerCase();
      if (mime === 'text/html') {
        acc.html = raw;
        acc.plainFromHtml = htmlToPlainText(raw);
      } else {
        acc.plain = raw;
      }
    }
    if (payload.parts?.length) {
      walkParts(payload.parts, acc);
    }

    // Prefer real text/plain, fall back to HTML-derived plain text
    let bodyPlain = acc.plain || acc.plainFromHtml || '';
    let bodyHtml = acc.html;
    if (!bodyPlain && bodyHtml) {
      bodyPlain = htmlToPlainText(bodyHtml);
    }

    // Post-process: remove subject duplication, clean boilerplate
    bodyPlain = cleanBody(bodyPlain, subject);

    // If body is too short, fall back to snippet
    if (bodyPlain.length < 20) {
      bodyPlain = full.data.snippet || bodyPlain;
    }

    const labelIds = (full.data.labelIds || []);
    const isRead = labelIds.includes('UNREAD') === false;
    const isStarred = labelIds.includes('STARRED');

    out.push({
      gmail_id: id,
      thread_id: full.data.threadId || id,
      subject,
      snippet: full.data.snippet || '',
      body_plain: bodyPlain,
      body_html: bodyHtml || null,
      from_address: from,
      to_addresses: to,
      cc_addresses: cc,
      received_at: receivedAt,
      is_read: isRead,
      is_starred: isStarred,
      label_ids: labelIds,
    });
  }

  return out;
}
