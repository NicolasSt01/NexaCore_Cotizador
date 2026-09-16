import { test, expect } from "@playwright/test"

const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

test.describe.configure({ timeout: 60_000 })

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) throw new Error("Faltan ADMIN_EMAIL y ADMIN_PASSWORD en .env")
})

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.fill('input[name="email"]', EMAIL!)
  await page.fill('input[name="password"]', PASSWORD!)
  await page.click('button:has-text("Entrar")')
  await page.waitForURL("/")
}

test("cobranza con abonos parciales hasta saldar", async ({ page }) => {
  await login(page)
  const req = page.request
  const clientId = (await (await req.get("/api/clients")).json())[0].id

  const q = await (await req.post("/api/quotations", {
    data: { clientId, items: [{ productId: null, concept: "Servicio", quantity: 1, unit: "servicio", unitPrice: 1000, discountPercent: 0, taxType: "iva" }] },
  })).json()
  await req.patch(`/api/quotations/${q.id}`, { data: { status: "enviada" } })
  await req.patch(`/api/quotations/${q.id}`, { data: { status: "aprobada" } })
  const inv = await (await req.post(`/api/quotations/${q.id}/invoice`)).json()
  await req.post(`/api/invoices/${inv.id}/facturar`, { multipart: { uuid: "ABONO-" + Date.now() } })

  const full = await (await req.get(`/api/invoices/${inv.id}`)).json()
  const total = Number(full.total)
  const half = Math.round((total / 2) * 100) / 100

  // Abono parcial → sigue facturada, con 1 abono.
  let after = await (await req.post(`/api/invoices/${inv.id}/payments`, { data: { amount: half } })).json()
  expect(after.status).toBe("facturada")
  expect(after.payments.length).toBe(1)

  // Segundo abono cubre el resto → pagada.
  const rest = Math.round((total - half) * 100) / 100
  after = await (await req.post(`/api/invoices/${inv.id}/payments`, { data: { amount: rest } })).json()
  expect(after.status).toBe("pagada")
  expect(after.payments.length).toBe(2)

  // UI: saldo cubierto.
  await page.goto(`/facturas/${inv.id}`)
  await expect(page.getByText("Pagada", { exact: true })).toBeVisible()
  await expect(page.getByText("Factura pagada por completo.")).toBeVisible()
})

test("el dashboard financiero carga con sus métricas", async ({ page }) => {
  await login(page)
  await expect(page.getByText("Ingreso recurrente (MRR)")).toBeVisible()
  await expect(page.getByText("Por cobrar")).toBeVisible()
  await expect(page.getByText("Vencido", { exact: true })).toBeVisible()
  await expect(page.getByText("Cobrado este mes")).toBeVisible()
})
