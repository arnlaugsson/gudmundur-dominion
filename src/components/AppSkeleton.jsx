// Shown while the data and app code load. Mirrors the header + nav + stat
// grid layout so the page doesn't jump when the real content arrives.
const STAT_PLACEHOLDERS = 6

export default function AppSkeleton() {
  return (
    <div aria-busy="true" aria-label="Hleð gögnum">
      <header>
        <h1>♛ Dominionklúbburinn Guðmundur ♛</h1>
        <p>Tölfræði og gagnvirk úrvinnsla</p>
      </header>
      <div className="skeleton-nav" />
      <main>
        <div className="stats-grid">
          {Array.from({ length: STAT_PLACEHOLDERS }, (_, i) => (
            <div key={i} className="stat-card skeleton-block" />
          ))}
        </div>
        <div className="skeleton-block skeleton-panel" />
      </main>
    </div>
  )
}
