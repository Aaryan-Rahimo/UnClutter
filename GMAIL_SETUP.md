# Gmail Integration Setup

Follow these steps to connect your real Gmail account to UnClutter.

## 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Gmail API**:
   - APIs & Services → Enable APIs → search "Gmail API" → Enable

## 2. OAuth Consent Screen

1. APIs & Services → OAuth consent screen
2. Choose **External** (or Internal if using Workspace)
3. Fill in: App name, User support email, Developer contact
4. Scopes → Add: `gmail.readonly`, `gmail.modify`
5. Add yourself as a test user (if in testing mode)

## 3. Create OAuth Credentials

1. APIs & Services → Credentials → Create Credentials → OAuth client ID
2. Application type: **Web application**
3. Name: e.g. "UnClutter"
4. **Authorized redirect URIs** → Add:
   - `http://localhost:5000/auth/callback`
   - (For production: `https://yourdomain.com/auth/callback`)
5. Copy the **Client ID** and **Client Secret**

## 4. Backend Configuration

1. In `backend/`, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `backend/.env` and add:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   REDIRECT_URI=http://localhost:5000/auth/callback
   FRONTEND_URL=http://localhost:5174
   ```

## 5. Frontend Configuration

1. In `frontend/`, create `.env` (or add to existing):
   ```
   VITE_APP_API_URL=http://localhost:5000
   ```

## 6. Run the App

**Terminal 1 – Backend:**
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Backend runs at http://localhost:5000

**Terminal 2 – Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at http://localhost:5174

## 7. Connect Gmail

1. Open http://localhost:5174
2. Click **Sign in with Google**
3. Sign in and approve access
4. You'll be redirected to `/home` with your real Gmail inbox

## Troubleshooting

- **"Redirect URI mismatch"**: Ensure `http://localhost:5000/auth/callback` is exactly in your Google Cloud credentials
- **CORS errors**: Make sure `FRONTEND_URL` in backend `.env` matches your frontend URL (including port)
- **"Not authenticated"**: Clear cookies and sign in again
