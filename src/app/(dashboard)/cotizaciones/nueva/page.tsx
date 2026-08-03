"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { WizardCliente } from "@/components/quotations/WizardCliente"
import { WizardConceptos } from "@/components/quotations/WizardConceptos"
import { WizardFiscal } from "@/components/quotations/WizardFiscal"
import { WizardPreview } from "@/components/quotations/WizardPreview"

const STEPS = ["Cliente", "Conceptos", "Configuración", "Vista previa"]

interface LineItem {
  id: string
  productId: number | null
  concept: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  taxType: "iva" | "iva_retencion" | "exento"
}

export default function NuevaCotizacionPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [clients, setClients] = useState<{ id: number; businessName: string; rfc: string }[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [clientId, setClientId] = useState<number | null>(null)
  const [items, setItems] = useState<LineItem[]>([])
  const [paymentTerms, setPaymentTerms] = useState("")
  const [deliveryTerms, setDeliveryTerms] = useState("")
  const [notes, setNotes] = useState("")
  const [termsConditions, setTermsConditions] = useState("")
  const [applyIsrRetencion, setApplyIsrRetencion] = useState(false)
  const [applyIvaRetencion, setApplyIvaRetencion] = useState(false)

  // Las tasas vienen de Configuración; sin ellas la vista previa mostraría un
  // total distinto al que calcula el servidor al guardar.
  const [rates, setRates] = useState({ ivaRate: 0.16, isrRate: 0.1, ivaRetencionRate: 0.106666 })

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/clients")
    if (res.ok) setClients(await res.json())
  }, [])

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/settings")
    if (!res.ok) return
    const s = await res.json()
    if (!s) return
    setRates({
      ivaRate: Number(s.ivaRate ?? 0.16),
      isrRate: Number(s.isrRetencionRate ?? 0.1),
      ivaRetencionRate: Number(s.ivaRetencionRate ?? 0.106666),
    })
    setNotes((n) => n || s.defaultNotes || "")
    setTermsConditions((t) => t || s.defaultTerms || "")
  }, [])

  useEffect(() => { loadClients() }, [loadClients])
  useEffect(() => { loadSettings() }, [loadSettings])

  const filteredClients = clients.filter(
    (c) =>
      c.businessName.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.rfc.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const selectedClient = clients.find((c) => c.id === clientId)

  async function handleSave(status: string) {
    if (!clientId) return
    setSaving(true)
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          status,
          paymentTerms,
          deliveryTerms,
          notes,
          termsConditions,
          applyIsrRetencion,
          applyIvaRetencion,
          items: items.filter((i) => i.concept).map((i) => ({
            productId: i.productId,
            concept: i.concept,
            description: i.description,
            quantity: i.quantity,
            unit: i.unit,
            unitPrice: i.unitPrice,
            discountPercent: i.discountPercent,
            taxType: i.taxType,
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/cotizaciones/${data.id}`)
      } else {
        const err = await res.json()
        alert(err.error || "Error al guardar")
      }
    } catch {
      alert("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Nueva cotización</h1>

      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => i < step && setStep(i)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              i === step
                ? "bg-signal-600 text-white"
                : i < step
                ? "bg-signal-600/10 text-signal-400 cursor-pointer"
                : "bg-ink-900 text-text-muted cursor-default"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="min-h-[300px]">
        {step === 0 && (
          <WizardCliente
            clientId={clientId}
            onSelect={setClientId}
            clients={filteredClients}
            loading={false}
            search={clientSearch}
            onSearchChange={setClientSearch}
            onNewClient={() => router.push("/clientes")}
          />
        )}
        {step === 1 && (
          <WizardConceptos items={items} onChange={setItems} />
        )}
        {step === 2 && (
          <WizardFiscal
            paymentTerms={paymentTerms}
            deliveryTerms={deliveryTerms}
            notes={notes}
            termsConditions={termsConditions}
            onChange={(field, value) => {
              const setters: Record<string, (v: string) => void> = {
                paymentTerms: setPaymentTerms,
                deliveryTerms: setDeliveryTerms,
                notes: setNotes,
                termsConditions: setTermsConditions,
              }
              setters[field]?.(value)
            }}
            applyIsrRetencion={applyIsrRetencion}
            applyIvaRetencion={applyIvaRetencion}
            onToggleRetencion={(field, value) =>
              field === "applyIsrRetencion"
                ? setApplyIsrRetencion(value)
                : setApplyIvaRetencion(value)
            }
            isrRate={rates.isrRate}
            ivaRetencionRate={rates.ivaRetencionRate}
          />
        )}
        {step === 3 && (
          <WizardPreview
            clientName={selectedClient?.businessName ?? ""}
            clientRfc={selectedClient?.rfc ?? ""}
            items={items}
            paymentTerms={paymentTerms}
            deliveryTerms={deliveryTerms}
            notes={notes}
            termsConditions={termsConditions}
            onSave={() => handleSave("borrador")}
            onSend={() => handleSave("enviada")}
            saving={saving}
            ivaRate={rates.ivaRate}
            isrRate={rates.isrRate}
            ivaRetencionRate={rates.ivaRetencionRate}
            applyIsrRetencion={applyIsrRetencion}
            applyIvaRetencion={applyIvaRetencion}
          />
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-line">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
        >
          Anterior
        </button>
        <button
          onClick={() => {
            if (step === 0 && !clientId) return
            if (step === 1 && items.filter((i) => i.concept).length === 0) return
            setStep(Math.min(STEPS.length - 1, step + 1))
          }}
          disabled={
            (step === 0 && !clientId) ||
            (step === 1 && items.filter((i) => i.concept).length === 0)
          }
          className="px-6 py-2 rounded-lg bg-signal-600 text-white text-sm font-medium hover:bg-signal-700 disabled:opacity-30 transition-colors"
        >
          {step === STEPS.length - 1 ? "Finalizar" : "Siguiente"}
        </button>
      </div>
    </div>
  )
}
