import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"
import { getTaxRates, calculateQuotationTotals } from "@/lib/taxes"

/**
 * Recalcula retenciones y total de una cotización existente a partir de las
 * partidas ya guardadas. Devuelve null si la cotización no existe.
 */
async function recalculate(
  id: number,
  applyIsrRetencion?: boolean,
  applyIvaRetencion?: boolean
) {
  const current = await prisma.quotation.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!current) return null

  const rates = await getTaxRates()

  const items = current.items.map((i) => ({
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice),
    discountPercent: Number(i.discountPercent),
    subtotal: Number(i.subtotal),
    iva: Number(i.iva),
    total: Number(i.total),
  }))

  return calculateQuotationTotals(items, Number(current.discountPercent), rates, {
    applyIsrRetencion: applyIsrRetencion ?? current.applyIsrRetencion,
    applyIvaRetencion: applyIvaRetencion ?? current.applyIvaRetencion,
  })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const quotation = await prisma.quotation.findUnique({
    where: { id: Number(id) },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      user: { select: { name: true, email: true } },
      invoice: true,
    },
  })

  if (!quotation) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(quotation)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  const validTransitions: Record<string, string[]> = {
    borrador: ["enviada", "cancelada"],
    enviada: ["vista", "aprobada", "rechazada", "cancelada"],
    vista: ["aprobada", "rechazada"],
    aprobada: ["convertida"],
    rechazada: ["borrador", "cancelada"],
  }

  if (data.status) {
    const current = await prisma.quotation.findUnique({ where: { id: Number(id) } })
    if (current && validTransitions[current.status] && !validTransitions[current.status].includes(data.status)) {
      return NextResponse.json(
        { error: `Transición inválida: ${current.status} → ${data.status}` },
        { status: 400 }
      )
    }
  }

  // Cambiar las retenciones altera el total, así que hay que recalcular a partir
  // de las partidas ya guardadas.
  let totals: Awaited<ReturnType<typeof recalculate>> = null

  if (data.applyIsrRetencion !== undefined || data.applyIvaRetencion !== undefined) {
    totals = await recalculate(
      Number(id),
      data.applyIsrRetencion,
      data.applyIvaRetencion
    )
    if (!totals) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  const quotation = await prisma.quotation.update({
    where: { id: Number(id) },
    data: {
      status: data.status,
      paymentTerms: data.paymentTerms,
      deliveryTerms: data.deliveryTerms,
      notes: data.notes,
      termsConditions: data.termsConditions,
      applyIsrRetencion: data.applyIsrRetencion,
      applyIvaRetencion: data.applyIvaRetencion,
      pdfShowSubtotal: data.pdfShowSubtotal,
      pdfShowDiscount: data.pdfShowDiscount,
      pdfShowIva: data.pdfShowIva,
      pdfShowRetenciones: data.pdfShowRetenciones,
      ...(totals && {
        isrRetencion: totals.isrRetencion,
        ivaRetencion: totals.ivaRetencion,
        total: totals.total,
      }),
    },
  })

  return NextResponse.json(quotation)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  await prisma.quotation.delete({ where: { id: Number(id) } })

  return NextResponse.json({ success: true })
}
