const CATEGORY_COLOR = {
  volume:    '#58a6ff',
  wins:      '#c9a84c',
  records:   '#f43f5e',
  streaks:   '#f97316',
  variety:   '#3fb950',
  rivalries: '#a78bfa',
}

export default function AchievementBadge({ achievement }) {
  const color = CATEGORY_COLOR[achievement.category] || 'var(--gold)'
  const tooltip = achievement.earnedGameNum != null
    ? `Náði í leik #${achievement.earnedGameNum}${achievement.earnedDate ? ` þann ${achievement.earnedDate}` : ''}`
    : (achievement.detail || achievement.title)
  return (
    <div className="achievement-pill" title={tooltip} style={{ borderColor: color }}>
      <span className="achievement-icon" style={{ color }}>{achievement.icon}</span>
      <div className="achievement-text">
        <div className="achievement-title">{achievement.title}</div>
        {achievement.detail && <div className="achievement-detail">{achievement.detail}</div>}
      </div>
    </div>
  )
}
