import { prisma } from "./prisma"

interface TaxRates {
  ivaRate: number
  isrRetencionRate: number
  ivaRetencionRate: number
}

const DEFAULT_RATES: TaxRates = {
  ivaRate: 0.16,
  isrRetencionRate: 0.10,
  ivaRetencionRate: 0.106666,
}

let cachedRates: TaxRates | null = null

export async function getTaxRates(): Promise<TaxRates> {
  if (cachedRates) return cachedRates
  try {
    const settings = await prisma.companySettings.findFirst()
    if (settings) {
      cachedRates = {
        ivaRate: Number(settings.ivaRate),
        isrRetencionRate: Number(settings.isrRetencionRate),
        ivaRetencionRate: Number(settings.ivaRetencionRate),
      }
      return cachedRates
    }
  } catch {
    // ignore
  }
  return DEFAULT_RATES
}

export function invalidateTaxRates() {
  cachedRates = null
}

export interface TaxCalculationInput {
  quantity: number
  unitPrice: number
  discountPercent: number
  taxType: "iva" | "iva_retencion" | "exento"
}

export interface TaxCalculationResult {
  quantity: number
  unitPrice: number
  discountPercent: number
  subtotal: number
  iva: number
  total: number
}

export function calculateItem(
  input: TaxCalculationInput,
  ivaRate: number = DEFAULT_RATES.ivaRate
): TaxCalculationResult {
  const gross = input.quantity * input.unitPrice
  const discountAmount = gross * (input.discountPercent / 100)
  const subtotal = gross - discountAmount
  const iva = input.taxType === "exento" ? 0 : subtotal * ivaRate
  const total = input.taxType === "exento" ? subtotal : subtotal + iva

  return {
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    discountPercent: input.discountPercent,
    subtotal: Math.round(subtotal * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

export interface QuotationTotals {
  itemsSubtotal: number
  discountPercent: number
  discountAmount: number
  subtotal: number
  ivaAmount: number
  isrRetencion: number
  ivaRetencion: number
  total: number
}

export interface RetencionOptions {
  /** Retención de ISR (10%). Solo aplica si una persona física factura a una moral. */
  applyIsrRetencion?: boolean
  /** Retención de IVA (dos terceras partes del IVA trasladado). Mismo supuesto. */
  applyIvaRetencion?: boolean
}

export function calculateQuotationTotals(
  items: TaxCalculationResult[],
  discountPercent: number,
  rates?: TaxRates,
  options: RetencionOptions = {}
): QuotationTotals {
  const r = rates ?? DEFAULT_RATES
  const itemsSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0)
  const discountAmount = itemsSubtotal * (discountPercent / 100)
  const subtotal = itemsSubtotal - discountAmount
  const ivaAmount = items.reduce((sum, i) => sum + i.iva, 0) * (1 - discountPercent / 100)

  // Por defecto no se retiene nada: el total es subtotal + IVA.
  const isrRetencion = options.applyIsrRetencion ? subtotal * r.isrRetencionRate : 0
  const ivaRetencion = options.applyIvaRetencion
    ? ivaAmount * (r.ivaRetencionRate / r.ivaRate)
    : 0

  const total = subtotal + ivaAmount - isrRetencion - ivaRetencion

  return {
    itemsSubtotal: Math.round(itemsSubtotal * 100) / 100,
    discountPercent,
    discountAmount: Math.round(discountAmount * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    ivaAmount: Math.round(ivaAmount * 100) / 100,
    isrRetencion: Math.round(isrRetencion * 100) / 100,
    ivaRetencion: Math.round(ivaRetencion * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

/**
 * Folio consecutivo por año y prefijo: COT-2026-0001, COT-2026-0002…; las
 * facturas usan F-2026-0001. Reinicia cada año. Toma el mayor folio existente de
 * ese prefijo+año y le suma 1 (COT se busca en cotizaciones, F en facturas).
 *
 * Nota: con concurrencia muy alta dos altas simultáneas podrían calcular el
 * mismo número; el índice único del folio haría fallar la segunda. Para el uso
 * previsto (equipo pequeño) es suficiente.
 */
export async function generateFolio(
  prefix: string = "COT",
  year: number = new Date().getFullYear()
): Promise<string> {
  const like = `${prefix}-${year}-`

  const folios =
    prefix === "F"
      ? (await prisma.invoice.findMany({ where: { folio: { startsWith: like } }, select: { folio: true } })).map((r) => r.folio)
      : (await prisma.quotation.findMany({ where: { folio: { startsWith: like } }, select: { folio: true } })).map((r) => r.folio)

  let max = 0
  for (const f of folios) {
    const n = parseInt(f.slice(like.length), 10)
    if (!Number.isNaN(n) && n > max) max = n
  }

  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`
}

export { RFC_PUBLICO_GENERAL, RFC_EXTRANJERO } from "@/types"

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/

export function validateRFC(rfc: string): boolean {
  return RFC_REGEX.test(rfc.toUpperCase())
}

const CURP_REGEX = /^[A-Z]{4}\d{6}[H,M][A-Z]{5}[A-Z0-9]{2}$/

export function validateCURP(curp: string): boolean {
  return CURP_REGEX.test(curp.toUpperCase())
}
