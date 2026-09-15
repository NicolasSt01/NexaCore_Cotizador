import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
    ]
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
  })

  return NextResponse.json(products)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const data = await req.json()

  const exists = await prisma.product.findUnique({ where: { sku: data.sku } })
  if (exists) {
    return NextResponse.json({ error: "Ya existe un producto con ese SKU" }, { status: 409 })
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description || null,
      unitPrice: Number(data.unitPrice),
      taxType: data.taxType || "iva",
      unit: data.unit || "pieza",
      sku: data.sku,
      active: data.active !== false,
    },
  })

  return NextResponse.json(product, { status: 201 })
}
