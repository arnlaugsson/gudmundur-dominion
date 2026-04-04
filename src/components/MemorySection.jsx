import PhotoGrid from './PhotoGrid'
import { useAuth } from '../context/AuthContext'

export default function MemorySection({ memories, onEdit }) {
  const { user } = useAuth()

  if (!user?.allowed) return null
  if (!memories || memories.length === 0) {
    if (user?.admin) {
      return (
        <div className="memory-section">
          <button className="login-btn" onClick={onEdit}>
            📸 Bæta við minningu
          </button>
        </div>
      )
    }
    return null
  }

  return (
    <div className="memory-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>📸 Minningar</h3>
        {user?.admin && (
          <button className="login-btn" onClick={onEdit}>
            Breyta
          </button>
        )}
      </div>
      {memories.map((memory) => (
        <div key={memory.id}>
          <PhotoGrid photos={memory.photos} />
          {memory.text && <div className="memory-text">{memory.text}</div>}
        </div>
      ))}
    </div>
  )
}
