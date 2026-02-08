# Step-by-step: Backend on Render + Frontend on GitHub Pages

This guide connects your **UnClutter** frontend (GitHub Pages) to your backend (Render) in order. Use your real repo name, GitHub username, and Render service name where shown.

---

## Part 1: Deploy the backend on Render

### Step 1.1 – Create the backend service

1. Go to **[render.com](https://render.com)** and sign in (e.g. **Sign in with GitHub**).
2. Click **New +** → **Web Service**.
3. Connect your **GitHub** account if needed, then select the repo that contains UnClutter (e.g. **UnClutter**).
4. Fill in:
   - **Name:** `unclutter-api` (or any name; your URL will be `https://unclutter-api.onrender.com`).
   - **Region:** pick one (e.g. Oregon).
   - **Root Directory:** click **Edit**, type **`backend`**, then **Save**.
   - **Runtime:** **Python 3**.
   - **Build Command:**  
     `pip install -r requirements.txt`
   - **Start Command:**  
     `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Scroll to **Environment** (or **Environment Variables**).

### Step 1.2 – Backend environment variables

Click **Add Environment Variable** and add these **one by one**:

| Key | Value |
|-----|--------|
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID (from Google Cloud Console). |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client secret. |
| `FLASK_SECRET_KEY` | Any long random string (e.g. run `openssl rand -hex 32` in a terminal and paste the output). |
| `FRONTEND_URL` | For now use: `https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME` (see below). Replace `YOUR_GITHUB_USERNAME` with your GitHub username and `YOUR_REPO_NAME` with the repo name (e.g. `UnClutter`). **No trailing slash.** Example: `https://jane.github.io/UnClutter` |
| `REDIRECT_URI` | `https://unclutter-api.onrender.com/api/auth/google/callback` (replace `unclutter-api` with the **Name** you chose in Step 1.1 if different). |

### Step 1.3 – Deploy the backend

1. Click **Create Web Service**.
2. Wait until the deploy finishes and the status is **Live** (green).
3. Your backend URL is: **`https://unclutter-api.onrender.com`** (again, replace `unclutter-api` with your service name if different).
4. In a browser open:  
   **`https://unclutter-api.onrender.com/api/health`**  
   You should see: `{"status":"ok"}`.

---

## Part 2: Google OAuth – allow your backend callback

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)** → **APIs & Services** → **Credentials**.
2. Open your **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized redirect URIs**, click **Add URI** and add:
   - `https://unclutter-api.onrender.com/api/auth/google/callback`  
   (same as your `REDIRECT_URI`; use your real Render service name).
4. Click **Save**.  
   (You will add the frontend URL in Part 4.)

---

## Part 3: Deploy the frontend on GitHub Pages

### Step 3.1 – Add the backend URL as a secret

1. On **GitHub**, open your UnClutter repo.
2. Go to **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret**.
4. **Name:** `VITE_API_URL`  
   **Value:** your backend URL, e.g. `https://unclutter-api.onrender.com` (no trailing slash).
5. Click **Add secret**.

### Step 3.2 – Turn on GitHub Pages

1. In the same repo go to **Settings** → **Pages**.
2. Under **Build and deployment**:
   - **Source:** select **GitHub Actions**.
3. Save (no need to choose a branch when using Actions).

### Step 3.3 – Deploy the frontend

1. The repo already has a workflow at **`.github/workflows/deploy-pages.yml`** that builds the frontend and deploys to GitHub Pages.
2. **Push** your latest code to the **`main`** branch (or the branch the workflow uses).  
   If it’s already pushed, you can trigger a run: **Actions** → **Deploy to GitHub Pages** → **Run workflow**.
3. Wait until the workflow run is green (completed).
4. Your frontend will be at:  
   **`https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/`**  
   Example: `https://jane.github.io/UnClutter/`  
   (Replace with your username and repo name.)

---

## Part 4: Connect frontend and backend

### Step 4.1 – Point the backend to the frontend

1. On **Render**, open your **unclutter-api** (or your backend) service.
2. Go to **Environment**.
3. Set **`FRONTEND_URL`** to your real GitHub Pages URL **without** a trailing slash, e.g.:  
   `https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME`  
   Example: `https://jane.github.io/UnClutter`
4. **Save Changes.** Render will redeploy (wait until it’s Live again).

### Step 4.2 – Tell Google OAuth about the frontend

1. In **Google Cloud Console** → **Credentials** → your **OAuth 2.0 Client ID**.
2. Under **Authorized JavaScript origins**, click **Add URI** and add:
   - `https://YOUR_GITHUB_USERNAME.github.io`  
   (no path, no trailing slash – Google allows the origin for all paths under that domain).
3. Click **Save**.

---

## Part 5: Test the full flow

1. Open your **frontend** in a browser:  
   **`https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/`**
2. You should see the UnClutter landing page.
3. Click **Get started with Google** (or go to the login page).
4. Sign in with Google. You should be redirected back to the app at **`/home?token=...`** and the inbox should load (or show “Loading inbox…” then data).
5. If you see “Failed to fetch emails” or “Not authenticated”, check:
   - **Render** → Environment: `FRONTEND_URL` and `REDIRECT_URI` are correct.
   - **Google Cloud** → Authorized JavaScript origins includes `https://YOUR_GITHUB_USERNAME.github.io` and Authorized redirect URIs includes your Render callback URL.
   - You’re using the **GitHub Pages URL** in the browser (not the Render URL).

---

## Quick reference

| What | Where | Value (example) |
|------|--------|------------------|
| Backend URL | Render dashboard | `https://unclutter-api.onrender.com` |
| Frontend URL | GitHub Pages | `https://jane.github.io/UnClutter` (no trailing slash) |
| `FRONTEND_URL` | Render → Environment | Same as Frontend URL |
| `REDIRECT_URI` | Render → Environment | `https://unclutter-api.onrender.com/api/auth/google/callback` |
| `VITE_API_URL` | GitHub → Settings → Secrets | Same as Backend URL |
| Authorized JavaScript origins | Google Cloud → OAuth client | `https://jane.github.io` |
| Authorized redirect URIs | Google Cloud → OAuth client | `https://unclutter-api.onrender.com/api/auth/google/callback` |

---

## Summary

1. **Render:** Deploy backend (root `backend`, gunicorn with `$PORT`), set all 5 env vars (including `FRONTEND_URL` and `REDIRECT_URI`).
2. **Google:** Add the **redirect URI** (backend callback).
3. **GitHub:** Add secret **`VITE_API_URL`** (backend URL), set Pages source to **GitHub Actions**, push to `main` to deploy frontend.
4. **Render:** Set **`FRONTEND_URL`** to your real GitHub Pages URL and save.
5. **Google:** Add **JavaScript origin** `https://YOUR_GITHUB_USERNAME.github.io`.
6. Open the **frontend** URL and sign in with Google to confirm everything works.
