"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

interface ContractItem {
  id: number
  concept: string
  kind: string
  unitPrice: string
  unit: string
}
interface Contract {
  id: number
  name: string
  status: string
  client: { id: number; businessName: string }
  items: ContractItem[]
}

const money = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`

const STATUS_BADGE: Record<string, "green" | "yellow" | "gray"> = {
  activo: "green", pausado: "yellow", cancelado: "gray",
}

export default function ContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    let cancelled = false
    fetch(`/api/contracts?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!cancelled) setContracts(d) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [search])

  const fixedOf = (c: Contract) =>
    c.items.filter((i) => i.kind === "fijo").reduce((s, i) => s + Number(i.unitPrice), 0)

  // MRR = recurrente fijo mensual de los contratos activos.
  const mrr = contracts.filter((c) => c.status === "activo").reduce((s, c) => s + fixedOf(c), 0)
  const activos = contracts.filter((c) => c.status === "activo").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Contratos</h1>
        <Link href="/contratos/nuevo"><Button>Nuevo contrato</Button></Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold">Ingreso recurrente (MRR)</p>
          <p className="text-2xl font-semibold text-signal-400 font-mono mt-1">{money(mrr)}</p>
          <p className="text-xs text-text-muted mt-1">fijo mensual · + variable por uso</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold">Contratos activos</p>
          <p className="text-2xl font-semibold text-text-primary font-mono mt-1">{activos}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted uppercase font-semibold">Anualizado (fijo)</p>
          <p className="text-2xl font-semibold text-text-primary font-mono mt-1">{money(mrr * 12)}</p>
        </Card>
      </div>

      <Input placeholder="Buscar por contrato o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <Card padding="sm">
        {loading ? (
          <p className="text-text-muted p-4 text-center">Cargando...</p>
        ) : contracts.length === 0 ? (
          <p className="text-text-muted p-4 text-center">No hay contratos. Crea el primero.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-muted">Contrato</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-muted">Cliente</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-text-muted">Fijo mensual</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase text-text-muted">Conceptos</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase text-text-muted">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-ink-850 transition-colors cursor-pointer" onClick={() => window.location.href = `/contratos/${c.id}`}>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{c.client.businessName}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{money(fixedOf(c))}</td>
                  <td className="px-4 py-3 text-center text-sm text-text-muted">
                    {c.items.length}
                    {c.items.some((i) => i.kind === "uso") && <span className="text-signal-400"> · uso</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_BADGE[c.status] || "gray"}>{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
