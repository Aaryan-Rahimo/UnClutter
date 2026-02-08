# UnClutter

Your inbox, simplified. Login with Google, sync Gmail, sort emails, and chat with AI (Gemini).

UnClutter connects to your Gmail, syncs recent messages into a clean dashboard, and groups them by intent (promotions, updates, social, etc.). You can search, filter by date, and read email details in a focused layout. The built-in assistant can summarize emails, surface deadlines/action items, and create custom group rules to keep your inbox organized.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** Supabase (Postgres)
- **Auth:** Google OAuth 2.0 (Gmail API)
- **AI:** Gemini (optional Groq fallback)

## Setup

### 1. Environment

Copy `.env.example` to `.env` in the repo root and fill in:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GEMINI_API_KEY=...
PORT=3001
REDIRECT_URI_BASE=http://localhost:3001
FRONTEND_URL=http://localhost:5174
```

Create a frontend env file at `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_GEMINI_API_KEY=your-gemini-key
```

### 2. Supabase

- Create a project at [supabase.com](https://supabase.com)
- Run migrations in order via the Supabase SQL Editor:
  - `supabase/migrations/001_initial_schema.sql`
  - `supabase/migrations/002_user_groups.sql`
  - `supabase/migrations/003_unique_group_names.sql`

### 3. Google Cloud

- Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Create OAuth 2.0 credentials (Web application)
- Add redirect URI: `http://localhost:3001/api/auth/google/callback`
- Enable Gmail API

### 4. Run

```bash
npm install
npm run dev
```

This starts:
- **Backend** (Node.js) on port 3001 (`server/`)
- **Frontend** (Vite + React) on port 5174 (`frontend/`)

Open http://localhost:5174 and sign in with Google.

## Production Notes

- Backend uses `REDIRECT_URI_BASE`, so production redirect URI is:
  `https://<your-backend>.onrender.com/api/auth/google/callback`
- For the Node backend, set `FRONTEND_URL` to your Vercel URL and
  `REDIRECT_URI_BASE` to your backend base URL (no `/api/...` path).
- Never put `SUPABASE_SERVICE_ROLE_KEY` in the frontend.
