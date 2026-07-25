"use client"

interface Props {
  paymentTerms: string
  deliveryTerms: string
  notes: string
  termsConditions: string
  onChange: (field: string, value: string) => void
}

export function WizardFiscal({
  paymentTerms, deliveryTerms, notes, termsConditions, onChange,
}: Props) {
  return (
    <div className="space-y-4">
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
