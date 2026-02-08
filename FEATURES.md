# UnClutter — Features

A concise overview of what UnClutter does and what’s implemented.

---

## Email & Inbox

| Feature | Description |
|--------|-------------|
| **Inbox** | Synced Gmail inbox with configurable date range (Last 7/30/90 days, All time). |
| **Search** | Search mail by sender, subject, or snippet from the top bar. |
| **Sync** | Manual sync with Gmail; “Last synced” shown on Sync button hover. |
| **Compose** | Compose new emails via the Compose FAB; modal with To, Cc/Bcc, Subject, Body. |
| **Reply** | Reply from the email detail view (inline composer and “Click here to reply” bar). |
| **Send** | Send and reply go through Gmail API; success/error toasts. |

---

## Mail Folders (Sidebar)

| Folder | Description |
|--------|-------------|
| **Inbox** | Main inbox (cached); supports Tabs and Grouped views. |
| **Starred** | Emails with Gmail star (live from Gmail API). |
| **Sent** | Sent mail (live from Gmail API). |
| **Drafts** | Gmail drafts (live from Gmail API). |
| **Archive** | Emails not in Inbox (archived); fetched via search query. |
| **Spam** | Gmail Spam folder. |
| **Trash** | Gmail Trash. |

Folder counts (where available) come from Gmail label metadata. Non-inbox folders load on demand when selected.

---

## Email Actions

| Action | Where | Description |
|--------|--------|-------------|
| **Archive** | Email detail toolbar | Removes from Inbox; email appears in Archive folder. |
| **Delete** | Email detail toolbar | Moves to Gmail Trash and removes from local list. |
| **Star / Unstar** | Email detail toolbar | Toggles Gmail star; state and list update. |
| **Summarize** | Email detail toolbar | AI bullet-point summary of the open email. |

---

## Groups & Views

| Feature | Description |
|--------|-------------|
| **Your Groups** | User-defined groups in the sidebar with colored dots. |
| **Tabs view** | Horizontal tab bar: All Mail, then each group, then Unsorted. Scrollable with arrows. |
| **Grouped view** | Cards per group with expand/collapse and “Show more” in each card. |
| **Click a group** | Switches to Inbox, Tabs view, and selects that group’s tab. |
| **Edit group** | Pencil on group (non-default groups); modal to edit name/description/keywords/color. |
| **Delete group** | Trash on group (non-default only); confirmation modal. |
| **Create group** | Via chatbot (e.g. “Create a group for university emails”); AI suggests keywords. |

Default groups (Promotions, Updates, Social) are created on first sync; custom groups get distinct colors from a palette.

---

## Layout & UI

| Feature | Description |
|--------|-------------|
| **Resizable panels** | Drag handles between sidebar ↔ list/detail and list/detail ↔ chat. Min/max widths; double-click resets. |
| **Panel persistence** | Sidebar, detail, and chat widths stored in `localStorage`. |
| **Tab bar** | Horizontal scroll with left/right arrows and edge fade when scrollable. |
| **Chat input** | Chat input fixed at bottom of chat panel; message area scrolls above it. |
| **Scroll to bottom** | “Scroll to bottom” button in chat when not at bottom. |
| **Compose FAB** | Floating “Compose” button (bottom-left); opens compose modal. |
| **Toasts** | Success/error toasts for sync, send, archive, delete, group actions. |
| **View toggle** | Tabs / Grouped always visible in sidebar; choosing one from another folder switches to Inbox. |

---

## AI Assistant (Chatbot)

| Feature | Description |
|--------|-------------|
| **Context** | Uses current inbox (and optionally the selected email). |
| **Questions** | e.g. deadlines, action items, “Summarize my inbox”. |
| **Summarize email** | Summarize the currently open email. |
| **Draft reply** | “Draft a reply to this email” uses selected email context. |
| **Create group** | Natural language, e.g. “Create a group for university emails”; creates group and suggests keywords. |
| **Draft email** | e.g. “Draft an email to my professor”; AI returns To/Subject/Body; “Open in Compose” pre-fills the compose modal. |
| **Email links** | When the AI refers to “Email 13” etc., those become clickable links that open the corresponding email. |
| **Suggested prompts** | Contextual chips (e.g. “Summarize this email”, “Draft a reply”). |
| **Clear** | Clear conversation; **Close (X)** closes the chat panel. |
| **Rate limits** | Handles AI rate limits with retry countdown and optional “Retry”. |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **J** | Next email in list. |
| **K** | Previous email in list. |
| **Escape** | Close email detail or close chat. |
| **C** | Toggle chat panel. |
| **/** | Focus search. |

---

## Auth & Account

| Feature | Description |
|--------|-------------|
| **Sign in** | Google OAuth (Login/Signup). |
| **Session** | Session stored in `localStorage`; `X-Session-Id` sent with API requests. |
| **Token refresh** | Backend refreshes Google access token when expired. |
| **Sign out** | Clears session and redirects to login. |

---

## Tech Stack (Reference)

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 5, React Router 6 |
| Backend | Node.js, Express 4 |
| Database | Supabase (PostgreSQL) |
| Auth | Google OAuth 2.0 |
| Email | Gmail API (read, send, modify, labels, search) |
| AI | Groq (primary), Google Gemini (fallback / create-group) |

---

For full replication details (env, schema, routes, prompts), see **REPLICATION.md**.
