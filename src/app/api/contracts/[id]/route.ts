import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const contract = await prisma.contract.findUnique({
    where: { id: Number(id) },
    include: {
      client: true,
      items: { orderBy: { id: "asc" } },
      charges: { orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }], include: { invoice: { select: { id: true, folio: true, status: true } } } },
    },
  })

  if (!contract) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(contract)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  // Actualiza campos del contrato. Si viene `items`, reemplaza el catálogo de
  // conceptos (los cargos ya generados guardan su propia copia, no se afectan).
  const updated = await prisma.$transaction(async (tx) => {
    await tx.contract.update({
      where: { id: Number(id) },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.billingDay !== undefined && { billingDay: Number(data.billingDay) || 1 }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    })

    if (Array.isArray(data.items)) {
      await tx.contractItem.deleteMany({ where: { contractId: Number(id) } })
      for (const i of data.items as Record<string, unknown>[]) {
        if (!i.concept) continue
        await tx.contractItem.create({
          data: {
            contractId: Number(id),
            concept: i.concept as string,
            kind: (i.kind as string) === "uso" ? "uso" : "fijo",
            unitPrice: Number(i.unitPrice) || 0,
            unit: (i.unit as string) || (((i.kind as string) === "uso") ? "operación" : "mes"),
            taxType: (i.taxType as string) === "exento" ? "exento" : "iva",
          },
        })
      }
    }

    return tx.contract.findUnique({
      where: { id: Number(id) },
      include: { items: true, client: true },
    })
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const charges = await prisma.charge.count({ where: { contractId: Number(id) } })
  if (charges > 0) {
    return NextResponse.json(
      { error: "No se puede borrar: el contrato ya tiene cargos generados. Cámbialo a 'cancelado'." },
      { status: 400 }
    )
  }
  await prisma.contract.delete({ where: { id: Number(id) } })
  return NextResponse.json({ success: true })
}
