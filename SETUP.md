# NexaCore Cotizador — Guía de Instalación y Setup

## Requisitos

- Node.js 18+
- MySQL 8+
- Cuenta Cloudflare R2 (solo para facturas timbradas)
- Dokploy (para deploy en VPS)

---

## 1. Crear proyecto Next.js

```bash
npx create-next-app@latest nexacore-cotizador \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-import-alias \
  --use-npm

cd nexacore-cotizador
```

## 2. Dependencias

### Producción

```bash
npm install \
  @prisma/client \
  next-auth@4 \
  react-hook-form \
  @hookform/resolvers \
  zod \
  chart.js \
  react-chartjs-2 \
  html2canvas \
  jspdf \
  qrcode \
  @aws-sdk/client-s3 \
  bcryptjs \
  next-themes \
  uuid
```

### Desarrollo

```bash
npm install -D \
  prisma \
  @types/bcryptjs \
  @types/uuid
```

## 3. Variables de entorno

Crear `.env` en la raíz:

```env
# Base de datos
DATABASE_URL="mysql://usuario:password@host:3306/nexacore_cotizador"

# NextAuth
NEXTAUTH_SECRET="generar-con: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Admin inicial (lo crea/actualiza el seed en cada arranque)
ADMIN_NAME="Nombre Apellido"
ADMIN_EMAIL="admin@nexacore.com.mx"
ADMIN_PASSWORD="password-fuerte"

# Cloudflare R2 (solo facturas timbradas)
R2_ENDPOINT="https://account.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET="nexacore-facturas"

# SMTP (para enviar cotizaciones por email)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="cotizaciones@nexacore.mx"
```

## 4. Base de datos

### Inicializar Prisma

```bash
npx prisma generate
npx prisma migrate deploy    # aplica prisma/migrations/ a una BD vacía
```

En producción esto lo hace el `entrypoint.sh` solo. Ver sección 8.

### Seed (usuario admin inicial)

```bash
npx tsx prisma/seed.ts
```

Requiere `ADMIN_EMAIL` y `ADMIN_PASSWORD` definidas en `.env`.

## 5. Archivos clave del proyecto

```
src/
├── app/
│   ├── layout.tsx              ← Provider wrapper (NextAuth, Theme)
│   ├── page.tsx                ← Dashboard con gráficos
│   ├── login/page.tsx          ← Login
│   ├── cotizaciones/
│   │   ├── page.tsx            ← Lista con filtros
│   │   ├── nueva/page.tsx      ← Wizard 4 pasos
│   │   └── [id]/page.tsx       ← Detalle / PDF
│   ├── clientes/
│   │   ├── page.tsx            ← CRUD tabla
│   │   └── [id]/page.tsx       ← Editar
│   ├── productos/
│   │   ├── page.tsx            ← Catálogo
│   │   └── [id]/page.tsx       ← Editar
│   ├── facturas/
│   │   ├── page.tsx            ← Lista
│   │   └── [id]/page.tsx       ← Detalle
│   ├── configuracion/
│   │   └── page.tsx            ← Tasas IVA/ISR, datos empresa
│   └── publica/
│       └── [hash]/page.tsx     ← Vista pública vía QR
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ThemeToggle.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── Table.tsx
│   ├── quotations/
│   │   ├── WizardCliente.tsx
│   │   ├── WizardConceptos.tsx
│   │   ├── WizardFiscal.tsx
│   │   └── WizardPreview.tsx
│   └── dashboard/
│       ├── StatsCards.tsx
│       ├── ChartStatus.tsx
│       └── RecentQuotations.tsx
├── lib/
│   ├── prisma.ts               ← Singleton PrismaClient
│   ├── auth.ts                 ← NextAuth config
│   ├── taxes.ts                ← Cálculos IVA/ISR/Retenciones
│   └── qr.ts                   ← Generar QR
├── types/
│   └── index.ts                ← TypeScript interfaces
└── styles/
    ├── globals.css             ← Tokens NexaCore DS
    └── light-theme.css         ← Modo claro
```

## 6. Prisma Schema (MySQL)

Archivo: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id           Int         @id @default(autoincrement())
  name         String
  email        String      @unique
  passwordHash String      @map("password_hash")
  role         String      @default("editor")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")
  quotations   Quotation[]

  @@map("users")
}

model Client {
  id            Int         @id @default(autoincrement())
  businessName  String      @map("business_name")
  rfc           String      @unique
  curp          String?
  email         String?
  phone         String?
  addressStreet String?     @map("address_street")
  addressNumber String?     @map("address_number")
  addressColony String?     @map("address_colony")
  city          String?
  state         String?
  zipCode       String?     @map("zip_code")
  taxRegime     String?     @map("tax_regime")
  cfdiUsage     String?     @map("cfdi_usage")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")
  quotations    Quotation[]

  @@map("clients")
}

