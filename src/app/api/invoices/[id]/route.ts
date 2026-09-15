import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const invoice = await prisma.invoice.findUnique({
    where: { id: Number(id) },
    include: {
      quotation: {
        include: {
          client: true,
          items: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  })

  if (!invoice) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  return NextResponse.json(invoice)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const { action, dueDate } = await req.json()

  const invoice = await prisma.invoice.findUnique({ where: { id: Number(id) } })
  if (!invoice) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })

  if (action === "pay") {
    if (invoice.status === "pagada") {
      return NextResponse.json({ error: "La factura ya está pagada" }, { status: 400 })
    }
    const updated = await prisma.invoice.update({
      where: { id: Number(id) },
      data: { status: "pagada", paymentDate: new Date() },
    })
    return NextResponse.json(updated)
  }

  if (action === "reopen") {
    if (invoice.status !== "pagada") {
      return NextResponse.json({ error: "La factura no está pagada" }, { status: 400 })
    }
    const updated = await prisma.invoice.update({
      where: { id: Number(id) },
      data: { status: "pendiente", paymentDate: null },
    })
    return NextResponse.json(updated)
  }

  if (action === "dueDate" && dueDate) {
    const updated = await prisma.invoice.update({
      where: { id: Number(id) },
      data: { dueDate: new Date(dueDate) },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
}