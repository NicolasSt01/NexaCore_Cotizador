import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

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

  const quotation = await prisma.quotation.update({
    where: { id: Number(id) },
    data: {
      status: data.status,
      paymentTerms: data.paymentTerms,
      deliveryTerms: data.deliveryTerms,
      notes: data.notes,
      termsConditions: data.termsConditions,
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
