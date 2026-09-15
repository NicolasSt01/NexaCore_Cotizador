import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isQuotationExpired } from "@/lib/quotation-status"
import { logQuotationChange } from "@/lib/audit"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params

  const quotation = await prisma.quotation.findUnique({
    where: { publicHash: hash },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!quotation) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  }

  if (quotation.status === "enviada" || quotation.status === "vista") {
    if (quotation.status === "enviada") {
      await logQuotationChange({
        quotationId: quotation.id,
        fromStatus: "enviada",
        toStatus: "vista",
        note: "El cliente abrió el enlace público",
      })
    }
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: "vista" },
    })
  }

  // Este endpoint es público: se expone solo la marca (nombre y logo), nunca las
  // tasas ni el resto de los datos fiscales de la empresa.
  const settings = await prisma.companySettings.findFirst({
    select: { businessName: true, brandName: true, logoData: true, logoHeight: true },
  })

  return NextResponse.json({ ...quotation, company: settings })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params
  const { action } = await req.json()

  const quotation = await prisma.quotation.findUnique({
    where: { publicHash: hash },
  })

  if (!quotation) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  }

  if (action === "approve") {
    if (quotation.status !== "enviada" && quotation.status !== "vista") {
      return NextResponse.json(
        { error: `No se puede aprobar desde estado: ${quotation.status}` },
        { status: 400 }
      )
    }
    if (isQuotationExpired(quotation.validUntil, quotation.status)) {
      return NextResponse.json(
        { error: "La cotización venció. Contacta al emisor para renovarla." },
        { status: 400 }
      )
    }
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: "aprobada" },
    })
    await logQuotationChange({
      quotationId: quotation.id,
      fromStatus: quotation.status,
      toStatus: "aprobada",
      note: "Aprobada por el cliente desde la página pública",
    })
    return NextResponse.json({ success: true, status: "aprobada" })
  }

  if (action === "reject") {
    if (quotation.status !== "enviada" && quotation.status !== "vista") {
      return NextResponse.json(
        { error: `No se puede rechazar desde estado: ${quotation.status}` },
        { status: 400 }
      )
    }
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: "rechazada" },
    })
    await logQuotationChange({
      quotationId: quotation.id,
      fromStatus: quotation.status,
      toStatus: "rechazada",
      note: "Rechazada por el cliente desde la página pública",
    })
    return NextResponse.json({ success: true, status: "rechazada" })
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
}
