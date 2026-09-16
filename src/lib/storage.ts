import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"

// Almacenamiento de CFDI en Cloudflare R2 (compatible con la API de S3). Los
// archivos viven en el bucket, no en la BD; en Invoice solo se guardan las
// llaves. Las credenciales llegan por entorno; si faltan, isStorageConfigured()
// devuelve false y las rutas que suben/descargan responden con un error claro
// en vez de romperse.
const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucket = process.env.R2_BUCKET

export function isStorageConfigured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucket)
}

let client: S3Client | null = null

function getClient(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error(
      "Almacenamiento R2 no configurado: define R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_BUCKET."
    )
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
      },
    })
  }
  return client
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return key
}

export async function getObject(
  key: string
): Promise<{ body: Buffer; contentType?: string }> {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  )
  const bytes = await res.Body!.transformToByteArray()
  return { body: Buffer.from(bytes), contentType: res.ContentType }
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}
