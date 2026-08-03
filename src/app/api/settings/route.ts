import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-helpers"
import { NextResponse } from "next/server"
import { invalidateTaxRates } from "@/lib/taxes"

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const settings = await prisma.companySettings.findFirst()
  return NextResponse.json(settings)
}

/**
 * Convierte el porcentaje que captura el formulario a la fracción que guarda la
 * base ("16" → 0.16). Siempre divide entre 100: interpretar "0.5" como fracción
 * convertiría una tasa de 0.5% en 50%.
 */
function parseRate(input: unknown, fallback: number): number {
  if (input === undefined || input === null || input === "") return fallback
  const n = Number(String(input).replace("%", "").trim())
  if (!Number.isFinite(n) || n < 0) return fallback
  return n / 100
}

const LOGO_MIME = ["image/png", "image/jpeg", "image/webp"]
/** Tope del data URI ya codificado. Base64 infla ~33%, así que son ~375 KB reales. */
const LOGO_MAX_BYTES = 500 * 1024

/**
 * Valida el logo recibido como data URI. Devuelve el valor a guardar
 * (string para reemplazar, null para borrar) o un mensaje de error.
 */
function parseLogo(input: unknown): { value: string | null } | { error: string } {
  if (input === undefined) return { value: null }
  if (input === null || input === "") return { value: null }
  if (typeof input !== "string") return { error: "Logo inválido" }

  const match = input.match(/^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/)
  if (!match) return { error: "El logo debe enviarse como data URI en base64" }

  if (!LOGO_MIME.includes(match[1])) {
    return { error: "Formato no admitido. Usa PNG, JPEG o WebP." }
  }
  if (input.length > LOGO_MAX_BYTES) {
    return { error: "El logo excede 500 KB. Usa una imagen más pequeña." }
  }
  return { value: input }
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Solo un administrador puede cambiar la configuración" },
      { status: 403 }
    )
  }

  const data = await req.json()

  if (!data.businessName?.trim()) {
    return NextResponse.json({ error: "La razón social es obligatoria" }, { status: 400 })
  }

  const ivaRate = parseRate(data.ivaRate, 0.16)
  const isrRetencionRate = parseRate(data.isrRetencionRate, 0.1)
  const ivaRetencionRate = parseRate(data.ivaRetencionRate, 0.106666)

  if (ivaRate > 1 || isrRetencionRate > 1 || ivaRetencionRate > 1) {
    return NextResponse.json({ error: "Las tasas no pueden exceder 100%" }, { status: 400 })
  }

  // `logoData` ausente = no se tocó el logo; null o "" = se quita.
  const logo = "logoData" in data ? parseLogo(data.logoData) : null
  if (logo && "error" in logo) {
    return NextResponse.json({ error: logo.error }, { status: 400 })
  }

  const logoHeight = Math.min(160, Math.max(16, Number(data.logoHeight) || 48))

  const payload = {
    businessName: data.businessName.trim(),
    brandName: data.brandName?.trim() || null,
    ...(logo && { logoData: logo.value }),
    logoHeight,
    rfc: (data.rfc ?? "").toUpperCase().trim(),
    curp: data.curp?.toUpperCase().trim() || null,
    taxRegime: data.taxRegime || null,
    addressStreet: data.addressStreet || null,
    addressNumber: data.addressNumber || null,
    addressColony: data.addressColony || null,
    city: data.city || null,
    state: data.state || null,
    zipCode: data.zipCode || null,
    email: data.email || null,
    phone: data.phone || null,
    website: data.website || null,
    ivaRate,
    isrRetencionRate,
    ivaRetencionRate,
    defaultTerms: data.defaultTerms || null,
    defaultNotes: data.defaultNotes || null,
  }

  const existing = await prisma.companySettings.findFirst()

  const settings = existing
    ? await prisma.companySettings.update({ where: { id: existing.id }, data: payload })
    : await prisma.companySettings.create({ data: payload })

  // getTaxRates() cachea en memoria; sin esto las cotizaciones seguirían
  // calculándose con las tasas viejas hasta reiniciar el proceso.
  invalidateTaxRates()

  return NextResponse.json(settings)
}
