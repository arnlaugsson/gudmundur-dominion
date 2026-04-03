import { useState, useMemo } from 'react'
import CardImage from '../components/CardImage'
import CardModal from '../components/CardModal'
import DATA from '../data'

const MODES = [
  { id: 'random',    icon: '🎲', name: 'Hrein tilviljun', desc: 'Algjörlega handahófskennt ríki' },
  { id: 'least',     icon: '🦗', name: 'Gleymdu kortin',  desc: 'Kortin sem eru sjaldnast í ríkinu' },
  { id: 'favorites', icon: '⭐', name: 'Uppáhald allra',  desc: 'Vinsælustu kortin í sögu klúbbsins' },
  { id: 'balanced',  icon: '⚖️', name: 'Jafnvægt',        desc: 'Blanda af nýjum og kunnuglegum kortum' },
]

const SPECIAL_TYPES = new Set(['Event', 'Landmark', 'Project', 'Way', 'Ally', 'Trait', 'Prophecy'])

const TYPE_COLOR = {
  Event: '#f97316', Landmark: '#3fb950', Project: '#58a6ff',
  Way: '#a78bfa', Ally: '#f43f5e', Trait: '#06b6d4', Prophecy: '#e879f9',
}

const PLAYER_MODES = [
  { id: 'unseen',    name: 'Óspilað',    desc: 'Spil sem valdir hafa aldrei séð' },
  { id: 'rare',      name: 'Sjaldséð',   desc: 'Spil sem valdir hafa sjaldnast spilað' },
  { id: 'favorites', name: 'Uppáhald',   desc: 'Spil sem valdir spila oftast' },
]

function CostBadge({ card }) {
  if (card.cost == null && !card.debt && !card.potion) return null
  if (card.debt) return <span className="coin debt">{card.debt}D</span>
  if (card.potion) return <><span className="coin">{card.cost ?? 0}</span><span className="coin potion">P</span></>
  return <span className="coin">{card.cost}</span>
}

function KingdomCard({ card, onClick }) {
  return (
    <div className="kd-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <CardImage name={card.name} className="card-art" />
      <div style={{ padding: '.5rem .6rem' }}>
        <div className="kn" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
          {card.name}
          {card.isSecondEdition && <span className="tag tag-2nd">2nd Ed.</span>}
        </div>
        <div className="ke">{card.expansion}</div>
        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          <CostBadge card={card} />
          <span className="kt">{card.times_used}× notað</span>
        </div>
      </div>
    </div>
  )
}

function ExtraCard({ card, onClick }) {
  const color = TYPE_COLOR[card.card_type] || 'var(--dim)'
  return (
    <div className="kd-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <CardImage name={card.name} className="card-art" />
      <div style={{ padding: '.5rem .6rem' }}>
        <div className="kn">{card.name}</div>
        <div className="ke">{card.expansion}</div>
        <div style={{ fontSize: '.72rem', fontWeight: 600, color }}>{card.card_type}</div>
      </div>
    </div>
  )
}

function formatCost(card) {
  if (card.cost == null && !card.debt && !card.potion) return ''
  if (card.debt) return `${card.debt}D`
  if (card.potion) return `${card.cost ?? 0}P`
  return `${card.cost}`
}

function buildExportText(kingdom, extras, colonyPlatinum, colonyCard, platinumCard) {
  const lines = []
  lines.push('Ríkið:')
  for (const c of [...kingdom].sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))) {
    const cost = formatCost(c)
    lines.push(`  ${c.name}${cost ? ` (${cost})` : ''} — ${c.expansion}`)
  }
  if (extras.length > 0) {
    lines.push('')
    lines.push('Aukaleg:')
    for (const c of extras) {
      lines.push(`  ${c.name} [${c.card_type}] — ${c.expansion}`)
    }
  }
  if (colonyPlatinum && colonyCard && platinumCard) {
    lines.push('')
    lines.push('Velmegun: Colony & Platinum')
  }
  return lines.join('\n')
}

/** Build a map: playerName → { cardName → timesPlayed } */
function buildPlayerCardUsage(games) {
  const usage = {}
  for (const g of games) {
    const cardNames = (g.kingdom || []).map(k => k.card)
    for (const player of g.players) {
      if (!usage[player]) usage[player] = {}
      for (const card of cardNames) {
        usage[player][card] = (usage[player][card] || 0) + 1
      }
    }
  }
  return usage
}

/** Build a map: playerName → { expansion → timesPlayed } counting games where that expansion appeared */
function buildPlayerExpUsage(games) {
  const usage = {}
  for (const g of games) {
    const exps = new Set((g.kingdom || []).map(k => k.expansion).filter(Boolean))
    for (const player of g.players) {
      if (!usage[player]) usage[player] = {}
      for (const exp of exps) {
        usage[player][exp] = (usage[player][exp] || 0) + 1
      }
    }
  }
  return usage
}