model Product {
  id          Int                @id @default(autoincrement())
  name        String
  description String?
  unitPrice   Decimal            @db.Decimal(12, 2) @map("unit_price")
  taxType     String             @default("iva") @map("tax_type")
  unit        String             @default("pieza")
  sku         String             @unique
  active      Boolean            @default(true)
  createdAt   DateTime           @default(now()) @map("created_at")
  items       QuotationItem[]

  @@map("products")
}

model Quotation {
  id              Int              @id @default(autoincrement())
  folio           String           @unique
  clientId        Int              @map("client_id")
  userId          Int              @map("user_id")
  status          String           @default("borrador")
  issueDate       DateTime         @default(now()) @map("issue_date")
  validUntil      DateTime?        @map("valid_until")
  paymentTerms    String?          @map("payment_terms")
  deliveryTerms   String?          @map("delivery_terms")
  notes           String?
  termsConditions String?          @map("terms_conditions")
  subtotal        Decimal          @default(0) @db.Decimal(14, 2)
  discountPercent Decimal          @default(0) @db.Decimal(5, 2) @map("discount_percent")
  discountAmount  Decimal          @default(0) @db.Decimal(14, 2) @map("discount_amount")
  ivaAmount       Decimal          @default(0) @db.Decimal(14, 2) @map("iva_amount")
  isrRetencion    Decimal          @default(0) @db.Decimal(14, 2) @map("isr_retencion")
  ivaRetencion    Decimal          @default(0) @db.Decimal(14, 2) @map("iva_retencion")
  total           Decimal          @default(0) @db.Decimal(14, 2)
  currency        String           @default("MXN")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  client          Client           @relation(fields: [clientId], references: [id])
  user            User             @relation(fields: [userId], references: [id])
  items           QuotationItem[]
  invoice         Invoice?

  @@map("quotations")
}

model QuotationItem {
  id              Int        @id @default(autoincrement())
  quotationId     Int        @map("quotation_id")
  productId       Int?       @map("product_id")
  concept         String
  description     String?
  quantity        Int
  unit            String     @default("pieza")
  unitPrice       Decimal    @db.Decimal(12, 2) @map("unit_price")
  discountPercent Decimal    @default(0) @db.Decimal(5, 2) @map("discount_percent")
  subtotal        Decimal    @db.Decimal(14, 2)
  iva             Decimal    @default(0) @db.Decimal(14, 2)
  total           Decimal    @db.Decimal(14, 2)
  sortOrder       Int        @default(0) @map("sort_order")
  quotation       Quotation  @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  product         Product?   @relation(fields: [productId], references: [id])

  @@map("quotation_items")
}

model Invoice {
  id            Int        @id @default(autoincrement())
  quotationId   Int        @unique @map("quotation_id")
  folio         String     @unique
  status        String     @default("pendiente")
  subtotal      Decimal    @db.Decimal(14, 2)
  iva           Decimal    @db.Decimal(14, 2)
  retenciones   Decimal    @db.Decimal(14, 2)
  total         Decimal    @db.Decimal(14, 2)
  issueDate     DateTime   @default(now()) @map("issue_date")
  paymentDate   DateTime?  @map("payment_date")
  pdfPath       String?    @map("pdf_path")
  createdAt     DateTime   @default(now()) @map("created_at")
  quotation     Quotation  @relation(fields: [quotationId], references: [id])

  @@map("invoices")
}

