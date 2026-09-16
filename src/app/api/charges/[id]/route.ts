import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { getTaxRates } from "@/lib/taxes"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const charge = await prisma.charge.findUnique({
    where: { id: Number(id) },
    include: {
      lines: { orderBy: { id: "asc" } },
      contract: { include: { client: true } },
      invoice: { select: { id: true, folio: true, status: true } },
    },
  })

  if (!charge) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(charge)
}

/**
 * Edita el cargo en borrador: captura del uso (cantidades por línea) y notas.
 * Recalcula subtotal/IVA/total. También permite cancelar el cargo.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  const charge = await prisma.charge.findUnique({ where: { id: Number(id) }, include: { lines: true } })
  if (!charge) return NextResponse.json({ error: "Cargo no encontrado" }, { status: 404 })

  if (data.action === "cancel") {
    if (charge.status === "facturado") {
      return NextResponse.json({ error: "No se puede cancelar un cargo ya facturado." }, { status: 400 })
    }
    const updated = await prisma.charge.update({ where: { id: Number(id) }, data: { status: "cancelado" } })
    return NextResponse.json(updated)
  }

  if (charge.status !== "borrador") {
    return NextResponse.json({ error: "Solo se puede editar un cargo en borrador." }, { status: 400 })
  }

  const { ivaRate } = await getTaxRates()

  // Mapa id → cantidad nueva (uso capturado).
  const qtyById = new Map<number, number>()
  if (Array.isArray(data.lines)) {
    for (const l of data.lines as { id: number; quantity: number }[]) {
      qtyById.set(Number(l.id), Number(l.quantity) || 0)
    }
  }

  const updatedLines = charge.lines.map((l) => {
    const quantity = qtyById.has(l.id) ? qtyById.get(l.id)! : Number(l.quantity)
    const subtotal = Math.round(quantity * Number(l.unitPrice) * 100) / 100
    return { ...l, quantity, subtotal }
  })

  const subtotal = updatedLines.reduce((s, l) => s + l.subtotal, 0)
  const iva = updatedLines.reduce((s, l) => s + (l.taxType === "exento" ? 0 : l.subtotal * ivaRate), 0)

  await prisma.$transaction([
    ...updatedLines.map((l) =>
      prisma.chargeLine.update({ where: { id: l.id }, data: { quantity: l.quantity, subtotal: l.subtotal } })
    ),
    prisma.charge.update({
      where: { id: Number(id) },
      data: {
        subtotal: Math.round(subtotal * 100) / 100,
        iva: Math.round(iva * 100) / 100,
        total: Math.round((subtotal + iva) * 100) / 100,
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    }),
  ])

  const fresh = await prisma.charge.findUnique({
    where: { id: Number(id) },
    include: { lines: { orderBy: { id: "asc" } }, contract: { include: { client: true } }, invoice: { select: { id: true, folio: true, status: true } } },
  })
  return NextResponse.json(fresh)
}
