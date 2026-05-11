function navigateToGame(gameNum) {
  // Reuse the History tab's targetGame mechanism: set hash, then App's
  // existing handleGameNav can be triggered by listening at App-level.
  // Simpler: just set the hash to history and open the game modal there.
  window.location.hash = 'history'
  // Future enhancement: pre-target the game (not in this PR).
  // For now, navigation to History is enough; the user can find the game.
  // To avoid silent failure, log so we know when this is used.
  console.debug('Navigate to game #' + gameNum)
}

export default function PlayerBio({ bio, onEdit, canEdit }) {
  const filled = !!(bio?.shortBio || bio?.favoriteExpansion || bio?.favoriteCard || bio?.memorableVictory || bio?.memorableLoss)

  if (!filled) {
    return (
      <div style={{ color: 'var(--dim)', fontSize: '.85rem', padding: '.4rem 0' }}>
        Engar prófíl-upplýsingar enn.
        {canEdit && (
          <button
            onClick={onEdit}
            style={{
              marginLeft: '.5rem', background: 'none', border: 'none',
              color: 'var(--gold)', cursor: 'pointer', fontSize: '.85rem', padding: 0,
            }}
          >
            [Bæta við]
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', fontSize: '.88rem' }}>
      {bio.shortBio && (
        <div>{bio.shortBio}</div>
      )}
      {bio.favoriteExpansion && (
        <div><span style={{ color: 'var(--dim)' }}>Uppáhalds viðbót: </span>{bio.favoriteExpansion}</div>
      )}
      {bio.favoriteCard && (
        <div><span style={{ color: 'var(--dim)' }}>Uppáhaldsspil: </span>{bio.favoriteCard}</div>
      )}
      {bio.memorableVictory?.gameNum != null && (
        <div>
          <span style={{ color: 'var(--dim)' }}>Eftirminnilegasti sigur: </span>
          <button
            onClick={() => navigateToGame(bio.memorableVictory.gameNum)}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, font: 'inherit' }}
          >
            leikur #{bio.memorableVictory.gameNum}
          </button>
          {bio.memorableVictory.text && <span> — "{bio.memorableVictory.text}"</span>}
        </div>
      )}
      {bio.memorableLoss?.gameNum != null && (
        <div>
          <span style={{ color: 'var(--dim)' }}>Skemmtilegasta tapið: </span>
          <button
            onClick={() => navigateToGame(bio.memorableLoss.gameNum)}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, font: 'inherit' }}
          >
            leikur #{bio.memorableLoss.gameNum}
          </button>
          {bio.memorableLoss.text && <span> — "{bio.memorableLoss.text}"</span>}
        </div>
      )}
    </div>
  )
}
