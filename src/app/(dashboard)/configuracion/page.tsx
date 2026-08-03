"use client"

import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { TAX_REGIMES } from "@/types"

/** Las tasas se guardan como fracción (0.16) y se editan como porcentaje (16). */
const toPercent = (v: unknown) =>
  v === null || v === undefined || v === "" ? "" : String(Math.round(Number(v) * 1e6) / 1e4)

const EMPTY = {
  businessName: "",
  rfc: "",
  curp: "",
  taxRegime: "",
  addressStreet: "",
  addressNumber: "",
  addressColony: "",
  city: "",
  state: "",
  zipCode: "",
  email: "",
  phone: "",
  website: "",
  ivaRate: "16",
  isrRetencionRate: "10",
  ivaRetencionRate: "10.6666",
  defaultTerms: "",
  defaultNotes: "",
  logoData: "",
  logoHeight: "48",
  brandName: "",
}

/** "NexaCore" → ["Nexa", "Core"]; igual que el logotipo del PDF. */
function splitWordmark(name: string): [string, string] {
  const m = name.match(/^(.*?[a-záéíóúñ])([A-ZÁÉÍÓÚÑ].*)$/)
  return m ? [m[1], m[2]] : [name, ""]
}

const LOGO_MIME = ["image/png", "image/jpeg", "image/webp"]
/** Ancho máximo al que se reescala antes de guardar. Suficiente para el PDF. */
const LOGO_MAX_WIDTH = 600

