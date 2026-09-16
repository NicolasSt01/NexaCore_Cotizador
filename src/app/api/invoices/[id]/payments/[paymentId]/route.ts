import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

/** Elimina un abono y recalcula el estado de la factura. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id, paymentId } = await params
  const invoice = await prisma.invoice.findUnique({ where: { id: Number(id) }, include: { payments: true } })
  if (!invoice) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })

  const payment = invoice.payments.find((p) => p.id === Number(paymentId))
  if (!payment) return NextResponse.json({ error: "Abono no encontrado" }, { status: 404 })

  await prisma.payment.delete({ where: { id: payment.id } })

  const remaining = invoice.payments.filter((p) => p.id !== payment.id)
  const paid = remaining.reduce((s, p) => s + Number(p.amount), 0)

  // Si ya no se cubre el total y estaba pagada, vuelve a "facturada".
  if (invoice.status === "pagada" && paid < Number(invoice.total)) {
    const lastDate = remaining.length ? remaining.map((p) => p.paidAt).sort().at(-1)! : null
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: invoice.uuid ? "facturada" : "solicitada", paymentDate: lastDate },
    })
  }

  const fresh = await prisma.invoice.findUnique({ where: { id: invoice.id }, include: { payments: { orderBy: { paidAt: "asc" } } } })
  return NextResponse.json(fresh)
}
