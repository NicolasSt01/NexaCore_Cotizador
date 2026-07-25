import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import bcrypt from "bcryptjs"

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

const ADMIN_NAME = process.env.ADMIN_NAME ?? "Admin NexaCore"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@nexacore.mx"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_PASSWORD no está definida. Configúrala en las variables de entorno antes de correr el seed."
    )
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  // Idempotente: si el admin ya existe se re-sincronizan nombre, rol y contraseña,
  // así basta con cambiar ADMIN_PASSWORD en Dokploy y redesplegar para rotarla.
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      passwordHash,
      role: "admin",
    },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "admin",
    },
  })

  const settings = await prisma.companySettings.findFirst()
  if (!settings) {
    await prisma.companySettings.create({
      data: {
        businessName: "NexaCore Desarrollo e Integración de Sistemas",
        rfc: "XXX000101XXX",
        email: "contacto@nexacore.mx",
        phone: "(899) 000-0000",
        ivaRate: 0.16,
        isrRetencionRate: 0.1,
        ivaRetencionRate: 0.106666,
      },
    })
  }

  console.log("Seed completado. Admin:", admin.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
