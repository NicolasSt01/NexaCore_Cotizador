import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"
import { generateFolio, getTaxRates, calculateItem, calculateQuotationTotals } from "@/lib/taxes"
import { generatePublicHash } from "@/lib/qr"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { folio: { contains: search } },
      { client: { businessName: { contains: search } } },
    ]
  }

  const quotations = await prisma.quotation.findMany({
    where,
    include: { client: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(quotations)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const data = await req.json()
  const rates = await getTaxRates()

  const items = data.items.map((item: Record<string, unknown>) =>
    calculateItem(
      {
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent || 0),
        taxType: item.taxType as "iva" | "iva_retencion" | "exento" || "iva",
      },
      rates.ivaRate
    )
  )

  const totals = calculateQuotationTotals(items, Number(data.discountPercent || 0), rates)

  const quotation = await prisma.quotation.create({
    data: {
      folio: generateFolio(),
      clientId: Number(data.clientId),
      publicHash: generatePublicHash(),
      userId: Number(session.user.id),
      status: "borrador",
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      paymentTerms: data.paymentTerms || null,
      deliveryTerms: data.deliveryTerms || null,
      notes: data.notes || null,
      termsConditions: data.termsConditions || null,
      subtotal: totals.subtotal,
      discountPercent: totals.discountPercent,
      discountAmount: totals.discountAmount,
      ivaAmount: totals.ivaAmount,
      isrRetencion: totals.isrRetencion,
      ivaRetencion: totals.ivaRetencion,
      total: totals.total,
      currency: data.currency || "MXN",
      items: {
        create: data.items.map((item: Record<string, unknown>, idx: number) => ({
          productId: item.productId ? Number(item.productId) : null,
          concept: item.concept as string,
          description: (item.description as string) || null,
          quantity: Number(item.quantity),
          unit: (item.unit as string) || "pieza",
          unitPrice: Number(item.unitPrice),
          discountPercent: Number(item.discountPercent || 0),
          subtotal: items[idx].subtotal,
          iva: items[idx].iva,
          total: items[idx].total,
          sortOrder: idx,
        })),
      },
    },
    include: { client: true, items: true },
  })

  return NextResponse.json(quotation, { status: 201 })
}
