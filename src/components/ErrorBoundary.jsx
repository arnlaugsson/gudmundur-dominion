import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="error-screen" role="alert">
        <h2>Eitthvað fór úrskeiðis</h2>
        <p>Ekki tókst að hlaða síðunni. Athugaðu nettenginguna og reyndu aftur.</p>
        <button className="login-btn" onClick={() => window.location.reload()}>
          Reyna aftur
        </button>
      </div>
    )
  }
}
