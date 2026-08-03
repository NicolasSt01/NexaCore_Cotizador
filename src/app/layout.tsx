import type { Metadata } from "next"
import { DM_Sans, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google"
import { Providers } from "@/components/Providers"
import "./globals.css"

// El eje `opsz` no se incluye por defecto en las fuentes variables de next/font.
// Sin él, el `font-variation-settings:'opsz' 18` del logotipo no surte efecto y
// la marca no coincide con el material de Canva.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  axes: ["opsz"],
})

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "NexaCore — Sistema de Cotizaciones",
  description: "Sistema de cotizaciones para NexaCore Desarrollo e Integración de Sistemas",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${dmSans.variable} ${plusJakarta.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
