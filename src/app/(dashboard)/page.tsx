import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Table, Td } from "@/components/ui/Table"
import { ChartStatus } from "@/components/dashboard/ChartStatus"
import { ChartMonthly } from "@/components/dashboard/ChartMonthly"
import { QUOTATION_STATUSES } from "@/types"
import Link from "next/link"

export const dynamic = "force-dynamic"

const statusBadgeVariant: Record<string, "green" | "yellow" | "blue" | "red" | "gray" | "orange"> = {
  borrador: "gray",
  enviada: "blue",
  vista: "orange",
  aprobada: "green",
  rechazada: "red",
  convertida: "green",
  cancelada: "gray",
}

async function getDashboardData() {
  const [quotations, totalQuotations, approvedCount, rejectedCount] = await Promise.all([
    prisma.quotation.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: true },
    }),
    prisma.quotation.count(),
    prisma.quotation.count({ where: { status: "aprobada" } }),
    prisma.quotation.count({ where: { status: "rechazada" } }),
  ])

  const activeCount = await prisma.quotation.count({
    where: { status: { in: ["borrador", "enviada", "vista"] } },
  })

  const totalRevenue = await prisma.quotation.aggregate({
    _sum: { total: true },
    where: { status: { in: ["aprobada", "convertida"] } },
  })

  const statusCounts = await prisma.quotation.groupBy({
    by: ["status"],
    _count: true,
  })

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const monthlyData = await prisma.quotation.findMany({
    where: {
      createdAt: { gte: sixMonthsAgo },
      status: { in: ["aprobada", "convertida"] },
    },
    select: { total: true, createdAt: true },
  })

  const monthlyMap = new Map<string, { total: number; count: number }>()
  for (const q of monthlyData) {
    const key = q.createdAt.toLocaleDateString("es-MX", { month: "short", year: "2-digit" })
    const current = monthlyMap.get(key) || { total: 0, count: 0 }
    current.total += Number(q.total)
    current.count += 1
    monthlyMap.set(key, current)
  }

  const months = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    total: Math.round(data.total * 100) / 100,
    count: data.count,
  }))

  return {
    quotations,
    activeCount,
    totalQuotations,
    approvedCount,
    rejectedCount,
    totalRevenue: totalRevenue._sum.total || 0,
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count })),
    monthlyData: months,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  const conversionRate = data.totalQuotations > 0
    ? Math.round((data.approvedCount / data.totalQuotations) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <Link
          href="/cotizaciones/nueva"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-signal-600 text-white text-sm font-medium hover:bg-signal-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Nueva cotización
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <p className="text-sm text-text-muted">Cotizaciones activas</p>
          <p className="text-3xl font-semibold text-text-primary mt-1">{data.activeCount}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-text-muted">Aprobadas este mes</p>
          <p className="text-3xl font-semibold text-signal-400 mt-1">{data.approvedCount}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-text-muted">Tasa de conversión</p>
          <p className="text-3xl font-semibold text-text-primary mt-1">{conversionRate}%</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-text-muted">Ingreso potencial</p>
          <p className="text-3xl font-semibold text-text-primary mt-1">
            ${Number(data.totalRevenue).toLocaleString("es-MX")}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Cotizaciones por estado</h2>
          <ChartStatus data={data.statusCounts} />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Ingresos mensuales</h2>
          {data.monthlyData.length > 0 ? (
            <ChartMonthly data={data.monthlyData} />
          ) : (
            <p className="text-text-muted text-sm py-16 text-center">Sin datos de ingresos aún</p>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Últimas cotizaciones</h2>
          <Link href="/cotizaciones" className="text-sm text-signal-400 hover:text-signal-300 transition-colors">
            Ver todas
          </Link>
        </div>
        <Table
          headers={[
            { label: "Folio", width: "15%" },
            { label: "Cliente", width: "30%" },
            { label: "Total", width: "20%" },
            { label: "Estado", width: "20%" },
            { label: "Fecha", width: "15%" },
          ]}
        >
          {data.quotations.map((q) => (
            <tr key={q.id}>
              <Td><span className="font-mono text-sm">{q.folio}</span></Td>
              <Td>{q.client.businessName}</Td>
              <Td><span className="font-mono">${Number(q.total).toLocaleString("es-MX")}</span></Td>
              <Td>
                <Badge variant={statusBadgeVariant[q.status] || "gray"}>
                  {QUOTATION_STATUSES.find((s) => s.value === q.status)?.label || q.status}
                </Badge>
              </Td>
              <Td className="text-text-muted">
                {q.createdAt.toLocaleDateString("es-MX")}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
