import { forwardRef } from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-signal-500/40 focus:border-signal-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red" : ""}
            ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red">{error}</span>}
      </div>
    )
  }
)

Input.displayName = "Input"
