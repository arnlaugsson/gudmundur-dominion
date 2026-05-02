import { useState, useMemo, useEffect, useRef } from 'react'
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

// Subtypes not exposed in the card data. Liaisons summon an Ally; Omens summon a Prophecy.
const LIAISON_NAMES = new Set([
  'Bauble', 'Sycophant', 'Importer', 'Underling', 'Broker', 'Contract',
  'Emissary', 'Galleria', 'Guildmaster', 'Wizards', 'Hunter', 'Modify',
  'Specialist', 'Swap',
])
const OMEN_NAMES = new Set([
  'Aristocrat', 'Artist', 'Daimyo', 'Gold mine', 'Imperial envoy',
  'Mountain shrine', 'Snake witch', 'Tanuki',
])

function pickRandom(arr, n) {
  if (arr.length === 0 || n <= 0) return []
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length))
}

function pickLandscapeCards(extrasPool, kingdom) {
  const byType = { Event: [], Landmark: [], Project: [], Way: [], Trait: [], Ally: [], Prophecy: [] }
  for (const c of extrasPool) {
    if (byType[c.card_type]) byType[c.card_type].push(c)
  }

  const picked = []

  // Always include 1 Way (kingdom-wide modifier from Menagerie) if any are available
  picked.push(...pickRandom(byType.Way, 1))

  // Always include 1 Trait (attaches to a Kingdom pile, from Plunder) if any are available.
  // The trait modifies a single Kingdom pile per Dominion's Plunder rules — pair it with a
  // random kingdom card so the suggestion specifies which pile.
  const traitPicks = pickRandom(byType.Trait, 1)
  if (traitPicks.length > 0 && kingdom.length > 0) {
    const target = kingdom[Math.floor(Math.random() * kingdom.length)]
    picked.push({ ...traitPicks[0], _attachedCard: target.name })
  } else {
    picked.push(...traitPicks)
  }

  // 1 Ally only if the kingdom contains a Liaison (Allies expansion rule)
  if (kingdom.some(c => LIAISON_NAMES.has(c.name))) {
    picked.push(...pickRandom(byType.Ally, 1))
  }

  // 1 Prophecy only if the kingdom contains an Omen (Rising Sun rule)
  if (kingdom.some(c => OMEN_NAMES.has(c.name))) {
    picked.push(...pickRandom(byType.Prophecy, 1))
  }

  // 1–2 from Event/Landmark/Project combined (Dominion's standard 0–2 cap, biased toward inclusion)
  const elp = [...byType.Event, ...byType.Landmark, ...byType.Project]
  if (elp.length > 0) {
    const count = Math.random() < 0.5 ? 1 : 2
    picked.push(...pickRandom(elp, count))
  }

  return picked
}

const PLAYER_MODES = [
  { id: 'unseen',    name: 'Óspilað',    desc: 'Spil sem valdir hafa aldrei séð' },
  { id: 'rare',      name: 'Sjaldséð',   desc: 'Spil sem valdir hafa sjaldnast spilað' },
  { id: 'favorites', name: 'Uppáhald',   desc: 'Spil sem valdir spila oftast' },
]

function CostBadge({ card }) {
  if (card.cost == null && !card.debt && !card.potion) return null
  if (card.debt) return <span className="coin debt">{card.debt}D</span>
  if (card.potion) return <><span className="coin">{card.cost ?? 0}</span><span className="coin potion">S</span></>
  return <span className="coin">{card.cost}</span>
}

