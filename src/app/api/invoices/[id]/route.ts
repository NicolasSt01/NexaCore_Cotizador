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
