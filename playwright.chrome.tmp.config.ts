// Config TEMPORAL para validación E2E en macOS 12, donde Playwright ya no
// descarga Chromium. Usa el Google Chrome del sistema (channel "chrome").
// Este archivo es desechable; se borra al terminar las pruebas.
import "dotenv/config"
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:3001",
    headless: false,
    channel: "chrome",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npm run dev -- --port 3001",
    url: "http://localhost:3001/login",
    reuseExistingServer: true,
  },
})
