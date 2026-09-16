import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { getTaxRates } from "@/lib/taxes"
import { NextResponse } from "next/server"

/**
 * Genera el cargo (corte) de un periodo para un contrato. Nace como "borrador":
 * los conceptos fijos entran con cantidad 1 y los de uso con cantidad 0 para que
 * captures el uso del mes antes de facturarlo.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const { periodYear, periodMonth } = await req.json()
  const year = Number(periodYear)
  const month = Number(periodMonth)
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Periodo inválido" }, { status: 400 })
  }

  const contract = await prisma.contract.findUnique({
    where: { id: Number(id) },
    include: { items: { where: { active: true } } },
  })
  if (!contract) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })

  const existing = await prisma.charge.findUnique({
    where: { contractId_periodYear_periodMonth: { contractId: contract.id, periodYear: year, periodMonth: month } },
  })
  if (existing) {
    return NextResponse.json({ error: "Ya existe un cargo para ese periodo.", chargeId: existing.id }, { status: 409 })
  }

  const { ivaRate } = await getTaxRates()

  const lines = contract.items.map((it) => {
    const quantity = it.kind === "uso" ? 0 : 1
    const subtotal = quantity * Number(it.unitPrice)
    return {
      concept: it.concept,
      kind: it.kind,
      quantity,
      unitPrice: Number(it.unitPrice),
      unit: it.unit,
      taxType: it.taxType,
      subtotal: Math.round(subtotal * 100) / 100,
    }
  })

  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0)
  const iva = lines.reduce((s, l) => s + (l.taxType === "exento" ? 0 : l.subtotal * ivaRate), 0)

  const charge = await prisma.charge.create({
    data: {
      contractId: contract.id,
      periodYear: year,
      periodMonth: month,
      status: "borrador",
      subtotal: Math.round(subtotal * 100) / 100,
      iva: Math.round(iva * 100) / 100,
      total: Math.round((subtotal + iva) * 100) / 100,
      lines: { create: lines },
    },
    include: { lines: true },
  })

  return NextResponse.json(charge, { status: 201 })
}
