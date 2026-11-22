import { useMemo } from 'react'
import DATA from '../data'
import { useAuth } from '../context/AuthContext'
import { usePublicStories } from '../hooks/usePublicStories'
import { availableYears } from '../lib/yearInReview'
import { parseYearSub, yearHash } from '../lib/yearRoute'
import { canViewStory } from '../lib/storyAccess'
import { closeModalRoute } from '../lib/route'
import LoginGate from '../components/LoginGate'
import YearInReview, { PlayerStory } from './YearInReview'

function Loading() {
  return (
    <section className="section active" aria-busy="true">
      <div className="skeleton-block skeleton-panel" />
    </section>
  )
}

// Guests: login prompt, plus links to the stories players chose to share.
function GuestLanding({ year, publicNames, login, authError }) {
  const shared = [...publicNames].sort((a, b) => a.localeCompare(b, 'is'))
  return (
    <>
      <LoginGate allowed={false} loading={false} onLogin={login} error={authError} title="Árið er fyrir meðlimi" />
      {shared.length > 0 && (
        <section className="section active public-stories">
          <h3 className="wrapped-subtitle">Opinber ár</h3>
          <p>Þessir leikmenn hafa leyft öllum að sjá árið sitt:</p>
          <ul>
            {shared.map(name => <li key={name}><a href={`#${yearHash(year, name)}`}>{name}</a></li>)}
          </ul>
        </section>
      )}
    </>
  )
}

export default function YearInReviewRoute({ sub }) {
  const { user, loading: authLoading, login, authError } = useAuth()
  const { names: publicNames, loading: publicLoading, error: shareError, setPublic } = usePublicStories()
  const years = useMemo(() => availableYears(DATA.games), [])
  const { year, story } = parseYearSub(sub, years)
  const isMember = !!user?.allowed

  if (isMember) {
    return <YearInReview sub={sub} publicNames={publicNames} myName={user.playerName} onSetPublic={setPublic} shareError={shareError} />
  }
  if (authLoading || publicLoading) return <Loading />
  if (year != null && canViewStory({ isMember, story, publicNames })) {
    return (
      <section className="section active">
        <PlayerStory key={`${year}/${story}`} year={year} name={story} onClose={() => closeModalRoute('arid', String(year))} />
      </section>
    )
  }
  return <GuestLanding year={year} publicNames={publicNames} login={login} authError={authError} />
}
