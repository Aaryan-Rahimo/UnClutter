import { Link } from 'react-router-dom'
import '../styles/auth.css'

function Landing() {
  return (
    <div className="auth-page auth-page--landing">
      <div className="auth-card">
        <div className="auth-card__brand">
          <h1 className="auth-card__logo">UnClutter</h1>
          <p className="auth-card__tagline">Your inbox, simplified.</p>
        </div>
        <p className="auth-card__desc">
          Connect your Gmail, sort your emails, and chat with AI to stay organized.
        </p>
        <div className="auth-card__actions">
          <Link to="/login" className="auth-btn auth-btn--primary">
            Get Started
          </Link>
          <Link to="/login" className="auth-btn auth-btn--secondary">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Landing
