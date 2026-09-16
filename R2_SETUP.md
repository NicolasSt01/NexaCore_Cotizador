# Configurar Cloudflare R2 para los CFDI

Guía paso a paso para crear el bucket de R2 donde se guardan los PDF/XML de las
facturas timbradas por el despacho. El sistema **no** guarda los archivos en la
base de datos: solo guarda la "llave" (ruta) del objeto en R2.

> Mientras R2 no esté configurado, el sistema funciona igual: puedes capturar el
> UUID (folio fiscal), pero no adjuntar ni descargar archivos. Al terminar estos
> pasos se activa la subida/descarga.

---

## 1. Habilitar R2 en Cloudflare

1. Entra a <https://dash.cloudflare.com> con tu cuenta.
2. En el menú lateral abre **R2 Object Storage**.
3. Si es la primera vez, te pedirá **agregar un método de pago** (R2 tiene capa
   gratuita generosa; no cobra hasta superar los límites). Acepta para habilitar.

## 2. Crear el bucket

1. En R2 → **Create bucket**.
2. Nombre del bucket: **`nexacore-cotizador-cfdi`**
   (si usas otro nombre, deberás ponerlo en la variable `R2_BUCKET`).
3. Location: **Automatic** (o la región más cercana, p. ej. ENAM / North America).
4. Deja el acceso público **DESACTIVADO** (el bucket debe ser privado; los
   archivos se sirven a través del sistema, con sesión).
5. **Create bucket**.

## 3. Obtener el Account ID

1. En la página de R2 (Overview), del lado derecho aparece **Account ID**.
   Cópialo — es el valor de `R2_ACCOUNT_ID`.
   - El endpoint que usa el sistema se arma solo así:
     `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`

## 4. Crear el API Token (llaves de acceso)

1. En R2 → **Manage R2 API Tokens** (arriba a la derecha) → **Create API Token**.
2. Token name: `nexacore-cotizador`.
3. Permissions: **Object Read & Write**.
4. Specify bucket(s): selecciona **Apply to specific buckets** →
   `nexacore-cotizador-cfdi` (principio de mínimo privilegio).
5. TTL: **Forever** (o el que prefieras).
6. **Create API Token**.
7. Cloudflare te muestra **una sola vez**:
   - **Access Key ID** → valor de `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → valor de `R2_SECRET_ACCESS_KEY`

   Cópialos ahora; no se vuelven a mostrar. (Si los pierdes, generas otro token.)

## 5. Poner las variables de entorno

Necesitas ponerlas en **dos lugares**:

### a) Producción (Dokploy)

1. Abre Dokploy → proyecto **NexaCore** → servicio **Cotizador** → pestaña
   **Environment**.
2. Agrega estas líneas (sin comillas, con tus valores reales):
   ```
   R2_ACCOUNT_ID=tu_account_id
   R2_ACCESS_KEY_ID=tu_access_key_id
   R2_SECRET_ACCESS_KEY=tu_secret_access_key
   R2_BUCKET=nexacore-cotizador-cfdi
   ```
3. Guarda y **redespliega** el servicio (o haz un push, que dispara el deploy).

### b) Local (`.env`)

Agrega las mismas variables a tu archivo `.env` (está en `.gitignore`, no se sube):
```
R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key_id
R2_SECRET_ACCESS_KEY=tu_secret_access_key
R2_BUCKET=nexacore-cotizador-cfdi
```
Reinicia `npm run dev` para que tome las variables.

## 6. Probar

1. Abre una factura en estado **Solicitada**.
2. En **"Registrar CFDI del despacho"**: captura un UUID y adjunta un PDF y/o XML
   de prueba → **Marcar como facturada**.
3. La factura pasa a **Facturada** y aparecen los botones **Descargar CFDI (PDF)**
   y **(XML)**. Si descargan bien, R2 quedó configurado. ✅

---

## Notas

- **CORS:** no hace falta configurarlo. Las subidas van del navegador a la API del
  sistema (servidor) y de ahí a R2; el navegador nunca habla directo con R2.
- **Seguridad:** el bucket es privado. Las descargas pasan por
  `/api/invoices/[id]/cfdi/pdf|xml`, que exige sesión iniciada. Un link directo al
  objeto en R2 no es accesible sin las llaves.
- **Costos:** R2 no cobra por egress (descargas). El almacenamiento de PDFs/XML de
  CFDI es mínimo; la capa gratuita suele bastar para este uso.
- **Rotar llaves:** si necesitas cambiar las credenciales, crea un nuevo API Token
  y actualiza las variables; borra el token viejo en Cloudflare.
