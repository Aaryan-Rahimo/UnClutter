import os
from dotenv import load_dotenv
load_dotenv()

# Google OAuth - set these in .env or environment
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:5000/auth/callback")

# Frontend URL for CORS and redirects
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5174")

# Gmail API scopes
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",  # to apply labels
]