/**
 * Reescala la imagen en el navegador y la devuelve como data URI. Evita mandar
 * al servidor una foto de 5 MB cuando en el PDF se imprime a ~48 px de alto.
 * Los PNG conservan transparencia; el resto se codifica como JPEG.
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
    reader.onload = () => {
      const img = new window.Image()
      img.onerror = () => reject(new Error("El archivo no es una imagen válida"))
      img.onload = () => {
        const scale = Math.min(1, LOGO_MAX_WIDTH / img.width)
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("No se pudo procesar la imagen"))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const isPng = file.type === "image/png"
        resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.92))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function ConfiguracionPage() {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/settings")
    if (res.ok) {
      const s = await res.json()
      if (s) {
        setForm({
          ...EMPTY,
          ...Object.fromEntries(
            Object.keys(EMPTY).map((k) => [k, s[k] ?? EMPTY[k as keyof typeof EMPTY]])
          ),
          ivaRate: toPercent(s.ivaRate),
          isrRetencionRate: toPercent(s.isrRetencionRate),
          ivaRetencionRate: toPercent(s.ivaRetencionRate),
          logoData: s.logoData ?? "",
          logoHeight: String(s.logoHeight ?? 48),
          brandName: s.brandName ?? "",
        } as typeof EMPTY)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const set = (field: keyof typeof EMPTY) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // permite volver a elegir el mismo archivo
    if (!file) return

    if (!LOGO_MIME.includes(file.type)) {
      setMessage({ type: "error", text: "Formato no admitido. Usa PNG, JPEG o WebP." })
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      if (dataUrl.length > 500 * 1024) {
        setMessage({ type: "error", text: "El logo sigue pesando demasiado. Prueba con una imagen más simple." })
        return
      }
      setForm((f) => ({ ...f, logoData: dataUrl }))
      setMessage({ type: "ok", text: "Logo cargado. Guarda los cambios para aplicarlo." })
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo cargar el logo" })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setMessage({ type: "ok", text: "Configuración guardada." })
        load()
      } else {
        const err = await res.json()
        setMessage({ type: "error", text: err.error || "No se pudo guardar" })
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-text-muted">Cargando configuración...</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Configuración</h1>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            message.type === "ok"
              ? "border-green/40 text-green bg-green/10"
              : "border-red/40 text-red bg-red/10"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-1">Logo</h2>
        <p className="text-sm text-text-muted mb-4">
          Aparece en la esquina superior izquierda del PDF y de la vista pública.
          Sin logo se imprime la razón social como texto. PNG, JPEG o WebP.
        </p>

        <div className="flex flex-wrap items-center gap-6">
          <div
            className="shrink-0 flex items-center justify-center rounded-lg border border-dashed border-line bg-ink-900 px-4"
            style={{ minWidth: "180px", minHeight: "96px" }}
          >
            {form.logoData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logoData}
                alt="Logo de la empresa"
                style={{ height: `${form.logoHeight || 48}px`, width: "auto", maxWidth: "160px", objectFit: "contain" }}
              />
            ) : (
              <span className="text-xs text-text-muted">Sin logo</span>
            )}
          </div>

          <div className="flex-1 min-w-[240px] space-y-3">
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center px-4 py-2 rounded-lg bg-signal-600 text-white text-sm font-medium hover:bg-signal-700 transition-colors cursor-pointer">
                {form.logoData ? "Cambiar logo" : "Subir logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoPick}
                  className="hidden"
                />
              </label>
              {form.logoData && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setForm((f) => ({ ...f, logoData: "" }))}
                >
                  Quitar
                </Button>
              )}
            </div>

            <Input
              label="Alto en el PDF (px)"
              type="number"
              min="16"
              max="160"
              value={form.logoHeight}
              onChange={set("logoHeight")}
            />
            <p className="text-xs text-text-muted">
              La imagen se reescala a 600 px de ancho al subirla; el ancho en el PDF
              se ajusta solo para conservar la proporción.
            </p>

            <Input
              label="Nombre de marca junto al logo"
              value={form.brandName}
              onChange={set("brandName")}
              placeholder="NexaCore"
            />
            <p className="text-xs text-text-muted">
              Se imprime en DM Sans 700 con la segunda mitad en el azul de marca,
              según el sistema de diseño. Déjalo vacío para mostrar solo la imagen.
            </p>

            {form.brandName.trim() && (
              <div className="p-4 rounded-lg bg-white flex items-center justify-center">
                <span
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontWeight: 700,
                    fontSize: "28px",
                    letterSpacing: "-0.03em",
                    fontVariationSettings: "'opsz' 18",
                    lineHeight: 1,
                    color: "#03060F",
                  }}
                >
                  {splitWordmark(form.brandName.trim())[0]}
                  <span style={{ color: "#006C99" }}>
                    {splitWordmark(form.brandName.trim())[1]}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-1">Impuestos</h2>
        <p className="text-sm text-text-muted mb-4">
          Se capturan en porcentaje. Aplican a las cotizaciones que se creen a partir de
          ahora; las ya guardadas conservan sus montos.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="IVA (%)"
            type="number"
            step="0.0001"
            min="0"
            max="100"
            value={form.ivaRate}
            onChange={set("ivaRate")}
            required
          />
          <Input
            label="Retención ISR (%)"
            type="number"
            step="0.0001"
            min="0"
            max="100"
            value={form.isrRetencionRate}
            onChange={set("isrRetencionRate")}
          />
          <Input
            label="Retención IVA (%)"
            type="number"
            step="0.0001"
            min="0"
            max="100"
            value={form.ivaRetencionRate}
            onChange={set("ivaRetencionRate")}
          />
        </div>

        <p className="text-xs text-text-muted mt-3">
          Las retenciones vienen desactivadas en cada cotización. Se activan una por una
          en el paso 3 del asistente, cuando el cliente es una persona moral que retiene.
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Datos fiscales</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Razón social" value={form.businessName} onChange={set("businessName")} required />
            <Input label="RFC" value={form.rfc} onChange={set("rfc")} placeholder="XXX000101XXX" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="CURP (opcional)" value={form.curp} onChange={set("curp")} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Régimen fiscal</label>
              <select
                value={form.taxRegime}
                onChange={set("taxRegime")}
                className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary focus:outline-none focus:ring-2 focus:ring-signal-500/40"
              >
                <option value="">Seleccionar...</option>
                {TAX_REGIMES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Domicilio y contacto</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Calle" value={form.addressStreet} onChange={set("addressStreet")} />
            <Input label="Número" value={form.addressNumber} onChange={set("addressNumber")} />
            <Input label="Colonia" value={form.addressColony} onChange={set("addressColony")} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Ciudad" value={form.city} onChange={set("city")} />
            <Input label="Estado" value={form.state} onChange={set("state")} />
            <Input label="Código postal" value={form.zipCode} onChange={set("zipCode")} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={set("email")} />
            <Input label="Teléfono" value={form.phone} onChange={set("phone")} />
            <Input label="Sitio web" value={form.website} onChange={set("website")} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-1">Textos por defecto</h2>
        <p className="text-sm text-text-muted mb-4">
          Se usan como sugerencia al crear una cotización.
        </p>
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Términos y condiciones</label>
            <textarea
              value={form.defaultTerms}
              onChange={set("defaultTerms")}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-ink-900 border border-line text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-sm resize-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Notas</label>
            <textarea
              value={form.defaultNotes}
              onChange={set("defaultNotes")}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-ink-900 border border-line text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-sm resize-none"
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}
