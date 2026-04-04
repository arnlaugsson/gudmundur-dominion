import { useAuth } from '../context/AuthContext'
import PhotoGrid from './PhotoGrid'

export default function PlayerPhotos({ playerName, photosByPlayer }) {
  const { user } = useAuth()

  if (!user?.allowed) return null

  const photos = photosByPlayer?.get(playerName) || []
  if (photos.length === 0) return null

  return (
    <div className="player-photos">
      <h3>📸 Myndir ({photos.length})</h3>
      <PhotoGrid photos={photos} />
    </div>
  )
}
