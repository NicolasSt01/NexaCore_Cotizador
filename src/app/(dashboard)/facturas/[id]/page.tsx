"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import Link from "next/link"

interface InvoiceDetail {
  id: number
  folio: string
  status: string
  subtotal: string
  iva: string
  retenciones: string
  total: string
  dueDate: string | null
  issueDate: string
  paymentDate: string | null
  quotation: {
    folio: string
    client: { businessName: string; rfc: string; email?: string | null }
    items: { concept: string; quantity: number; unit: string; unitPrice: string; subtotal: string }[]
  }
}

export default function FacturaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [overdue, setOverdue] = useState(false)
  const [dueDraft, setDueDraft] = useState("")

  async function load() {
    const res = await fetch(`/api/invoices/${id}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
      setOverdue(
        d?.status === "pendiente" && d?.dueDate
          ? new Date(d.dueDate).getTime() < Date.now()
          : false
      )
      if (d?.dueDate) {
        setDueDraft(new Date(d.dueDate).toISOString().slice(0, 10))
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    fetch(`/api/invoices/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return
        setData(d)
        setOverdue(
          d?.status === "pendiente" && d?.dueDate
            ? new Date(d.dueDate).getTime() < Date.now()
            : false
        )
        if (d?.dueDate) {
          setDueDraft(new Date(d.dueDate).toISOString().slice(0, 10))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  async function act(action: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setUpdating(true)
    const r = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    if (r.ok) await load()
    else {
      const err = await r.json()
      alert(err.error || "No se pudo actualizar")
    }
    setUpdating(false)
  }

  async function saveDueDate() {
    if (!dueDraft) return
    setUpdating(true)
    const r = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dueDate", dueDate: dueDraft }),
    })
    if (r.ok) await load()
    else {
      const err = await r.json()
      alert(err.error || "No se pudo actualizar")
    }
    setUpdating(false)
  }

  if (loading) return <p className="text-text-muted py-12 text-center">Cargando...</p>
  if (!data) return <p className="text-text-muted py-12 text-center">No encontrada</p>

  const statusBadge: Record<string, "green" | "yellow" | "red" | "gray"> = {
    pendiente: "yellow", pagada: "green", cancelada: "red",
  }
  const statusLabel = data.status === "pendiente" ? "Pendiente" : data.status === "pagada" ? "Pagada" : "Cancelada"

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/facturas" className="text-sm text-signal-400 hover:text-signal-300 mb-2 block">
            ← Facturas
          </Link>
          <h1 className="text-2xl font-semibold text-text-primary font-mono">{data.folio}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusBadge[data.status] || "gray"}>{statusLabel}</Badge>
          {overdue && <Badge variant="red">Vencida</Badge>}
        </div>
      </div>

      <div className="flex gap-3">
        {data.status === "pendiente" && (
          <Button onClick={() => act("pay", "¿Registrar esta factura como pagada?")} disabled={updating}>
            Marcar como pagada
          </Button>
        )}
        {data.status === "pagada" && (
          <Button variant="secondary" onClick={() => act("reopen", "¿Reabrir la factura como pendiente?")} disabled={updating}>
            Reabrir
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold mb-2">Cliente</p>
          <p className="text-sm font-medium text-text-primary">{data.quotation.client.businessName}</p>
          <p className="text-xs text-text-muted font-mono">{data.quotation.client.rfc}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold mb-2">Detalles</p>
          <p className="text-sm text-text-primary">Cotización: {data.quotation.folio}</p>
          <p className="text-xs text-text-muted">Emisión: {new Date(data.issueDate).toLocaleDateString("es-MX")}</p>
          {data.paymentDate && <p className="text-xs text-text-muted">Pago: {new Date(data.paymentDate).toLocaleDateString("es-MX")}</p>}
        </Card>
      </div>

      <Card>
        <p className="text-xs text-text-muted uppercase font-semibold mb-3">Vencimiento</p>
        <div className="flex items-end gap-2">
          <div className="flex-1 max-w-xs">
            <Input
              type="date"
              value={dueDraft}
              onChange={(e) => setDueDraft(e.target.value)}
              placeholder="Fecha de vencimiento"
            />
          </div>
          <Button variant="secondary" onClick={saveDueDate} disabled={updating || !dueDraft}>
            Guardar
          </Button>
        </div>
      </Card>

      <Card padding="sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-muted">Concepto</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-text-muted">Cant.</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-text-muted">P.U.</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-text-muted">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.quotation.items.map((item, i) => (
              <tr key={i}>
                <td className="px-4 py-3 text-sm font-medium text-text-primary">{item.concept}</td>
                <td className="px-4 py-3 text-right text-sm text-text-primary">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-sm font-mono">
                  ${Number(item.unitPrice).toLocaleString("es-MX")}
                </td>
                <td className="px-4 py-3 text-right text-sm font-mono">
                  ${Number(item.subtotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-4 border-t border-line space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Subtotal</span>
            <span className="font-mono">${Number(data.subtotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">IVA</span>
            <span className="font-mono">${Number(data.iva).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
          {Number(data.retenciones) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Retenciones</span>
              <span className="font-mono text-red">-${Number(data.retenciones).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold pt-2 border-t border-line">
            <span className="text-text-primary">Total</span>
            <span className="font-mono text-signal-400">
              ${Number(data.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2">
            <span className="text-text-muted">Saldo</span>
            <span className={`font-mono ${data.status === "pagada" ? "text-text-muted" : "text-text-primary"}`}>
              {data.status === "pagada" ? "Pagado" : `$${Number(data.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
            </span>
          </div>
        </div>
      </Card>

      <Button variant="secondary" onClick={() => router.push("/facturas")}>Volver</Button>
    </div>
  )
}