import { test, expect } from "@playwright/test"

const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

test.describe.configure({ timeout: 60_000 })

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) throw new Error("Faltan ADMIN_EMAIL y ADMIN_PASSWORD en .env")
})

test("los folios de cotización son consecutivos", async ({ page }) => {
  await page.goto("/login")
  await page.fill('input[name="email"]', EMAIL!)
  await page.fill('input[name="password"]', PASSWORD!)
  await page.click('button:has-text("Entrar")')
  await page.waitForURL("/")
  const req = page.request

  const clients = await (await req.get("/api/clients")).json()
  const clientId = clients[0].id

  const body = {
    clientId,
    items: [{ productId: null, concept: "Servicio", quantity: 1, unit: "servicio", unitPrice: 100, discountPercent: 0, taxType: "iva" }],
  }

  const q1 = await (await req.post("/api/quotations", { data: body })).json()
  const q2 = await (await req.post("/api/quotations", { data: body })).json()

  const year = new Date().getFullYear()
  const re = new RegExp(`^COT-${year}-\\d{4,}$`)
  expect(q1.folio).toMatch(re)
  expect(q2.folio).toMatch(re)

  const n1 = Number(q1.folio.split("-")[2])
  const n2 = Number(q2.folio.split("-")[2])
  expect(n2).toBe(n1 + 1) // consecutivo
})
