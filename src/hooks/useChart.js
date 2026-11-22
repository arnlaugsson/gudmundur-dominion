import { useRef, useEffect } from 'react'
import {
  Chart, BarController, LineController, DoughnutController, PieController,
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Legend, Tooltip,
} from 'chart.js'

// Register only what the dashboard/player charts use (bar, line, doughnut,
// pie) instead of chart.js/auto, which pulls in every chart type and plugin.
Chart.register(
  BarController, LineController, DoughnutController, PieController,
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Legend, Tooltip,
)

export default function useChart(config, deps = []) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return undefined
    chartRef.current?.destroy()
    const cfg = typeof config === 'function' ? config() : config
    if (!cfg) return undefined
    chartRef.current = new Chart(canvasRef.current, cfg)
    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return canvasRef
}
