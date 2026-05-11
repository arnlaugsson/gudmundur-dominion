import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function AvatarPicker({ playerName, photosByPlayer, onChange }) {
  const { user } = useAuth()
  const photos = photosByPlayer?.get(playerName) || []

  async function pick(photo) {
    try {
      await setDoc(
        doc(db, 'playerProfiles', playerName),
        {
          avatarUrl: photo?.url || null,
          avatarPhotoStoragePath: photo?.storagePath || null,
          updatedAt: Timestamp.now(),
          updatedBy: user?.email || null,
        },
        { merge: true },
      )
      onChange?.()
    } catch (err) {
      console.error('Failed to set avatar:', err)
      alert('Villa við að vista prófílmynd: ' + err.message)
    }
  }

  if (photos.length === 0) {
    return (
      <div style={{ fontSize: '.85rem', color: 'var(--dim)', padding: '.75rem 0' }}>
        Engar myndir til að velja úr. Bættu þér við sem tag á einhverri mynd fyrst.
      </div>
    )
  }

  return (
    <div style={{ marginTop: '.5rem' }}>
      <div style={{ fontSize: '.7rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.4rem' }}>
        Veldu prófílmynd
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
        {photos.map((p, i) => (
          <img
            key={p.url + '-' + i}
            src={p.url}
            alt=""
            onClick={() => pick(p)}
            style={{
              width: 60, height: 60, borderRadius: 6, objectFit: 'cover',
              cursor: 'pointer', border: '1px solid var(--border)',
            }}
          />
        ))}
        <button
          onClick={() => pick(null)}
          style={{
            width: 60, height: 60, borderRadius: 6,
            background: 'var(--bg2)', border: '1px dashed var(--border)',
            color: 'var(--dim)', fontSize: '.7rem', cursor: 'pointer',
          }}
        >
          Engin
        </button>
      </div>
    </div>
  )
}
