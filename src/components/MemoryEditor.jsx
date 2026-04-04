import { useState, useRef } from 'react'
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function MemoryEditor({ game, existingMemory, onSave, onCancel }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [text, setText] = useState(existingMemory?.text || '')
  const [photos, setPhotos] = useState(existingMemory?.photos || [])
  const [newFiles, setNewFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [dragover, setDragover] = useState(false)

  const resultNames = (game.results || []).map((r) => r.name)
  const gamePlayers = resultNames.length > 0 ? resultNames : (game.players || [])
  const gameDate = game.date || ''
  const datePart = gameDate.replace(/\//g, '-')

  const handleFiles = (files) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const withPreview = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      taggedPlayers: [],
    }))
    setNewFiles((prev) => [...prev, ...withPreview])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragover(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeNewFile = (index) => {
    setNewFiles((prev) => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const removeExistingPhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const togglePlayerTag = (photoIndex, player, isNew) => {
    if (isNew) {
      setNewFiles((prev) =>
        prev.map((f, i) => {
          if (i !== photoIndex) return f
          const tags = f.taggedPlayers.includes(player)
            ? f.taggedPlayers.filter((p) => p !== player)
            : [...f.taggedPlayers, player]
          return { ...f, taggedPlayers: tags }
        })
      )
    } else {
      setPhotos((prev) =>
        prev.map((p, i) => {
          if (i !== photoIndex) return p
          const tags = p.taggedPlayers.includes(player)
            ? p.taggedPlayers.filter((t) => t !== player)
            : [...p.taggedPlayers, player]
          return { ...p, taggedPlayers: tags }
        })
      )
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const uploadedPhotos = []
      for (let i = 0; i < newFiles.length; i++) {
        const { file, taggedPlayers: fileTags } = newFiles[i]
        const ext = file.name.split('.').pop()
        const filename = `${datePart}-mynd${String(photos.length + i + 1).padStart(2, '0')}.${ext}`
        const storageRef = ref(storage, `memories/${filename}`)
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)
        uploadedPhotos.push({
          url,
          caption: null,
          taggedPlayers: fileTags,
          order: photos.length + i,
        })
      }

      const allPhotos = [...photos, ...uploadedPhotos]
      const now = Timestamp.now()

      if (existingMemory?.id) {
        await updateDoc(doc(db, 'memories', existingMemory.id), {
          text,
          photos: allPhotos,
          updatedAt: now,
        })
      } else {
        await addDoc(collection(db, 'memories'), {
          gameNums: [game.game_num],
          text,
          photos: allPhotos,
          source: 'facebook',
          createdBy: user.email,
          createdAt: now,
          updatedAt: now,
        })
      }

      newFiles.forEach((f) => URL.revokeObjectURL(f.preview))
      onSave()
    } catch (err) {
      console.error('Failed to save memory:', err)
      alert('Villa við að vista minningu: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="memory-editor">
      <h3 style={{ color: 'var(--gold)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
        📸 {existingMemory ? 'Breyta minningu' : 'Bæta við minningu'}
      </h3>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Athugasemdir frá leiknum..."
      />

      {/* Existing photos */}
      {photos.length > 0 && (
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--dim)', marginBottom: '0.3rem', marginTop: '0.75rem' }}>
            Myndir:
          </div>
          {photos.map((photo, i) => (
            <div key={photo.url} style={{ marginBottom: '0.5rem' }}>
              <div className="memory-upload-preview">
                <div className="memory-upload-thumb">
                  <img src={photo.url} alt="" />
                  <button className="memory-upload-remove" onClick={() => removeExistingPhoto(i)}>
                    ✕
                  </button>
                </div>
              </div>
              <div className="memory-tag-list">
                <span style={{ fontSize: '0.7rem', color: 'var(--dim)', marginRight: '0.3rem' }}>
                  Merkja:
                </span>
                {gamePlayers.map((player) => (
                  <button
                    key={player}
                    className={(photo.taggedPlayers || []).includes(player) ? 'memory-tag' : 'memory-add-tag'}
                    onClick={() => togglePlayerTag(i, player, false)}
                  >
                    {player}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New file previews */}
      {newFiles.length > 0 && (
        <div className="memory-upload-preview">
          {newFiles.map((f, i) => (
            <div key={f.preview} className="memory-upload-thumb">
              <img src={f.preview} alt="" />
              <button className="memory-upload-remove" onClick={() => removeNewFile(i)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        className={`memory-upload-zone ${dragover ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        Dragðu myndir hingað eða smelltu til að bæta við
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Player tagging for new files */}
      {newFiles.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--dim)', marginBottom: '0.3rem' }}>
            Merkja leikmenn á nýjar myndir:
          </div>
          {newFiles.map((f, fi) => (
            <div key={f.preview} className="memory-tag-list">
              <span style={{ fontSize: '0.7rem', color: 'var(--dim)', marginRight: '0.3rem' }}>
                Mynd {fi + 1}:
              </span>
              {gamePlayers.map((player) => (
                <button
                  key={player}
                  className={f.taggedPlayers.includes(player) ? 'memory-tag' : 'memory-add-tag'}
                  onClick={() => togglePlayerTag(fi, player, true)}
                >
                  {player}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="memory-actions">
        <button className="memory-cancel-btn" onClick={onCancel}>
          Hætta við
        </button>
        <button className="memory-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Vista...' : 'Vista minningu'}
        </button>
      </div>
    </div>
  )
}
