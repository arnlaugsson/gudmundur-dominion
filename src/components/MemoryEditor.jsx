import { useState, useRef } from 'react'
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, updateMetadata } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'
import DATA from '../data'
import PlayerTagger from './PlayerTagger'

// Build the storage filename for a photo. Including the game number, the
// date, and a per-memory sequence index makes the path unambiguous even
// when two games share the same date.
function buildStorageFilename(gameNum, datePart, sequenceIdx, ext) {
  const seq = String(sequenceIdx).padStart(2, '0')
  return `game-${gameNum}-${datePart}-mynd${seq}.${ext}`
}

// Custom metadata we want on every uploaded image so the file is
// self-describing in the Firebase Storage console — even if the
// Firestore record is ever lost or out of sync.
function buildCustomMetadata(game, taggedPlayers) {
  return {
    gameNum: String(game.game_num ?? ''),
    gameDate: game.date || '',
    taggedPlayers: (taggedPlayers || []).join(','),
  }
}

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
  const allPlayers = DATA.players.map((p) => p.name)
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

  const updatePhotoCaption = (index, caption) => {
    setPhotos((prev) =>
      prev.map((p, i) => i === index ? { ...p, caption } : p)
    )
  }

  const movePhoto = (index, direction) => {
    setPhotos((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const updated = [...prev]
      const temp = updated[index]
      updated[index] = updated[target]
      updated[target] = temp
      return updated.map((p, i) => ({ ...p, order: i }))
    })
  }

  const toggleHighlight = (index) => {
    setPhotos((prev) =>
      prev.map((p, i) => ({
        ...p,
        highlight: i === index ? !p.highlight : false,
      }))
    )
  }

  const updateNewFileCaption = (index, caption) => {
    setNewFiles((prev) =>
      prev.map((f, i) => i === index ? { ...f, caption } : f)
    )
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
      // 1. Upload new files with full metadata baked in.
      const uploadedPhotos = []
      for (let i = 0; i < newFiles.length; i++) {
        const { file, taggedPlayers: fileTags } = newFiles[i]
        const ext = file.name.split('.').pop()
        const filename = buildStorageFilename(game.game_num, datePart, photos.length + i + 1, ext)
        const storagePath = `memories/${filename}`
        const fileRef = ref(storage, storagePath)
        await uploadBytes(fileRef, file, { customMetadata: buildCustomMetadata(game, fileTags) })
        const url = await getDownloadURL(fileRef)
        uploadedPhotos.push({
          url,
          storagePath,
          gameNum: game.game_num,
          caption: newFiles[i].caption || null,
          taggedPlayers: fileTags,
          order: photos.length + i,
        })
      }

      // 2. For existing photos whose tags or per-photo gameNum changed since
      //    load, sync the change down to Firebase Storage's customMetadata so
      //    the file remains self-describing. Skip silently when storagePath
      //    is missing (older photos predating this field).
      const existingByUrl = new Map((existingMemory?.photos || []).map(p => [p.url, p]))
      for (const photo of photos) {
        if (!photo.storagePath) continue
        const before = existingByUrl.get(photo.url)
        const tagsChanged = before
          ? JSON.stringify(before.taggedPlayers || []) !== JSON.stringify(photo.taggedPlayers || [])
          : false
        if (!tagsChanged) continue
        try {
          await updateMetadata(ref(storage, photo.storagePath), {
            customMetadata: buildCustomMetadata(
              { game_num: photo.gameNum ?? game.game_num, date: game.date },
              photo.taggedPlayers,
            ),
          })
        } catch (err) {
          // Non-fatal: log but keep the Firestore save going.
          console.warn('Failed to update Storage metadata for', photo.storagePath, err)
        }
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
            <div key={photo.url} style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'var(--bg3)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div className="memory-upload-thumb">
                  <img src={photo.url} alt="" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={photo.caption || ''}
                    onChange={(e) => updatePhotoCaption(i, e.target.value)}
                    placeholder="Myndatexti..."
                    style={{
                      width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                      color: 'var(--text)', borderRadius: '4px', padding: '0.3rem 0.5rem',
                      fontSize: '0.8rem', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                  <PlayerTagger
                    tagged={photo.taggedPlayers || []}
                    gamePlayers={gamePlayers}
                    onToggle={(player) => togglePlayerTag(i, player, false)}
                    onAdd={(player) => {
                      setPhotos((prev) =>
                        prev.map((p, idx) => idx === i
                          ? { ...p, taggedPlayers: [...(p.taggedPlayers || []), player] }
                          : p
                        )
                      )
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <button
                    onClick={() => toggleHighlight(i)}
                    title={photo.highlight ? 'Fjarlægja úr korti' : 'Sýna á korti'}
                    style={{
                      background: 'none', border: '1px solid var(--border)',
                      color: photo.highlight ? 'var(--gold)' : 'var(--dim)',
                      borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 5px',
                    }}
                  >{photo.highlight ? '★' : '☆'}</button>
                  <button
                    onClick={() => movePhoto(i, -1)}
                    disabled={i === 0}
                    style={{
                      background: 'none', border: '1px solid var(--border)', color: i === 0 ? 'var(--bg3)' : 'var(--dim)',
                      borderRadius: '3px', cursor: i === 0 ? 'default' : 'pointer', fontSize: '0.7rem', padding: '2px 5px',
                    }}
                  >▲</button>
                  <button
                    onClick={() => movePhoto(i, 1)}
                    disabled={i === photos.length - 1}
                    style={{
                      background: 'none', border: '1px solid var(--border)', color: i === photos.length - 1 ? 'var(--bg3)' : 'var(--dim)',
                      borderRadius: '3px', cursor: i === photos.length - 1 ? 'default' : 'pointer', fontSize: '0.7rem', padding: '2px 5px',
                    }}
                  >▼</button>
                  <button
                    onClick={() => removeExistingPhoto(i)}
                    style={{
                      background: 'none', border: '1px solid var(--border)', color: 'var(--red)',
                      borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 5px',
                    }}
                  >✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New file previews */}
      {newFiles.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--dim)', marginBottom: '0.3rem' }}>
            Nýjar myndir:
          </div>
          {newFiles.map((f, i) => (
            <div key={f.preview} style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'var(--bg3)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div className="memory-upload-thumb">
                  <img src={f.preview} alt="" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={f.caption || ''}
                    onChange={(e) => updateNewFileCaption(i, e.target.value)}
                    placeholder="Myndatexti..."
                    style={{
                      width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                      color: 'var(--text)', borderRadius: '4px', padding: '0.3rem 0.5rem',
                      fontSize: '0.8rem', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                  <PlayerTagger
                    tagged={f.taggedPlayers}
                    gamePlayers={gamePlayers}
                    onToggle={(player) => togglePlayerTag(i, player, true)}
                    onAdd={(player) => {
                      setNewFiles((prev) =>
                        prev.map((file, idx) => idx === i
                          ? { ...file, taggedPlayers: [...file.taggedPlayers, player] }
                          : file
                        )
                      )
                    }}
                  />
                </div>
                <button
                  onClick={() => removeNewFile(i)}
                  style={{
                    background: 'none', border: '1px solid var(--border)', color: 'var(--red)',
                    borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 5px',
                  }}
                >✕</button>
              </div>
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
