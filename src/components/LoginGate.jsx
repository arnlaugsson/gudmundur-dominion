// Members-only content: logged-in, allowed users see `children`; guests get
// a login prompt. Note this hides UI only — the underlying game data is public.
export default function LoginGate({ allowed, loading, onLogin, error, title = 'Aðeins fyrir meðlimi', children = null }) {
  if (allowed) return children
  if (loading) {
    return (
      <section className="section active" aria-busy="true">
        <div className="skeleton-block skeleton-panel" />
      </section>
    )
  }
  return (
    <section className="section active">
      <div className="login-gate">
        <div className="login-gate-icon" aria-hidden="true">🔒</div>
        <h2>{title}</h2>
        <p>Skráðu þig inn með Google-aðganginum þínum til að sjá þetta.</p>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="story-cta" onClick={onLogin}>Innskrá</button>
      </div>
    </section>
  )
}