function KingdomCard({ card, attachedTrait, onClick }) {
  return (
    <div
      className={`kd-card${attachedTrait ? ' kd-card-trait' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <CardImage name={card.name} className="card-art" />
      <div style={{ padding: '.5rem .6rem' }}>
        <div className="kn" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
          {card.name}
          {card.isSecondEdition && <span className="tag tag-2nd">2nd Ed.</span>}
          {attachedTrait && <span className="trait-pill">✨ {attachedTrait.name}</span>}
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
  if (card.potion) return `${card.cost ?? 0}S`
  return `${card.cost}`
}

function formatColonyPlatinumLabel(playerCount) {
  const colonyCount = playerCount >= 2 ? (playerCount === 2 ? 8 : 12) : null
  const colonyLabel = colonyCount != null ? `Colony (${colonyCount})` : 'Colony (2 í leik: 8, 3-4 í leik: 12)'
  return `${colonyLabel} & Platinum (12)`
}

function buildExportText(kingdom, extras, colonyPlatinum, colonyCard, platinumCard, playerCount) {
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
      const attached = c._attachedCard ? ` → ${c._attachedCard}` : ''
      lines.push(`  ${c.name} [${c.card_type}]${attached} — ${c.expansion}`)
    }
  }
  if (colonyPlatinum && colonyCard && platinumCard) {
    lines.push('')
    lines.push(`Velmegun: ${formatColonyPlatinumLabel(playerCount)}`)
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
  const [customRatios, setCustomRatios] = useState({})
  const [kingdom, setKingdom] = useState([])
  const [extras, setExtras] = useState([])
  const [colonyPlatinum, setColonyPlatinum] = useState(false)
  const showPotions = useMemo(
    () => [...kingdom, ...extras].some(c => c.potion),
    [kingdom, extras]
  )
  const [showCurses, setShowCurses] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [copied, setCopied] = useState(false)

  // Random expansion count
  const [randomExpCount, setRandomExpCount] = useState(2)

  // Filters
  const [noAttacks, setNoAttacks] = useState(false)
  const [noCurses, setNoCurses] = useState(false)
  const [noTokens, setNoTokens] = useState(false)

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
    const next = selectedExps.includes(e)
      ? selectedExps.filter(x => x !== e)
      : [...selectedExps, e]

    setSelectedExps(next)

    if (next.length >= 2) {
      const per = Math.floor(10 / next.length)
      const rem = 10 - per * next.length
      const ratios = {}
      next.forEach((exp, i) => { ratios[exp] = per + (i < rem ? 1 : 0) })
      setCustomRatios(ratios)
    } else {
      setCustomRatios({})
    }
  }

  const updateRatio = (exp, raw) => {
    const value = raw === '' ? '' : Math.min(10, parseInt(raw) || 0)
    setCustomRatios(prev => ({ ...prev, [exp]: value }))
  }

  const ratioTotal = useMemo(() =>
    Object.values(customRatios).reduce((sum, v) => sum + (parseInt(v) || 0), 0),
    [customRatios]
  )

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

  const autoGenerateRef = useRef(false)

  useEffect(() => {
    if (autoGenerateRef.current) {
      autoGenerateRef.current = false
      generate()
    }
  }) // runs after every render — only fires when flag is set

  function generateRandomExps() {
    const count = Math.max(1, Math.min(randomExpCount, kingdomExpansions.length))
    const shuffled = [...kingdomExpansions].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, count)
    setSelectedExps(picked)
    if (picked.length >= 2) {
      const per = Math.floor(10 / picked.length)
      const rem = 10 - per * picked.length
      const ratios = {}
      picked.forEach((exp, i) => { ratios[exp] = per + (i < rem ? 1 : 0) })
      setCustomRatios(ratios)
    } else {
      setCustomRatios({})
    }
    autoGenerateRef.current = true
  }

  function generate() {
    const excludeCard = c =>
      (noAttacks && c.isAttack) || (noCurses && c.isCurseGiver) || (noTokens && c.isTokenCard)

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

    // Always 10 kingdom cards — use custom ratios or balanced split
    let newKingdom
    const activeExps = [...new Set(candidates.map(c => c.expansion))]
    const hasCustomRatios = selectedExps.length >= 2 && Object.keys(customRatios).length > 0
    if (hasCustomRatios && ratioTotal === 10) {
      const picked = []
      for (const exp of selectedExps) {
        const count = parseInt(customRatios[exp]) || 0
        if (count === 0) continue
        const pool = candidates.filter(c => c.expansion === exp)
        picked.push(...[...pool].sort(() => Math.random() - 0.5).slice(0, count))
      }
      // Backfill if any expansion couldn't fill its quota
      if (picked.length < 10) {
        const pickedNames = new Set(picked.map(c => c.name))
        const leftover = candidates.filter(c => !pickedNames.has(c.name))
        picked.push(...[...leftover].sort(() => Math.random() - 0.5).slice(0, 10 - picked.length))
      }
      newKingdom = [...picked].sort(() => Math.random() - 0.5).slice(0, 10)
    } else if (activeExps.length >= 2) {
      const perExp = Math.floor(10 / activeExps.length)
      const remainder = 10 - perExp * activeExps.length
      const picked = []
      for (const exp of activeExps) {
        const pool = candidates.filter(c => c.expansion === exp)
        picked.push(...[...pool].sort(() => Math.random() - 0.5).slice(0, perExp))
      }
      // Backfill remainder from any expansion
      const pickedNames = new Set(picked.map(c => c.name))
      const leftover = candidates.filter(c => !pickedNames.has(c.name))
      picked.push(...[...leftover].sort(() => Math.random() - 0.5).slice(0, 10 - picked.length))
      newKingdom = [...picked].sort(() => Math.random() - 0.5).slice(0, 10)
    } else {
      newKingdom = [...candidates].sort(() => Math.random() - 0.5).slice(0, 10)
    }

    // Landscape cards: pick by Dominion setup rules (Way/Trait/Event/Landmark/Project always
    // when available; Ally and Prophecy only when triggered by a Liaison or Omen in the kingdom).
    const newExtras = pickLandscapeCards(extrasPool, newKingdom)

    // Colony + Platinum: 10% chance per Prosperity kingdom card
    const prosperityCount = newKingdom.filter(c => c.expansion === 'Prosperity').length
    const newColony = Math.random() < prosperityCount / 10

    const hasCurseGiver = [...newKingdom, ...newExtras].some(c => c.isCurseGiver)

    setKingdom(newKingdom)
    setExtras(newExtras)
    setColonyPlatinum(newColony)
    setShowCurses(hasCurseGiver)
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
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.75rem' }}>
            <span style={{ fontSize: '.78rem', color: 'var(--dim)' }}>Handahófskenndar:</span>
            <input
              type="number"
              min={1}
              max={kingdomExpansions.length}
              value={randomExpCount}
              onFocus={e => e.target.select()}
              onChange={e => {
                const raw = e.target.value
                if (raw === '') { setRandomExpCount(''); return }
                const num = parseInt(raw)
                if (!isNaN(num)) setRandomExpCount(Math.min(kingdomExpansions.length, num))
              }}
              onBlur={() => { if (randomExpCount === '' || randomExpCount < 1) setRandomExpCount(1) }}
              style={{
                width: '3rem', textAlign: 'center', background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)',
                fontSize: '.82rem', padding: '.25rem', fontFamily: 'inherit',
              }}
            />
            <button
              className="gen-btn"
              style={{ fontSize: '.78rem', padding: '.35rem .75rem' }}
              onClick={() => { generateRandomExps() }}
            >
              Velja {randomExpCount || '?'} og búa til ríki
            </button>
          </div>
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

          {selectedExps.length >= 2 && (
            <div style={{ marginTop: '.75rem' }}>
              <div style={{ fontSize: '.72rem', color: 'var(--dim)', marginBottom: '.4rem' }}>
                Fjöldi korta per viðbót (samtals: <span style={{ color: ratioTotal === 10 ? 'var(--green, #3fb950)' : 'var(--red, #f85149)', fontWeight: 600 }}>{ratioTotal}/10</span>)
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {selectedExps.map(exp => (
                  <div key={exp} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', background: 'var(--bg3)', borderRadius: '6px', padding: '.25rem .5rem' }}>
                    <span id={`exp-ratio-label-${exp}`} style={{ fontSize: '.75rem' }}>{exp}</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      aria-labelledby={`exp-ratio-label-${exp}`}
                      value={customRatios[exp] ?? ''}
                      onChange={e => updateRatio(exp, e.target.value)}
                      style={{
                        width: '2.5rem', textAlign: 'center', background: 'var(--bg)',
                        border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)',
                        fontSize: '.78rem', padding: '.15rem', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
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
          <label className="exp-check" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <input type="checkbox" checked={noTokens} onChange={() => setNoTokens(v => !v)} />
            <span>Engin souls</span>
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

                {selectedExps.length >= 2 && (
                  <div style={{ marginBottom: '.75rem' }}>
                    <div style={{ fontSize: '.72rem', color: 'var(--dim)', marginBottom: '.4rem' }}>
                      Fjöldi korta per viðbót (samtals: <span style={{ color: ratioTotal === 10 ? 'var(--green, #3fb950)' : 'var(--red, #f85149)', fontWeight: 600 }}>{ratioTotal}/10</span>)
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {selectedExps.map(exp => (
                        <div key={exp} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', background: 'var(--bg3)', borderRadius: '6px', padding: '.25rem .5rem' }}>
                          <span id={`exp-ratio-adv-${exp}`} style={{ fontSize: '.75rem' }}>{exp}</span>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            aria-labelledby={`exp-ratio-adv-${exp}`}
                            value={customRatios[exp] ?? ''}
                            onChange={e => updateRatio(exp, e.target.value)}
                            style={{
                              width: '2.5rem', textAlign: 'center', background: 'var(--bg)',
                              border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)',
                              fontSize: '.78rem', padding: '.15rem', fontFamily: 'inherit',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
        <button
          className="gen-btn"
          onClick={generate}
          disabled={selectedExps.length >= 2 && ratioTotal !== 10}
          style={selectedExps.length >= 2 && ratioTotal !== 10 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
        >
          Búa til ríki
        </button>
        {kingdom.length > 0 && (
          <button
            className="gen-btn"
            style={{ background: copied ? 'var(--green, #3fb950)' : 'var(--bg3)', color: copied ? '#fff' : 'var(--text)' }}
            onClick={() => {
              const text = buildExportText(kingdom, extras, colonyPlatinum, colonyCard, platinumCard, showAdvanced ? selectedPlayers.length : 0)
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

          {/* Seyði reminder */}
          {showPotions && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Seyðabrunnur — 16 í birgðum
              </div>
            </div>
          )}

          {/* Curse pile reminder */}
          {showCurses && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {showAdvanced && selectedPlayers.length >= 2
                  ? `Bölvanir — ${(selectedPlayers.length - 1) * 10} í birgðum (${selectedPlayers.length} í leik)`
                  : 'Bölvanir — 2 í leik: 10 · 3 í leik: 20 · 4 í leik: 30'}
              </div>
            </div>
          )}

          {/* Colony + Platinum count reminder */}
          {colonyPlatinum && colonyCard && platinumCard && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Velmegun — {formatColonyPlatinumLabel(showAdvanced ? selectedPlayers.length : 0)}
              </div>
            </div>
          )}

          {/* 10 Kingdom Cards */}
          <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
            Ríkið — {kingdom.length} spil
          </div>
          <div className="kingdom-display">
            {kingdom.map(card => {
              const attachedTrait = extras.find(e => e.card_type === 'Trait' && e._attachedCard === card.name)
              return (
                <KingdomCard
                  key={card.name}
                  card={card}
                  attachedTrait={attachedTrait}
                  onClick={() => setSelectedCard(card)}
                />
              )
            })}
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
