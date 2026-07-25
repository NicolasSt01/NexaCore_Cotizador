"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/Card"
import { Table, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { Input } from "@/components/ui/Input"

interface Product {
  id: number
  name: string
  description: string | null
  unitPrice: string
  taxType: string
  unit: string
  sku: string
  active: boolean
}

const taxTypeLabels: Record<string, { label: string; variant: "green" | "yellow" | "blue" }> = {
  iva: { label: "IVA 16%", variant: "blue" },
  iva_retencion: { label: "IVA + Retención", variant: "yellow" },
  exento: { label: "Exento", variant: "green" },
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: "",
    description: "",
    unitPrice: "",
    taxType: "iva",
    unit: "pieza",
    sku: "",
  })

  async function load() {
    setLoading(true)
    const res = await fetch("/api/products")
    if (res.ok) setProducts(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setModalOpen(false)
      setForm({ name: "", description: "", unitPrice: "", taxType: "iva", unit: "pieza", sku: "" })
      load()
    } else {
      const err = await res.json()
      alert(err.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Productos</h1>
        <Button onClick={() => setModalOpen(true)}>Nuevo producto</Button>
      </div>

      <Card>
        <Table
          headers={[
            { label: "SKU", width: "15%" },
            { label: "Nombre", width: "30%" },
            { label: "Precio", width: "15%" },
            { label: "Impuesto", width: "15%" },
            { label: "Unidad", width: "15%" },
            { label: "Estado", width: "10%" },
          ]}
        >
          {loading ? (
            <tr><Td colSpan={6} className="text-text-muted text-center py-8">Cargando...</Td></tr>
          ) : products.length === 0 ? (
            <tr><Td colSpan={6} className="text-text-muted text-center py-8">Sin productos registrados</Td></tr>
          ) : products.map((p) => {
            const tax = taxTypeLabels[p.taxType] || taxTypeLabels.iva
            return (
              <tr key={p.id}>
                <Td><span className="font-mono text-sm">{p.sku}</span></Td>
                <Td className="font-medium">{p.name}</Td>
                <Td><span className="font-mono">${Number(p.unitPrice).toLocaleString("es-MX")}</span></Td>
                <Td><Badge variant={tax.variant}>{tax.label}</Badge></Td>
                <Td className="text-text-muted">{p.unit}</Td>
                <Td><Badge variant={p.active ? "green" : "gray"}>{p.active ? "Activo" : "Inactivo"}</Badge></Td>
              </tr>
            )
          })}
        </Table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo producto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Precio unitario" type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Tipo de impuesto</label>
              <select
                value={form.taxType}
                onChange={(e) => setForm({ ...form, taxType: e.target.value })}
                className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary focus:outline-none focus:ring-2 focus:ring-signal-500/40 focus:border-signal-500"
              >
                <option value="iva">IVA 16%</option>
                <option value="iva_retencion">IVA + Retención</option>
                <option value="exento">Exento</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Unidad</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary focus:outline-none focus:ring-2 focus:ring-signal-500/40 focus:border-signal-500"
              >
                <option value="pieza">Pieza</option>
                <option value="servicio">Servicio</option>
                <option value="hora">Hora</option>
                <option value="día">Día</option>
                <option value="mes">Mes</option>
                <option value="proyecto">Proyecto</option>
                <option value="lote">Lote</option>
              </select>
            </div>
          </div>
          <Input label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button type="submit" className="w-full">Guardar producto</Button>
        </form>
      </Modal>
    </div>
  )
}
