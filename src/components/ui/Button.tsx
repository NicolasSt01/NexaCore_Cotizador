import { forwardRef } from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

const variantStyles = {
  primary:
    "bg-signal-600 text-white hover:bg-signal-700 active:bg-signal-800 disabled:opacity-50",
  secondary:
    "bg-transparent border border-line text-text-primary hover:bg-ink-850 active:bg-ink-800 disabled:opacity-50",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-ink-850 active:bg-ink-800 disabled:opacity-50",
  danger:
    "bg-red text-white hover:bg-red/90 active:bg-red/80 disabled:opacity-50",
}

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-lg",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 font-medium transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"
