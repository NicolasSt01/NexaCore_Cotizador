import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"
import { validateRFC, RFC_PUBLICO_GENERAL } from "@/lib/taxes"

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { quotations: true } } },
  })

  return NextResponse.json(clients)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const data = await req.json()

  // Sin RFC se asume público en general (RFC genérico del SAT), que es el caso
  // de mostrador donde el cliente no proporciona datos fiscales.
  const rawRfc = (data.rfc ?? "").toUpperCase().trim()
  const rfc = rawRfc || RFC_PUBLICO_GENERAL

  if (!validateRFC(rfc)) {
    return NextResponse.json(
      { error: `RFC inválido. Para público en general usa ${RFC_PUBLICO_GENERAL}.` },
      { status: 400 }
    )
  }

  const exists = await prisma.client.findUnique({ where: { rfc } })
  if (exists) {
    return NextResponse.json(
      {
        error:
          rfc === RFC_PUBLICO_GENERAL
            ? "El cliente Público General ya existe; selecciónalo en la lista."
            : "Ya existe un cliente con ese RFC",
      },
      { status: 409 }
    )
  }

  const client = await prisma.client.create({
    data: {
      businessName: data.businessName,
      rfc,
      curp: data.curp?.toUpperCase().trim() || null,
      email: data.email || null,
      phone: data.phone || null,
      addressStreet: data.addressStreet || null,
      addressNumber: data.addressNumber || null,
      addressColony: data.addressColony || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
      taxRegime: data.taxRegime || null,
      cfdiUsage: data.cfdiUsage || null,
    },
  })

  return NextResponse.json(client, { status: 201 })
}
