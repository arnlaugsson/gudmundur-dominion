import { useState, Suspense, lazy, useCallback } from 'react'
import Header from './components/Header'
import Nav from './components/Nav'

const Dashboard = lazy(() => import('./tabs/Dashboard'))
const Players = lazy(() => import('./tabs/Players'))
const Cards = lazy(() => import('./tabs/Cards'))
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

  const handleGameNav = useCallback((gameNum) => {
    setTargetGame(gameNum)
    setActiveTab('history')
  }, [])

  const clearTarget = useCallback(() => setTargetGame(null), [])

  return (
    <>
      <Header />
      <Nav active={activeTab} onSelect={setActiveTab} />
      <main>
        <Suspense fallback={<Loading />}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'players' && <Players />}
          {activeTab === 'cards' && <Cards />}
          {activeTab === 'history' && <History targetGame={targetGame} onClearTarget={clearTarget} />}
          {activeTab === 'funfacts' && <FunFacts onGameNav={handleGameNav} />}
          {activeTab === 'suggester' && <Suggester />}
        </Suspense>
      </main>
    </>
  )
}
