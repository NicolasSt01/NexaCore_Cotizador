import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { generateFolio } from "@/lib/taxes"
import { logQuotationChange } from "@/lib/audit"
import { NextResponse } from "next/server"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const quotation = await prisma.quotation.findUnique({
    where: { id: Number(id) },
    include: { invoice: true },
  })

  if (!quotation) {
    return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 })
  }

  if (quotation.status !== "aprobada") {
    return NextResponse.json({ error: "Solo cotizaciones aprobadas pueden convertirse" }, { status: 400 })
  }

  if (quotation.invoice) {
    return NextResponse.json({ error: "Ya tiene una factura asociada" }, { status: 400 })
  }

  const invoiceFolio = generateFolio("F")

  const invoice = await prisma.invoice.create({
    data: {
      quotationId: quotation.id,
      folio: invoiceFolio,
      status: "pendiente",
      dueDate: quotation.validUntil,
      subtotal: quotation.subtotal,
      iva: quotation.ivaAmount,
      retenciones: quotation.isrRetencion.add(quotation.ivaRetencion),
      total: quotation.total,
    },
  })

  await prisma.quotation.update({
    where: { id: Number(id) },
    data: { status: "convertida" },
  })

  await logQuotationChange({
    quotationId: Number(id),
    userId: Number(session.user.id),
    fromStatus: "aprobada",
    toStatus: "convertida",
    note: `Convertida a factura ${invoiceFolio}`,
  })

  return NextResponse.json(invoice)
}
