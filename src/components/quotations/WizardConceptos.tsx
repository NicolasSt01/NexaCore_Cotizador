"use client"

import { useEffect, useState } from "react"

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

/** Servicio/producto del catálogo (/productos) para prellenar partidas. */
interface CatalogProduct {
  id: number
  name: string
  description: string | null
  unitPrice: string
  unit: string
  taxType: string
  active: boolean
}

interface Props {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
}

let nextId = 1
function newItem(): LineItem {
  return {
    id: String(nextId++),
    productId: null,
    concept: "",
    description: "",
    quantity: 1,
    unit: "pieza",
    unitPrice: 0,
    discountPercent: 0,
    taxType: "iva",
  }
}

/** Convierte un producto del catálogo en una partida lista para cotizar. */
function itemFromProduct(p: CatalogProduct): LineItem {
  const taxType =
    p.taxType === "iva_retencion" || p.taxType === "exento" ? p.taxType : "iva"
  return {
    id: String(nextId++),
    productId: p.id,
    concept: p.name,
    description: p.description ?? "",
    quantity: 1,
    unit: p.unit || "pieza",
    unitPrice: Number(p.unitPrice),
    discountPercent: 0,
    taxType,
  }
}

export function WizardConceptos({ items, onChange }: Props) {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])

  useEffect(() => {
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CatalogProduct[]) => setCatalog(data.filter((p) => p.active)))
      .catch(() => setCatalog([]))
  }, [])

  function addFromCatalog(productId: number) {
    const p = catalog.find((c) => c.id === productId)
    if (p) onChange([...items, itemFromProduct(p)])
  }

  function updateItem(id: string, fn: (item: LineItem) => LineItem) {
    onChange(items.map((i) => (i.id === id ? fn(i) : i)))
  }

  function addItem() {
    onChange([...items, newItem()])
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id))
  }

  function subtotal(item: LineItem) {
    return item.quantity * item.unitPrice * (1 - item.discountPercent / 100)
  }

  const grandTotal = items.reduce((sum, i) => sum + subtotal(i), 0)

  return (
    <div className="space-y-3">
      {catalog.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-line bg-ink-900/40">
          <label className="text-xs text-text-muted whitespace-nowrap">
            Agregar del catálogo
          </label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addFromCatalog(Number(e.target.value))
              e.target.value = ""
            }}
            className="flex-1 h-9 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40"
          >
            <option value="">Elegir un servicio…</option>
            {catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ${Number(p.unitPrice).toLocaleString("es-MX")} / {p.unit}
              </option>
            ))}
          </select>
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="p-4 rounded-lg border border-line space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <input
              placeholder="Concepto"
              value={item.concept}
              onChange={(e) => updateItem(item.id, (i) => ({ ...i, concept: e.target.value }))}
              className="h-9 px-3 rounded-lg bg-ink-900 border border-line text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-sm"
            />
            <button
              onClick={() => removeItem(item.id)}
              className="p-2 rounded-md text-text-muted hover:text-red transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Cantidad</label>
              <input
                type="number" min="1"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, (i) => ({ ...i, quantity: Number(e.target.value) }))}
                className="w-full h-9 px-3 rounded-lg bg-ink-900 border border-line text-text-primary focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Unidad</label>
              <select
                value={item.unit}
                onChange={(e) => updateItem(item.id, (i) => ({ ...i, unit: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg bg-ink-900 border border-line text-text-primary focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-sm"
              >
                <option value="pieza">Pieza</option><option value="servicio">Servicio</option>
                <option value="hora">Hora</option><option value="día">Día</option>
                <option value="mes">Mes</option><option value="proyecto">Proyecto</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Precio unit.</label>
              <input
                type="number" step="0.01" min="0"
                value={item.unitPrice}
                onChange={(e) => updateItem(item.id, (i) => ({ ...i, unitPrice: Number(e.target.value) }))}
                className="w-full h-9 px-3 rounded-lg bg-ink-900 border border-line text-text-primary focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Desc. %</label>
              <input
                type="number" step="0.1" min="0" max="100"
                value={item.discountPercent}
                onChange={(e) => updateItem(item.id, (i) => ({ ...i, discountPercent: Number(e.target.value) }))}
                className="w-full h-9 px-3 rounded-lg bg-ink-900 border border-line text-text-primary focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Subtotal</label>
              <div className="h-9 flex items-center text-sm font-mono text-text-primary">
                ${subtotal(item).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={item.taxType}
              onChange={(e) => updateItem(item.id, (i) => ({ ...i, taxType: e.target.value as "iva" | "iva_retencion" | "exento" }))}
              className="h-8 px-2 rounded-md bg-ink-900 border border-line text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-signal-500/40"
            >
              <option value="iva">IVA 16%</option>
              <option value="iva_retencion">IVA + Retención</option>
              <option value="exento">Exento</option>
            </select>
          </div>
        </div>
      ))}

      <button
        onClick={addItem}
        className="w-full py-3 rounded-lg border border-dashed border-line text-text-muted hover:text-signal-400 hover:border-signal-500/50 transition-colors text-sm"
      >
        + Agregar concepto
      </button>

      {items.length > 0 && (
        <div className="text-right pt-2">
          <p className="text-sm text-text-muted">
            <span className="font-semibold text-text-primary">Total:</span>{" "}
            <span className="font-mono text-lg">
              ${grandTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
