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
  const [quotations, totalQuotations, sentCount, approvedCount, rejectedCount, convertedCount] =
    await Promise.all([
      prisma.quotation.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { client: true },
      }),
      prisma.quotation.count(),
      prisma.quotation.count({ where: { status: { in: ["enviada", "vista"] } } }),
      prisma.quotation.count({ where: { status: "aprobada" } }),
      prisma.quotation.count({ where: { status: "rechazada" } }),
      prisma.quotation.count({ where: { status: "convertida" } }),
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

  // ── Métricas financieras ──────────────────────────────────────────────
  // MRR: fee fijo mensual de los contratos activos.
  const fixedAgg = await prisma.contractItem.aggregate({
    _sum: { unitPrice: true },
    where: { kind: "fijo", active: true, contract: { status: "activo" } },
  })
  const mrr = Number(fixedAgg._sum.unitPrice || 0)

  // Cuentas por cobrar: saldo de facturas ya facturadas y no saldadas.
  const receivables = await prisma.invoice.findMany({
    where: { status: "facturada" },
    select: { total: true, dueDate: true, payments: { select: { amount: true } } },
  })
  const now = new Date()
  let porCobrar = 0
  let vencido = 0
  for (const inv of receivables) {
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0)
    const bal = Number(inv.total) - paid
    if (bal > 0) {
      porCobrar += bal
      if (inv.dueDate && inv.dueDate < now) vencido += bal
    }
  }

  // Cobrado en el mes en curso (suma de abonos).
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const paidAgg = await prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: startMonth } } })
  const cobradoMes = Number(paidAgg._sum.amount || 0)

  return {
    mrr,
    porCobrar: Math.round(porCobrar * 100) / 100,
    vencido: Math.round(vencido * 100) / 100,
    cobradoMes,
    quotations,
    activeCount,
    totalQuotations,
    sentCount,
    approvedCount,
    convertedCount,
    rejectedCount,
    totalRevenue: totalRevenue._sum.total || 0,
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count })),
    monthlyData: months,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  // Conversión = aprobadas (incluye convertidas) sobre las que llegaron a
  // salir al cliente (enviadas + vistas + aprobadas + convertidas).
  const reachedClient = data.sentCount + data.approvedCount + data.convertedCount
  const conversionRate = reachedClient > 0
    ? Math.round(((data.approvedCount + data.convertedCount) / reachedClient) * 100)
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

      {/* Finanzas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <p className="text-sm text-text-muted">Ingreso recurrente (MRR)</p>
          <p className="text-3xl font-semibold text-signal-400 mt-1">${Number(data.mrr).toLocaleString("es-MX")}</p>
          <p className="text-xs text-text-muted mt-1">fijo mensual de contratos activos</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-text-muted">Por cobrar</p>
          <p className="text-3xl font-semibold text-text-primary mt-1">${Number(data.porCobrar).toLocaleString("es-MX")}</p>
          <p className="text-xs text-text-muted mt-1">saldo de facturas emitidas</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-text-muted">Vencido</p>
          <p className={`text-3xl font-semibold mt-1 ${Number(data.vencido) > 0 ? "text-red" : "text-text-primary"}`}>
            ${Number(data.vencido).toLocaleString("es-MX")}
          </p>
          <p className="text-xs text-text-muted mt-1">facturas pasadas de fecha</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-text-muted">Cobrado este mes</p>
          <p className="text-3xl font-semibold text-text-primary mt-1">${Number(data.cobradoMes).toLocaleString("es-MX")}</p>
          <p className="text-xs text-text-muted mt-1">abonos recibidos</p>
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
