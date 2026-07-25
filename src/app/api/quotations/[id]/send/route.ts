import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { sendQuotationEmail } from "@/lib/mail"
import { NextResponse } from "next/server"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const { recipientEmail, pdfBase64 } = await _req.json()

  if (!recipientEmail || !pdfBase64) {
    return NextResponse.json({ error: "Faltan datos: recipientEmail, pdfBase64" }, { status: 400 })
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: Number(id) },
    include: { client: true },
  })

  if (!quotation) {
    return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 })
  }

  const pdfBuffer = Buffer.from(pdfBase64.split(",")[1] || pdfBase64, "base64")

  try {
    await sendQuotationEmail({
      to: recipientEmail,
      subject: `Cotización ${quotation.folio} — NexaCore`,
      text: `Hola,\n\nAdjuntamos la cotización ${quotation.folio} para ${quotation.client.businessName}.\n\nPuedes consultarla en línea aquí: ${process.env.NEXTAUTH_URL}/publica/${quotation.publicHash}\n\nSaludos,\nNexaCore`,
      pdfBuffer,
      filename: `${quotation.folio}.pdf`,
    })

    if (quotation.status === "borrador") {
      await prisma.quotation.update({
        where: { id: Number(id) },
        data: { status: "enviada" },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error enviando email:", err)
    return NextResponse.json({ error: "Error al enviar el correo" }, { status: 500 })
  }
}
