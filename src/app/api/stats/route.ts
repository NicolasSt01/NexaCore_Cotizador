import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const [
    totalQuotations,
    activeQuotations,
    approvedCount,
    rejectedCount,
    totalRevenue,
    recentQuotations,
  ] = await Promise.all([
    prisma.quotation.count(),
    prisma.quotation.count({ where: { status: { in: ["borrador", "enviada", "vista"] } } }),
    prisma.quotation.count({ where: { status: "aprobada" } }),
    prisma.quotation.count({ where: { status: "rechazada" } }),
    prisma.quotation.aggregate({
      _sum: { total: true },
      where: { status: { in: ["aprobada", "convertida"] } },
    }),
    prisma.quotation.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { businessName: true } } },
    }),
  ])

  const statusCounts = await prisma.quotation.groupBy({
    by: ["status"],
    _count: true,
  })

  return NextResponse.json({
    totalQuotations,
    activeQuotations,
    approvedCount,
    rejectedCount,
    totalRevenue: totalRevenue._sum.total || 0,
    recentQuotations,
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count })),
  })
}
