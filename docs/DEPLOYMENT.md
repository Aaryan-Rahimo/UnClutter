# Hosting UnClutter (make it public)

UnClutter has two parts: a **React frontend** and a **Flask backend**. You need to host both and point Google OAuth at your production URLs.

---

## 1. Google Cloud Console (do this first)

Your OAuth client must allow your production URLs.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → open your **OAuth 2.0 Client ID**.
2. Under **Authorized JavaScript origins**, add:
   - Your frontend URL, e.g. `https://unclutter.vercel.app` or `https://yourdomain.com`
3. Under **Authorized redirect URIs**, add:
   - Your backend callback URL, e.g. `https://your-backend.onrender.com/api/auth/google/callback`
4. Save.

Use your real frontend and backend URLs from the steps below.

---

## 2. Host the backend

The backend must be a **public HTTPS URL** (required for Google OAuth).

### Option A: Render (free tier)

1. Go to [render.com](https://render.com) and sign in (e.g. GitHub).
2. **New** → **Web Service**.
3. Connect your repo and set:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
4. Under **Environment**, add:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `FLASK_SECRET_KEY` (random string)
   - `FRONTEND_URL` = your frontend URL (e.g. `https://unclutter.vercel.app`)
   - `REDIRECT_URI` = `https://<your-service-name>.onrender.com/api/auth/google/callback`
5. Deploy. Note the URL, e.g. `https://unclutter-api.onrender.com`.

### Option B: Railway

1. Go to [railway.app](https://railway.app), connect repo.
2. Add a service from the `backend` directory.
3. Set **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
4. Add the same env vars as above; set `REDIRECT_URI` to `https://<your-railway-url>/api/auth/google/callback`.
5. Deploy and copy the public URL.

### Option C: Fly.io, Heroku, etc.

Same idea: run `gunicorn app:app`, set `PORT` from the host, and set `FRONTEND_URL` and `REDIRECT_URI` to your production URLs.

---

## 3. Host the frontend

The frontend must call your **production backend URL**.

### Option A: Vercel (recommended)

1. Go to [vercel.com](https://vercel.com), connect your repo.
2. Set **Root Directory** to `frontend` (or leave root and set build to run in `frontend`).
3. **Build settings:**
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment variables:**
   - `VITE_API_URL` = your backend URL, e.g. `https://unclutter-api.onrender.com`
   - (Optional) `VITE_GEMINI_API_KEY` for the chatbot
5. Deploy. Your app will be at `https://your-project.vercel.app`.

### Option B: Netlify

1. [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**.
2. **Base directory:** `frontend`
3. **Build command:** `npm run build`
4. **Publish directory:** `dist`
5. **Environment variables:** `VITE_API_URL` = your backend URL.
6. Deploy.

### Option C: Cloudflare Pages

1. Connect repo, set **Build configuration** to `frontend` (or root with build in `frontend`).
2. **Build command:** `npm run build`, **Output directory:** `dist`.
3. Add `VITE_API_URL` in **Settings** → **Environment variables**.
4. Deploy.

---

## 4. Environment variables summary

| Where        | Variable            | Example (production) |
|-------------|---------------------|----------------------|
| **Backend** | `GOOGLE_CLIENT_ID`  | (same as dev)        |
| **Backend** | `GOOGLE_CLIENT_SECRET` | (same as dev)     |
| **Backend** | `FLASK_SECRET_KEY`  | long random string   |
| **Backend** | `FRONTEND_URL`      | `https://unclutter.vercel.app` |
| **Backend** | `REDIRECT_URI`      | `https://your-api.onrender.com/api/auth/google/callback` |
| **Frontend**| `VITE_API_URL`      | `https://your-api.onrender.com` |

Frontend uses `VITE_API_URL` in `auth.js` as `API_BASE`; if unset it falls back to `http://localhost:5001`. In production you **must** set it so the app calls your backend.

---

## 5. Quick checklist

- [ ] Backend deployed and returning 200 on a health URL (e.g. `/api/auth/me` will 401 without a token; that’s OK).
- [ ] Frontend deployed with `VITE_API_URL` set to the backend URL.
- [ ] Google OAuth: production frontend URL in **Authorized JavaScript origins**.
- [ ] Google OAuth: production backend callback in **Authorized redirect URIs**.
- [ ] Visit frontend URL → Sign in with Google → you’re redirected back and emails load.

---

## 6. Optional: backend health check

You can add a simple route for “is the backend up?”:

```python
@app.route("/api/health")
def health():
    return jsonify({"status": "ok"}), 200
```

Then use `https://your-api.onrender.com/api/health` for Render’s health check if needed.

---

## 7. Free-tier notes

- **Render:** Free backend sleeps after ~15 min idle; first request after that can be slow.
- **Vercel/Netlify:** Frontend free tier is usually enough for small traffic.
- **Google OAuth:** If the app is still in “Testing”, only test users can sign in. To make it public, switch the OAuth consent screen to **Production** (may require verification for sensitive scopes).
