import { test, expect } from "@playwright/test"

// Las credenciales salen del entorno (.env, que está en .gitignore). Nunca se
// escriben aquí: este archivo sí va al repositorio.
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

test("login con admin y ver dashboard", async ({ page }) => {
  await page.goto("/login")
  await expect(page.locator("h1")).toContainText("Iniciar sesión")

  await page.fill('input[name="email"]', EMAIL!)
  await page.fill('input[name="password"]', PASSWORD!)
  await page.click('button:has-text("Entrar")')

  await page.waitForURL("/")
  await expect(page.locator("h1")).toContainText("Dashboard")
})

test("navegar a clientes desde dashboard", async ({ page }) => {
  await login(page)
  await page.goto("/clientes")
  await expect(page.locator("h1")).toContainText("Clientes")
})

test("navegar a productos", async ({ page }) => {
  await login(page)
  await page.goto("/productos")
  await expect(page.locator("h1")).toContainText("Productos")
})

test("navegar a cotizaciones", async ({ page }) => {
  await login(page)
  await page.goto("/cotizaciones")
  await expect(page.locator("h1")).toContainText("Cotizaciones")
})

test("dashboard carga correctamente", async ({ page }) => {
  await login(page)
  await expect(page.locator("h1")).toContainText("Dashboard")
  await expect(page.locator("h1")).toBeVisible()
})