export default function Suggester() {
  const { cards, expansions, games, players } = DATA
  const [mode, setMode] = useState('random')
  const [selectedExps, setSelectedExps] = useState([])
  const [kingdom, setKingdom] = useState([])
  const [extras, setExtras] = useState([])
  const [colonyPlatinum, setColonyPlatinum] = useState(false)
  const showPotions = useMemo(
    () => [...kingdom, ...extras].some(c => c.potion),
    [kingdom, extras]
  )
  const [selectedCard, setSelectedCard] = useState(null)
  const [copied, setCopied] = useState(false)

  // Filters
  const [noAttacks, setNoAttacks] = useState(false)
  const [noCurses, setNoCurses] = useState(false)

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [playerMode, setPlayerMode] = useState('unseen')

  const playerCardUsage = useMemo(() => buildPlayerCardUsage(games), [games])
  const playerExpUsage = useMemo(() => buildPlayerExpUsage(games), [games])

  const availablePlayers = useMemo(() =>
    [...players].sort((a, b) => b.games - a.games),
    [players]
  )

  const toggleExp = (e) => {
    setSelectedExps(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
  }

  const togglePlayer = (name) => {
    setSelectedPlayers(prev => {
      if (prev.includes(name)) return prev.filter(n => n !== name)
      if (prev.length >= 4) return prev
      return [...prev, name]
    })
  }

  const kingdomExpansions = useMemo(() => {
    if (!expansions.length) return []
    return expansions.filter(e => e !== 'Promo')
  }, [expansions])

  function generate() {
    const excludeCard = c =>
      (noAttacks && c.isAttack) || (noCurses && c.isCurseGiver)

    // Kingdom cards only
    const kingdomPool = cards.filter(c =>
      !c.removed &&
      !c.isSupplyCard &&
      (!c.card_type || c.card_type === 'Kingdom') &&
      (selectedExps.length === 0 || selectedExps.includes(c.expansion)) &&
      !excludeCard(c)
    )

    // Special/landscape cards as extras
    const extrasPool = cards.filter(c =>
      !c.removed &&
      SPECIAL_TYPES.has(c.card_type) &&
      (selectedExps.length === 0 || selectedExps.includes(c.expansion)) &&
      !excludeCard(c)
    )

    let candidates = [...kingdomPool]

    // Apply player-based filtering if advanced is active and players selected
    if (showAdvanced && selectedPlayers.length > 0) {
      if (playerMode === 'unseen') {
        // Cards that NONE of the selected players have ever played
        candidates = candidates.filter(c =>
          selectedPlayers.every(p => !(playerCardUsage[p]?.[c.name]))
        )
        // If not enough unseen cards, fall back to rarest
        if (candidates.length < 10) {
          candidates = [...kingdomPool]
          candidates.sort((a, b) => {
            const usageA = selectedPlayers.reduce((sum, p) => sum + (playerCardUsage[p]?.[a.name] || 0), 0)
            const usageB = selectedPlayers.reduce((sum, p) => sum + (playerCardUsage[p]?.[b.name] || 0), 0)
            return usageA - usageB
          })
          candidates = candidates.slice(0, 20)
        }
      } else if (playerMode === 'rare') {
        // Sort by combined usage across selected players (least played first)
        candidates.sort((a, b) => {
          const usageA = selectedPlayers.reduce((sum, p) => sum + (playerCardUsage[p]?.[a.name] || 0), 0)
          const usageB = selectedPlayers.reduce((sum, p) => sum + (playerCardUsage[p]?.[b.name] || 0), 0)
          return usageA - usageB
        })
        candidates = candidates.slice(0, 25)
      } else {
        // 'favorites' — sort by combined usage across selected players (most played first)
        candidates = candidates.filter(c =>
          selectedPlayers.some(p => (playerCardUsage[p]?.[c.name] || 0) > 0)
        )
        candidates.sort((a, b) => {
          const usageA = selectedPlayers.reduce((sum, p) => sum + (playerCardUsage[p]?.[a.name] || 0), 0)
          const usageB = selectedPlayers.reduce((sum, p) => sum + (playerCardUsage[p]?.[b.name] || 0), 0)
          return usageB - usageA
        })
        candidates = candidates.slice(0, 25)
      }
    } else {
      // Standard modes (no player filter)
      if (mode === 'least') {
        candidates.sort((a, b) => a.times_used - b.times_used)
        candidates = candidates.slice(0, 20)
      } else if (mode === 'favorites') {
        candidates.sort((a, b) => b.times_used - a.times_used)
        candidates = candidates.slice(0, 30)
      } else if (mode === 'balanced') {
        const half = Math.floor(candidates.length / 2)
        const leastUsed = [...candidates].sort((a, b) => a.times_used - b.times_used).slice(0, half)
        const mostUsed = [...candidates].sort((a, b) => b.times_used - a.times_used).slice(0, half)
        candidates = [...leastUsed.slice(0, 15), ...mostUsed.slice(0, 15)]
      }
    }

    // Always 10 kingdom cards — balanced across selected expansions
    let newKingdom
    const activeExps = [...new Set(candidates.map(c => c.expansion))]
    if (activeExps.length >= 2) {
      // Distribute slots roughly evenly, then fill remainder randomly
      const perExp = Math.floor(10 / activeExps.length)
      const remainder = 10 - perExp * activeExps.length
      const picked = []
      for (const exp of activeExps) {
        const pool = candidates.filter(c => c.expansion === exp)
        const shuffled = [...pool].sort(() => Math.random() - 0.5)
        picked.push(...shuffled.slice(0, perExp))
      }
      // Fill remaining slots from unused candidates
      const pickedNames = new Set(picked.map(c => c.name))
      const leftover = candidates.filter(c => !pickedNames.has(c.name))
      picked.push(...[...leftover].sort(() => Math.random() - 0.5).slice(0, remainder))
      newKingdom = [...picked].sort(() => Math.random() - 0.5).slice(0, 10)
    } else {
      newKingdom = [...candidates].sort(() => Math.random() - 0.5).slice(0, 10)
    }

    // 0, 1, or 2 extras (equal 1/3 chance each)
    let newExtras = []
    if (extrasPool.length > 0) {
      const roll = Math.random()
      const count = roll < 1/3 ? 0 : roll < 2/3 ? 1 : 2
      newExtras = [...extrasPool].sort(() => Math.random() - 0.5).slice(0, count)
    }

    // Colony + Platinum: 10% chance per Prosperity kingdom card
    const prosperityCount = newKingdom.filter(c => c.expansion === 'Prosperity').length
    const newColony = Math.random() < prosperityCount / 10

    setKingdom(newKingdom)
    setExtras(newExtras)
    setColonyPlatinum(newColony)
    setCopied(false)
  }

  const colonyCard = useMemo(() => cards.find(c => c.name === 'Colony'), [cards])
  const platinumCard = useMemo(() => cards.find(c => c.name === 'Platinum'), [cards])

  // Per-expansion stats for the selected player group
  const expStatsForPlayers = useMemo(() => {
    if (selectedPlayers.length === 0) return []
    const expList = expansions.filter(e => e !== 'Promo')
    return expList.map(exp => {
      const expCards = cards.filter(c =>
        !c.removed && !c.isSupplyCard &&
        (!c.card_type || c.card_type === 'Kingdom') &&
        c.expansion === exp
      )
      // Per-player breakdown
      const perPlayer = selectedPlayers.map(p => {
        const played = playerExpUsage[p]?.[exp] || 0
        const unseen = expCards.filter(c => !(playerCardUsage[p]?.[c.name])).length
        return { name: p, played, unseen }
      })
      // Total plays across all selected players
      const totalPlayed = perPlayer.reduce((sum, pp) => sum + pp.played, 0)
      // Cards unseen by ANY selected player (at least one hasn't seen it)
      const unseenByAny = expCards.filter(c =>
        selectedPlayers.some(p => !(playerCardUsage[p]?.[c.name]))
      ).length
      return { exp, cardCount: expCards.length, totalPlayed, unseenByAny, perPlayer }
    }).sort((a, b) => a.totalPlayed - b.totalPlayed)
  }, [selectedPlayers, expansions, cards, playerExpUsage, playerCardUsage])

  return (
    <section className="section active">
      <h2 className="section-title">Ríkistillögur</h2>

      <div className="sug-section">
        <h3>TEGUND TILLÖGU</h3>
        <div className="mode-grid">
          {MODES.map(m => (
            <button key={m.id} className={`mode-card${mode === m.id && !(showAdvanced && selectedPlayers.length > 0) ? ' selected' : ''}`} onClick={() => setMode(m.id)}>
              <div className="mi">{m.icon}</div>
              <div className="mn">{m.name}</div>
              <div className="md">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {!(showAdvanced && selectedPlayers.length > 0) && (
        <div className="sug-section">
          <h3>VIÐBÆTUR <span style={{ color: 'var(--dim)', fontWeight: 400, textTransform: 'none' }}>— skildu eftir ómerkt til að nota allar</span></h3>
          <div className="exp-checkboxes">
            {kingdomExpansions.map(e => (
              <label key={e} className="exp-check">
                <input
                  type="checkbox"
                  checked={selectedExps.includes(e)}
                  onChange={() => toggleExp(e)}
                />
                <span>{e}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="sug-section">
        <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
          <label className="exp-check" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <input type="checkbox" checked={noAttacks} onChange={() => setNoAttacks(v => !v)} />
            <span>Engin árásarspil</span>
          </label>
          <label className="exp-check" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <input type="checkbox" checked={noCurses} onChange={() => setNoCurses(v => !v)} />
            <span>Engar bölvanir</span>
          </label>
        </div>
      </div>

      {/* Advanced options */}
      <div className="sug-section">
        <button
          onClick={() => setShowAdvanced(v => !v)}
          style={{
            background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer',
            fontSize: '.85rem', fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: '.4rem',
          }}
        >
          <span style={{ fontSize: '.7rem' }}>{showAdvanced ? '▼' : '▶'}</span>
          ÍTARLEGRI VALKOSTIR
        </button>

        {showAdvanced && (
          <div style={{ marginTop: '.75rem' }}>
            <div style={{ fontSize: '.78rem', color: 'var(--dim)', marginBottom: '.5rem' }}>
              Veldu 1–4 sem taka þátt — veldu svo viðbætur og tegund
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.75rem' }}>
              {availablePlayers.map(p => (
                <button
                  key={p.name}
                  className={`chip${selectedPlayers.includes(p.name) ? ' active' : ''}`}
                  onClick={() => togglePlayer(p.name)}
                  style={selectedPlayers.includes(p.name) ? { background: 'rgba(201,168,76,.2)', borderColor: 'var(--gold)' } : {}}
                >
                  {p.name}
                  <span style={{ fontSize: '.68rem', color: 'var(--dim)', marginLeft: '.3rem' }}>({p.games})</span>
                </button>
              ))}
            </div>

            {selectedPlayers.length > 0 && (
              <>
                <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem', marginTop: '1rem' }}>
                  Viðbætur — raðað eftir minnstri reynslu
                </div>
                <div className="exp-checkboxes" style={{ marginBottom: '.75rem' }}>
                  {expStatsForPlayers.map(({ exp, cardCount, totalPlayed, unseenByAny, perPlayer }) => (
                    <label key={exp} className="exp-check" style={{ display: 'flex', alignItems: 'flex-start', gap: '.4rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedExps.includes(exp)}
                        onChange={() => toggleExp(exp)}
                        style={{ marginTop: '.2rem' }}
                      />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '.15rem' }}>
                        <span>{exp}</span>
                        <span style={{ fontSize: '.7rem', color: 'var(--dim)' }}>
                          {unseenByAny}/{cardCount} óséð · {perPlayer.map(pp =>
                            `${pp.name.split(' ')[0]} ${pp.played}x`
                          ).join(', ')}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>

                <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>
                  Tegund
                </div>
                <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem' }}>
                  {PLAYER_MODES.map(m => (
                    <button
                      key={m.id}
                      className={`mode-card${playerMode === m.id ? ' selected' : ''}`}
                      onClick={() => setPlayerMode(m.id)}
                      style={{ flex: 1, padding: '.6rem .8rem' }}
                    >
                      <div className="mn" style={{ fontSize: '.85rem' }}>{m.name}</div>
                      <div className="md" style={{ fontSize: '.72rem' }}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="gen-btn" onClick={generate}>Búa til ríki</button>
        {kingdom.length > 0 && (
          <button
            className="gen-btn"
            style={{ background: copied ? 'var(--green, #3fb950)' : 'var(--bg3)', color: copied ? '#fff' : 'var(--text)' }}
            onClick={() => {
              const text = buildExportText(kingdom, extras, colonyPlatinum, colonyCard, platinumCard)
              navigator.clipboard.writeText(text).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              })
            }}
          >
            {copied ? 'Afritað!' : 'Afrita lista'}
          </button>
        )}
      </div>

      {kingdom.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>

          {/* Potion reminder */}
          {showPotions && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Seyðabrunnur — 16 í birgðum
              </div>
            </div>
          )}

          {/* 10 Kingdom Cards */}
          <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
            Ríkið — {kingdom.length} spil
          </div>
          <div className="kingdom-display">
            {kingdom.map(card => (
              <KingdomCard key={card.name} card={card} onClick={() => setSelectedCard(card)} />
            ))}
          </div>

          {/* Extras */}
          {extras.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
                Aukaleg — {extras.length} {extras.length === 1 ? 'spil' : 'spil'}
              </div>
              <div className="kingdom-display">
                {extras.map(card => (
                  <ExtraCard key={card.name} card={card} onClick={() => setSelectedCard(card)} />
                ))}
              </div>
            </div>
          )}

          {/* Colony + Platinum */}
          {colonyPlatinum && colonyCard && platinumCard && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
                Velmegun — Colony &amp; Platinum
              </div>
              <div className="kingdom-display">
                {[colonyCard, platinumCard].map(card => (
                  <KingdomCard key={card.name} card={card} onClick={() => setSelectedCard(card)} />
                ))}
              </div>
            </div>
          )}


        </div>
      )}

      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </section>
  )
}
