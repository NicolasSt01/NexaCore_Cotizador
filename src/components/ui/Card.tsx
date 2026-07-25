import type { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  className?: string
  padding?: "sm" | "md" | "lg"
}

const paddingStyles = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
}

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface-card ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  )
}
