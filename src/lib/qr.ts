import QRCode from "qrcode"

export async function generateQRCode(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 300,
    margin: 2,
    color: {
      dark: "#03060F",
      light: "#FFFFFF",
    },
  })
}

export function generatePublicHash(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let hash = ""
  for (let i = 0; i < 16; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return hash
}
