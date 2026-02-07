/**
 * Keyword-Based Sorting Engine
 * Classifies emails into Gmail-style labels for Academic Sweep and FOMO Filter.
 *
 * Gmail label mapping (when API integrated):
 * - University, Action Items, Promotions → apply/ensure corresponding Gmail labels
 */

export const GMAIL_LABELS = {
  UNIVERSITY: 'University',
  ACTION_ITEMS: 'Action Items',
  PROMOTIONS: 'Promotions',
}

// Academic Sweep (McMaster-Focused)
const ACADEMIC_KEYWORDS = [
  'avenue to learn',
  'mosaic',
  'macid',
  'mcmaster',
  'msu',
  'registrar',
  'syllabus',
  'midterm',
  'exam',
]

// Secondary: Action Items triggers
const ACTION_ITEM_KEYWORDS = ['due', 'deadline', 'submission', 'submit by']

// Date patterns: DD/MM, DD-MM, DD.MM, "by DATE", "due DATE", month names, etc.
const DATE_PATTERNS = [
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/i, // 15/02, 15/02/25
  /\b\d{1,2}-\d{1,2}(-\d{2,4})?\b/i,  // 15-02
  /\b\d{1,2}\.\d{1,2}(\.\d{2,4})?\b/i, // 15.02
  /\b(by|due|before)\s+[\w\d\s,.-]+\b/i,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?(\s*,?\s*\d{4})?/i,
  /\b\d{1,2}(st|nd|rd|th)\s+(of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)/i,
  /\b(mon|tue|wed|thu|fri|sat|sun)(day)?\s*[,.]?\s*\d{1,2}/i,
]

// FOMO Filter (Promotions & Newsletters)
const PROMOTION_KEYWORDS = [
  'sale',
  'discount',
  'offer',
  'limited time',
  'promo',
  'clearance',
  'deal',
  'save',
  '% off',
  'off %',
]

/**
 * Check if text contains any of the given keywords (case-insensitive)
 */
function containsKeyword(text, keywords) {
  if (!text || typeof text !== 'string') return false
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw.toLowerCase()))
}

/**
 * Check if text matches any date pattern
 */
function hasDatePattern(text) {
  if (!text || typeof text !== 'string') return false
  return DATE_PATTERNS.some((re) => re.test(text))
}

/**
 * Classify a single email into labels.
 * @param {Object} email - { id, sender, subject, date, body? }
 * @returns {string[]} - Array of labels: 'University', 'Action Items', 'Promotions', 'Unsorted'
 */
export function classifyEmail(email) {
  const labels = new Set()
  const combinedText = [email.subject, email.sender, email.body || ''].join(' ')

  // Academic Sweep
  if (containsKeyword(combinedText, ACADEMIC_KEYWORDS)) {
    labels.add('University')
    // Action Items: Due, Deadline, or date patterns
    if (
      containsKeyword(combinedText, ACTION_ITEM_KEYWORDS) ||
      hasDatePattern(combinedText)
    ) {
      labels.add('Action Items')
    }
  }

  // FOMO Filter
  if (containsKeyword(combinedText, PROMOTION_KEYWORDS)) {
    labels.add('Promotions')
  }

  // Default
  if (labels.size === 0) {
    labels.add('Unsorted')
  }

  return Array.from(labels)
}

/**
 * Sort and group emails by labels. Action Items get priority; Promotions in scrollable feed.
 * @param {Object[]} emails - Raw email list
 * @param {string} [searchQuery] - Optional search filter; only emails matching query are included
 * @returns {Object} - { actionItems, university, promotions, unsorted }
 */
export function sortEmails(emails, searchQuery = '') {
  const result = {
    actionItems: [],
    university: [],
    promotions: [],
    unsorted: [],
  }

  const query = (searchQuery || '').trim().toLowerCase()

  for (const email of emails) {
    const labels = classifyEmail(email)
    const emailWithLabels = { ...email, labels }

    // Apply search filter
    if (query) {
      const searchable = [
        email.subject,
        email.sender,
        email.body || '',
      ].join(' ')
      if (!searchable.toLowerCase().includes(query)) continue
    }

    if (labels.includes('Action Items')) {
      result.actionItems.push(emailWithLabels)
    }
    if (labels.includes('University')) {
      result.university.push(emailWithLabels)
    }
    if (labels.includes('Promotions')) {
      result.promotions.push(emailWithLabels)
    }
    if (labels.includes('Unsorted') && labels.length === 1) {
      result.unsorted.push(emailWithLabels)
    }
  }

  // Dedupe: if an email is in Action Items, don't also show in University card
  const inAction = new Set(result.actionItems.map((e) => e.id))
  result.university = result.university.filter((e) => !inAction.has(e.id))

  return result
}
