import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

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
      { name: { contains: search } },
      { client: { businessName: { contains: search } } },
    ]
  }

  const contracts = await prisma.contract.findMany({
    where,
    include: {
      client: { select: { id: true, businessName: true, rfc: true } },
      items: { where: { active: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(contracts)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const data = await req.json()
  if (!data.clientId || !data.name) {
    return NextResponse.json({ error: "Faltan cliente y nombre del contrato" }, { status: 400 })
  }

  const items = Array.isArray(data.items) ? data.items : []

  const contract = await prisma.contract.create({
    data: {
      clientId: Number(data.clientId),
      name: data.name,
      status: data.status || "activo",
      billingDay: Number(data.billingDay) || 1,
      currency: data.currency || "MXN",
      notes: data.notes || null,
      items: {
        create: items
          .filter((i: Record<string, unknown>) => i.concept)
          .map((i: Record<string, unknown>) => ({
            concept: i.concept as string,
            kind: (i.kind as string) === "uso" ? "uso" : "fijo",
            unitPrice: Number(i.unitPrice) || 0,
            unit: (i.unit as string) || (((i.kind as string) === "uso") ? "operación" : "mes"),
            taxType: (i.taxType as string) === "exento" ? "exento" : "iva",
          })),
      },
    },
    include: { items: true, client: true },
  })

  return NextResponse.json(contract, { status: 201 })
}
