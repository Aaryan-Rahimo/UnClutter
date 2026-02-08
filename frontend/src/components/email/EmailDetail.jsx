import { useState, useEffect, useMemo } from 'react'
import { getAuthHeaders } from '../../utils/auth'
import { getDisplayBody, splitIntoParagraphs } from '../../utils/emailDisplay'

const TRUNCATE_LIMIT = 3000
const TRUNCATE_SHOW = 1500

function EmailDetail({ email, onBack }) {
  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const [showFullBody, setShowFullBody] = useState(false)

  useEffect(() => {
    if (email) {
      setSummary(null)
      setSummaryError(null)
      setShowFullBody(false)
    }
  }, [email?.id])

  const handleSummarize = async () => {
    if (!email) return
    setSummaryError(null)
    setSummarizing(true)
    try {
      const res = await fetch('/api/ai/summarize-email', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ subject: email.subject, body: bodyText }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Summarization failed')
      }
      const data = await res.json()
      setSummary(data.text || '')
    } catch (err) {
      setSummaryError(err.message || 'Summarization failed.')
    } finally {
      setSummarizing(false)
    }
  }

  const bodyText = useMemo(() => getDisplayBody(email), [email])

  const { displayText, isTruncated } = useMemo(() => {
    if (!bodyText || bodyText.length <= TRUNCATE_LIMIT || showFullBody) {
      return { displayText: bodyText, isTruncated: false }
    }
    return { displayText: bodyText.slice(0, TRUNCATE_SHOW), isTruncated: true }
  }, [bodyText, showFullBody])

  const paragraphs = useMemo(() => splitIntoParagraphs(displayText), [displayText])

  if (!email) return null

  const summaryLines = summary
    ? summary
        .split(/\n+/)
        .map((s) => s.replace(/^[\s\u2022\-*]+\s*/, '').trim())
        .filter(Boolean)
    : []

  // Format sender name from "Name <email>" format
  const senderDisplay = (() => {
    const s = email.sender || email.from_address || ''
    const match = s.match(/^(.+?)\s*<(.+)>$/)
    if (match) return { name: match[1].replace(/"/g, ''), email: match[2] }
    return { name: s, email: '' }
  })()

  return (
    <div className="email-detail">
      <div className="email-detail__toolbar">
        <button type="button" className="email-detail__back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: 'middle'}}>
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back
        </button>
        <span className="email-detail__toolbar-divider" />
        <button type="button" className="email-detail__action">Reply</button>
        <button type="button" className="email-detail__action">Forward</button>
        <div style={{flex: 1}} />
        <button
          type="button"
          className="email-detail__btn email-detail__btn--outline"
          onClick={handleSummarize}
          disabled={summarizing}
        >
          {summarizing ? 'Summarizing...' : 'Summarize'}
        </button>
      </div>

      <h2 className="email-detail__subject">{email.subject}</h2>

      <div className="email-detail__sender-block">
        <div className="email-detail__avatar">
          {(senderDisplay.name || '?')[0].toUpperCase()}
        </div>
        <div className="email-detail__sender-info">
          <span className="email-detail__sender-name">{senderDisplay.name}</span>
          {senderDisplay.email && (
            <span className="email-detail__sender-email">&lt;{senderDisplay.email}&gt;</span>
          )}
        </div>
        <span className="email-detail__date">{email.date}</span>
      </div>

      <div className="email-detail__meta">
        <span><strong>To:</strong> me</span>
        {email.cc_addresses?.length > 0 && (
          <span><strong>CC:</strong> {email.cc_addresses.join(', ')}</span>
        )}
      </div>

      {email.labels?.length > 0 && (
        <div className="email-detail__labels">
          {email.labels.filter((l) => !['INBOX', 'UNREAD', 'CATEGORY_PERSONAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_SOCIAL', 'CATEGORY_FORUMS'].includes(l)).map((label) => (
            <span key={label} className="email-detail__label-chip">
              {label.replace(/_/g, ' ').toLowerCase()}
            </span>
          ))}
        </div>
      )}

      <div className="email-detail__body">
        {paragraphs.map((para, i) => {
          // Detect bullet lists
          if (para.includes('\n\u2022 ') || para.startsWith('\u2022 ')) {
            const items = para.split('\n').filter(Boolean)
            return (
              <ul key={i} className="email-detail__body-list">
                {items.map((item, j) => (
                  <li key={j}>{item.replace(/^\u2022\s*/, '')}</li>
                ))}
              </ul>
            )
          }
          // Detect blockquotes
          if (para.startsWith('> ')) {
            return (
              <blockquote key={i} className="email-detail__body-quote">
                {para.replace(/^>\s*/gm, '')}
              </blockquote>
            )
          }
          // Regular paragraph
          return <p key={i} className="email-detail__body-para">{para}</p>
        })}
        {isTruncated && (
          <button
            type="button"
            className="email-detail__show-more"
            onClick={() => setShowFullBody(true)}
          >
            Show full email ({Math.round(bodyText.length / 1000)}k characters)
          </button>
        )}
      </div>

      {(summary || summarizing || summaryError) && (
        <div className="email-detail__summary-box">
          <h3 className="email-detail__summary-title">AI Summary</h3>
          {summarizing && <p className="email-detail__summary-loading">Summarizing...</p>}
          {summaryError && (
            <p className="email-detail__summary-error">{summaryError}</p>
          )}
          {!summarizing && !summaryError && summaryLines.length > 0 && (
            <ul className="email-detail__summary-list">
              {summaryLines.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default EmailDetail
