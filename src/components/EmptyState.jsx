export default function EmptyState({ icon = '🔍', children }) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-icon" aria-hidden="true">{icon}</span>
      {children}
    </div>
  )
}
