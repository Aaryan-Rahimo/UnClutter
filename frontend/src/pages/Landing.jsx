import { Link } from 'react-router-dom'
import { GrainGradient } from '@paper-design/shaders-react'
import '../styles/landing.css'

// ---------------------------------------------------------------------------
// Navbar – logo, nav links, and right-side actions (Sign in, Start for free)
// ---------------------------------------------------------------------------
function Navbar() {
  return (
    <nav className="navbar">
      <Link to="#hero" className="navbar__logo">
        UnClutter
      </Link>
      <ul className="navbar__links">
        <li><a href="#product" className="navbar__link">Product</a></li>
        <li><a href="#how-it-works" className="navbar__link">How it works</a></li>
        <li><a href="#privacy" className="navbar__link">Privacy</a></li>
        <li><a href="#pricing" className="navbar__link">Pricing</a></li>
      </ul>
      <div className="navbar__actions">
        <Link to="/login" className="btn-text">Sign in</Link>
        <Link to="/login" className="btn-primary">Start for free</Link>
      </div>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// HeroSection – badge, headline, subheading, and CTA buttons
// ---------------------------------------------------------------------------
function HeroSection() {
  return (
    <section className="hero">
      <span className="hero__badge">Privacy-first Gmail organization</span>
      <h1 className="hero__headline">
        Your inbox, finally <span className="hero__headline-accent">organized</span>.
      </h1>
      <p className="hero__subheading">
        UnClutter groups your emails into clean, category-based cards so you can focus on what matters.
      </p>
      <div className="hero__ctas">
        <Link to="/login" className="btn-primary">Get started</Link>
        <a href="#how-it-works" className="btn-secondary">Learn more</a>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// FeaturesSection – explains what UnClutter does and why it helps
// ---------------------------------------------------------------------------
function FeaturesSection() {
  return (
    <section className="features">
      <div className="features__content">
        <h2 className="features__title">Why students choose UnClutter</h2>
        <p className="features__subtitle">
          A calm, focused inbox that keeps you in control without the clutter.
        </p>

        <div className="features__grid">
          <article className="feature-card">
            <div className="feature-card__icon" aria-hidden="true" />
            <h3 className="feature-card__title">Smart Email Grouping</h3>
            <p className="feature-card__text">
              Automatically groups emails into clean, category-based cards like School, Work,
              Promotions, and Updates.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-card__icon" aria-hidden="true" />
            <h3 className="feature-card__title">Built for Focus</h3>
            <p className="feature-card__text">
              Surfaces only emails that need attention while keeping everything else organized in
              the background.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-card__icon" aria-hidden="true" />
            <h3 className="feature-card__title">Privacy First</h3>
            <p className="feature-card__text">
              Emails are processed securely and are never sold, shared, or used for ads.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-card__icon" aria-hidden="true" />
            <h3 className="feature-card__title">Instant Setup</h3>
            <p className="feature-card__text">
              Connect Gmail and get organized immediately. No filters, no rules, no manual setup.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// ComparisonSection – UnClutter vs Gmail comparison table
// ---------------------------------------------------------------------------
const comparisonRows = [
  { feature: 'Automatic category-based email grouping', unclutter: true, gmail: false },
  { feature: 'Inbox organized into clean cards', unclutter: true, gmail: false },
  { feature: 'Zero manual filters or rules required', unclutter: true, gmail: false },
  { feature: 'Focused view for important emails', unclutter: true, gmail: false },
  { feature: 'Privacy-first (no ads, no data selling)', unclutter: true, gmail: false },
  { feature: 'Built specifically for inbox decluttering', unclutter: true, gmail: false },
  { feature: 'Traditional inbox with tabs and labels', unclutter: false, gmail: true },
  { feature: 'Manual filters and labels', unclutter: false, gmail: true },
]

function ComparisonSection() {
  return (
    <section className="comparison">
      <div className="comparison__content">
        <h2 className="comparison__title">
          Why UnClutter beats Gmail for inbox organization
        </h2>
        <p className="comparison__subtitle">
          A simpler, more focused way to manage your email.
        </p>

        <div className="comparison__table-wrap">
          <table className="comparison__table">
            <thead>
              <tr>
                <th className="comparison__th comparison__th--feature">Feature</th>
                <th className="comparison__th comparison__th--brand">UnClutter</th>
                <th className="comparison__th">Gmail</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="comparison__row">
                  <td className="comparison__td comparison__td--feature">{row.feature}</td>
                  <td className="comparison__td">
                    {row.unclutter
                      ? <span className="comparison__check" aria-label="Yes">✓</span>
                      : <span className="comparison__cross" aria-label="No">✕</span>}
                  </td>
                  <td className="comparison__td">
                    {row.gmail
                      ? <span className="comparison__check" aria-label="Yes">✓</span>
                      : <span className="comparison__cross" aria-label="No">✕</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// LandingPage – top-level page that composes Navbar and HeroSection
// ---------------------------------------------------------------------------
function LandingPage() {
  return (
    <div className="landing-page">
      {/* Background mesh gradient (subtle, behind content) */}
      <div className="landing-bg" aria-hidden="true">
        <GrainGradient
          className="landing-bg__mesh"
          width = "100%"
          height= "100%"
          colors={["#8ee0fb", "#99ecff", "#09a4d7", "#0033ff", "#0018a3"]}
          colorBack="#f5f5f5"
          softness={0.5}
          intensity={0.82}
          noise={0.25}
          shape="corners"
          speed={1.56}
          scale={1.00}
        />
        <div className="landing-bg__wash" />
      </div>

      <div className="landing-content">
        <Navbar />
        <main>
          <HeroSection />
          <FeaturesSection />
          <ComparisonSection />
        </main>
      </div>
    </div>
  )
}

export default LandingPage
