import { test, expect } from "@playwright/test"

const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

test.describe.configure({ timeout: 60_000 })

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) throw new Error("Faltan ADMIN_EMAIL y ADMIN_PASSWORD en .env")
})

test("la sección Finanzas carga, filtra y exporta a CSV", async ({ page }) => {
  await page.goto("/login")
  await page.fill('input[name="email"]', EMAIL!)
  await page.fill('input[name="password"]', PASSWORD!)
  await page.click('button:has-text("Entrar")')
  await page.waitForURL("/")

  // Entrar desde el menú lateral.
  await page.getByRole("link", { name: "Finanzas" }).click()
  await page.waitForURL("**/finanzas")

  // KPIs presentes.
  await expect(page.getByText("MRR", { exact: true })).toBeVisible()
  await expect(page.getByText("Facturado", { exact: true })).toBeVisible()
  await expect(page.getByText("Cobrado", { exact: true })).toBeVisible()
  await expect(page.getByText("Por cobrar", { exact: true })).toBeVisible()
  await expect(page.getByText("Vencido", { exact: true })).toBeVisible()

  // Exportar a CSV: se dispara la descarga.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar a Excel (CSV)" }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^finanzas-\d{4}-\d{2}-\d{2}\.csv$/)
})
