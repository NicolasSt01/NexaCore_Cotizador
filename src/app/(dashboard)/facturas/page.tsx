"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"

interface Invoice {
  id: number
  folio: string
  status: string
  total: string
  dueDate: string | null
  issueDate: string
  overdue: boolean
  quotation: { folio: string; client: { businessName: string; rfc: string } }
}

export default function FacturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)
    let cancelled = false
    fetch(`/api/invoices?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Invoice[]) => {
        if (cancelled) return
        const now = Date.now()
        setInvoices(
          list.map((inv) => ({
            ...inv,
            overdue:
              inv.status === "pendiente" && inv.dueDate
                ? new Date(inv.dueDate).getTime() < now
                : false,
          }))
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [search, statusFilter])

  const statusBadge: Record<string, "green" | "yellow" | "red" | "gray"> = {
    pendiente: "yellow", pagada: "green", cancelada: "red",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Facturas</h1>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por folio, cotización o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary focus:outline-none focus:ring-2 focus:ring-signal-500/40"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagada">Pagada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      <Card padding="sm">
        {loading ? (
          <p className="text-text-muted p-4 text-center">Cargando...</p>
        ) : invoices.length === 0 ? (
          <p className="text-text-muted p-4 text-center">No hay facturas que coincidan.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-muted">Folio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-muted">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-muted">Cotización</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-text-muted">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-text-muted">Vence</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase text-text-muted">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoices.map((inv) => {
                const overdue = inv.overdue
                return (
                  <tr key={inv.id} className="hover:bg-ink-850 transition-colors cursor-pointer" onClick={() => window.location.href = `/facturas/${inv.id}`}>
                    <td className="px-4 py-3 text-sm font-mono text-signal-400">{inv.folio}</td>
                    <td className="px-4 py-3 text-sm text-text-primary">{inv.quotation.client.businessName}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{inv.quotation.folio}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      ${Number(inv.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right ${overdue ? "text-red" : "text-text-muted"}`}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("es-MX") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant={statusBadge[inv.status] || "gray"}>
                          {inv.status === "pendiente" ? "Pendiente" : inv.status === "pagada" ? "Pagada" : "Cancelada"}
                        </Badge>
                        {overdue && <Badge variant="red">Vencida</Badge>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}