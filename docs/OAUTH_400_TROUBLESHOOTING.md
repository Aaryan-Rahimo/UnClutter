# OAuth "Error 400: invalid_request" – Doesn't comply with Google's OAuth 2.0 policy

When you see:

> You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy for keeping apps secure.  
> Error 400: invalid_request

Google is blocking the request for a **specific** reason, but the public message is generic. Use the steps below to find and fix the real cause.

---

## 1. Get the real error (do this first)

On the error page, click **"If you are a developer of UnClutter, see error details."**

That page will show the **exact** validation rule that failed, for example:

- **`redirect_uri_mismatch`** → The redirect URI in your request does not exactly match one of the **Authorized redirect URIs** in Google Cloud. Fix in [Credentials](#2-credentials-oauth-client) below.
- **Invalid or missing domain** / **Authorized domains** → Your app’s host domain is not in the OAuth consent screen. Fix in [OAuth consent screen](#3-oauth-consent-screen-authorized-domains) below.
- **Invalid client** → Wrong Client ID/Secret or wrong OAuth client type (e.g. Desktop instead of Web). Fix in [Credentials](#2-credentials-oauth-client) and Render env.

Note what the **error details** say and use the matching section below.

---

## 2. Credentials (OAuth client)

In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → open your **OAuth 2.0 Client ID** (Web application).

### Authorized redirect URIs

Must include **exactly** (no trailing slash):

```text
https://unclutter-api.onrender.com/api/auth/google/callback
```

Replace `unclutter-api` with your actual Render service name if different.

- The value must be **identical** to `REDIRECT_URI` on Render (see [RENDER_BACKEND.md](./RENDER_BACKEND.md)).
- If you use both local and production, you can add both:
  - `http://localhost:5001/api/auth/google/callback`
  - `https://unclutter-api.onrender.com/api/auth/google/callback`

### Authorized JavaScript origins

Add the **exact** URL where users open your app (no trailing slash), e.g.:

```text
https://your-unclutter-app.vercel.app
```

Google requires this for the origin that starts the OAuth flow (your frontend).

---

## 3. OAuth consent screen – Authorized domains

In **APIs & Services** → **OAuth consent screen** → scroll to **Authorized domains**.

Add (if not already):

- `vercel.app`
- `onrender.com`

Use only the domain (e.g. `vercel.app`), no `https://` or path. Save.

Without these, Google can reject the request with the generic “doesn’t comply” message even when test users are added.

---

## 4. Render environment variables

In Render → your service → **Environment**:

| Variable           | Example value                                                                 |
|--------------------|-------------------------------------------------------------------------------|
| `REDIRECT_URI`     | `https://unclutter-api.onrender.com/api/auth/google/callback`                 |
| `FRONTEND_URL`     | `https://your-unclutter-app.vercel.app` (same as in Authorized JavaScript origins) |
| `GOOGLE_CLIENT_ID` | Your Web client ID (`xxx.apps.googleusercontent.com`)                         |
| `GOOGLE_CLIENT_SECRET` | Your Web client secret                                             |

Redeploy after changing env vars.

---

## 5. Testing vs production

- **Testing:** App is in **Testing** and only **Test users** can sign in. Ensure every account you use is listed under **Test users** on the OAuth consent screen.
- **Production:** To allow any Google user, you must submit the app for verification. Until then, keep the app in **Testing** and use only test users.

---

## Quick checklist

- [ ] Clicked **“see error details”** and read the exact error.
- [ ] **Authorized redirect URIs** includes exactly `https://<your-render-service>.onrender.com/api/auth/google/callback`.
- [ ] **Authorized JavaScript origins** includes exactly your frontend URL (e.g. Vercel).
- [ ] **Authorized domains** (consent screen) include `vercel.app` and `onrender.com`.
- [ ] Render env: `REDIRECT_URI` and `FRONTEND_URL` match the values above.
- [ ] App is in **Testing** and the Google account is in **Test users**.

After any change, wait a minute and try again in an **incognito/private** window to avoid cached redirects or old sessions.
