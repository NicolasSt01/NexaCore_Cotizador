"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/Card"
import { Table, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { Input } from "@/components/ui/Input"

interface Client {
  id: number
  businessName: string
  rfc: string
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  _count: { quotations: number }
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    businessName: "",
    rfc: "",
    email: "",
    phone: "",
    addressStreet: "",
    addressNumber: "",
    addressColony: "",
    city: "",
    state: "",
    zipCode: "",
    taxRegime: "",
    cfdiUsage: "",
  })

  async function load() {
    setLoading(true)
    const res = await fetch("/api/clients")
    if (res.ok) setClients(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setModalOpen(false)
      setForm({
        businessName: "",
        rfc: "",
        email: "",
        phone: "",
        addressStreet: "",
        addressNumber: "",
        addressColony: "",
        city: "",
        state: "",
        zipCode: "",
        taxRegime: "",
        cfdiUsage: "",
      })
      load()
    } else {
      const err = await res.json()
      alert(err.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Clientes</h1>
        <Button onClick={() => setModalOpen(true)}>Nuevo cliente</Button>
      </div>

      <Card>
        <Table
          headers={[
            { label: "RFC", width: "15%" },
            { label: "Razón Social", width: "30%" },
            { label: "Contacto", width: "25%" },
            { label: "Ubicación", width: "20%" },
            { label: "Cotizaciones", width: "10%" },
          ]}
        >
          {loading ? (
            <tr><Td colSpan={5} className="text-text-muted text-center py-8">Cargando...</Td></tr>
          ) : clients.length === 0 ? (
            <tr><Td colSpan={5} className="text-text-muted text-center py-8">Sin clientes registrados</Td></tr>
          ) : clients.map((c) => (
            <tr key={c.id}>
              <Td><span className="font-mono text-sm">{c.rfc}</span></Td>
              <Td className="font-medium">{c.businessName}</Td>
              <Td>
                {c.email && <p className="text-sm">{c.email}</p>}
                {c.phone && <p className="text-xs text-text-muted">{c.phone}</p>}
              </Td>
              <Td className="text-text-muted">{[c.city, c.state].filter(Boolean).join(", ")}</Td>
              <Td><Badge>{c._count.quotations}</Badge></Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo cliente">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="RFC" value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value })} required placeholder="XXX000101XXX" />
          <Input label="Razón Social" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Calle" value={form.addressStreet} onChange={(e) => setForm({ ...form, addressStreet: e.target.value })} />
            <Input label="Número" value={form.addressNumber} onChange={(e) => setForm({ ...form, addressNumber: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Colonia" value={form.addressColony} onChange={(e) => setForm({ ...form, addressColony: e.target.value })} />
            <Input label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Estado" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <Button type="submit" className="w-full">Guardar cliente</Button>
        </form>
      </Modal>
    </div>
  )
}
