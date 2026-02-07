"""
Flask backend: Google OAuth + Gmail API.
Run: flask --app app run -p 5001
"""
import base64
import os
import uuid

from dotenv import load_dotenv
from google.auth.transport.requests import Request
from flask import Flask, redirect, request, jsonify
from flask_cors import CORS
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret")
CORS(app, supports_credentials=True, origins=[os.environ.get("FRONTEND_URL", "http://localhost:5174")])

CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5174")
REDIRECT_URI = "http://localhost:5001/api/auth/google/callback"

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

# Server-side token store: token_id -> { access_token, refresh_token, expiry, email }
# Use Redis/DB in production. In dev, tokens are lost on server restart.
TOKEN_STORE = {}


def get_client_config():
    return {
        "web": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }


def get_flow():
    return Flow.from_client_config(
        get_client_config(),
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )


def get_credentials_from_token(token_id):
    """Build Credentials from TOKEN_STORE by token_id (from Authorization header)."""
    if not token_id or token_id not in TOKEN_STORE:
        return None
    data = TOKEN_STORE[token_id]
    return Credentials(
        token=data.get("access_token"),
        refresh_token=data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
    )


def _auth_token():
    """Get token from Authorization: Bearer <token> header."""
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def save_tokens(credentials, email=None):
    token_id = str(uuid.uuid4())
    TOKEN_STORE[token_id] = {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
        "email": email or "",
    }
    return token_id


@app.route("/api/auth/login")
def login():
    """Redirect to Google OAuth."""
    flow = get_flow()
    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return redirect(authorization_url)


@app.route("/api/auth/google/callback")
def auth_callback():
    """Exchange code for tokens and redirect to frontend."""
    if "error" in request.args:
        return redirect(f"{FRONTEND_URL}/login?error=access_denied")
    code = request.args.get("code")
    if not code:
        return redirect(f"{FRONTEND_URL}/login?error=no_code")
    try:
        flow = get_flow()
        flow.fetch_token(code=code)
        creds = flow.credentials
    except Exception as e:
        print("OAuth token exchange failed:", e)
        return redirect(f"{FRONTEND_URL}/login?error=token_exchange_failed")
    email = ""
    try:
        from googleapiclient.discovery import build as build_api
        user_info = build_api("oauth2", "v2", credentials=creds)
        profile = user_info.userinfo().get().execute()
        email = profile.get("email", "")
    except Exception as e:
        print("Userinfo failed (non-fatal):", e)
    token_id = save_tokens(creds, email=email)
    return redirect(f"{FRONTEND_URL}/home?token={token_id}")


@app.route("/api/auth/me")
def me():
    """Return current user email or 401."""
    token_id = _auth_token()
    if not token_id or token_id not in TOKEN_STORE:
        return jsonify({"error": "Not authenticated"}), 401
    email = TOKEN_STORE[token_id].get("email", "")
    return jsonify({"email": email})


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    token_id = _auth_token()
    if token_id and token_id in TOKEN_STORE:
        del TOKEN_STORE[token_id]
    return jsonify({"ok": True}), 200


def _get_valid_creds():
    token_id = _auth_token()
    creds = get_credentials_from_token(token_id)
    if not creds:
        return None
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        if token_id and token_id in TOKEN_STORE:
            TOKEN_STORE[token_id]["access_token"] = creds.token
            TOKEN_STORE[token_id]["expiry"] = creds.expiry.isoformat() if creds.expiry else None
    return creds


@app.route("/api/emails")
def list_emails():
    """List messages (Gmail API). Query params: maxResults, q."""
    creds = _get_valid_creds()
    if not creds:
        return jsonify({"error": "Not authenticated"}), 401
    service = build("gmail", "v1", credentials=creds)
    max_results = request.args.get("maxResults", "50")
    q = request.args.get("q", "")
    try:
        result = service.users().messages().list(
            userId="me",
            maxResults=int(max_results),
            q=q if q else None,
        ).execute()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    messages = result.get("messages", [])
    ids = [m["id"] for m in messages]
    # Fetch minimal details for each (snippet, payload.headers)
    emails = []
    for msg_id in ids[:50]:
        try:
            msg = service.users().messages().get(userId="me", id=msg_id, format="metadata", metadataHeaders=["From", "Subject", "Date"]).execute()
            payload = msg.get("payload", {})
            headers = {h["name"]: h["value"] for h in payload.get("headers", [])}
            emails.append({
                "id": msg["id"],
                "threadId": msg.get("threadId"),
                "snippet": msg.get("snippet", ""),
                "subject": headers.get("Subject", ""),
                "sender": headers.get("From", ""),
                "date": headers.get("Date", ""),
            })
        except Exception:
            continue
    return jsonify({"emails": emails})


@app.route("/api/emails/<msg_id>")
def get_email(msg_id):
    """Get one message by id (full body)."""
    creds = _get_valid_creds()
    if not creds:
        return jsonify({"error": "Not authenticated"}), 401
    service = build("gmail", "v1", credentials=creds)
    try:
        msg = service.users().messages().get(userId="me", id=msg_id, format="full").execute()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    payload = msg.get("payload", {})
    headers = {h["name"]: h["value"] for h in payload.get("headers", [])}
    body = ""
    if "body" in payload and payload["body"].get("data"):
        body = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")
    elif "parts" in payload:
        for part in payload["parts"]:
            if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
                body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
                break
    return jsonify({
        "id": msg["id"],
        "threadId": msg.get("threadId"),
        "snippet": msg.get("snippet", ""),
        "subject": headers.get("Subject", ""),
        "sender": headers.get("From", ""),
        "date": headers.get("Date", ""),
        "body": body,
        "labelIds": msg.get("labelIds", []),
    })


if __name__ == "__main__":
    app.run(port=5001, debug=True)
