import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const status = searchParams.get("status")

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { folio: { contains: search } },
      { quotation: { folio: { contains: search } } },
      { quotation: { client: { businessName: { contains: search } } } },
    ]
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      quotation: {
        select: { folio: true, client: { select: { businessName: true, rfc: true } } },
      },
      charge: {
        select: {
          periodYear: true,
          periodMonth: true,
          contract: { select: { name: true, client: { select: { businessName: true, rfc: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(invoices)
}