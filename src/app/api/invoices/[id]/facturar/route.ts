import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { isStorageConfigured, uploadObject } from "@/lib/storage"
import { NextResponse } from "next/server"

/**
 * Marca una factura como "facturada": guarda el UUID (folio fiscal) que regresó
 * el despacho y, si se adjuntan, sube el XML y/o el PDF del CFDI a R2 guardando
 * solo sus llaves. Recibe multipart/form-data porque incluye archivos.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const invoice = await prisma.invoice.findUnique({ where: { id: Number(id) } })
  if (!invoice) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })

  const form = await req.formData()
  const uuid = (form.get("uuid") as string | null)?.trim()
  const formaPago = (form.get("formaPago") as string | null)?.trim() || null
  const metodoPago = (form.get("metodoPago") as string | null)?.trim() || null
  const pdf = form.get("pdf")
  const xml = form.get("xml")

  if (!uuid) {
    return NextResponse.json({ error: "El UUID (folio fiscal) es obligatorio." }, { status: 400 })
  }

  const hasFiles = pdf instanceof File || xml instanceof File
  if (hasFiles && !isStorageConfigured()) {
    return NextResponse.json(
      { error: "No se puede adjuntar el CFDI: el almacenamiento R2 no está configurado. Puedes guardar solo el UUID." },
      { status: 400 }
    )
  }

  let cfdiPdfKey = invoice.cfdiPdfKey
  let cfdiXmlKey = invoice.cfdiXmlKey

  try {
    if (pdf instanceof File) {
      const key = `cfdi/${invoice.id}/${uuid}.pdf`
      await uploadObject(key, Buffer.from(await pdf.arrayBuffer()), "application/pdf")
      cfdiPdfKey = key
    }
    if (xml instanceof File) {
      const key = `cfdi/${invoice.id}/${uuid}.xml`
      await uploadObject(key, Buffer.from(await xml.arrayBuffer()), "application/xml")
      cfdiXmlKey = key
    }
  } catch (e) {
    console.error("Error subiendo CFDI a R2:", e)
    return NextResponse.json({ error: "No se pudo subir el CFDI al almacenamiento." }, { status: 500 })
  }

  const updated = await prisma.invoice.update({
    where: { id: Number(id) },
    data: {
      status: "facturada",
      uuid,
      invoicedAt: new Date(),
      ...(formaPago && { formaPago }),
      ...(metodoPago && { metodoPago }),
      cfdiPdfKey,
      cfdiXmlKey,
    },
  })

  return NextResponse.json(updated)
}
