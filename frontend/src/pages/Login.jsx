import '../styles/login.css'
import { GrainGradient } from '@paper-design/shaders-react'

function LoginPage() {
  return (
    <div className="login-page">
      {/* Animated gradient background */}
      <div className="login-background" aria-hidden="true">
        <GrainGradient
          className="login-background__mesh"
          width="100%"
          height="100%"
          colors={["#8ee0fb", "#99ecff", "#09a4d7", "#0033ff", "#0018a3"]}
          colorBack="#f5f5f5"
          softness={0.5}
          intensity={0.82}
          noise={0.25}
          shape="corners"
          speed={1.56}
          scale={1.22}
        />
        <div className="login-background__wash" />
      </div>

      <div className="login-content">
        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">UnClutter</div>

          {/* Title */}
          <h1 className="login-title">Log in to your account</h1>

          {/* Google button (UI only) */}
          <button type="button" className="login-google-btn">
            <span className="login-google-icon">G</span>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="login-divider">
            <span>or</span>
          </div>

          {/* Form fields (UI only) */}
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@school.edu" />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" placeholder="••••••••" />
          </div>

          {/* Primary CTA */}
          <button type="button" className="login-primary-btn">
            Continue
          </button>

          {/* Footer links */}
          <div className="login-footer">
            <p>
              Don't have an account? <a href="#signup">Sign up</a>
            </p>
            <p>
              <a href="#help">Having trouble logging in?</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage