/**
 * Groq API - OpenAI-compatible chat completions.
 * Endpoint: https://api.groq.com/openai/v1/chat/completions
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

const CATEGORY_PROMPT = `You are a triage assistant. Given an email, assign exactly one category: "School", "Finance", "Work", "Personal", or "Other".
Rules: If the email mentions "macID" assign "School". If it mentions "order" or "coupons" or payment/billing assign "Finance". Otherwise choose the best fit.
Reply with only the single category word, nothing else.`;

const SUMMARY_PROMPT = `Summarize this email thread in exactly 3 bullet points. Be concise. Output only the 3 bullets, one per line.`;

const REPLY_PROMPT = `You are helping the user reply to an email thread. Given the last few messages in the thread, write a short, professional reply that continues the conversation. Output only the reply body, no subject or metadata.`;

const EMAIL_SUMMARY_PROMPT = `Summarize this email in 3–5 short bullet points. Be concise. Output only the bullets, one per line.`;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function groqChat(apiKey, messages, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const groqMessages = messages.map((m) => ({
      role: m.role === 'model' ? 'assistant' : (m.role === 'system' ? 'system' : (m.role || 'user')),
      content: String(m.text ?? m.content ?? ''),
    }));
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: groqMessages,
        temperature: 0.2,
      }),
    });
    if (res.status === 429 && attempt < retries) {
      const waitMs = Math.min(2000 * Math.pow(2, attempt), 30000);
      console.log(`[groq] Rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Groq API error ${res.status}`);
    }
    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice?.message?.content) {
      throw new Error('No response from Groq');
    }
    return choice.message.content.trim();
  }
  throw new Error('Groq rate limit exceeded after retries');
}

export async function summarizeEmailWithGroq(apiKey, subject, body) {
  const text = `Subject: ${subject}\n\nBody:\n${body || '(No body)'}`;
  const content = `${EMAIL_SUMMARY_PROMPT}\n\n${text}`;
  return groqChat(apiKey, [{ role: 'user', text: content }]);
}

const INBOX_CONTEXT_SYSTEM = `You are the UnClutter assistant. You have FULL ACCESS to the user's email inbox. Use the email data provided to answer questions. Extract deadlines, action items, and commitments from the emails. Give specific answers based on the content. Never say you don't have access to their emails.`;

function buildEmailContextBlock(context) {
  if (!context) return '';
  const { selectedEmail, emailsPreview } = context;
  const parts = [];
  if (Array.isArray(emailsPreview) && emailsPreview.length > 0) {
    const blocks = emailsPreview.slice(0, 20).map((e, i) => {
      const from = e.from_address || e.sender;
      const subject = e.subject || '(No Subject)';
      const date = e.received_at ? new Date(e.received_at).toLocaleString() : e.date || '';
      const snippet = (e.body_plain || e.snippet || e.body || '').slice(0, 300);
      return `[Email ${i + 1}] From: ${from}\nSubject: ${subject}\nDate: ${date}\nContent: ${snippet}`;
    });
    parts.push('--- USER\'S EMAILS ---\n' + blocks.join('\n\n') + '\n--- END EMAILS ---');
  }
  if (selectedEmail && typeof selectedEmail === 'object') {
    const from = selectedEmail.from_address || selectedEmail.sender;
    const body = (selectedEmail.body_plain || selectedEmail.body || selectedEmail.snippet || '').slice(0, 2000);
    parts.push('--- CURRENTLY SELECTED EMAIL (focus on this) ---\nFrom: ' + from + '\nSubject: ' + (selectedEmail.subject || '') + '\nDate: ' + (selectedEmail.received_at ? new Date(selectedEmail.received_at).toLocaleString() : selectedEmail.date || '') + '\nBody: ' + body + '\n--- END ---');
  }
  if (parts.length === 0) return '';
  return parts.join('\n\n');
}

export async function chatWithGroq(apiKey, messages, userMessage, context) {
  const history = (messages || [])
    .map((m) => ({ role: m.role, text: m.text }))
    .filter((h, i) => !(h.role === 'assistant' && i === 0));
  const contextBlock = buildEmailContextBlock(context);
  const systemText = contextBlock
    ? INBOX_CONTEXT_SYSTEM + '\n\n' + contextBlock
    : INBOX_CONTEXT_SYSTEM;
  const chatMessages = [
    { role: 'system', text: systemText },
    ...history.map((h) => ({ role: h.role, text: h.text })),
    { role: 'user', text: userMessage },
  ];
  return groqChat(apiKey, chatMessages);
}

export async function categorizeWithGroq(apiKey, email) {
  const text = `Subject: ${email.subject}\nSnippet: ${email.snippet}\nBody (excerpt): ${email.body}`;
  const content = `${CATEGORY_PROMPT}\n\n${text}`;
  const raw = await groqChat(apiKey, [{ role: 'user', text: content }]);
  const category = ['School', 'Finance', 'Work', 'Personal', 'Other'].find((c) =>
    raw.toLowerCase().includes(c.toLowerCase())
  );
  return category || 'Other';
}

export async function summarizeWithGroq(apiKey, thread) {
  const block = thread
    .map(
      (e, i) =>
        `[${i + 1}] From: ${e.from_address} | ${e.received_at}\nSubject: ${e.subject}\n${(e.body_plain || e.snippet || '').slice(0, 1500)}`
    )
    .join('\n\n');
  const content = `${SUMMARY_PROMPT}\n\n${block}`;
  return groqChat(apiKey, [{ role: 'user', text: content }]);
}

const CREATE_GROUP_PROMPT = `You help users create email groups. Given a user's intent and sample emails, output a JSON object with these fields:
- name: short group name (1-3 words)
- description: one sentence describing the group
- keywords: array of SPECIFIC strings to match in email subject/body. Be precise - use words that will ONLY appear in relevant emails. Lowercase, no duplicates. Do NOT use generic words like "the", "a", "email", "message".
- domains: array of email domain strings (like "mcmaster.ca") to match sender addresses

IMPORTANT: Keywords must be highly specific to the group intent. For a "University" group, use academic terms like "course", "assignment", "professor", "lecture", "exam", "grade", "syllabus", "campus". Do NOT include generic words that would match unrelated emails.

Output ONLY valid JSON, no markdown, no code blocks. Start with { and end with }.
Example: {"name":"University","description":"Academic and university emails","keywords":["university","course","assignment","professor","lecture","exam","grade","syllabus","campus","semester"],"domains":["mcmaster.ca","edu"]}`;

export async function suggestGroupFromIntent(apiKey, userIntent, sampleEmails) {
  const samples = (sampleEmails || [])
    .slice(0, 15)
    .map((e) => `From: ${e.from_address || ''} | Subject: ${e.subject || ''} | Snippet: ${(e.snippet || '').slice(0, 100)}`)
    .join('\n');
  const content = `${CREATE_GROUP_PROMPT}\n\nUser intent: "${userIntent}"\n\nSample emails:\n${samples || '(none)'}\n\nOutput JSON:`;
  const raw = await groqChat(apiKey, [{ role: 'user', text: content }]);
  const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return { name: userIntent.slice(0, 30), description: '', keywords: [], domains: [] };
  }
}

export async function suggestReplyWithGroq(apiKey, thread) {
  const block = thread
    .map(
      (e, i) =>
        `From: ${e.from_address}\nSubject: ${e.subject}\n\n${(e.body_plain || '').slice(0, 2000)}`
    )
    .join('\n\n---\n\n');
  const content = `${REPLY_PROMPT}\n\n${block}`;
  return groqChat(apiKey, [{ role: 'user', text: content }]);
}
