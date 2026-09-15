"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/Card"
import { Table, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { QUOTATION_STATUSES } from "@/types"
import { isQuotationExpired } from "@/lib/quotation-status"
import Link from "next/link"

interface Quotation {
  id: number
  folio: string
  total: string
  status: string
  validUntil: string | null
  createdAt: string
  client: { businessName: string }
}

const statusBadge: Record<string, "green" | "yellow" | "blue" | "red" | "gray" | "orange"> = {
  borrador: "gray", enviada: "blue", vista: "orange",
  aprobada: "green", rechazada: "red", convertida: "green", cancelada: "gray",
}

const PAGE_SIZE = 10

export default function CotizacionesPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)
    params.set("page", String(page))
    params.set("pageSize", String(PAGE_SIZE))
    let cancelled = false
    fetch(`/api/quotations?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled) return
        setQuotations(body?.data ?? [])
        setTotal(body?.total ?? 0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [search, statusFilter, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Cotizaciones</h1>
        <Link href="/cotizaciones/nueva">
          <Button>Nueva cotización</Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por folio o cliente..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary focus:outline-none focus:ring-2 focus:ring-signal-500/40"
        >
          <option value="">Todos los estados</option>
          {QUOTATION_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <Card padding="sm">
        <Table
          headers={[
            { label: "Folio", width: "15%" },
            { label: "Cliente", width: "30%" },
            { label: "Total", width: "15%" },
            { label: "Estado", width: "15%" },
            { label: "Fecha", width: "15%" },
            { label: "", width: "10%" },
          ]}
        >
          {loading ? (
            <tr><Td colSpan={6} className="text-text-muted text-center py-8">Cargando...</Td></tr>
          ) : quotations.length === 0 ? (
            <tr><Td colSpan={6} className="text-text-muted text-center py-8">Sin cotizaciones</Td></tr>
          ) : quotations.map((q) => {
            const expired = isQuotationExpired(q.validUntil, q.status)
            return (
              <tr key={q.id}>
                <Td><span className="font-mono text-sm">{q.folio}</span></Td>
                <Td className="font-medium">{q.client.businessName}</Td>
                <Td><span className="font-mono">${Number(q.total).toLocaleString("es-MX")}</span></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusBadge[q.status] || "gray"}>
                      {QUOTATION_STATUSES.find((s) => s.value === q.status)?.label || q.status}
                    </Badge>
                    {expired && <Badge variant="red">Vencida</Badge>}
                  </div>
                </Td>
                <Td className="text-text-muted">{new Date(q.createdAt).toLocaleDateString("es-MX")}</Td>
                <Td>
                  <Link href={`/cotizaciones/${q.id}`} className="text-signal-400 hover:text-signal-300 text-sm">
                    Ver
                  </Link>
                </Td>
              </tr>
            )
          })}
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-line">
            <p className="text-sm text-text-muted">
              {total} cotizaciones · página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}