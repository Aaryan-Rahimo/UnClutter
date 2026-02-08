import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { getAuthHeaders } from '../../utils/auth'
import { createGroupFromIntent } from '../../utils/groupsApi'

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'assistant',
    text: "Hi! I'm the UnClutter Assistant. I have full access to your inbox. Ask me about deadlines, summarize your emails, or create groups to organize. Try the prompts below to get started!",
  },
]

const DEFAULT_PROMPTS = [
  'What deadlines do I have this week?',
  'Summarize my inbox',
  'Create a group for university emails',
  'List my action items from recent emails',
]

const EMAIL_PROMPTS = [
  'Summarize this email',
  'What should I reply?',
  'Is this urgent?',
  'Extract action items',
]

function isRateLimitError(errMsg) {
  if (!errMsg) return false
  const lower = errMsg.toLowerCase()
  return lower.includes('rate limit') || lower.includes('429') || lower.includes('too many requests') || lower.includes('rate_limit')
}

function ChatbotSidebar({ isOpen = true, onClose, selectedEmail, emails = [], onGroupsChange, onToast }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCountdown, setRetryCountdown] = useState(0)
  const [pendingRetry, setPendingRetry] = useState(null)
  const countdownRef = useRef(null)
  const threadRef = useRef(null)

  // Auto-scroll chat thread to bottom
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages, loading])

  // Countdown timer for rate limit retry
  useEffect(() => {
    if (retryCountdown <= 0) {
      if (countdownRef.current) clearInterval(countdownRef.current)
      return
    }
    countdownRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [retryCountdown])

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || input || '').trim()
      if (!trimmed) return

      const userMsg = { id: Date.now(), role: 'user', text: trimmed }
      setInput('')
      setError(null)
      setPendingRetry(null)
      setRetryCountdown(0)

      // Group creation intent detection
      const isCreateGroup = /^(create|make|add)\s+(a\s+)?group\s+for\s+/i.test(trimmed) || /^group\s+(together\s+)?(all\s+)?(emails\s+)?from\s+/i.test(trimmed)
      if (isCreateGroup) {
        setMessages((prev) => [...prev, userMsg])
        setLoading(true)
        try {
          const intent = trimmed.replace(/^(create|make|add)\s+(a\s+)?group\s+for\s+/i, '').replace(/^group\s+(together\s+)?(all\s+)?(emails\s+)?from\s+/i, '')
          const { group, suggested } = await createGroupFromIntent(intent.trim() || trimmed)
          onGroupsChange?.()
          const reply = `Created group "${group.name}"${suggested?.description ? ` - ${suggested.description}` : ''}.\n\nKeywords: ${(suggested?.keywords || []).slice(0, 8).join(', ') || 'none'}\n\nSwitch to Grouped view in the sidebar to see your new group.`
          setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: reply }])
          onToast?.({ type: 'success', message: `Group "${group.name}" created successfully` })
        } catch (err) {
          const errMsg = err.message || 'Failed to create group'
          if (isRateLimitError(errMsg)) {
            setError('AI is temporarily busy due to rate limits. Please wait a moment and try again.')
            setRetryCountdown(15)
            setPendingRetry(trimmed)
          } else {
            setError(errMsg)
          }
          onToast?.({ type: 'error', message: 'Failed to create group' })
        } finally {
          setLoading(false)
        }
        return
      }

      // Regular chat: send only user message; backend builds context from selectedEmail + emails
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)

      try {
        const history = messages.map(({ role, text }) => ({ role, text }))
        const body = {
          messages: history,
          message: trimmed,
          selectedEmail: selectedEmail || undefined,
          emails: (emails || []).slice(0, 25),
        }
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Chat failed')
        }
        const data = await res.json()
        setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: data.text || '' }])
      } catch (err) {
        const errMsg = err.message || 'Something went wrong.'
        if (isRateLimitError(errMsg)) {
          setError('AI is temporarily busy. Please wait a moment and try again.')
          setRetryCountdown(15)
          setPendingRetry(trimmed)
        } else {
          setError(errMsg)
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
        }
      } finally {
        setLoading(false)
      }
    },
    [input, messages, selectedEmail, emails, onGroupsChange, onToast]
  )

  const handleRetry = useCallback(() => {
    if (pendingRetry) {
      setError(null)
      setRetryCountdown(0)
      sendMessage(pendingRetry)
    }
  }, [pendingRetry, sendMessage])

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleClearChat = () => {
    setMessages(INITIAL_MESSAGES)
    setError(null)
    setPendingRetry(null)
    setRetryCountdown(0)
  }

  const suggestedPrompts = selectedEmail ? EMAIL_PROMPTS : DEFAULT_PROMPTS

  return (
    <aside className={`chatbot-sidebar ${!isOpen ? 'chatbot-sidebar--closed' : ''}`}>
      <div className="chatbot-sidebar__header">
        <h2 className="chatbot-sidebar__title">UnClutter Assistant</h2>
        <div className="chatbot-sidebar__header-actions">
          {messages.length > 1 && (
            <button
              type="button"
              className="chatbot-sidebar__clear-btn"
              onClick={handleClearChat}
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              Clear
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="chatbot-sidebar__close"
              onClick={onClose}
              aria-label="Close chat"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      <p className="chatbot-sidebar__privacy">
        {emails.length > 0
          ? `Context: ${emails.length} email${emails.length !== 1 ? 's' : ''} loaded`
          : 'Sync inbox to enable email context'}
        {selectedEmail && ' \u2022 Focused on selected email'}
      </p>

      <div className="chatbot-sidebar__thread" ref={threadRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chatbot-sidebar__message chatbot-sidebar__message--${msg.role}`}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="chatbot-sidebar__message chatbot-sidebar__message--assistant chatbot-sidebar__message--loading">
            <span className="chatbot-sidebar__typing-indicator">
              <span /><span /><span />
            </span>
          </div>
        )}
        {error && (
          <div className="chatbot-sidebar__error chatbot-sidebar__error--inline">
            <span className="chatbot-sidebar__error-icon">!</span>
            <span className="chatbot-sidebar__error-text">
              {error}
              {retryCountdown > 0 && (
                <span className="chatbot-sidebar__countdown"> Retry in {retryCountdown}s...</span>
              )}
            </span>
            {pendingRetry && retryCountdown <= 0 && (
              <button
                type="button"
                className="chatbot-sidebar__retry-btn"
                onClick={handleRetry}
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      <div className="chatbot-sidebar__suggestions">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="chatbot-sidebar__chip"
            onClick={() => sendMessage(prompt)}
            disabled={loading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className="chatbot-sidebar__input-wrap" onSubmit={handleSubmit}>
        <textarea
          className="chatbot-sidebar__input chatbot-sidebar__textarea"
          placeholder="Ask about your emails..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          aria-label="Message"
          rows={2}
        />
        <button
          type="submit"
          className="chatbot-sidebar__send"
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </form>
    </aside>
  )
}

export default ChatbotSidebar
