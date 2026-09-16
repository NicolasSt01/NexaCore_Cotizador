"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

interface Client { id: number; businessName: string; rfc: string }
interface ItemDraft {
  key: string
  concept: string
  kind: "fijo" | "uso"
  unitPrice: string
  unit: string
}

let seq = 1
const newItem = (): ItemDraft => ({ key: String(seq++), concept: "", kind: "fijo", unitPrice: "", unit: "mes" })

export default function NuevoContratoPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState("")
  const [name, setName] = useState("")
  const [billingDay, setBillingDay] = useState("1")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<ItemDraft[]>([newItem()])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/clients").then((r) => (r.ok ? r.json() : [])).then(setClients)
  }, [])

  function updateItem(key: string, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  async function save() {
    if (!clientId) { alert("Selecciona un cliente"); return }
    if (!name.trim()) { alert("Ponle nombre al contrato"); return }
    setSaving(true)
    const r = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: Number(clientId),
        name: name.trim(),
        billingDay: Number(billingDay) || 1,
        notes,
        items: items
          .filter((i) => i.concept.trim())
          .map((i) => ({ concept: i.concept.trim(), kind: i.kind, unitPrice: Number(i.unitPrice) || 0, unit: i.unit })),
      }),
    })
    if (r.ok) {
      const c = await r.json()
      router.push(`/contratos/${c.id}`)
    } else {
      alert((await r.json()).error || "No se pudo crear")
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/contratos" className="text-sm text-signal-400 hover:text-signal-300 mb-2 block">← Contratos</Link>
        <h1 className="text-2xl font-semibold text-text-primary">Nuevo contrato</h1>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Cliente</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40"
          >
            <option value="">Selecciona un cliente…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName} — {c.rfc}</option>)}
          </select>
        </div>
        <Input label="Nombre del contrato" placeholder="Ej. Plataforma aduanal + Bot IA" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Día de corte" type="number" min="1" max="28" value={billingDay} onChange={(e) => setBillingDay(e.target.value)} />
        </div>
        <Input label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted uppercase font-semibold">Conceptos recurrentes</p>
        </div>
        {items.map((it) => (
          <div key={it.key} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Concepto</label>
              <input
                value={it.concept}
                onChange={(e) => updateItem(it.key, { concept: e.target.value })}
                placeholder="Ej. Bot IA / Operación procesada"
                className="h-9 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Tipo</label>
              <select
                value={it.kind}
                onChange={(e) => {
                  const kind = e.target.value as "fijo" | "uso"
                  updateItem(it.key, { kind, unit: kind === "uso" ? "operación" : "mes" })
                }}
                className="h-9 px-2 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40"
              >
                <option value="fijo">Fijo/mes</option>
                <option value="uso">Por uso</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 w-28">
              <label className="text-xs text-text-muted">{it.kind === "uso" ? "Precio/unidad" : "Monto/mes"}</label>
              <input
                type="number" step="0.01" min="0"
                value={it.unitPrice}
                onChange={(e) => updateItem(it.key, { unitPrice: e.target.value })}
                className="h-9 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40"
              />
            </div>
            <div className="flex flex-col gap-1 w-24">
              <label className="text-xs text-text-muted">Unidad</label>
              <input
                value={it.unit}
                onChange={(e) => updateItem(it.key, { unit: e.target.value })}
                className="h-9 px-3 rounded-lg bg-ink-900 border border-line text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-signal-500/40"
              />
            </div>
            <button
              onClick={() => setItems((prev) => prev.length > 1 ? prev.filter((x) => x.key !== it.key) : prev)}
              className="h-9 px-2 rounded-md text-text-muted hover:text-red transition-colors"
              title="Quitar"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => setItems((prev) => [...prev, newItem()])}
          className="w-full py-2.5 rounded-lg border border-dashed border-line text-text-muted hover:text-signal-400 hover:border-signal-500/50 transition-colors text-sm"
        >
          + Agregar concepto
        </button>
      </Card>

      <div className="flex gap-3">
        <Button onClick={save} disabled={saving}>{saving ? "Guardando..." : "Crear contrato"}</Button>
        <Button variant="secondary" onClick={() => router.push("/contratos")}>Cancelar</Button>
      </div>
    </div>
  )
}
