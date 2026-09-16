"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { FORMAS_PAGO, METODOS_PAGO } from "@/types"
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
  uuid: string | null
  formaPago: string | null
  metodoPago: string | null
  invoicedAt: string | null
  cfdiPdfKey: string | null
  cfdiXmlKey: string | null
  quotation?: {
    folio: string
    paymentTerms?: string | null
    client: FiscalClient
    items: LineLike[]
  } | null
  charge?: {
    periodYear: number
    periodMonth: number
    contract: { name: string; client: FiscalClient }
    lines: LineLike[]
  } | null
}

interface FiscalClient {
  businessName: string
  rfc: string
  email?: string | null
  zipCode?: string | null
  taxRegime?: string | null
  cfdiUsage?: string | null
  city?: string | null
  state?: string | null
}

interface LineLike {
  concept: string
  description?: string | null
  quantity: number
  unit: string
  unitPrice: string
  subtotal: string
}

const money = (n: number | string) =>
  `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`

const STATUS_BADGE: Record<string, "green" | "yellow" | "blue" | "red" | "gray"> = {
  solicitada: "yellow", pendiente: "yellow", facturada: "blue", pagada: "green", cancelada: "red",
}
const STATUS_LABEL: Record<string, string> = {
  solicitada: "Solicitada", pendiente: "Solicitada", facturada: "Facturada", pagada: "Pagada", cancelada: "Cancelada",
}

