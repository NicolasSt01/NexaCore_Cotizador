"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

interface Line { id: number; concept: string; kind: string; quantity: string; unitPrice: string; unit: string; taxType: string; subtotal: string }
interface Charge {
  id: number
  periodYear: number
  periodMonth: number
  status: string
  subtotal: string
  iva: string
  total: string
  contract: { id: number; name: string; client: { businessName: string; rfc: string } }
  lines: Line[]
  invoice: { id: number; folio: string; status: string } | null
}

const money = (n: number | string) => `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
const MONTHS = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

export default function CargoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Charge | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [qty, setQty] = useState<Record<number, string>>({})
  const [ivaRate, setIvaRate] = useState(0.16)

  function apply(d: Charge | null) {
    if (!d) return
    setData(d)
    setQty(Object.fromEntries(d.lines.map((l) => [l.id, String(Number(l.quantity))])))
  }

  useEffect(() => {
    let cancelled = false
    fetch(`/api/charges/${id}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!cancelled) { apply(d); setLoading(false) } })
    fetch("/api/settings").then((r) => (r.ok ? r.json() : null)).then((s) => { if (!cancelled && s?.ivaRate) setIvaRate(Number(s.ivaRate)) })
    return () => { cancelled = true }
  }, [id])

  async function load() {
    const r = await fetch(`/api/charges/${id}`)
    if (r.ok) apply(await r.json())
  }

  if (loading) return <p className="text-text-muted py-12 text-center">Cargando...</p>
  if (!data) return <p className="text-text-muted py-12 text-center">No encontrado</p>

  const editable = data.status === "borrador"

  // Preview en vivo con las cantidades capturadas.
  const linesPreview = data.lines.map((l) => {
    const q = editable ? Number(qty[l.id] ?? l.quantity) || 0 : Number(l.quantity)
    return { ...l, q, sub: Math.round(q * Number(l.unitPrice) * 100) / 100 }
  })
  const subtotal = linesPreview.reduce((s, l) => s + l.sub, 0)
  const iva = linesPreview.reduce((s, l) => s + (l.taxType === "exento" ? 0 : l.sub * ivaRate), 0)
  const total = subtotal + iva

  async function guardar() {
    setUpdating(true)
    const r = await fetch(`/api/charges/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: data!.lines.map((l) => ({ id: l.id, quantity: Number(qty[l.id] ?? l.quantity) || 0 })) }),
    })
    if (r.ok) await load()
    else alert((await r.json()).error || "No se pudo guardar")
    setUpdating(false)
  }

  async function generarFactura() {
    if (!confirm("¿Generar la factura de este cargo? Se enviará al flujo de facturación (despacho → cobro).")) return
    setUpdating(true)
    // Guarda el uso capturado antes de facturar.
    await fetch(`/api/charges/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: data!.lines.map((l) => ({ id: l.id, quantity: Number(qty[l.id] ?? l.quantity) || 0 })) }),
    })
    const r = await fetch(`/api/charges/${id}/invoice`, { method: "POST" })
    const body = await r.json()
    if (r.ok) router.push(`/facturas/${body.id}`)
    else { alert(body.error || "No se pudo facturar"); setUpdating(false) }
  }

  async function cancelar() {
    if (!confirm("¿Cancelar este cargo?")) return
    setUpdating(true)
    const r = await fetch(`/api/charges/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) })
    if (r.ok) await load()
    else alert((await r.json()).error || "No se pudo cancelar")
    setUpdating(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/contratos/${data.contract.id}`} className="text-sm text-signal-400 hover:text-signal-300 mb-2 block">← {data.contract.name}</Link>
          <h1 className="text-2xl font-semibold text-text-primary">Cargo {MONTHS[data.periodMonth]} {data.periodYear}</h1>
          <p className="text-sm text-text-muted">{data.contract.client.businessName}</p>
        </div>
        <Badge variant={data.status === "facturado" ? "blue" : data.status === "cancelado" ? "gray" : "yellow"}>{data.status}</Badge>
      </div>

      {data.invoice && (
        <Card>
          <p className="text-sm text-text-secondary">
            Este cargo se facturó: <Link href={`/facturas/${data.invoice.id}`} className="text-signal-400 font-mono">{data.invoice.folio}</Link>
          </p>
        </Card>
      )}

      <Card padding="sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-muted">Concepto</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-text-muted">Cantidad</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-text-muted">P.U.</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-text-muted">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {linesPreview.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3 text-sm">
                  <span className="text-text-primary font-medium">{l.concept}</span>{" "}
                  {l.kind === "uso" && <Badge variant="blue">uso</Badge>}
                </td>
                <td className="px-4 py-3 text-right">
                  {editable && l.kind === "uso" ? (
                    <input
                      type="number" min="0" step="1"
                      value={qty[l.id] ?? ""}
                      onChange={(e) => setQty((p) => ({ ...p, [l.id]: e.target.value }))}
                      className="w-24 h-8 px-2 text-right rounded-md bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40"
                    />
                  ) : (
                    <span className="text-sm font-mono">{l.q} {l.kind === "uso" ? l.unit : ""}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm font-mono">{money(l.unitPrice)}</td>
                <td className="px-4 py-3 text-right text-sm font-mono">{money(l.sub)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-4 border-t border-line space-y-1">
          <div className="flex justify-between text-sm"><span className="text-text-muted">Subtotal</span><span className="font-mono">{money(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-text-muted">IVA</span><span className="font-mono">{money(iva)}</span></div>
          <div className="flex justify-between text-lg font-semibold pt-2 border-t border-line">
            <span className="text-text-primary">Total</span><span className="font-mono text-signal-400">{money(total)}</span>
          </div>
        </div>
      </Card>

      {editable && (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" disabled={updating} onClick={guardar}>Guardar uso</Button>
          <Button disabled={updating} onClick={generarFactura}>Generar factura</Button>
          <Button variant="danger" disabled={updating} onClick={cancelar}>Cancelar cargo</Button>
        </div>
      )}

      <Button variant="secondary" onClick={() => router.push(`/contratos/${data.contract.id}`)}>Volver al contrato</Button>
    </div>
  )
}
