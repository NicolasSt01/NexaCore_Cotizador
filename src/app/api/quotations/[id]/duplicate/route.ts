import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { generateFolio, getTaxRates, calculateQuotationTotals } from "@/lib/taxes"
import { generatePublicHash } from "@/lib/qr"
import { logQuotationChange } from "@/lib/audit"
import { NextResponse } from "next/server"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const source = await prisma.quotation.findUnique({
    where: { id: Number(id) },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  })

  if (!source) {
    return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 })
  }

  const rates = await getTaxRates()

  // Las partidas copian sus subtotales/IVA ya calculados; solo se recalculan
  // los totales de la cotización con las tasas vigentes.
  const items = source.items.map((i) => ({
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice),
    discountPercent: Number(i.discountPercent),
    subtotal: Number(i.subtotal),
    iva: Number(i.iva),
    total: Number(i.total),
  }))

  const totals = calculateQuotationTotals(items, Number(source.discountPercent), rates, {
    applyIsrRetencion: source.applyIsrRetencion,
    applyIvaRetencion: source.applyIvaRetencion,
  })

  const clone = await prisma.quotation.create({
    data: {
      folio: generateFolio(),
      clientId: source.clientId,
      publicHash: generatePublicHash(),
      userId: Number(session.user.id),
      status: "borrador",
      validUntil: source.validUntil,
      paymentTerms: source.paymentTerms,
      deliveryTerms: source.deliveryTerms,
      notes: source.notes,
      termsConditions: source.termsConditions,
      subtotal: totals.subtotal,
      discountPercent: totals.discountPercent,
      discountAmount: totals.discountAmount,
      ivaAmount: totals.ivaAmount,
      isrRetencion: totals.isrRetencion,
      ivaRetencion: totals.ivaRetencion,
      total: totals.total,
      applyIsrRetencion: source.applyIsrRetencion,
      applyIvaRetencion: source.applyIvaRetencion,
      pdfShowSubtotal: source.pdfShowSubtotal,
      pdfShowDiscount: source.pdfShowDiscount,
      pdfShowIva: source.pdfShowIva,
      pdfShowRetenciones: source.pdfShowRetenciones,
      currency: source.currency,
      items: {
        create: source.items.map((item, idx) => ({
          productId: item.productId,
          concept: item.concept,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          subtotal: items[idx].subtotal,
          iva: items[idx].iva,
          total: items[idx].total,
          sortOrder: idx,
        })),
      },
    },
    include: { items: true },
  })

  await logQuotationChange({
    quotationId: clone.id,
    userId: Number(session.user.id),
    toStatus: "borrador",
    note: `Copia de ${source.folio}`,
  })

  return NextResponse.json(clone, { status: 201 })
}