import { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import Header from './components/Header'
import Nav from './components/Nav'
import { TABS } from './constants'

const Dashboard = lazy(() => import('./tabs/Dashboard'))
const Players = lazy(() => import('./tabs/Players'))
const Cards = lazy(() => import('./tabs/Cards'))
const Expansions = lazy(() => import('./tabs/Expansions'))
const History = lazy(() => import('./tabs/History'))
const FunFacts = lazy(() => import('./tabs/FunFacts'))
const Suggester = lazy(() => import('./tabs/Suggester'))

const VALID_TABS = new Set(TABS.map(t => t.id))

function getTabFromHash() {
  const hash = window.location.hash.slice(1)
  return VALID_TABS.has(hash) ? hash : 'dashboard'
}

function Loading() {
  return (
    <section className="section active" style={{ textAlign: 'center', paddingTop: '4rem', color: 'var(--dim)' }}>
      Loading...
    </section>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState(getTabFromHash)
  const [targetGame, setTargetGame] = useState(null)
  const [targetExpansion, setTargetExpansion] = useState(null)

  const navigateTo = useCallback((tab) => {
    window.location.hash = tab
  }, [])

  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash())
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
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'players' && <Players />}
          {activeTab === 'cards' && <Cards initialExpansion={targetExpansion} onClearExpansion={clearExpansion} />}
          {activeTab === 'expansions' && <Expansions onNavigateCards={handleExpansionCards} />}
          {activeTab === 'history' && <History targetGame={targetGame} onClearTarget={clearTarget} />}
          {activeTab === 'funfacts' && <FunFacts onGameNav={handleGameNav} />}
          {activeTab === 'suggester' && <Suggester />}
        </Suspense>
      </main>
    </>
  )
}
