import { useState, useRef, useEffect } from 'react'

function ComposeModal({ onSend, onClose, initialTo, initialSubject, initialBody, loading: externalLoading }) {
  const [to, setTo] = useState(initialTo || '')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState(initialSubject || '')
  const [body, setBody] = useState(initialBody || '')
  const [showCc, setShowCc] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const toRef = useRef(null)

  useEffect(() => {
    if (toRef.current && !initialTo) toRef.current.focus()
  }, [])

  // Update body if initialBody changes (e.g. AI drafts)
  useEffect(() => {
    if (initialBody) setBody(initialBody)
  }, [initialBody])

  const handleSend = async () => {
    if (!to.trim()) { setError('Recipient is required'); return }
    if (!subject.trim()) { setError('Subject is required'); return }
    if (!body.trim()) { setError('Message body is required'); return }
    setError(null)
    setSending(true)
    try {
      await onSend({ to: to.trim(), cc: cc.trim() || undefined, bcc: bcc.trim() || undefined, subject: subject.trim(), body: body.trim() })
    } catch (err) {
      setError(err.message || 'Failed to send')
      setSending(false)
    }
  }

  const isBusy = sending || externalLoading

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="compose-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Compose email">
        <div className="compose-modal__header">
          <h3 className="compose-modal__title">New Message</h3>
          <button type="button" className="compose-modal__close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="compose-modal__fields">
          <div className="compose-modal__field">
            <label className="compose-modal__label">To</label>
            <input
              ref={toRef}
              type="email"
              className="compose-modal__input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              disabled={isBusy}
            />
            {!showCc && (
              <button type="button" className="compose-modal__cc-toggle" onClick={() => setShowCc(true)}>
                Cc/Bcc
              </button>
            )}
          </div>

          {showCc && (
            <>
              <div className="compose-modal__field">
                <label className="compose-modal__label">Cc</label>
                <input
                  type="email"
                  className="compose-modal__input"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  disabled={isBusy}
                />
              </div>
              <div className="compose-modal__field">
                <label className="compose-modal__label">Bcc</label>
                <input
                  type="email"
                  className="compose-modal__input"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  disabled={isBusy}
                />
              </div>
            </>
          )}

          <div className="compose-modal__field">
            <label className="compose-modal__label">Subject</label>
            <input
              type="text"
              className="compose-modal__input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              disabled={isBusy}
            />
          </div>
        </div>

        <textarea
          className="compose-modal__body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message..."
          disabled={isBusy}
          rows={12}
        />

        {error && <p className="compose-modal__error">{error}</p>}

        <div className="compose-modal__footer">
          <button
            type="button"
            className="compose-modal__send-btn"
            onClick={handleSend}
            disabled={isBusy || !to.trim()}
          >
            {sending ? (
              <>
                <span className="loading-spinner loading-spinner--small" aria-hidden="true" />
                Sending...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 6}}>
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
                Send
              </>
            )}
          </button>
          <button type="button" className="compose-modal__discard-btn" onClick={onClose} disabled={isBusy}>
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}

export default ComposeModal
