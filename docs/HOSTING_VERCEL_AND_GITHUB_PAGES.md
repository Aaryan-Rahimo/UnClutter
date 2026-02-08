# Host the frontend on Vercel or GitHub Pages

The **frontend** (React app) can be hosted on **Vercel** or **GitHub Pages**. The **backend** (Flask API) must be hosted somewhere else (e.g. [Render](https://render.com)) because it runs Python and keeps OAuth state. See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup.

---

## Backend first (required)

1. Deploy the **backend** to Render (or Railway, etc.) as in [DEPLOYMENT.md](./DEPLOYMENT.md).
2. Note your backend URL, e.g. `https://unclutter-api.onrender.com`.
3. In Render **Environment**, set:
   - `FRONTEND_URL` = the URL you will use below (Vercel or GitHub Pages).
   - `REDIRECT_URI` = `https://unclutter-api.onrender.com/api/auth/google/callback`.

---

## Option 1: Vercel (recommended)

1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
2. **Add New** → **Project** and import your repo.
3. Configure the project:
   - **Root Directory:** click **Edit** and set to `frontend`.
   - **Framework Preset:** Vite (should be detected).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables** (add these):
   - **Name:** `VITE_API_URL`  
     **Value:** your backend URL, e.g. `https://unclutter-api.onrender.com`
   - (Optional) `VITE_GEMINI_API_KEY` for the chatbot.
5. Click **Deploy**. When it finishes, you get a URL like `https://your-project.vercel.app`.
6. In **Render** (backend), set:
   - `FRONTEND_URL` = `https://your-project.vercel.app`
7. In **Google Cloud Console** → Credentials → your OAuth client:
   - **Authorized JavaScript origins:** add `https://your-project.vercel.app`
   - **Authorized redirect URIs:** add `https://unclutter-api.onrender.com/api/auth/google/callback` (if not already).

You’re done. Open `https://your-project.vercel.app` and use **Get started with Google**.

---

## Option 2: GitHub Pages

GitHub Pages serves your site at `https://<username>.github.io/<repo-name>/`, so the app must run under that path.

### 2.1 Set base path

In your repo, the frontend is configured to use an optional base path via `VITE_BASE_PATH`. Use your **repo name** (e.g. if the repo is `UnClutter`, the path is `/UnClutter/`).

You’ll set this when building (see step 2.3).

### 2.2 Deploy with GitHub Actions

1. In your repo, create `.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install and build
        run: |
          cd frontend
          npm ci
          npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_BASE_PATH: /${{ github.event.repository.name }}/

      - name: Upload artifact
        uses: actions/upload-pages-artifact@3
        with:
          path: frontend/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@4
```

2. Replace `VITE_API_URL` with your backend URL:
   - **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Name: `VITE_API_URL`
   - Value: `https://unclutter-api.onrender.com` (your real backend URL)

3. Enable GitHub Pages:
   - **Settings** → **Pages**
   - **Source:** GitHub Actions
   - Save.

4. Push to `main`; the workflow will build and deploy. Your site will be at:
   `https://<username>.github.io/<repo-name>/`

5. Set **FRONTEND_URL** on Render to that URL (no trailing slash), e.g.:
   `https://myusername.github.io/UnClutter`

6. In **Google Cloud Console** → OAuth client:
   - **Authorized JavaScript origins:** add `https://<username>.github.io`
   - **Authorized redirect URIs:** your backend callback URL (unchanged).

### 2.3 Build locally and upload (alternative)

If you don’t use Actions:

```bash
cd frontend
# Replace UnClutter with your repo name
VITE_API_URL=https://unclutter-api.onrender.com VITE_BASE_PATH=/UnClutter/ npm run build
```

Then use the **gh-pages** package or drag the `frontend/dist` contents into a branch that GitHub Pages serves. The repo name in `VITE_BASE_PATH` must match the repo (e.g. `/UnClutter/` for repo `UnClutter`).

---

## Checklist

- [ ] Backend deployed (e.g. Render) with `FRONTEND_URL` and `REDIRECT_URI` set.
- [ ] Frontend deployed (Vercel or GitHub Pages).
- [ ] `VITE_API_URL` set to backend URL (Vercel env vars or GitHub Actions secret).
- [ ] For GitHub Pages: `VITE_BASE_PATH` set to `/<repo-name>/`.
- [ ] Google OAuth: production frontend origin and backend callback URI added.
- [ ] Open frontend URL → Sign in with Google → redirects back and app loads.

---

## Summary

| Host            | Use for   | Notes                                      |
|-----------------|-----------|--------------------------------------------|
| **Vercel**      | Frontend  | No base path; set `VITE_API_URL` only.     |
| **GitHub Pages**| Frontend  | Set `VITE_BASE_PATH` to `/<repo-name>/`.   |
| **Render**      | Backend   | Required for OAuth and Gmail API.          |

The backend cannot run on Vercel or GitHub Pages alone; it needs a Python host like Render.
