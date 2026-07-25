import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

export async function GET(_req: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const invoices = await prisma.invoice.findMany({
    include: {
      quotation: {
        select: { folio: true, client: { select: { businessName: true, rfc: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(invoices)
}
