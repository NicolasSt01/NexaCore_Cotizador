import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { generateFolio } from "@/lib/taxes"
import { NextResponse } from "next/server"

/**
 * Convierte un cargo (corte revisado) en una factura, que entra al mismo flujo
 * que las facturas de cotización: solicitada → facturada (despacho) → pagada.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const charge = await prisma.charge.findUnique({
    where: { id: Number(id) },
    include: { invoice: true },
  })
  if (!charge) return NextResponse.json({ error: "Cargo no encontrado" }, { status: 404 })
  if (charge.invoice) {
    return NextResponse.json({ error: "Este cargo ya tiene una factura." }, { status: 400 })
  }
  if (charge.status !== "borrador") {
    return NextResponse.json({ error: "Solo un cargo en borrador puede facturarse." }, { status: 400 })
  }
  if (Number(charge.total) <= 0) {
    return NextResponse.json({ error: "El cargo está en cero; captura el uso antes de facturar." }, { status: 400 })
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        chargeId: charge.id,
        folio: generateFolio("F"),
        status: "solicitada",
        subtotal: charge.subtotal,
        iva: charge.iva,
        retenciones: 0,
        total: charge.total,
      },
    })
    await tx.charge.update({ where: { id: charge.id }, data: { status: "facturado" } })
    return inv
  })

  return NextResponse.json(invoice, { status: 201 })
}
