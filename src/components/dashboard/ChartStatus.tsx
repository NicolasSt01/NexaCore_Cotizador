"use client"

import { useEffect, useRef } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js"
import { useTheme } from "next-themes"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)

interface Props {
  data: { status: string; count: number }[]
}

const STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  vista: "Vista",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  convertida: "Convertida",
  cancelada: "Cancelada",
}

const STATUS_COLORS: Record<string, string> = {
  borrador: "#7A8AA3",
  enviada: "#006C99",
  vista: "#EA580C",
  aprobada: "#059669",
  rechazada: "#DC2626",
  convertida: "#059669",
  cancelada: "#5C6B84",
}

export function ChartStatus({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartJS | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!canvasRef.current) return

    if (chartRef.current) chartRef.current.destroy()

    const sorted = [...data].sort((a, b) => b.count - a.count)
    const isDark = theme === "dark"

    chartRef.current = new ChartJS(canvasRef.current, {
      type: "bar",
      data: {
        labels: sorted.map((d) => STATUS_LABELS[d.status] || d.status),
        datasets: [
          {
            label: "Cotizaciones",
            data: sorted.map((d) => d.count),
            backgroundColor: sorted.map((d) => STATUS_COLORS[d.status] || "#7A8AA3"),
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? "#1A2640" : "#FFFFFF",
            titleColor: isDark ? "#FFFFFF" : "#03060F",
            bodyColor: isDark ? "#C7D2E4" : "#5C6B84",
          },
        },
        scales: {
          x: {
            grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(3,6,15,0.06)" },
            ticks: { color: isDark ? "#7A8AA3" : "#5C6B84" },
          },
          y: {
            grid: { display: false },
            ticks: { color: isDark ? "#C7D2E4" : "#1F3A78", font: { size: 12 } },
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
