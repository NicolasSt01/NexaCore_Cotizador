import { test, expect, type Page } from "@playwright/test"

// Credenciales desde el entorno (.env, en .gitignore). No se escriben aquí
// porque este archivo sí va al repositorio.
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

// El asistente de cotización tiene varios pasos; en modo headed cada test
// necesita algo más de margen que el default de 30s.
test.describe.configure({ timeout: 60_000 })

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Faltan ADMIN_EMAIL y ADMIN_PASSWORD. Defínelas en .env antes de correr las pruebas."
    )
  }
})

async function login(page: Page) {
  // Aceptar automáticamente los confirm() de aprobar/rechazar/cancelar. Sin
  // esto Playwright los descarta por defecto y la acción nunca se ejecuta.
  page.on("dialog", (dialog) => dialog.accept())
  await page.goto("/login")
  await page.fill('input[name="email"]', EMAIL!)
  await page.fill('input[name="password"]', PASSWORD!)
  await page.click('button:has-text("Entrar")')
  await page.waitForURL("/")
}

/** Crea un servicio en el catálogo vía API (sesión ya autenticada). */
async function createProductViaApi(page: Page, name: string, unitPrice: number) {
  const sku = "E2E-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
  const res = await page.request.post("/api/products", {
    data: {
      name,
      sku,
      unitPrice,
      taxType: "iva",
      unit: "servicio",
      description: "Servicio creado por prueba E2E",
    },
  })
  expect(res.ok(), "el producto de prueba debe crearse").toBeTruthy()
}

/** Paso 1 del wizard: selecciona el primer cliente disponible. */
async function selectFirstClient(page: Page) {
  await page.locator("div.max-h-60 button").first().click()
}

/**
 * Recorre el wizard con un concepto manual y guarda como borrador.
 * Deja la página en el detalle de la cotización recién creada.
 */
async function createDraft(page: Page, concept = "Servicio E2E", price = "1000") {
  await page.goto("/cotizaciones/nueva")
  await selectFirstClient(page)
  await page.getByRole("button", { name: "Siguiente" }).click()

  await page.getByRole("button", { name: "Agregar concepto" }).click()
  await page.fill('input[placeholder="Concepto"]', concept)
  // Orden de inputs numéricos en la partida: cantidad, precio unit., desc %.
  await page.locator('input[type="number"]').nth(1).fill(price)

  await page.getByRole("button", { name: "Siguiente" }).click() // → Configuración
  await page.getByRole("button", { name: "Siguiente" }).click() // → Vista previa
  await page.getByRole("button", { name: "Guardar borrador" }).click()
  await page.waitForURL(/\/cotizaciones\/\d+$/)
}

// 1 ─────────────────────────────────────────────────────────────────────────
test("1. Login del admin y carga del dashboard", async ({ page }) => {
  await page.goto("/login")
  await expect(page.locator("h1")).toContainText("Iniciar sesión")
  await page.fill('input[name="email"]', EMAIL!)
  await page.fill('input[name="password"]', PASSWORD!)
  await page.click('button:has-text("Entrar")')
  await page.waitForURL("/")
  await expect(page.locator("h1")).toContainText("Dashboard")
})

// 2 ─────────────────────────────────────────────────────────────────────────
test("2. Crear un servicio base en el catálogo (Productos)", async ({ page }) => {
  await login(page)
  await page.goto("/productos")
  await expect(page.locator("h1")).toContainText("Productos")

  const nombre = "Soporte técnico E2E " + Date.now()
  const sku = "SOP-" + Date.now()

  await page.getByRole("button", { name: "Nuevo producto" }).click()
  await page.getByLabel("SKU").fill(sku)
  await page.getByLabel("Nombre").fill(nombre)
  await page.getByLabel("Precio unitario").fill("600")
  await page.getByRole("button", { name: "Guardar producto" }).click()

  // Debe aparecer en la tabla del catálogo.
  await expect(page.getByText(nombre)).toBeVisible()
})