model CompanySettings {
  id                Int      @id @default(autoincrement())
  businessName      String   @map("business_name")
  rfc               String
  curp              String?
  taxRegime         String?  @map("tax_regime")
  addressStreet     String?  @map("address_street")
  addressNumber     String?  @map("address_number")
  addressColony     String?  @map("address_colony")
  city              String?
  state             String?
  zipCode           String?  @map("zip_code")
  logoPath          String?  @map("logo_path")
  email             String?
  phone             String?
  website           String?
  ivaRate           Decimal  @default(0.16) @db.Decimal(5, 4) @map("iva_rate")
  isrRetencionRate  Decimal  @default(0.10) @db.Decimal(5, 4) @map("isr_retencion_rate")
  ivaRetencionRate  Decimal  @default(0.106666) @db.Decimal(8, 6) @map("iva_retencion_rate")
  defaultTerms      String?  @map("default_terms")
  defaultNotes      String?  @map("default_notes")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("company_settings")
}
```

## 7. Seed (usuario inicial y configuración)

El archivo real es `prisma/seed.ts`. **No tiene credenciales hardcodeadas**: lee
`ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` del entorno y falla si falta la
contraseña.

Es idempotente y se ejecuta en **cada arranque** del contenedor:

- Si el admin no existe, lo crea.
- Si ya existe, re-sincroniza nombre, rol y hash de contraseña.

Consecuencia práctica: para rotar la contraseña del admin basta con cambiar
`ADMIN_PASSWORD` en Dokploy y redesplegar. No hace falta entrar a la BD.

También crea `CompanySettings` la primera vez (si ya hay un registro, lo respeta
para no pisar lo que se configure desde `/configuracion`).

```bash
# Manual, en local
npx tsx prisma/seed.ts
```

---

## 8. Docker (producción)

Los archivos reales son `Dockerfile`, `entrypoint.sh` y `docker-compose.yml` en
la raíz del proyecto. Notas importantes:

- El build usa `output: "standalone"` (activado por `DOCKER_BUILD=true`), y el
  runner copia `public/` y `.next/static` aparte — el servidor standalone no los
  incluye por sí solo.
- El build define un `DATABASE_URL` placeholder. **No se conecta a la BD**: ni
  `prisma generate` ni `next build` necesitan la base, solo que la variable
  exista. La real se inyecta en runtime.
- La imagen final incluye el CLI de `prisma` y `tsx` porque el `entrypoint.sh`
  corre migraciones y seed antes de arrancar Next.

### Qué hace `entrypoint.sh` en cada arranque

1. Espera hasta 60s a que la BD acepte conexiones.
2. `prisma migrate deploy` — aplica migraciones pendientes de `prisma/migrations/`.
3. `tsx prisma/seed.ts` — crea/actualiza el admin y la configuración de empresa.
4. `node server.js` — arranca Next.js.

Si cualquiera de los pasos 1–3 falla, el contenedor sale con error en vez de
arrancar una app rota.

### Migraciones

`prisma/migrations/` **debe estar commiteado en git**. Es lo que crea las tablas
en producción. Al cambiar `schema.prisma`:

```bash
npx prisma migrate dev --name descripcion_del_cambio   # local, genera el SQL
git add prisma/migrations && git commit -m "..."       # se aplica solo en deploy
```

---

## 9. Despliegue en Dokploy

1. Subir el repo a GitHub (asegurarse de que `prisma/migrations/` esté incluido).
2. En Dokploy: **Create Application → Docker Compose**, conectar el repo y la rama.
3. Compose path: `nexacore-cotizador/docker-compose.yml` (o la raíz, según cómo
   se suba el repo).
4. Cargar las variables de entorno en el panel de Dokploy (pestaña *Environment*):

   ```env
   MYSQL_ROOT_PASSWORD=<password fuerte de la BD>
   MYSQL_DATABASE=nexacore_cotizador
   NEXTAUTH_SECRET=<openssl rand -base64 32>
   NEXTAUTH_URL=https://cotizador.tudominio.com
   ADMIN_NAME=Nombre Apellido
   ADMIN_EMAIL=admin@tudominio.com
   ADMIN_PASSWORD=<password del admin>
   SMTP_HOST=
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=
   SMTP_PASS=
   SMTP_FROM=cotizaciones@tudominio.com
   ```

   El `.env` **no** se sube al repo (`.gitignore` lo excluye). Dokploy es la
   única fuente de las credenciales de producción.

5. Asignar dominio al servicio `app`, puerto 3000, con HTTPS (Let's Encrypt).
6. Deploy. El primer arranque crea las tablas y el usuario admin
   automáticamente; los siguientes solo aplican migraciones nuevas.

Cada push a la rama configurada redespliega (si el webhook de GitHub está
activo), y vuelve a correr migraciones + seed sin perder datos: el volumen
`db_data` es persistente.

> Nota: en `docker-compose.yml` el servicio `db` publica el puerto `3307` del
> host. En un VPS conviene quitar ese bloque `ports:` para no exponer MariaDB a
> internet — la app la alcanza por la red interna de Docker (`db:3306`).

---

## 10. Resumen de comandos

```bash
# Desarrollo
npm run dev                                  # Servidor dev
npx prisma studio                            # UI de base de datos
npx prisma migrate dev --name <cambio>       # Nueva migración tras editar el schema
npx prisma generate                          # Regenerar cliente Prisma
npx tsx prisma/seed.ts                       # Poblar datos iniciales

# Producción (lo hace el entrypoint solo)
npx prisma migrate deploy                    # Aplicar migraciones
npm run build && npm start                   # Build e inicio
```
