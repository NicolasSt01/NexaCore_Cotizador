import { test, expect } from "@playwright/test"

const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Faltan ADMIN_EMAIL y ADMIN_PASSWORD. Defínelas en .env antes de correr las pruebas."
    )
  }
})

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.fill('input[name="email"]', EMAIL!)
  await page.fill('input[name="password"]', PASSWORD!)
  await page.click('button:has-text("Entrar")')
  await page.waitForURL("/")
}

/** Texto largo de términos: supera los 191 chars que permitía VARCHAR(191). */
const LONG_TERMS =
  "El cliente acepta las condiciones del servicio prestado por NexaCore. " +
  "Los plazos de entrega son estimados y podrán ajustarse según la disponibilidad. " +
  "El pago deberá realizarse dentro de los 15 días naturales siguientes a la emisión. " +
  "Cualquier modificación al alcance requerirá una cotización adicional. Fin del texto."

test("guardar términos y condiciones largos en Configuración", async ({ page }) => {
  await login(page)
  await page.goto("/configuracion")
  await expect(page.getByText("Términos y condiciones")).toBeVisible()

  const card = page.locator("form", { hasText: "Textos por defecto" })
  const texts = card.locator("textarea")
  await texts.nth(0).fill(LONG_TERMS)

  await page.getByRole("button", { name: "Guardar cambios" }).first().click()

  await expect(page.getByText("Configuración guardada.")).toBeVisible()

  // Recargar y verificar que persiste.
  await page.reload()
  await expect(page.getByText("Términos y condiciones")).toBeVisible()
  const value = await page.locator("form", { hasText: "Textos por defecto" }).locator("textarea").nth(0).inputValue()
  expect(value).toBe(LONG_TERMS)
})