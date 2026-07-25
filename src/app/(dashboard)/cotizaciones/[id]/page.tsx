"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { PDFDownload } from "@/components/quotations/PDFDownload"
import { EmailModal } from "@/components/quotations/EmailModal"
import { QUOTATION_STATUSES } from "@/types"
import Link from "next/link"
import Image from "next/image"

interface QuotationItem {
  id: number
  concept: string
  description: string | null
  quantity: number
  unit: string
  unitPrice: string
  discountPercent: string
  subtotal: string
  iva: string
  total: string
}

interface QuotationDetail {
  id: number
  folio: string
  status: string
  subtotal: string
  discountPercent: string
  discountAmount: string
  ivaAmount: string
  isrRetencion: string
  ivaRetencion: string
  total: string
  paymentTerms: string | null
  deliveryTerms: string | null
  notes: string | null
  termsConditions: string | null
  createdAt: string
  validUntil: string | null
  publicHash: string | null
  client: { id: number; businessName: string; rfc: string; email?: string | null }
  items: QuotationItem[]
  invoice?: { id: number; folio: string } | null
}

const statusBadge: Record<string, "green" | "yellow" | "blue" | "red" | "gray" | "orange"> = {
  borrador: "gray", enviada: "blue", vista: "orange",
  aprobada: "green", rechazada: "red", convertida: "green", cancelada: "gray",
}

export default function CotizacionDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<QuotationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrUrl, setQrUrl] = useState("")
  const [showEmail, setShowEmail] = useState(false)

  async function load() {
    const r = await fetch(`/api/quotations/${id}`)
    if (!r.ok) { setLoading(false); return }
    const d = await r.json()
    setData(d)
    if (d?.publicHash) {
      const url = `${window.location.origin}/publica/${d.publicHash}`
      import("qrcode").then((qr) => qr.default.toDataURL(url).then(setQrUrl))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleConvertInvoice() {
    if (!confirm("¿Convertir esta cotización a factura?")) return
    const r = await fetch(`/api/quotations/${id}/invoice`, { method: "POST" })
    if (r.ok) {
      load()
    } else {
      const err = await r.json()
      alert(err.error || "Error al convertir")
    }
  }

  if (loading) return <p className="text-text-muted py-12 text-center">Cargando...</p>
  if (!data) return <p className="text-text-muted py-12 text-center">No encontrada</p>

  const publicUrl = data.publicHash
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/publica/${data.publicHash}`
    : ""

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/cotizaciones" className="text-sm text-signal-400 hover:text-signal-300 mb-2 block">
            ← Cotizaciones
          </Link>
          <h1 className="text-2xl font-semibold text-text-primary font-mono">{data.folio}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusBadge[data.status] || "gray"}>
            {QUOTATION_STATUSES.find((s) => s.value === data.status)?.label || data.status}
          </Badge>
          {data.invoice && (
            <Link href={`/facturas`}>
              <Badge variant="green">Factura: {data.invoice.folio}</Badge>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {data.publicHash && publicUrl && (
          <PDFDownload
            quotation={{
              folio: data.folio,
              client: data.client,
              items: data.items.map((i) => ({
                concept: i.concept,
                description: i.description ?? undefined,
                quantity: i.quantity,
                unit: i.unit,
                unitPrice: Number(i.unitPrice),
                subtotal: Number(i.subtotal),
                total: Number(i.total),
              })),
              subtotal: Number(data.subtotal),
              ivaAmount: Number(data.ivaAmount),
              isrRetencion: Number(data.isrRetencion),
              ivaRetencion: Number(data.ivaRetencion),
              total: Number(data.total),
              discountPercent: Number(data.discountPercent),
              paymentTerms: data.paymentTerms ?? undefined,
              deliveryTerms: data.deliveryTerms ?? undefined,
              notes: data.notes ?? undefined,
              termsConditions: data.termsConditions ?? undefined,
              validUntil: data.validUntil ?? undefined,
              createdAt: data.createdAt,
              publicHash: data.publicHash ?? undefined,
            }}
          />
        )}
        {data.publicHash && (
          <Button variant="secondary" onClick={() => setShowEmail(true)}>
            Enviar por correo
          </Button>
        )}
        {data.status === "aprobada" && (
          <Button variant="primary" onClick={handleConvertInvoice}>
            Convertir a factura
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold mb-2">Cliente</p>
          <p className="text-sm font-medium text-text-primary">{data.client.businessName}</p>
          <p className="text-xs text-text-muted font-mono">{data.client.rfc}</p>
          {data.client.email && <p className="text-xs text-text-muted">{data.client.email}</p>}
        </Card>
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold mb-2">Fechas</p>
          <p className="text-sm text-text-primary">Creada: {new Date(data.createdAt).toLocaleDateString("es-MX")}</p>
          {data.validUntil && <p className="text-xs text-text-muted">Válida hasta: {new Date(data.validUntil).toLocaleDateString("es-MX")}</p>}
          {data.paymentTerms && <p className="text-xs text-text-muted">Pago: {data.paymentTerms}</p>}
          {data.deliveryTerms && <p className="text-xs text-text-muted">Entrega: {data.deliveryTerms}</p>}
        </Card>
      </div>

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
            {data.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{item.concept}</p>
                  {item.description && <p className="text-xs text-text-muted">{item.description}</p>}
                </td>
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
          {Number(data.discountPercent) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Descuento ({data.discountPercent}%)</span>
              <span className="font-mono text-red">-${Number(data.discountAmount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">IVA</span>
            <span className="font-mono">${Number(data.ivaAmount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
          {Number(data.isrRetencion) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Retención ISR</span>
              <span className="font-mono text-red">-${Number(data.isrRetencion).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {Number(data.ivaRetencion) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Retención IVA</span>
              <span className="font-mono text-red">-${Number(data.ivaRetencion).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold pt-2 border-t border-line">
            <span className="text-text-primary">Total</span>
            <span className="font-mono text-signal-400">
              ${Number(data.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </Card>

      {qrUrl && (
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold mb-3">Compartir cotización</p>
          <div className="flex items-center gap-6">
            <Image src={qrUrl} alt="QR" width={100} height={100} className="rounded-lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-secondary mb-2">
                Escanea el código QR o comparte este enlace con tu cliente:
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={publicUrl}
                  className="flex-1 h-9 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm font-mono truncate focus:outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                >
                  Copiar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.push("/cotizaciones")}>Volver</Button>
      </div>

      {showEmail && (
        <EmailModal
          quotationId={data.id}
          clientEmail={data.client.email}
          folio={data.folio}
          onSent={() => { setShowEmail(false); load() }}
          onClose={() => setShowEmail(false)}
        />
      )}
    </div>
  )
}
