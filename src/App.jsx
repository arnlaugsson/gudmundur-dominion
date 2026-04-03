import { useState, Suspense, lazy, useCallback } from 'react'
import Header from './components/Header'
import Nav from './components/Nav'

const Dashboard = lazy(() => import('./tabs/Dashboard'))
const Players = lazy(() => import('./tabs/Players'))
const Cards = lazy(() => import('./tabs/Cards'))
const Expansions = lazy(() => import('./tabs/Expansions'))
const History = lazy(() => import('./tabs/History'))
const FunFacts = lazy(() => import('./tabs/FunFacts'))
const Suggester = lazy(() => import('./tabs/Suggester'))

function Loading() {
  return (
    <section className="section active" style={{ textAlign: 'center', paddingTop: '4rem', color: 'var(--dim)' }}>
      Loading...
    </section>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [targetGame, setTargetGame] = useState(null)
  const [targetExpansion, setTargetExpansion] = useState(null)

  const handleGameNav = useCallback((gameNum) => {
    setTargetGame(gameNum)
    setActiveTab('history')
  }, [])

  const handleExpansionCards = useCallback((expansion) => {
    setTargetExpansion(expansion)
    setActiveTab('cards')
  }, [])

  const clearTarget = useCallback(() => setTargetGame(null), [])
  const clearExpansion = useCallback(() => setTargetExpansion(null), [])

  return (
    <>
      <Header />
      <Nav active={activeTab} onSelect={setActiveTab} />
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
