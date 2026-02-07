import { API_BASE } from '../../utils/auth'

function GoogleButton() {
  const handleClick = () => {
    window.location.href = `${API_BASE}/api/auth/login`
  }

  return (
    <button type="button" className="google-button" onClick={handleClick}>
      Sign in with Google
    </button>
  )
}

export default GoogleButton
