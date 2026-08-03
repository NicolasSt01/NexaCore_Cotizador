"use client"

import { useEffect, useRef } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js"
import { useTheme } from "next-themes"

ChartJS.register(CategoryScale, LinearScale, LineController, PointElement, LineElement, Title, Tooltip, Filler)

interface MonthlyData {
  month: string
  total: number
  count: number
}

interface Props {
  data: MonthlyData[]
}

export function ChartMonthly({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartJS | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!canvasRef.current) return

    if (chartRef.current) chartRef.current.destroy()

    const isDark = theme === "dark"

    chartRef.current = new ChartJS(canvasRef.current, {
      type: "line",
      data: {
        labels: data.map((d) => d.month),
        datasets: [
          {
            label: "Monto cotizado",
            data: data.map((d) => d.total),
            borderColor: "#006C99",
            backgroundColor: "rgba(0, 108, 153, 0.08)",
            fill: true,
            tension: 0.3,
            pointBackgroundColor: "#006C99",
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? "#1A2640" : "#FFFFFF",
            titleColor: isDark ? "#FFFFFF" : "#03060F",
            bodyColor: isDark ? "#C7D2E4" : "#5C6B84",
            callbacks: {
              label: (ctx) => `$${Number(ctx.raw).toLocaleString("es-MX")}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(3,6,15,0.06)" },
            ticks: { color: isDark ? "#7A8AA3" : "#5C6B84" },
          },
          y: {
            grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(3,6,15,0.06)" },
            ticks: {
              color: isDark ? "#7A8AA3" : "#5C6B84",
              callback: (val) => `$${Number(val).toLocaleString("es-MX")}`,
            },
          },
        },
      },
    })

    return () => {
      if (chartRef.current) chartRef.current.destroy()
    }
  }, [data, theme])

  return (
    <div className="h-64">
      <canvas ref={canvasRef} />
    </div>
  )
}
