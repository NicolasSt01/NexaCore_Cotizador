"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/Button"

interface QuotationData {
  folio: string
  client: { businessName: string; rfc: string; addressStreet?: string; addressNumber?: string; addressColony?: string; city?: string; state?: string }
  items: { concept: string; description?: string; quantity: number; unit: string; unitPrice: number; subtotal: number; total: number }[]
  subtotal: number
  ivaAmount: number
  isrRetencion: number
  ivaRetencion: number
  total: number
  discountPercent: number
  paymentTerms?: string
  deliveryTerms?: string
  notes?: string
  termsConditions?: string
  validUntil?: string
  createdAt?: string
  publicHash?: string
  discountAmount?: number
  pdfShowSubtotal?: boolean
  pdfShowDiscount?: boolean
  pdfShowIva?: boolean
  pdfShowRetenciones?: boolean
}

interface Props {
  quotation: QuotationData
  companyName?: string
  companyRfc?: string
  /** Data URI del logo. Si no viene, el encabezado cae al nombre en texto. */
  companyLogo?: string | null
  companyLogoHeight?: number
  companyTagline?: string
  /** Nombre corto de marca del logotipo ("NexaCore"). Vacío = no se imprime. */
  brandName?: string | null
}

/* Tokens del sistema de diseño NexaCore, variante sobre fondo claro (el PDF es
   blanco). Van fijos aquí porque html2canvas rasteriza sin las variables CSS
   de la app: los `var(--...)` no resuelven dentro del canvas. */
const BRAND = {
  ink950: "#03060F",
  signalOnLight: "#006C99", // --signal-700, el tono de "Core" sobre blanco
  fontDisplay: "'DM Sans', system-ui, sans-serif",
  letterSpacing: "-0.03em",
  opsz: "'opsz' 18", // eje de tamaño óptico: iguala el "DM Sans 18pt" de Canva
}

/**
 * Parte el nombre de marca en el límite camelCase para colorear la segunda
 * mitad: "NexaCore" → ["Nexa", "Core"]. Sin límite interno, se devuelve entero.
 */
function splitWordmark(name: string): [string, string] {
  const m = name.match(/^(.*?[a-záéíóúñ])([A-ZÁÉÍÓÚÑ].*)$/)
  return m ? [m[1], m[2]] : [name, ""]
}