export default function FacturaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [overdue, setOverdue] = useState(false)
  const [dueDraft, setDueDraft] = useState("")
  const [formaDraft, setFormaDraft] = useState("")
  const [metodoDraft, setMetodoDraft] = useState("")
  const [uuidDraft, setUuidDraft] = useState("")
  const [copied, setCopied] = useState(false)
  const pdfRef = useRef<HTMLInputElement>(null)
  const xmlRef = useRef<HTMLInputElement>(null)

  function apply(d: InvoiceDetail | null) {
    if (!d) return
    setData(d)
    setOverdue(
      d.status !== "pagada" && d.status !== "cancelada" && d.dueDate
        ? new Date(d.dueDate).getTime() < Date.now()
        : false
    )
    if (d.dueDate) setDueDraft(new Date(d.dueDate).toISOString().slice(0, 10))
    setFormaDraft(d.formaPago ?? "")
    setMetodoDraft(d.metodoPago ?? "")
    setUuidDraft(d.uuid ?? "")
  }

  async function load() {
    const r = await fetch(`/api/invoices/${id}`)
    if (r.ok) apply(await r.json())
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    fetch(`/api/invoices/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) apply(d) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  async function act(action: string, confirmMsg?: string, extra?: Record<string, unknown>) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setUpdating(true)
    const r = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    })
    if (r.ok) await load()
    else alert((await r.json()).error || "No se pudo actualizar")
    setUpdating(false)
  }

  async function marcarFacturada() {
    if (!uuidDraft.trim()) { alert("Captura el UUID (folio fiscal) que te dio el despacho."); return }
    setUpdating(true)
    const fd = new FormData()
    fd.append("uuid", uuidDraft.trim())
    if (formaDraft) fd.append("formaPago", formaDraft)
    if (metodoDraft) fd.append("metodoPago", metodoDraft)
    if (pdfRef.current?.files?.[0]) fd.append("pdf", pdfRef.current.files[0])
    if (xmlRef.current?.files?.[0]) fd.append("xml", xmlRef.current.files[0])
    const r = await fetch(`/api/invoices/${id}/facturar`, { method: "POST", body: fd })
    if (r.ok) await load()
    else alert((await r.json()).error || "No se pudo marcar como facturada")
    setUpdating(false)
  }

  if (loading) return <p className="text-text-muted py-12 text-center">Cargando...</p>
  if (!data) return <p className="text-text-muted py-12 text-center">No encontrada</p>

  // La factura viene de una cotización (venta única) o de un cargo de contrato.
  const c: FiscalClient = data.quotation ? data.quotation.client : data.charge!.contract.client
  const items: LineLike[] = data.quotation ? data.quotation.items : data.charge!.lines
  const sourceLabel = data.quotation
    ? `Cotización: ${data.quotation.folio}`
    : `Contrato: ${data.charge!.contract.name} (${String(data.charge!.periodMonth).padStart(2, "0")}/${data.charge!.periodYear})`
  const isPaid = data.status === "pagada"
  const isFacturada = data.status === "facturada"
  const isSolicitada = data.status === "solicitada" || data.status === "pendiente"

  // Texto que se copia para pegárselo al despacho.
  const despachoText = [
    `SOLICITUD DE FACTURA — ${data.folio}`,
    ``,
    `RECEPTOR`,
    `Razón social: ${c.businessName}`,
    `RFC: ${c.rfc}`,
    `Código postal: ${c.zipCode ?? "—"}`,
    `Régimen fiscal: ${c.taxRegime ?? "—"}`,
    `Uso CFDI: ${c.cfdiUsage ?? "—"}`,
    ``,
    `PAGO`,
    `Forma de pago: ${data.formaPago ?? "—"}`,
    `Método de pago: ${data.metodoPago ?? "—"}`,
    ``,
    `CONCEPTOS`,
    ...items.map(
      (i, n) => `${n + 1}. ${i.concept} — ${i.quantity} ${i.unit} x ${money(i.unitPrice)} = ${money(i.subtotal)}`
    ),
    ``,
    `Subtotal: ${money(data.subtotal)}`,
    `IVA: ${money(data.iva)}`,
    ...(Number(data.retenciones) > 0 ? [`Retenciones: -${money(data.retenciones)}`] : []),
    `TOTAL: ${money(data.total)}`,
  ].join("\n")

  async function copyDespacho() {
    await navigator.clipboard.writeText(despachoText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
          <Badge variant={STATUS_BADGE[data.status] || "gray"}>{STATUS_LABEL[data.status] || data.status}</Badge>
          {overdue && <Badge variant="red">Vencida</Badge>}
        </div>
      </div>

      {/* Acciones según el ciclo */}
      <div className="flex flex-wrap gap-3">
        {isFacturada && (
          <Button onClick={() => act("pay", "¿Registrar esta factura como pagada?")} disabled={updating}>
            Marcar como pagada
          </Button>
        )}
        {isPaid && (
          <Button variant="secondary" onClick={() => act("reopen", "¿Reabrir la factura?")} disabled={updating}>
            Reabrir
          </Button>
        )}
        {(isFacturada || isPaid) && data.cfdiPdfKey && (
          <a href={`/api/invoices/${id}/cfdi/pdf`}>
            <Button variant="secondary" disabled={updating}>Descargar CFDI (PDF)</Button>
          </a>
        )}
        {(isFacturada || isPaid) && data.cfdiXmlKey && (
          <a href={`/api/invoices/${id}/cfdi/xml`}>
            <Button variant="secondary" disabled={updating}>Descargar CFDI (XML)</Button>
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold mb-2">Cliente</p>
          <p className="text-sm font-medium text-text-primary">{c.businessName}</p>
          <p className="text-xs text-text-muted font-mono">{c.rfc}</p>
          {c.zipCode && <p className="text-xs text-text-muted">CP: {c.zipCode}</p>}
        </Card>
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold mb-2">Detalles</p>
          <p className="text-sm text-text-primary">{sourceLabel}</p>
          <p className="text-xs text-text-muted">Emisión: {new Date(data.issueDate).toLocaleDateString("es-MX")}</p>
          {data.invoicedAt && <p className="text-xs text-text-muted">Facturada: {new Date(data.invoicedAt).toLocaleDateString("es-MX")}</p>}
          {data.paymentDate && <p className="text-xs text-text-muted">Pago: {new Date(data.paymentDate).toLocaleDateString("es-MX")}</p>}
          {data.uuid && <p className="text-xs text-text-muted font-mono break-all mt-1">UUID: {data.uuid}</p>}
        </Card>
      </div>

      {/* Datos para el despacho */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-text-muted uppercase font-semibold">Datos para el despacho</p>
          <Button variant="secondary" size="sm" onClick={copyDespacho}>
            {copied ? "¡Copiado!" : "Copiar"}
          </Button>
        </div>
        <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono bg-ink-900 rounded-lg p-3 border border-line overflow-x-auto">
          {despachoText}
        </pre>
        {(!c.zipCode || !c.taxRegime || !c.cfdiUsage) && (
          <p className="text-xs text-yellow mt-2">
            ⚠ Al cliente le faltan datos fiscales (CP, régimen o uso CFDI). Complétalos en su ficha para que el despacho pueda timbrar.
          </p>
        )}
      </Card>

      {/* Forma y método de pago (SAT) */}
      {!isPaid && (
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold mb-3">Forma y método de pago (SAT)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Forma de pago</label>
              <select
                value={formaDraft}
                onChange={(e) => setFormaDraft(e.target.value)}
                className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40"
              >
                <option value="">Selecciona…</option>
                {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Método de pago</label>
              <select
                value={metodoDraft}
                onChange={(e) => setMetodoDraft(e.target.value)}
                className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40"
              >
                <option value="">Selecciona…</option>
                {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={updating}
              onClick={() => act("saveFiscal", undefined, { formaPago: formaDraft, metodoPago: metodoDraft })}
            >
              Guardar forma/método
            </Button>
          </div>
        </Card>
      )}

      {/* Marcar como facturada (captura del despacho) */}
      {isSolicitada && (
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold mb-1">Registrar CFDI del despacho</p>
          <p className="text-xs text-text-muted mb-3">
            Cuando el despacho timbre, captura el UUID y adjunta el XML/PDF (opcional si aún no configuras R2).
          </p>
          <div className="space-y-3">
            <Input
              label="UUID (folio fiscal)"
              value={uuidDraft}
              onChange={(e) => setUuidDraft(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">CFDI PDF</label>
                <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="text-sm text-text-secondary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">CFDI XML</label>
                <input ref={xmlRef} type="file" accept="application/xml,text/xml,.xml" className="text-sm text-text-secondary" />
              </div>
            </div>
            <Button onClick={marcarFacturada} disabled={updating}>
              {updating ? "Guardando..." : "Marcar como facturada"}
            </Button>
          </div>
        </Card>
      )}

      {/* Vencimiento */}
      <Card>
        <p className="text-xs text-text-muted uppercase font-semibold mb-3">Vencimiento</p>
        <div className="flex items-end gap-2">
          <div className="flex-1 max-w-xs">
            <Input type="date" value={dueDraft} onChange={(e) => setDueDraft(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={() => act("dueDate", undefined, { dueDate: dueDraft })} disabled={updating || !dueDraft}>
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
            {items.map((item, i) => (
              <tr key={i}>
                <td className="px-4 py-3 text-sm font-medium text-text-primary">{item.concept}</td>
                <td className="px-4 py-3 text-right text-sm text-text-primary">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-sm font-mono">{money(item.unitPrice)}</td>
                <td className="px-4 py-3 text-right text-sm font-mono">{money(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-4 border-t border-line space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Subtotal</span>
            <span className="font-mono">{money(data.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">IVA</span>
            <span className="font-mono">{money(data.iva)}</span>
          </div>
          {Number(data.retenciones) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Retenciones</span>
              <span className="font-mono text-red">-{money(data.retenciones)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold pt-2 border-t border-line">
            <span className="text-text-primary">Total</span>
            <span className="font-mono text-signal-400">{money(data.total)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2">
            <span className="text-text-muted">Saldo</span>
            <span className={`font-mono ${isPaid ? "text-text-muted" : "text-text-primary"}`}>
              {isPaid ? "Pagado" : money(data.total)}
            </span>
          </div>
        </div>
      </Card>

      <Button variant="secondary" onClick={() => router.push("/facturas")}>Volver</Button>
    </div>
  )
}
