import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { getObject, isStorageConfigured } from "@/lib/storage"
import { NextResponse } from "next/server"

/**
 * Descarga el CFDI (pdf o xml) de una factura. El bucket R2 es privado: el
 * archivo se sirve a través de esta ruta autenticada, así solo un usuario con
 * sesión puede obtenerlo (nadie con el link directo).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id, type } = await params
  if (type !== "pdf" && type !== "xml") {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Almacenamiento R2 no configurado." }, { status: 400 })
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: Number(id) } })
  if (!invoice) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })

  const key = type === "pdf" ? invoice.cfdiPdfKey : invoice.cfdiXmlKey
  if (!key) return NextResponse.json({ error: "Esta factura no tiene ese archivo" }, { status: 404 })

  try {
    const { body, contentType } = await getObject(key)
    return new NextResponse(body as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType || (type === "pdf" ? "application/pdf" : "application/xml"),
        "Content-Disposition": `attachment; filename="${invoice.folio}.${type}"`,
      },
    })
  } catch (e) {
    console.error("Error obteniendo CFDI de R2:", e)
    return NextResponse.json({ error: "No se pudo obtener el archivo." }, { status: 500 })
  }
}
