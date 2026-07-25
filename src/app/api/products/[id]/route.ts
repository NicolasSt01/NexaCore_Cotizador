import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const product = await prisma.product.findUnique({ where: { id: Number(id) } })
  if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  return NextResponse.json(product)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  const product = await prisma.product.update({
    where: { id: Number(id) },
    data: {
      name: data.name,
      description: data.description,
      unitPrice: data.unitPrice !== undefined ? Number(data.unitPrice) : undefined,
      taxType: data.taxType,
      unit: data.unit,
      active: data.active,
    },
  })

  return NextResponse.json(product)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  await prisma.product.delete({ where: { id: Number(id) } })

  return NextResponse.json({ success: true })
}
