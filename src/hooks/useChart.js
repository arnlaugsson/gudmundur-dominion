import { useRef, useEffect } from 'react'
import Chart from 'chart.js/auto'

export default function useChart(config, deps = []) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) {
      chartRef.current.destroy()
    }
    const cfg = typeof config === 'function' ? config() : config
    if (!cfg) return
    chartRef.current = new Chart(canvasRef.current, cfg)
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return canvasRef
}
