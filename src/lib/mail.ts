import nodemailer from "nodemailer"

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendQuotationEmail({
  to,
  subject,
  text,
  pdfBuffer,
  filename,
}: {
  to: string
  subject: string
  text: string
  pdfBuffer: Buffer
  filename: string
}) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@nexacore.com"
  const transport = getTransport()

  await transport.sendMail({
    from: `"NexaCore Cotizador" <${from}>`,
    to,
    subject,
    text,
    attachments: [{ filename, content: pdfBuffer, contentType: "application/pdf" }],
  })
}
