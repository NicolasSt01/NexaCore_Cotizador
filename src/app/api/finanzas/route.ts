import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

/**
 * Data financiera para la sección Finanzas: todas las facturas (de cotización o
 * de contrato) con su cliente, importes y cobrado, más el MRR. El filtrado por
 * cliente/fecha/estado y las sumatorias se hacen en el cliente para respuesta
 * instantánea (volumen pequeño).
 */
export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      payments: { select: { amount: true, paidAt: true } },
      quotation: { select: { folio: true, clientId: true, client: { select: { businessName: true, rfc: true } } } },
      charge: {
        select: {
          periodYear: true,
          periodMonth: true,
          contract: { select: { name: true, clientId: true, client: { select: { businessName: true, rfc: true } } } },
        },
      },
    },
  })

  const rows = invoices.map((inv) => {
    const q = inv.quotation
    const ch = inv.charge
    const clientId = q?.clientId ?? ch?.contract.clientId ?? null
    const clientName = q?.client.businessName ?? ch?.contract.client.businessName ?? "—"
    const rfc = q?.client.rfc ?? ch?.contract.client.rfc ?? ""
    const origin = q
      ? `Cotización ${q.folio}`
      : ch
      ? `Contrato ${ch.contract.name} ${String(ch.periodMonth).padStart(2, "0")}/${ch.periodYear}`
      : "—"
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0)

    return {
      id: inv.id,
      folio: inv.folio,
      status: inv.status,
      clientId,
      clientName,
      rfc,
      origin,
      uuid: inv.uuid,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      total: Number(inv.total),
      paid: Math.round(paid * 100) / 100,
    }
  })

  // MRR: fee fijo mensual de contratos activos (global).
  const fixedAgg = await prisma.contractItem.aggregate({
    _sum: { unitPrice: true },
    where: { kind: "fijo", active: true, contract: { status: "activo" } },
  })

  return NextResponse.json({ mrr: Number(fixedAgg._sum.unitPrice || 0), rows })
}
