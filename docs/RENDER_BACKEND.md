# Host the backend on Render

Step-by-step to deploy the UnClutter **Flask backend** on Render.

---

## 1. Prerequisites

- Your UnClutter repo pushed to **GitHub** (or GitLab).
- **Google OAuth** credentials: Client ID and Client secret from [Google Cloud Console](https://console.cloud.google.com/) (see [CONNECTING_GMAIL.md](./CONNECTING_GMAIL.md)).

---

## 2. Deploy from the dashboard

### 2.1 Create the service

1. Go to [render.com](https://render.com) and sign in (e.g. **Sign in with GitHub**).
2. Click **New +** → **Web Service**.
3. Connect your repository (e.g. **UnClutter**) and select it.
4. Configure:
   - **Name:** e.g. `unclutter-api` (this becomes `unclutter-api.onrender.com`).
   - **Region:** choose one close to you.
   - **Root Directory:** click **Edit** and set to **`backend`**.
   - **Runtime:** **Python 3**.
   - **Build Command:**  
     `pip install -r requirements.txt`
   - **Start Command:**  
     `gunicorn app:app --bind 0.0.0.0:$PORT`  
     (Render sets `PORT`; you must bind to it.)

### 2.2 Environment variables

In **Environment** (or **Environment Variables**), add:

| Key | Value |
|-----|--------|
| `GOOGLE_CLIENT_ID` | Your OAuth client ID (e.g. `xxx.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | Your OAuth client secret |
| `FLASK_SECRET_KEY` | Any long random string (e.g. from `openssl rand -hex 32`) |
| `FRONTEND_URL` | Your frontend URL, e.g. `https://your-app.vercel.app` or `https://username.github.io/UnClutter` (no trailing slash) |
| `REDIRECT_URI` | `https://<your-service-name>.onrender.com/api/auth/google/callback` |

Replace `<your-service-name>` with the **Name** you gave the service (e.g. `unclutter-api` → `https://unclutter-api.onrender.com/api/auth/google/callback`).

You can leave `FRONTEND_URL` as a placeholder (e.g. `https://placeholder.vercel.app`) and change it later when you deploy the frontend.

### 2.3 Deploy

Click **Create Web Service**. Render will build and deploy. Wait until the service is **Live**.

Your backend URL will be: **`https://<your-service-name>.onrender.com`**

Test it: open  
`https://<your-service-name>.onrender.com/api/health`  
in a browser. You should see `{"status":"ok"}`.

---

## 3. Google OAuth settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → open your **OAuth 2.0 Client ID**.
2. Under **Authorized redirect URIs**, add:
   - `https://<your-service-name>.onrender.com/api/auth/google/callback`
3. Save.

(You’ll add the frontend URL to **Authorized JavaScript origins** when you deploy the frontend.)

---

## 4. (Optional) Deploy with Blueprint (render.yaml)

The repo includes a **render.yaml** so you can deploy from the dashboard using the Blueprint.

1. **New +** → **Blueprint**.
2. Connect the same repo.
3. Render will read `render.yaml` and create a **Web Service** with root directory `backend` and the start command above.
4. You still must add the **environment variables** in the service’s **Environment** tab (they are not stored in the repo):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `FLASK_SECRET_KEY`
   - `FRONTEND_URL`
   - `REDIRECT_URI`

---

## 5. After deployment

- **Backend URL:** `https://<your-service-name>.onrender.com`
- Use this URL as **`VITE_API_URL`** when you deploy the frontend (Vercel or GitHub Pages).
- Set **`FRONTEND_URL`** on Render to your real frontend URL once it’s live.
- Free tier: the service may **spin down** after ~15 minutes of no traffic; the next request can take 30–60 seconds to wake it up.

---

## 6. Troubleshooting

| Issue | What to check |
|-------|----------------|
| Build fails | Ensure **Root Directory** is `backend` and `requirements.txt` is in that folder. |
| “No open ports” / deploy fails | Start command must be `gunicorn app:app --bind 0.0.0.0:$PORT`. |
| 401 / “Not authenticated” from API | Tokens are in memory; they’re lost on redeploy. Users must sign in again. |
| OAuth “redirect_uri_mismatch” | `REDIRECT_URI` on Render must match exactly what’s in Google Cloud (including `https://` and path). |
