import { test, expect } from "@playwright/test"

const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

test.describe.configure({ timeout: 60_000 })

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) throw new Error("Faltan ADMIN_EMAIL y ADMIN_PASSWORD en .env")
})

test("el contenido del PDF incluye notas y términos y condiciones", async ({ page }) => {
  await page.goto("/login")
  await page.fill('input[name="email"]', EMAIL!)
  await page.fill('input[name="password"]', PASSWORD!)
  await page.click('button:has-text("Entrar")')
  await page.waitForURL("/")
  const req = page.request

  const clients = await (await req.get("/api/clients")).json()
  const clientId = clients[0].id

  const notesText = "NOTA-E2E-" + Date.now()
  const termsText = "TERMINOS-E2E-" + Date.now()

  const qRes = await req.post("/api/quotations", {
    data: {
      clientId,
      notes: notesText,
      termsConditions: termsText,
      items: [{ productId: null, concept: "Servicio", quantity: 1, unit: "servicio", unitPrice: 1000, discountPercent: 0, taxType: "iva" }],
    },
  })
  expect(qRes.ok()).toBeTruthy()
  const q = await qRes.json()

  await page.goto(`/cotizaciones/${q.id}`)

  // El PDF se arma desde este div oculto; si el texto está aquí, html2canvas lo captura.
  const pdf = page.locator("#pdf-print-content")
  await expect(pdf).toContainText("Notas")
  await expect(pdf).toContainText(notesText)
  await expect(pdf).toContainText("Términos y condiciones")
  await expect(pdf).toContainText(termsText)
})
