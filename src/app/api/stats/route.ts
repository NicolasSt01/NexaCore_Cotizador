import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const [totalQuotations, sentCount, approvedCount, rejectedCount, convertedCount] =
    await Promise.all([
      prisma.quotation.count(),
      prisma.quotation.count({ where: { status: { in: ["enviada", "vista"] } } }),
      prisma.quotation.count({ where: { status: "aprobada" } }),
      prisma.quotation.count({ where: { status: "rechazada" } }),
      prisma.quotation.count({ where: { status: "convertida" } }),
    ])

  const activeQuotations = await prisma.quotation.count({
    where: { status: { in: ["borrador", "enviada", "vista"] } },
  })

  const totalRevenue = await prisma.quotation.aggregate({
    _sum: { total: true },
    where: { status: { in: ["aprobada", "convertida"] } },
  })

  const recentQuotations = await prisma.quotation.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { client: { select: { businessName: true } } },
  })

  const statusCounts = await prisma.quotation.groupBy({
    by: ["status"],
    _count: true,
  })

  // Conversión: de cotizaciones enviadas a aprobadas (aprobadas incluye las que
  // después se convirtieron en factura, porque pasaron por aprobada antes).
  const approvedTotal = approvedCount + convertedCount
  const conversionRate = sentCount + approvedTotal > 0
    ? Math.round((approvedTotal / (sentCount + approvedTotal)) * 100)
    : 0

  return NextResponse.json({
    totalQuotations,
    activeQuotations,
    sentCount,
    approvedCount,
    convertedCount,
    rejectedCount,
    conversionRate,
    totalRevenue: totalRevenue._sum.total || 0,
    recentQuotations,
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count })),
  })
}