"""
Keyword-based sorting engine for UnClutter.
Maps Gmail emails to: university, action, promotions, unsorted, social, updates.
"""

ACADEMIC_KEYWORDS = [
    "avenue to learn", "mosaic", "macid", "mcmaster", "msu",
    "registrar", "syllabus", "midterm", "exam",
]
ACTION_KEYWORDS = ["due", "deadline", "submission", "submit by"]
PROMOTION_KEYWORDS = ["sale", "discount", "offer", "limited time", "promo", "clearance", "deal", "save", "% off"]
DATE_PATTERNS = [
    r"\b\d{1,2}/\d{1,2}", r"\b\d{1,2}-\d{1,2}",
    r"\b(by|due|before)\s+[\w\d\s,.-]+",
    r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}",
]
import re


def _contains(text, keywords):
    if not text:
        return False
    lower = text.lower()
    return any(kw.lower() in lower for kw in keywords)


def _has_date(text):
    if not text:
        return False
    return any(re.search(p, text, re.I) for p in DATE_PATTERNS)


def classify_email(subject, sender, body_snippet):
    """Return category id and labels for an email."""
    text = f"{subject or ''} {sender or ''} {body_snippet or ''}"
    labels = []

    if _contains(text, ACADEMIC_KEYWORDS):
        labels.append("University")
        if _contains(text, ACTION_KEYWORDS) or _has_date(text):
            labels.append("Action Items")

    if _contains(text, PROMOTION_KEYWORDS):
        labels.append("Promotions")

    # Map to category ids used by frontend
    if "Action Items" in labels:
        return "action", labels
    if "University" in labels:
        return "university", labels
    if "Promotions" in labels:
        return "promotions", labels

    return "unsorted", labels or ["Unsorted"]
