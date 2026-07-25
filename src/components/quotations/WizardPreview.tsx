"use client"

import { Button } from "@/components/ui/Button"

interface LineItem {
  id: string
  concept: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  taxType: string
}

interface Props {
  clientName: string
  clientRfc: string
  items: LineItem[]
  paymentTerms: string
  deliveryTerms: string
  notes: string
  termsConditions: string
  onSave: () => void
  onSend: () => void
  saving: boolean
}

export function WizardPreview({
  clientName, clientRfc, items, paymentTerms, deliveryTerms,
  notes, termsConditions, onSave, onSend, saving,
}: Props) {
  const filteredItems = items.filter((i) => i.concept)
  const subtotal = filteredItems.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - i.discountPercent / 100), 0)
  const iva = filteredItems.reduce((s, i) => s + (i.taxType !== "exento" ? i.quantity * i.unitPrice * (1 - i.discountPercent / 100) * 0.16 : 0), 0)
  const total = subtotal + iva

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line overflow-hidden">
        <div className="p-6 border-b border-line bg-ink-900">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">NexaCore</h2>
              <p className="text-sm text-text-muted">Cotización</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-text-primary">{clientName}</p>
              <p className="text-xs text-text-muted font-mono">{clientRfc}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {filteredItems.map((item) => {
            const st = item.quantity * item.unitPrice * (1 - item.discountPercent / 100)
            return (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-line last:border-0">
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.concept}</p>
                  <p className="text-xs text-text-muted">{item.quantity} × ${Number(item.unitPrice).toLocaleString("es-MX")}</p>
                </div>
                <span className="font-mono text-sm">${st.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
            )
          })}

          <div className="pt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Subtotal</span>
              <span className="font-mono">${subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">IVA (16%)</span>
              <span className="font-mono">${iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-line">
              <span className="text-text-primary">Total</span>
              <span className="font-mono text-signal-400">${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {(notes || termsConditions) && (
          <div className="p-6 border-t border-line bg-ink-900/50 space-y-2">
            {notes && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase">Notas</p>
                <p className="text-sm text-text-secondary">{notes}</p>
              </div>
            )}
            {termsConditions && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase">Términos</p>
                <p className="text-sm text-text-secondary">{termsConditions}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {(paymentTerms || deliveryTerms) && (
        <div className="grid grid-cols-2 gap-4">
          {paymentTerms && (
            <div className="p-3 rounded-lg bg-ink-900 border border-line">
              <p className="text-xs text-text-muted">Forma de pago</p>
              <p className="text-sm text-text-primary mt-0.5">{paymentTerms}</p>
            </div>
          )}
          {deliveryTerms && (
            <div className="p-3 rounded-lg bg-ink-900 border border-line">
              <p className="text-xs text-text-muted">Plazo de entrega</p>
              <p className="text-sm text-text-primary mt-0.5">{deliveryTerms}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar borrador"}
        </Button>
        <Button onClick={onSend} disabled={saving}>
          {saving ? "Guardando..." : "Guardar y enviar"}
        </Button>
      </div>
    </div>
  )
}
