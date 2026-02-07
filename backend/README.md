# UnClutter Backend (Gmail OAuth + API)

## Setup

1. **Python 3.10+** recommended.

2. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Environment:** Copy `.env.example` to `.env` and fill in (or use the existing `.env` if already created):
   - `GOOGLE_CLIENT_ID` – from Google Cloud Console OAuth client
   - `GOOGLE_CLIENT_SECRET` – from Google Cloud Console
   - `FLASK_SECRET_KEY` – any random string
   - `FRONTEND_URL` – e.g. `http://localhost:5174`

4. **Redirect URI** in Google Cloud must be exactly:
   `http://localhost:5001/api/auth/google/callback`
   (We use 5001 to avoid conflict with macOS AirPlay on port 5000.)

## Run

```bash
cd backend
flask --app app run -p 5001
```

Or:

```bash
python app.py
```

Backend will be at `http://localhost:5001`. Start the frontend (`npm run dev` in `frontend/`) and go to `http://localhost:5174/login` to sign in with Google.

## Endpoints

- `GET /api/auth/login` – Redirects to Google OAuth
- `GET /api/auth/google/callback` – OAuth callback (redirects to frontend with `?token=...`)
- `GET /api/auth/me` – Current user email (header: `Authorization: Bearer <token>`)
- `POST /api/auth/logout` – Invalidate token (header: `Authorization: Bearer <token>`)
- `GET /api/emails?maxResults=50&q=...` – List emails (header: `Authorization: Bearer <token>`)
- `GET /api/emails/<id>` – Get one email (header: `Authorization: Bearer <token>`)
