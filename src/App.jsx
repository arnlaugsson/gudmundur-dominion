import { useState, Suspense, lazy } from 'react'
import Header from './components/Header'
import Nav from './components/Nav'

const Dashboard = lazy(() => import('./tabs/Dashboard'))
const Players = lazy(() => import('./tabs/Players'))
const Cards = lazy(() => import('./tabs/Cards'))
const History = lazy(() => import('./tabs/History'))
const FunFacts = lazy(() => import('./tabs/FunFacts'))
const Suggester = lazy(() => import('./tabs/Suggester'))

const TAB_COMPONENTS = {
  dashboard: Dashboard,
  players: Players,
  cards: Cards,
  history: History,
  funfacts: FunFacts,
  suggester: Suggester,
}

function Loading() {
  return (
    <section className="section active" style={{ textAlign: 'center', paddingTop: '4rem', color: 'var(--dim)' }}>
      Loading...
    </section>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const TabComponent = TAB_COMPONENTS[activeTab]

  return (
    <>
      <Header />
      <Nav active={activeTab} onSelect={setActiveTab} />
      <main>
        <Suspense fallback={<Loading />}>
          <TabComponent />
        </Suspense>
      </main>
    </>
  )
}
