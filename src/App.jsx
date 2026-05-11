import { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import Header from './components/Header'
import Nav from './components/Nav'
import { TABS } from './constants'

const Dashboard = lazy(() => import('./tabs/Dashboard'))
const Players = lazy(() => import('./tabs/Players'))
const PlayerPage = lazy(() => import('./tabs/PlayerPage'))
const Cards = lazy(() => import('./tabs/Cards'))
const Expansions = lazy(() => import('./tabs/Expansions'))
const History = lazy(() => import('./tabs/History'))
const FunFacts = lazy(() => import('./tabs/FunFacts'))
const Afrek = lazy(() => import('./tabs/Afrek'))
const Suggester = lazy(() => import('./tabs/Suggester'))

const VALID_TABS = new Set(TABS.map(t => t.id))

function parseHash() {
  const raw = window.location.hash.slice(1)
  const [head, sub] = raw.split('/')
  const tab = VALID_TABS.has(head) ? head : 'dashboard'
  const playerName = head === 'players' && sub ? decodeURIComponent(sub) : null
  return { tab, playerName }
}

function Loading() {
  return (
    <section className="section active" style={{ textAlign: 'center', paddingTop: '4rem', color: 'var(--dim)' }}>
      Loading...
    </section>
  )
}

export default function App() {
  const [route, setRoute] = useState(parseHash)
  const activeTab = route.tab
  const viewPlayerName = route.playerName
  const [targetGame, setTargetGame] = useState(null)
  const [targetExpansion, setTargetExpansion] = useState(null)

  const navigateTo = useCallback((tab) => {
    window.location.hash = tab
  }, [])

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleGameNav = useCallback((gameNum) => {
    setTargetGame(gameNum)
    navigateTo('history')
  }, [navigateTo])

  const handleExpansionCards = useCallback((expansion) => {
    setTargetExpansion(expansion)
    navigateTo('cards')
  }, [navigateTo])

  const clearTarget = useCallback(() => setTargetGame(null), [])
  const clearExpansion = useCallback(() => setTargetExpansion(null), [])

  return (
    <>
      <Header />
      <Nav active={activeTab} onSelect={navigateTo} />
      <main>
        <Suspense fallback={<Loading />}>
          {activeTab === 'dashboard' && <Dashboard onGameNav={handleGameNav} />}
          {activeTab === 'players' && (viewPlayerName
            ? <PlayerPage playerName={viewPlayerName} />
            : <Players />)}
          {activeTab === 'cards' && <Cards initialExpansion={targetExpansion} onClearExpansion={clearExpansion} />}
          {activeTab === 'expansions' && <Expansions onNavigateCards={handleExpansionCards} />}
          {activeTab === 'history' && <History targetGame={targetGame} onClearTarget={clearTarget} />}
          {activeTab === 'funfacts' && <FunFacts onGameNav={handleGameNav} />}
          {activeTab === 'afrek' && <Afrek />}
          {activeTab === 'suggester' && <Suggester />}
        </Suspense>
      </main>
    </>
  )
}
