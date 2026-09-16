import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

/** Registra un abono (pago parcial o total) a una factura. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const amount = Math.round((Number(body.amount) || 0) * 100) / 100
  if (amount <= 0) return NextResponse.json({ error: "El importe del abono debe ser mayor a cero." }, { status: 400 })

  const invoice = await prisma.invoice.findUnique({ where: { id: Number(id) }, include: { payments: true } })
  if (!invoice) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
  if (invoice.status === "cancelada") {
    return NextResponse.json({ error: "La factura está cancelada." }, { status: 400 })
  }

  const paidAt = body.paidAt ? new Date(body.paidAt) : new Date()

  await prisma.payment.create({
    data: { invoiceId: invoice.id, amount, paidAt, method: body.method || null, note: body.note || null },
  })

  // Recalcula: si con este abono se cubre el total, la factura queda pagada.
  const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0) + amount
  if (paid >= Number(invoice.total)) {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "pagada", paymentDate: paidAt } })
  }

  const fresh = await prisma.invoice.findUnique({ where: { id: invoice.id }, include: { payments: { orderBy: { paidAt: "asc" } } } })
  return NextResponse.json(fresh)
}
