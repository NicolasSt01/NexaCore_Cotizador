import { test, expect } from "@playwright/test"

const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

test.describe.configure({ timeout: 60_000 })

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) throw new Error("Faltan ADMIN_EMAIL y ADMIN_PASSWORD en .env")
})

test("contrato recurrente: fijo + uso → cargo → facturar", async ({ page }) => {
  await page.goto("/login")
  await page.fill('input[name="email"]', EMAIL!)
  await page.fill('input[name="password"]', PASSWORD!)
  await page.click('button:has-text("Entrar")')
  await page.waitForURL("/")
  const req = page.request

  const clients = await (await req.get("/api/clients")).json()
  const clientId = clients[0].id

  // 1) Contrato con fee fijo ($1000) + fee por uso ($20/operación).
  const cRes = await req.post("/api/contracts", {
    data: {
      clientId,
      name: "Plataforma aduanal + Bot IA " + Date.now(),
      billingDay: 1,
      items: [
        { concept: "Bot IA", kind: "fijo", unitPrice: 1000, unit: "mes" },
        { concept: "Operación procesada por IA", kind: "uso", unitPrice: 20, unit: "operación" },
      ],
    },
  })
  expect(cRes.ok()).toBeTruthy()
  const contract = await cRes.json()
  expect(contract.items.length).toBe(2)

  // 2) Generar el cargo del periodo.
  const chRes = await req.post(`/api/contracts/${contract.id}/charge`, {
    data: { periodYear: 2026, periodMonth: 9 },
  })
  expect(chRes.ok()).toBeTruthy()
  const charge = await chRes.json()
  const usoLine = charge.lines.find((l: { kind: string }) => l.kind === "uso")
  const fijoLine = charge.lines.find((l: { kind: string }) => l.kind === "fijo")
  expect(Number(fijoLine.subtotal)).toBe(1000) // fijo entra en 1
  expect(Number(usoLine.quantity)).toBe(0)     // uso arranca en 0

  // 3) Capturar uso: 80 operaciones.
  const patchRes = await req.patch(`/api/charges/${charge.id}`, {
    data: { lines: [{ id: usoLine.id, quantity: 80 }] },
  })
  expect(patchRes.ok()).toBeTruthy()
  const updated = await patchRes.json()
  // 1000 fijo + 80 x 20 = 2600 subtotal
  expect(Number(updated.subtotal)).toBe(2600)
  expect(Number(updated.total)).toBeGreaterThan(2600) // + IVA

  // 4) Generar factura del cargo.
  const invRes = await req.post(`/api/charges/${charge.id}/invoice`)
  expect(invRes.ok()).toBeTruthy()
  const invoice = await invRes.json()
  expect(invoice.status).toBe("solicitada")
  expect(invoice.chargeId).toBe(charge.id)
  expect(Number(invoice.subtotal)).toBe(2600)

  // 5) El cargo queda facturado.
  const chargeAfter = await (await req.get(`/api/charges/${charge.id}`)).json()
  expect(chargeAfter.status).toBe("facturado")

  // 6) La factura de contrato se ve bien en la UI (origen = contrato + periodo).
  await page.goto(`/facturas/${invoice.id}`)
  await expect(page.getByText("Solicitada", { exact: true })).toBeVisible()
  await expect(page.getByText("Datos para el despacho")).toBeVisible()
  await expect(page.getByText(/Contrato:/)).toBeVisible()
})
