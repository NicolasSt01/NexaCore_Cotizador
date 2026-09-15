"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Table, Td } from "@/components/ui/Table"
import { QUOTATION_STATUSES } from "@/types"
import Link from "next/link"

interface QuotationSummary {
  id: number
  folio: string
  status: string
  total: string
  createdAt: string
  invoice: { id: number; folio: string; status: string; total: string } | null
}

interface ClientDetail {
  id: number
  businessName: string
  rfc: string
  email: string | null
  phone: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressColony: string | null
  city: string | null
  state: string | null
  quotations: QuotationSummary[]
}

const statusBadge: Record<string, "green" | "yellow" | "blue" | "red" | "gray" | "orange"> = {
  borrador: "gray", enviada: "blue", vista: "orange",
  aprobada: "green", rechazada: "red", convertida: "green", cancelada: "gray",
}

export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-text-muted py-12 text-center">Cargando...</p>
  if (!data) return <p className="text-text-muted py-12 text-center">No encontrado</p>

  const approvedTotal = data.quotations
    .filter((q) => q.status === "aprobada" || q.status === "convertida")
    .reduce((sum, q) => sum + Number(q.total), 0)

  const openCount = data.quotations.filter((q) =>
    ["borrador", "enviada", "vista"].includes(q.status)
  ).length

  const address = [
    [data.addressStreet, data.addressNumber].filter(Boolean).join(" "),
    data.addressColony,
    [data.city, data.state].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ")

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/clientes" className="text-sm text-signal-400 hover:text-signal-300 mb-2 block">
            ← Clientes
          </Link>
          <h1 className="text-2xl font-semibold text-text-primary">{data.businessName}</h1>
          <p className="text-sm text-text-muted font-mono mt-1">{data.rfc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <p className="text-sm text-text-muted">Cotizaciones</p>
          <p className="text-3xl font-semibold text-text-primary mt-1">{data.quotations.length}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-text-muted">Abiertas</p>
          <p className="text-3xl font-semibold text-text-primary mt-1">{openCount}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-text-muted">Ingreso aprobado</p>
          <p className="text-3xl font-semibold text-signal-400 mt-1">
            ${approvedTotal.toLocaleString("es-MX")}
          </p>
        </Card>
      </div>

      <Card>
        <p className="text-xs text-text-muted uppercase font-semibold mb-3">Contacto</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-text-muted">Email</p>
            <p className="text-text-primary">{data.email || "—"}</p>
          </div>
          <div>
            <p className="text-text-muted">Teléfono</p>
            <p className="text-text-primary">{data.phone || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-text-muted">Dirección</p>
            <p className="text-text-primary">{address || "—"}</p>
          </div>
        </div>
      </Card>

      <Card padding="sm">
        <p className="text-xs text-text-muted uppercase font-semibold mb-3">Historial de cotizaciones</p>
        <Table
          headers={[
            { label: "Folio", width: "15%" },
            { label: "Total", width: "15%" },
            { label: "Estado", width: "15%" },
            { label: "Factura", width: "20%" },
            { label: "Fecha", width: "20%" },
            { label: "", width: "15%" },
          ]}
        >
          {data.quotations.length === 0 ? (
            <tr><Td colSpan={6} className="text-text-muted text-center py-8">Sin cotizaciones</Td></tr>
          ) : data.quotations.map((q) => (
            <tr key={q.id}>
              <Td><span className="font-mono text-sm">{q.folio}</span></Td>
              <Td><span className="font-mono">${Number(q.total).toLocaleString("es-MX")}</span></Td>
              <Td>
                <Badge variant={statusBadge[q.status] || "gray"}>
                  {QUOTATION_STATUSES.find((s) => s.value === q.status)?.label || q.status}
                </Badge>
              </Td>
              <Td>
                {q.invoice ? (
                  <Link href={`/facturas/${q.invoice.id}`} className="text-sm text-signal-400 hover:text-signal-300">
                    {q.invoice.folio}
                  </Link>
                ) : (
                  <span className="text-sm text-text-muted">—</span>
                )}
              </Td>
              <Td className="text-text-muted">{new Date(q.createdAt).toLocaleDateString("es-MX")}</Td>
              <Td>
                <Link href={`/cotizaciones/${q.id}`} className="text-signal-400 hover:text-signal-300 text-sm">
                  Ver
                </Link>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}