export function PDFDownload({
  quotation,
  companyName = "NexaCore",
  companyRfc = "",
  companyLogo,
  companyLogoHeight = 48,
  companyTagline = "Desarrollo e Integración de Sistemas",
  brandName,
}: Props) {
  const [brandHead, brandTail] = splitWordmark((brandName ?? "").trim())
  const contentRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    if (!contentRef.current) return
    setLoading(true)

    const [html2canvas, jsPDF] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ])

    // Sin esperar a las fuentes, html2canvas rasteriza el logotipo con la
    // tipografía de respaldo y "NexaCore" sale en Helvetica en vez de DM Sans.
    if (document.fonts?.ready) await document.fonts.ready

    // html2canvas rasteriza de inmediato: si el logo aún no decodifica, sale en
    // blanco. Se espera a que todas las imágenes estén listas.
    await Promise.all(
      Array.from(contentRef.current.querySelectorAll("img")).map((img) =>
        img.complete
          ? img.decode().catch(() => undefined)
          : new Promise<void>((res) => {
              img.onload = () => res()
              img.onerror = () => res()
            })
      )
    )

    const canvas = await html2canvas.default(contentRef.current, {
      scale: 2,
      backgroundColor: "#FFFFFF",
      logging: false,
    })

    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF.default("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = (canvas.height * pageWidth) / canvas.width

    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight)
    pdf.save(`${quotation.folio}.pdf`)

    setLoading(false)
  }

  const sub = Number(quotation.subtotal)
  const iva = Number(quotation.ivaAmount)
  const isr = Number(quotation.isrRetencion)
  const ivaRet = Number(quotation.ivaRetencion)
  const total = Number(quotation.total)
  const discount = Number(quotation.discountAmount ?? 0)

  // Interruptores de desglose. Un renglón se imprime solo si está activado Y
  // tiene un importe distinto de cero. El TOTAL siempre se imprime.
  const showSubtotal = quotation.pdfShowSubtotal !== false
  const showDiscount = quotation.pdfShowDiscount !== false && discount > 0
  const showIva = quotation.pdfShowIva !== false && iva > 0
  const showRetenciones = quotation.pdfShowRetenciones !== false

  return (
    <>
      <div className="fixed left-[-9999px]" id="pdf-print-content" ref={contentRef}>
        <div style={{
          width: "800px",
          padding: "40px",
          fontFamily: "'DM Sans', 'Helvetica', 'Arial', sans-serif",
          color: "#000",
          background: "#fff",
          fontSize: "11px",
          lineHeight: "1.5",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ width: "60%", verticalAlign: "top" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    {companyLogo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={companyLogo}
                        alt={brandHead ? `${brandHead}${brandTail}` : companyName}
                        style={{
                          height: `${companyLogoHeight}px`,
                          width: "auto",
                          maxWidth: "220px",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    )}

                    {brandHead ? (
                      <span
                        style={{
                          fontFamily: BRAND.fontDisplay,
                          fontWeight: 700,
                          fontSize: `${Math.round(companyLogoHeight * 0.62)}px`,
                          letterSpacing: BRAND.letterSpacing,
                          fontVariationSettings: BRAND.opsz,
                          lineHeight: 1,
                          color: BRAND.ink950,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {brandHead}
                        <span style={{ color: BRAND.signalOnLight }}>{brandTail}</span>
                      </span>
                    ) : (
                      !companyLogo && (
                        <span style={{ fontSize: "20px", fontWeight: 700, color: BRAND.signalOnLight }}>
                          {companyName}
                        </span>
                      )
                    )}
                  </div>

                  {companyTagline && (
                    <div style={{ fontSize: "9px", color: "#5C6B84" }}>{companyTagline}</div>
                  )}
                </td>
                <td style={{ width: "40%", textAlign: "right", verticalAlign: "top" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#006C99" }}>
                    COTIZACIÓN
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#000", marginTop: "4px" }}>
                    {quotation.folio}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <hr style={{ border: "none", borderTop: "2px solid #006C99", margin: "16px 0" }} />

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <tbody>
              <tr>
                <td style={{ width: "50%", verticalAlign: "top" }}>
                  <div style={{ fontWeight: 600, color: "#006C99", marginBottom: "4px" }}>CLIENTE</div>
                  <div style={{ fontWeight: 500 }}>{quotation.client.businessName}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#5C6B84" }}>RFC: {quotation.client.rfc}</div>
                  {quotation.client.city && <div style={{ color: "#5C6B84" }}>{quotation.client.city}{quotation.client.state ? `, ${quotation.client.state}` : ""}</div>}
                </td>
                <td style={{ width: "50%", textAlign: "right", verticalAlign: "top" }}>
                  <div style={{ fontWeight: 600, color: "#006C99", marginBottom: "4px" }}>FECHA</div>
                  <div>{quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString("es-MX") : ""}</div>
                  {quotation.validUntil && (
                    <>
                      <div style={{ fontWeight: 600, color: "#006C99", marginTop: "8px" }}>VÁLIDA HASTA</div>
                      <div>{new Date(quotation.validUntil).toLocaleDateString("es-MX")}</div>
                    </>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <hr style={{ border: "none", borderTop: "1px solid #DFE3EA", margin: "16px 0" }} />

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #006C99" }}>
                <th style={{ textAlign: "left", padding: "6px 4px", color: "#006C99", fontWeight: 600, fontSize: "9px" }}>#</th>
                <th style={{ textAlign: "left", padding: "6px 4px", color: "#006C99", fontWeight: 600, fontSize: "9px" }}>CONCEPTO</th>
                <th style={{ textAlign: "center", padding: "6px 4px", color: "#006C99", fontWeight: 600, fontSize: "9px" }}>CANT</th>
                <th style={{ textAlign: "right", padding: "6px 4px", color: "#006C99", fontWeight: 600, fontSize: "9px" }}>P.U.</th>
                <th style={{ textAlign: "right", padding: "6px 4px", color: "#006C99", fontWeight: 600, fontSize: "9px" }}>IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #DFE3EA" }}>
                  <td style={{ padding: "6px 4px", fontFamily: "'IBM Plex Mono', monospace" }}>{i + 1}</td>
                  <td style={{ padding: "6px 4px" }}>
                    <div style={{ fontWeight: 500 }}>{item.concept}</div>
                    {item.description && <div style={{ color: "#5C6B84", fontSize: "9px" }}>{item.description}</div>}
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "center", fontFamily: "'IBM Plex Mono', monospace" }}>{item.quantity}</td>
                  <td style={{ padding: "6px 4px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>
                    ${Number(item.unitPrice).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>
                    ${Number(item.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <table style={{ width: "100%", marginTop: "12px", fontSize: "10px" }}>
            <tbody>
              <tr>
                <td style={{ width: "70%" }}></td>
                <td style={{ width: "30%", padding: "3px 0" }}>
                  {showSubtotal && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#5C6B84" }}>Subtotal</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {showDiscount && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                      <span style={{ color: "#5C6B84" }}>Descuento</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>-${discount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {showIva && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                      <span style={{ color: "#5C6B84" }}>IVA</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>${iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {showRetenciones && isr > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                      <span style={{ color: "#5C6B84" }}>Retención ISR</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>-${isr.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {showRetenciones && ivaRet > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                      <span style={{ color: "#5C6B84" }}>Retención IVA</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>-${ivaRet.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <hr style={{ border: "none", borderTop: "2px solid #006C99", margin: "6px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#006C99" }}>
                    <span>TOTAL</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {(quotation.notes || quotation.termsConditions || quotation.paymentTerms) && (
            <>
              <hr style={{ border: "none", borderTop: "1px solid #DFE3EA", margin: "20px 0 12px" }} />
              {quotation.paymentTerms && (
                <div style={{ marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, color: "#006C99" }}>Forma de pago:</span>
                  <span style={{ marginLeft: "4px", color: "#5C6B84" }}>{quotation.paymentTerms}</span>
                </div>
              )}
              {quotation.deliveryTerms && (
                <div style={{ marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, color: "#006C99" }}>Plazo de entrega:</span>
                  <span style={{ marginLeft: "4px", color: "#5C6B84" }}>{quotation.deliveryTerms}</span>
                </div>
              )}
              {quotation.notes && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ fontWeight: 600, color: "#006C99", marginBottom: "2px" }}>Notas</div>
                  <div style={{ color: "#5C6B84", whiteSpace: "pre-wrap" }}>{quotation.notes}</div>
                </div>
              )}
            </>
          )}

          <hr style={{ border: "none", borderTop: "1px solid #DFE3EA", margin: "20px 0 12px" }} />

          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ width: "50%", verticalAlign: "top" }}>
                  <div id="pdf-qr-placeholder" style={{ width: "80px", height: "80px", background: "#f0f2f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: "#9AA7BE" }}>
                    QR
                  </div>
                </td>
                <td style={{ width: "50%", textAlign: "right", verticalAlign: "bottom", fontSize: "8px", color: "#9AA7BE" }}>
                  {companyName} · {companyRfc}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Button onClick={handleDownload} disabled={loading} variant="secondary">
        {loading ? "Generando PDF..." : "Descargar PDF"}
      </Button>
    </>
  )
}
