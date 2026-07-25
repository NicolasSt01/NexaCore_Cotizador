import type { ReactNode } from "react"

interface TableProps {
  headers: { label: string; width?: string }[]
  children: ReactNode
}

export function Table({ headers, children }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-line">
            {headers.map((header) => (
              <th
                key={header.label}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                style={header.width ? { width: header.width } : undefined}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  )
}

export function Td({ children, className = "", colSpan }: { children: ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`px-4 py-3 text-sm text-text-primary ${className}`}>{children}</td>
}