// 3 ─────────────────────────────────────────────────────────────────────────
test("3. Cotizar usando el catálogo autocompleta la partida", async ({ page }) => {
  await login(page)
  const nombre = "Servicio catálogo E2E " + Date.now()
  await createProductViaApi(page, nombre, 600)

  await page.goto("/cotizaciones/nueva")
  await selectFirstClient(page)
  await page.getByRole("button", { name: "Siguiente" }).click()

  // Selector nuevo "Agregar del catálogo": elegir el servicio recién creado.
  const optionValue = await page
    .locator("select option", { hasText: nombre })
    .first()
    .getAttribute("value")
  await page.locator("select").first().selectOption(optionValue!)

  // La partida queda prellenada con el nombre y el precio del catálogo.
  await expect(page.locator('input[placeholder="Concepto"]')).toHaveValue(nombre)
  const itemCard = page
    .locator("div.p-4.rounded-lg.border")
    .filter({ has: page.locator('input[placeholder="Concepto"]') })
  await expect(itemCard.locator('input[type="number"]').nth(1)).toHaveValue("600")

  await page.getByRole("button", { name: "Siguiente" }).click()
  await page.getByRole("button", { name: "Siguiente" }).click()
  await page.getByRole("button", { name: "Guardar borrador" }).click()
  await page.waitForURL(/\/cotizaciones\/\d+$/)
  await expect(page.locator("td p").filter({ hasText: nombre })).toBeVisible()
})

// 4 ─────────────────────────────────────────────────────────────────────────
test("4. El detalle muestra el código QR y el enlace público", async ({ page }) => {
  await login(page)
  await createDraft(page)
  await expect(page.getByText("Compartir cotización")).toBeVisible()
  await expect(page.locator('img[alt="QR"]')).toBeVisible()
  const url = await page.locator("input[readonly]").inputValue()
  expect(url).toContain("/publica/")
})

// 5 ─────────────────────────────────────────────────────────────────────────
test("5. Admin marca una cotización como enviada", async ({ page }) => {
  await login(page)
  await createDraft(page)
  await expect(page.getByText("Borrador", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Marcar como enviada" }).click()
  await expect(page.getByText("Enviada", { exact: true })).toBeVisible()
})

// 6 ─────────────────────────────────────────────────────────────────────────
test("6. Admin aprueba y aparece 'Convertir a factura'", async ({ page }) => {
  await login(page)
  await createDraft(page)
  await page.getByRole("button", { name: "Marcar como enviada" }).click()
  await expect(page.getByText("Enviada", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Aprobar" }).click()
  await expect(page.getByText("Aprobada", { exact: true })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Convertir a factura" })
  ).toBeVisible()
})

// 7 ─────────────────────────────────────────────────────────────────────────
test("7. Admin rechaza una cotización", async ({ page }) => {
  await login(page)
  await createDraft(page)
  await page.getByRole("button", { name: "Marcar como enviada" }).click()
  await expect(page.getByText("Enviada", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Rechazar" }).click()
  await expect(page.getByText("Rechazada", { exact: true })).toBeVisible()
})

// 8 ─────────────────────────────────────────────────────────────────────────
test("8. Admin puede cancelar incluso una cotización aprobada", async ({ page }) => {
  await login(page)
  await createDraft(page)
  await page.getByRole("button", { name: "Marcar como enviada" }).click()
  await page.getByRole("button", { name: "Aprobar" }).click()
  await expect(page.getByText("Aprobada", { exact: true })).toBeVisible()
  // Con el ajuste del backend, cancelar debe funcionar desde 'aprobada'.
  await page.getByRole("button", { name: "Cancelar" }).click()
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Convertir a factura" })
  ).toHaveCount(0)
})

// 9 ─────────────────────────────────────────────────────────────────────────
test("9. La página pública muestra la cotización al cliente", async ({ page }) => {
  await login(page)
  await createDraft(page)
  await page.getByRole("button", { name: "Marcar como enviada" }).click()
  await expect(page.getByText("Enviada", { exact: true })).toBeVisible()
  const url = await page.locator("input[readonly]").inputValue()

  await page.goto(url)
  await expect(page.getByText("Cotización")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Aprobar cotización" })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Rechazar cotización" })
  ).toBeVisible()
})

// 10 ────────────────────────────────────────────────────────────────────────
test("10. El cliente aprueba desde la página pública", async ({ page }) => {
  await login(page)
  await createDraft(page)
  await page.getByRole("button", { name: "Marcar como enviada" }).click()
  await expect(page.getByText("Enviada", { exact: true })).toBeVisible()
  const url = await page.locator("input[readonly]").inputValue()

  await page.goto(url)
  await page.getByRole("button", { name: "Aprobar cotización" }).click()
  await expect(page.getByText("Cotización aprobada. Gracias.")).toBeVisible()
})

// 11 ────────────────────────────────────────────────────────────────────────
test("11. Alta manual de concepto sigue funcionando", async ({ page }) => {
  await login(page)
  await createDraft(page, "Concepto manual E2E", "2500")
  // Aterriza en el detalle: el concepto manual quedó guardado.
  await expect(page.locator("td p").filter({ hasText: "Concepto manual E2E" })).toBeVisible()
})
