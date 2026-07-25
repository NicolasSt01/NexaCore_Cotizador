"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import Link from "next/link"

interface Invoice {
  id: number
  folio: string
  status: string
  total: string
  issueDate: string
  quotation: { folio: string; client: { businessName: string; rfc: string } }
}

export default function FacturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => (r.ok ? r.json() : []))
      .then(setInvoices)
      .finally(() => setLoading(false))
  }, [])

  const statusBadge: Record<string, "green" | "yellow" | "red" | "gray"> = {
    pendiente: "yellow", pagada: "green", cancelada: "red",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Facturas</h1>
      </div>

      <Card padding="sm">
        {loading ? (
          <p className="text-text-muted p-4 text-center">Cargando...</p>
        ) : invoices.length === 0 ? (
          <p className="text-text-muted p-4 text-center">No hay facturas aún. Convierte una cotización aprobada.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-muted">Folio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-muted">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-muted">RFC</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-muted">Cotización</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-text-muted">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase text-text-muted">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-ink-850 transition-colors cursor-pointer" onClick={() => window.location.href = `/facturas/${inv.id}`}>
                  <td className="px-4 py-3 text-sm font-mono text-signal-400">{inv.folio}</td>
                  <td className="px-4 py-3 text-sm text-text-primary">{inv.quotation.client.businessName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted font-mono">{inv.quotation.client.rfc}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{inv.quotation.folio}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    ${Number(inv.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={statusBadge[inv.status] || "gray"}>{inv.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
