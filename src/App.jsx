import { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import Header from './components/Header'
import Nav from './components/Nav'
import { TABS } from './constants'
import { parseRoute, navigate, openModalRoute, closeModalRoute } from './lib/route'

const Dashboard = lazy(() => import('./tabs/Dashboard'))
const Players = lazy(() => import('./tabs/Players'))
const PlayerPage = lazy(() => import('./tabs/PlayerPage'))
const Cards = lazy(() => import('./tabs/Cards'))
const Expansions = lazy(() => import('./tabs/Expansions'))
const History = lazy(() => import('./tabs/History'))
const FunFacts = lazy(() => import('./tabs/FunFacts'))
const Afrek = lazy(() => import('./tabs/Afrek'))
const Suggester = lazy(() => import('./tabs/Suggester'))
const YearInReview = lazy(() => import('./tabs/YearInReview'))

const VALID_TABS = new Set(TABS.map(t => t.id))
const currentRoute = () => parseRoute(window.location.hash, VALID_TABS)

function TabLoading() {
  return (
    <section className="section active" aria-busy="true">
      <div className="skeleton-block skeleton-panel" />
    </section>
  )
}

function useRoute() {
  const [route, setRoute] = useState(currentRoute)
  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return route
}

export default function App() {
  const { tab, sub } = useRoute()
  const [targetExpansion, setTargetExpansion] = useState(null)

  const selectTab = useCallback(id => navigate(id), [])
  // Modals live in the URL; closing steps back (or replaces a deep-link
  // entry) so Back never reopens a closed modal.
  const openGame = useCallback(num => (num == null ? closeModalRoute('history') : openModalRoute('history', num)), [])
  const openCard = useCallback(name => (name == null ? closeModalRoute('cards') : openModalRoute('cards', name)), [])
  const openExpansionCards = useCallback((expansion) => {
    setTargetExpansion(expansion)
    navigate('cards')
  }, [])
  const clearExpansion = useCallback(() => setTargetExpansion(null), [])

  return (
    <>
      <Header />
      <Nav active={tab} onSelect={selectTab} />
      <main id="main">
        <Suspense fallback={<TabLoading />}>
          {tab === 'dashboard' && <Dashboard onGameNav={openGame} />}
          {tab === 'players' && (sub ? <PlayerPage playerName={sub} /> : <Players />)}
          {tab === 'cards' && (
            <Cards
              initialExpansion={targetExpansion}
              onClearExpansion={clearExpansion}
              cardName={sub}
              onSelectCard={openCard}
            />
          )}
          {tab === 'expansions' && <Expansions onNavigateCards={openExpansionCards} />}
          {tab === 'history' && <History gameNum={sub} onSelectGame={openGame} />}
          {tab === 'funfacts' && <FunFacts onGameNav={openGame} />}
          {tab === 'afrek' && <Afrek />}
          {tab === 'suggester' && <Suggester />}
          {tab === 'arid' && <YearInReview sub={sub} />}
        </Suspense>
      </main>
    </>
  )
}
