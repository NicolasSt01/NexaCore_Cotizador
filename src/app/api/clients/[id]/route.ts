import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const client = await prisma.client.findUnique({
    where: { id: Number(id) },
    include: {
      quotations: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  })

  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(client)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  const client = await prisma.client.update({
    where: { id: Number(id) },
    data: {
      businessName: data.businessName,
      email: data.email,
      phone: data.phone,
      addressStreet: data.addressStreet,
      addressNumber: data.addressNumber,
      addressColony: data.addressColony,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      taxRegime: data.taxRegime,
      cfdiUsage: data.cfdiUsage,
    },
  })

  return NextResponse.json(client)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  await prisma.client.delete({ where: { id: Number(id) } })

  return NextResponse.json({ success: true })
}
