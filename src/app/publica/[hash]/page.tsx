"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

interface PublicQuotation {
  id: number
  folio: string
  status: string
  subtotal: string
  ivaAmount: string
  isrRetencion: string
  ivaRetencion: string
  total: string
  paymentTerms: string | null
  deliveryTerms: string | null
  notes: string | null
  termsConditions: string | null
  validUntil: string | null
  createdAt: string
  client: { businessName: string; rfc: string }
  items: { concept: string; quantity: number; unit: string; unitPrice: string; subtotal: string; total: string }[]
  company?: {
    businessName: string
    brandName: string | null
    logoData: string | null
    logoHeight: number
  } | null
}

/** "NexaCore" → ["Nexa", "Core"]; mismo criterio que el logotipo del PDF. */
function splitWordmark(name: string): [string, string] {
  const m = name.match(/^(.*?[a-záéíóúñ])([A-ZÁÉÍÓÚÑ].*)$/)
  return m ? [m[1], m[2]] : [name, ""]
}

export default function PublicaPage() {
  const { hash } = useParams<{ hash: string }>()
  const [data, setData] = useState<PublicQuotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState("")

  useEffect(() => {
    fetch(`/api/publica/${hash}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false))
  }, [hash])

  async function handleAction(action: string) {
    setActionLoading(true)
    const res = await fetch(`/api/publica/${hash}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      const result = await res.json()
      setData((prev) => prev ? { ...prev, status: result.status } : prev)
      setActionMsg(
        action === "approve"
          ? "Cotización aprobada. Gracias."
          : "Cotización rechazada."
      )
    } else {
      const err = await res.json()
      alert(err.error || "Error al procesar")
    }
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <p className="text-text-muted">Cargando cotización...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Cotización no encontrada</h1>
          <p className="text-text-muted">El enlace no es válido o la cotización fue eliminada.</p>
        </div>
      </div>
    )
  }

  const canAct = data.status === "enviada" || data.status === "vista"

  return (
    <div className="min-h-screen bg-ink-950 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            {data.company?.logoData && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.company.logoData}
                alt={data.company.brandName ?? data.company.businessName}
                style={{ height: `${data.company.logoHeight || 48}px`, width: "auto", maxWidth: "220px", objectFit: "contain" }}
              />
            )}

            {data.company?.brandName?.trim() ? (
              <span
                className="text-text-primary"
                style={{
                  fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: "30px",
                  letterSpacing: "-0.03em",
                  fontVariationSettings: "'opsz' 18",
                  lineHeight: 1,
                }}
              >
                {splitWordmark(data.company.brandName.trim())[0]}
                <span className="text-signal-400">
                  {splitWordmark(data.company.brandName.trim())[1]}
                </span>
              </span>
            ) : (
              !data.company?.logoData && (
                <>
                  <div className="w-10 h-10 rounded-xl bg-signal-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {(data.company?.businessName ?? "NexaCore").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-text-primary">
                    {data.company?.businessName ?? "NexaCore"}
                  </span>
                </>
              )
            )}
          </div>
          <h1 className="text-2xl font-semibold text-text-primary font-mono">{data.folio}</h1>
          <p className="text-text-muted mt-1">Cotización</p>
        </div>

        <div className="rounded-xl border border-line bg-surface-card overflow-hidden">
          <div className="p-6 border-b border-line">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-text-primary">{data.client.businessName}</p>
                <p className="text-xs text-text-muted font-mono">{data.client.rfc}</p>
              </div>
              <Badge variant={
                data.status === "aprobada" ? "green" :
                data.status === "rechazada" ? "red" :
                data.status === "vista" ? "orange" :
                "blue"
              }>
                {data.status === "aprobada" ? "Aprobada" :
                 data.status === "rechazada" ? "Rechazada" :
                 data.status === "vista" ? "Vista" : "Enviada"}
              </Badge>
            </div>
          </div>

          <div className="divide-y divide-line">
            {data.items.map((item, i) => (
              <div key={i} className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.concept}</p>
                  <p className="text-xs text-text-muted">{item.quantity} × ${Number(item.unitPrice).toLocaleString("es-MX")}</p>
                </div>
                <span className="font-mono text-sm">
                  ${Number(item.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-line space-y-1 bg-ink-900/50">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Subtotal</span>
              <span className="font-mono">${Number(data.subtotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
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
        </div>

        {(data.paymentTerms || data.deliveryTerms) && (
          <div className="grid grid-cols-2 gap-4">
            {data.paymentTerms && (
              <div className="p-4 rounded-xl border border-line bg-surface-card">
                <p className="text-xs text-text-muted font-semibold uppercase">Forma de pago</p>
                <p className="text-sm text-text-primary mt-1">{data.paymentTerms}</p>
              </div>
            )}
            {data.deliveryTerms && (
              <div className="p-4 rounded-xl border border-line bg-surface-card">
                <p className="text-xs text-text-muted font-semibold uppercase">Plazo de entrega</p>
                <p className="text-sm text-text-primary mt-1">{data.deliveryTerms}</p>
              </div>
            )}
          </div>
        )}

        {data.notes && (
          <div className="p-4 rounded-xl border border-line bg-surface-card">
            <p className="text-xs text-text-muted font-semibold uppercase">Notas</p>
            <p className="text-sm text-text-secondary mt-1">{data.notes}</p>
          </div>
        )}

        {canAct && !actionMsg && (
          <div className="flex gap-4 justify-center">
            <Button
              variant="secondary"
              onClick={() => handleAction("reject")}
              disabled={actionLoading}
            >
              Rechazar cotización
            </Button>
            <Button
              onClick={() => handleAction("approve")}
              disabled={actionLoading}
            >
              {actionLoading ? "Procesando..." : "Aprobar cotización"}
            </Button>
          </div>
        )}

        {actionMsg && (
          <div className="text-center p-6 rounded-xl bg-signal-500/5 border border-signal-500/20">
            <p className="text-lg font-medium text-text-primary">{actionMsg}</p>
          </div>
        )}

        <p className="text-xs text-text-muted text-center">
          NexaCore Desarrollo e Integración de Sistemas
          {data.createdAt && ` · ${new Date(data.createdAt).toLocaleDateString("es-MX")}`}
        </p>
      </div>
    </div>
  )
}
