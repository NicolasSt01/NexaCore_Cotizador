import type { ReactNode } from "react"

interface BadgeProps {
  children: ReactNode
  variant?: "green" | "yellow" | "blue" | "red" | "gray" | "orange"
}

const variantStyles = {
  green: "bg-green/10 text-green border-green/20",
  yellow: "bg-yellow/10 text-yellow border-yellow/20",
  blue: "bg-signal-500/10 text-signal-400 border-signal-500/20",
  red: "bg-red/10 text-red border-red/20",
  gray: "bg-ink-700/20 text-text-muted border-ink-700/30",
  orange: "bg-orange/10 text-orange border-orange/20",
}

export function Badge({ children, variant = "gray" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]}`}
    >
      {children}
    </span>
  )
}
