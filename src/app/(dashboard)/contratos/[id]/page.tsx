"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

interface Item { id: number; concept: string; kind: string; unitPrice: string; unit: string }
interface Charge {
  id: number
  periodYear: number
  periodMonth: number
  status: string
  total: string
  invoice: { id: number; folio: string; status: string } | null
}
interface Contract {
  id: number
  name: string
  status: string
  billingDay: number
  notes: string | null
  client: { id: number; businessName: string; rfc: string }
  items: Item[]
  charges: Charge[]
}

const money = (n: number | string) => `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
const MONTHS = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

// Periodo por defecto (mes/año actual), calculado una sola vez al cargar el módulo
// para no llamar Date durante el render.
const NOW = new Date()
const CURRENT_YEAR = NOW.getFullYear()
const CURRENT_MONTH = NOW.getMonth() + 1
const STATUS_BADGE: Record<string, "green" | "yellow" | "blue" | "gray"> = {
  activo: "green", pausado: "yellow", cancelado: "gray", borrador: "yellow", facturado: "blue",
}

export default function ContratoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(CURRENT_MONTH)

  async function load() {
    const r = await fetch(`/api/contracts/${id}`)
    if (r.ok) setData(await r.json())
    setLoading(false)
  }
  useEffect(() => {
    let cancelled = false
    fetch(`/api/contracts/${id}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
    return () => { cancelled = true }
  }, [id])

  async function setStatus(status: string) {
    setUpdating(true)
    const r = await fetch(`/api/contracts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    })
    if (r.ok) await load()
    setUpdating(false)
  }

  async function generarCargo() {
    setUpdating(true)
    const r = await fetch(`/api/contracts/${id}/charge`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ periodYear: year, periodMonth: month }),
    })
    const body = await r.json()
    if (r.ok) {
      router.push(`/cargos/${body.id}`)
    } else if (r.status === 409 && body.chargeId) {
      router.push(`/cargos/${body.chargeId}`)
    } else {
      alert(body.error || "No se pudo generar el cargo")
      setUpdating(false)
    }
  }

  if (loading) return <p className="text-text-muted py-12 text-center">Cargando...</p>
  if (!data) return <p className="text-text-muted py-12 text-center">No encontrado</p>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/contratos" className="text-sm text-signal-400 hover:text-signal-300 mb-2 block">← Contratos</Link>
          <h1 className="text-2xl font-semibold text-text-primary">{data.name}</h1>
          <p className="text-sm text-text-muted">{data.client.businessName} · {data.client.rfc}</p>
        </div>
        <Badge variant={STATUS_BADGE[data.status] || "gray"}>{data.status}</Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        {data.status !== "activo" && <Button variant="secondary" disabled={updating} onClick={() => setStatus("activo")}>Activar</Button>}
        {data.status === "activo" && <Button variant="secondary" disabled={updating} onClick={() => setStatus("pausado")}>Pausar</Button>}
        {data.status !== "cancelado" && <Button variant="danger" disabled={updating} onClick={() => setStatus("cancelado")}>Cancelar contrato</Button>}
      </div>

      <Card>
        <p className="text-xs text-text-muted uppercase font-semibold mb-3">Conceptos recurrentes</p>
        <div className="space-y-2">
          {data.items.map((it) => (
            <div key={it.id} className="flex justify-between items-center text-sm border-b border-line pb-2 last:border-0">
              <div>
                <span className="text-text-primary font-medium">{it.concept}</span>
                <Badge variant={it.kind === "uso" ? "blue" : "gray"}>{it.kind === "uso" ? "por uso" : "fijo"}</Badge>
              </div>
              <span className="font-mono text-text-secondary">
                {money(it.unitPrice)} {it.kind === "uso" ? `/ ${it.unit}` : "/ mes"}
              </span>
            </div>
          ))}
          {data.items.length === 0 && <p className="text-text-muted text-sm">Sin conceptos.</p>}
        </div>
      </Card>

      {/* Generar corte del periodo */}
      {data.status !== "cancelado" && (
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold mb-3">Generar cargo del periodo</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Mes</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40">
                {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 w-28">
              <label className="text-xs text-text-muted">Año</label>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40" />
            </div>
            <Button disabled={updating} onClick={generarCargo}>Generar cargo</Button>
          </div>
          <p className="text-xs text-text-muted mt-2">Se crea como borrador para capturar el uso antes de facturar.</p>
        </Card>
      )}

      {/* Historial de cargos */}
      <Card padding="sm">
        <div className="px-4 py-3 border-b border-line">
          <p className="text-xs text-text-muted uppercase font-semibold">Cargos generados</p>
        </div>
        {data.charges.length === 0 ? (
          <p className="text-text-muted p-4 text-center text-sm">Aún no hay cargos.</p>
        ) : (
          <table className="w-full">
            <tbody className="divide-y divide-line">
              {data.charges.map((ch) => (
                <tr key={ch.id} className="hover:bg-ink-850 transition-colors cursor-pointer" onClick={() => router.push(`/cargos/${ch.id}`)}>
                  <td className="px-4 py-3 text-sm text-text-primary">{MONTHS[ch.periodMonth]} {ch.periodYear}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{money(ch.total)}</td>
                  <td className="px-4 py-3 text-center"><Badge variant={STATUS_BADGE[ch.status] || "gray"}>{ch.status}</Badge></td>
                  <td className="px-4 py-3 text-right text-sm">
                    {ch.invoice
                      ? <Link href={`/facturas/${ch.invoice.id}`} onClick={(e) => e.stopPropagation()} className="text-signal-400 font-mono">{ch.invoice.folio}</Link>
                      : <span className="text-text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Button variant="secondary" onClick={() => router.push("/contratos")}>Volver</Button>
    </div>
  )
}
