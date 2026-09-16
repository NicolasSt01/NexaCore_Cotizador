"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

interface Row {
  id: number
  folio: string
  status: string
  clientId: number | null
  clientName: string
  rfc: string
  origin: string
  uuid: string | null
  issueDate: string
  dueDate: string | null
  total: number
  paid: number
}
interface Client { id: number; businessName: string }

const money = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
const NOW_TS = Date.now()

const STATUS_BADGE: Record<string, "green" | "yellow" | "blue" | "red" | "gray"> = {
  solicitada: "yellow", pendiente: "yellow", facturada: "blue", pagada: "green", cancelada: "red",
}
const STATUS_LABEL: Record<string, string> = {
  solicitada: "Solicitada", pendiente: "Solicitada", facturada: "Facturada", pagada: "Pagada", cancelada: "Cancelada",
}

/** Escapa un valor para CSV (comillas, comas, saltos de línea). */
function csv(v: string | number | null): string {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function FinanzasPage() {
  const [mrr, setMrr] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const [clientId, setClientId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/finanzas").then((r) => (r.ok ? r.json() : { mrr: 0, rows: [] })),
      fetch("/api/clients").then((r) => (r.ok ? r.json() : [])),
    ]).then(([fin, cls]) => {
      if (cancelled) return
      setMrr(fin.mrr)
      setRows(fin.rows)
      setClients(cls)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (clientId && String(r.clientId) !== clientId) return false
      if (status && r.status !== status) return false
      const d = r.issueDate.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
  }, [rows, clientId, from, to, status])

  // KPIs sobre lo filtrado (coinciden con la tabla).
  const kpis = useMemo(() => {
    let facturado = 0, cobrado = 0, porCobrar = 0, vencido = 0
    for (const r of filtered) {
      const balance = Math.max(0, r.total - r.paid)
      if (r.status === "facturada" || r.status === "pagada") facturado += r.total
      cobrado += r.paid
      if (r.status === "facturada") {
        porCobrar += balance
        if (balance > 0 && r.dueDate && new Date(r.dueDate).getTime() < NOW_TS) vencido += balance
      }
    }
    return { facturado, cobrado, porCobrar, vencido }
  }, [filtered])

  function exportCsv() {
    const headers = ["Folio", "Cliente", "RFC", "Origen", "Emisión", "Vence", "Total", "Pagado", "Saldo", "Estado", "UUID"]
    const lines = filtered.map((r) => [
      r.folio, r.clientName, r.rfc, r.origin,
      r.issueDate.slice(0, 10), r.dueDate ? r.dueDate.slice(0, 10) : "",
      r.total.toFixed(2), r.paid.toFixed(2), Math.max(0, r.total - r.paid).toFixed(2),
      STATUS_LABEL[r.status] || r.status, r.uuid || "",
    ].map(csv).join(","))
    // BOM para que Excel abra el UTF-8 correctamente.
    const content = "﻿" + [headers.join(","), ...lines].join("\n")
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `finanzas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Finanzas</h1>
        <Button variant="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
          Exportar a Excel (CSV)
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card padding="md">
          <p className="text-xs text-text-muted uppercase font-semibold">MRR</p>
          <p className="text-2xl font-semibold text-signal-400 font-mono mt-1">{money(mrr)}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-muted uppercase font-semibold">Facturado</p>
          <p className="text-2xl font-semibold text-text-primary font-mono mt-1">{money(kpis.facturado)}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-muted uppercase font-semibold">Cobrado</p>
          <p className="text-2xl font-semibold text-text-primary font-mono mt-1">{money(kpis.cobrado)}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-muted uppercase font-semibold">Por cobrar</p>
          <p className="text-2xl font-semibold text-text-primary font-mono mt-1">{money(kpis.porCobrar)}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-muted uppercase font-semibold">Vencido</p>
          <p className={`text-2xl font-semibold font-mono mt-1 ${kpis.vencido > 0 ? "text-red" : "text-text-primary"}`}>{money(kpis.vencido)}</p>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Cliente</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40">
              <option value="">Todos</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
            </select>
          </div>
          <Input label="Desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40">
              <option value="">Todos</option>
              <option value="solicitada">Solicitada</option>
              <option value="facturada">Facturada</option>
              <option value="pagada">Pagada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
        {(clientId || from || to || status) && (
          <button onClick={() => { setClientId(""); setFrom(""); setTo(""); setStatus("") }} className="text-xs text-signal-400 hover:text-signal-300 mt-3">
            Limpiar filtros
          </button>
        )}
      </Card>

      {/* Tabla */}
      <Card padding="sm">
        {loading ? (
          <p className="text-text-muted p-4 text-center">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-text-muted p-4 text-center">Sin resultados con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-text-muted">Folio</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-text-muted">Cliente</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-text-muted">Origen</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold uppercase text-text-muted">Emisión</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold uppercase text-text-muted">Total</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold uppercase text-text-muted">Pagado</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold uppercase text-text-muted">Saldo</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold uppercase text-text-muted">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((r) => {
                  const balance = Math.max(0, r.total - r.paid)
                  return (
                    <tr key={r.id} className="hover:bg-ink-850 transition-colors cursor-pointer" onClick={() => window.location.href = `/facturas/${r.id}`}>
                      <td className="px-3 py-3 text-sm font-mono text-signal-400">{r.folio}</td>
                      <td className="px-3 py-3 text-sm text-text-primary">{r.clientName}</td>
                      <td className="px-3 py-3 text-xs text-text-muted">{r.origin}</td>
                      <td className="px-3 py-3 text-sm text-right text-text-muted">{r.issueDate.slice(0, 10)}</td>
                      <td className="px-3 py-3 text-sm text-right font-mono">{money(r.total)}</td>
                      <td className="px-3 py-3 text-sm text-right font-mono text-text-secondary">{money(r.paid)}</td>
                      <td className="px-3 py-3 text-sm text-right font-mono">{balance > 0 ? money(balance) : "—"}</td>
                      <td className="px-3 py-3 text-center"><Badge variant={STATUS_BADGE[r.status] || "gray"}>{STATUS_LABEL[r.status] || r.status}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-text-muted px-3 py-2">{filtered.length} registro(s)</p>
      </Card>
    </div>
  )
}
