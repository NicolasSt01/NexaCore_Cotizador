"use client"

interface Props {
  paymentTerms: string
  deliveryTerms: string
  notes: string
  termsConditions: string
  onChange: (field: string, value: string) => void
  applyIsrRetencion: boolean
  applyIvaRetencion: boolean
  onToggleRetencion: (field: "applyIsrRetencion" | "applyIvaRetencion", value: boolean) => void
  isrRate: number
  ivaRetencionRate: number
}

export function WizardFiscal({
  paymentTerms, deliveryTerms, notes, termsConditions, onChange,
  applyIsrRetencion, applyIvaRetencion, onToggleRetencion, isrRate, ivaRetencionRate,
}: Props) {
  const pct = (r: number) => `${(r * 100).toFixed(4).replace(/\.?0+$/, "")}%`

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-line bg-ink-900/50 space-y-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Retenciones</p>
          <p className="text-xs text-text-muted mt-0.5">
            Actívalas solo si eres persona física y le facturas a una persona moral.
            Se restan del total.
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={applyIsrRetencion}
            onChange={(e) => onToggleRetencion("applyIsrRetencion", e.target.checked)}
            className="w-4 h-4 accent-signal-600"
          />
          <span className="text-sm text-text-secondary">
            Retener ISR ({pct(isrRate)} del subtotal)
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={applyIvaRetencion}
            onChange={(e) => onToggleRetencion("applyIvaRetencion", e.target.checked)}
            className="w-4 h-4 accent-signal-600"
          />
          <span className="text-sm text-text-secondary">
            Retener IVA ({pct(ivaRetencionRate)} del subtotal)
          </span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Forma de pago</label>
          <select
            value={paymentTerms}
            onChange={(e) => onChange("paymentTerms", e.target.value)}
            className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary focus:outline-none focus:ring-2 focus:ring-signal-500/40"
          >
            <option value="">Seleccionar...</option>
            <option value="Pago de contado">Pago de contado</option>
            <option value="Pago a 15 días">Pago a 15 días</option>
            <option value="Pago a 30 días">Pago a 30 días</option>
            <option value="Pago a 60 días">Pago a 60 días</option>
            <option value="50% anticipo, 50% contra entrega">50% anticipo, 50% contra entrega</option>
            <option value="Transferencia electrónica">Transferencia electrónica</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Plazo de entrega</label>
          <select
            value={deliveryTerms}
            onChange={(e) => onChange("deliveryTerms", e.target.value)}
            className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary focus:outline-none focus:ring-2 focus:ring-signal-500/40"
          >
            <option value="">Seleccionar...</option>
            <option value="Inmediato">Inmediato</option>
            <option value="5 días hábiles">5 días hábiles</option>
            <option value="10 días hábiles">10 días hábiles</option>
            <option value="15 días hábiles">15 días hábiles</option>
            <option value="30 días hábiles">30 días hábiles</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => onChange("notes", e.target.value)}
          rows={3}
          placeholder="Notas adicionales para el cliente..."
          className="w-full px-3 py-2 rounded-lg bg-ink-900 border border-line text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-sm resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">Términos y condiciones</label>
        <textarea
          value={termsConditions}
          onChange={(e) => onChange("termsConditions", e.target.value)}
          rows={3}
          placeholder="Términos y condiciones de la cotización..."
          className="w-full px-3 py-2 rounded-lg bg-ink-900 border border-line text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-sm resize-none"
        />
      </div>
    </div>
  )
}
