import useChart from '../hooks/useChart'
import DATA from '../data'
import { ratingHistoryChart } from '../lib/ratingCharts'
import RatingInfo from './RatingInfo'

export default function PlayerRatingChart({ player }) {
  const ref = useChart(() => {
    const myGames = new Set(player.history.map(h => h.game_num))
    return ratingHistoryChart([player], DATA.games.filter(g => myGames.has(g.game_num)))
  }, [player.name])
  return (
    <div className="chart-box" style={{ marginBottom: '1.25rem' }}>
      <h3>STYRKLEIKI YFIR TÍMA</h3>
      <canvas ref={ref} />
      <RatingInfo />
    </div>
  )
}
