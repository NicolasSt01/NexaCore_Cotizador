import { test, expect } from "@playwright/test"

const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

test.describe.configure({ timeout: 60_000 })

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) throw new Error("Faltan ADMIN_EMAIL y ADMIN_PASSWORD en .env")
})

test("ciclo de facturación: solicitar → facturar (UUID) → pagar", async ({ page }) => {
  // Login (deja la cookie de sesión en el contexto; page.request la reutiliza).
  await page.goto("/login")
  await page.fill('input[name="email"]', EMAIL!)
  await page.fill('input[name="password"]', PASSWORD!)
  await page.click('button:has-text("Entrar")')
  await page.waitForURL("/")
  const req = page.request

  // Usa el primer cliente existente.
  const clients = await (await req.get("/api/clients")).json()
  expect(Array.isArray(clients) && clients.length > 0).toBeTruthy()
  const clientId = clients[0].id

  // 1) Crear cotización y llevarla a aprobada.
  const qRes = await req.post("/api/quotations", {
    data: {
      clientId,
      items: [{ productId: null, concept: "Servicio E2E factura", quantity: 1, unit: "servicio", unitPrice: 1000, discountPercent: 0, taxType: "iva" }],
    },
  })
  expect(qRes.ok()).toBeTruthy()
  const quotation = await qRes.json()
  await req.patch(`/api/quotations/${quotation.id}`, { data: { status: "enviada" } })
  await req.patch(`/api/quotations/${quotation.id}`, { data: { status: "aprobada" } })

  // 2) Solicitar factura (se crea en estado "solicitada").
  const invRes = await req.post(`/api/quotations/${quotation.id}/invoice`)
  expect(invRes.ok()).toBeTruthy()
  const invoice = await invRes.json()
  expect(invoice.status).toBe("solicitada")

  // 3) Guardar forma y método de pago (para el despacho).
  const fiscalRes = await req.patch(`/api/invoices/${invoice.id}`, {
    data: { action: "saveFiscal", formaPago: "03 - Transferencia electrónica de fondos", metodoPago: "PUE - Pago en una sola exhibición" },
  })
  expect(fiscalRes.ok()).toBeTruthy()

  // 4) Marcar como facturada con UUID (sin archivos, R2 no requerido).
  const uuid = "12345678-1234-1234-1234-123456789abc"
  const factRes = await req.post(`/api/invoices/${invoice.id}/facturar`, {
    multipart: { uuid },
  })
  expect(factRes.ok()).toBeTruthy()
  const facturada = await factRes.json()
  expect(facturada.status).toBe("facturada")
  expect(facturada.uuid).toBe(uuid)
  expect(facturada.formaPago).toContain("Transferencia")

  // 5) La UI del detalle muestra el ciclo y "Datos para el despacho".
  await page.goto(`/facturas/${invoice.id}`)
  await expect(page.getByText("Facturada", { exact: true })).toBeVisible()
  await expect(page.getByText("Datos para el despacho")).toBeVisible()
  await expect(page.getByText(uuid)).toBeVisible()

  // 6) Marcar como pagada.
  page.on("dialog", (d) => d.accept())
  await page.getByRole("button", { name: "Marcar como pagada" }).click()
  await expect(page.getByText("Pagada", { exact: true })).toBeVisible()

  // Verificación final por API.
  const finalInv = await (await req.get(`/api/invoices/${invoice.id}`)).json()
  expect(finalInv.status).toBe("pagada")
  expect(finalInv.paymentDate).toBeTruthy()
})
