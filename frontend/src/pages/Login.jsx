import { Link } from 'react-router-dom'
import { GrainGradient } from '@paper-design/shaders-react'
import GoogleButton from '../components/auth/GoogleButton'
import '../styles/login.css'

function LoginPage() {
  return (
    <div className="login-page">
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
          <Link to="/" className="login-logo">
            UnClutter
          </Link>
          <h1 className="login-title">Log in to your account</h1>
          <GoogleButton className="login-google-btn" />

          <div className="login-divider">
            <span>or</span>
          </div>

          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@school.edu" autoComplete="off" />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" placeholder="••••••••" autoComplete="off" />
          </div>

          <button type="button" className="login-primary-btn">
            Continue
          </button>

          <div className="login-footer">
            <p>
              Don&apos;t have an account? <a href="#signup">Sign up</a>
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