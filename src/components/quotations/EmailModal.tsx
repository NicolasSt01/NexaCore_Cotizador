"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

interface Props {
  quotationId: number
  clientEmail?: string | null
  folio: string
  onSent: () => void
  onClose: () => void
}

export function EmailModal({ quotationId, clientEmail, folio, onSent, onClose }: Props) {
  const [email, setEmail] = useState(clientEmail || "")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleSend() {
    if (!email.trim()) return setError("Ingresa un correo electrónico")
    setSending(true)
    setError("")

    try {
      const pdfEl = document.getElementById("pdf-print-content")
      if (!pdfEl) {
        setError("Primero genera el PDF desde el botón Descargar PDF")
        setSending(false)
        return
      }

      const [html2canvas, jsPDF] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])

      const canvas = await html2canvas.default(pdfEl, {
        scale: 2,
        backgroundColor: "#FFFFFF",
        logging: false,
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF.default("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = (canvas.height * pageWidth) / canvas.width
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight)
      const pdfBase64 = pdf.output("datauristring")

      const res = await fetch(`/api/quotations/${quotationId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: email.trim(), pdfBase64 }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al enviar")
      }

      setSuccess(true)
      onSent()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar")
    } finally {
      setSending(false)
    }
  }

  return (
      <Modal open onClose={onClose}>
      <h2 className="text-lg font-semibold text-text-primary mb-4">Enviar cotización {folio}</h2>

      {success ? (
        <div className="space-y-4">
          <p className="text-green">Cotización enviada correctamente a {email}</p>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="primary">Cerrar</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Correo del destinatario"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@ejemplo.com"
          />
          {error && <p className="text-sm text-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} variant="secondary">Cancelar</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
