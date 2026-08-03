import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
  }
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
  }
}

/** RFC genérico del SAT para operaciones con público en general. */
export const RFC_PUBLICO_GENERAL = "XAXX010101000"

/** RFC genérico del SAT para residentes en el extranjero. */
export const RFC_EXTRANJERO = "XEXX010101000"

/** Prellenado del cliente de mostrador (sin datos fiscales). */
export const PUBLICO_GENERAL = {
  businessName: "Público General",
  rfc: RFC_PUBLICO_GENERAL,
  taxRegime: "616 - Sin obligaciones fiscales",
  cfdiUsage: "S01 - Sin efectos fiscales",
}

export interface QuotationStatus {
  value: string
  label: string
  color: "green" | "yellow" | "blue" | "red" | "gray" | "orange"
}

export const QUOTATION_STATUSES: QuotationStatus[] = [
  { value: "borrador", label: "Borrador", color: "gray" },
  { value: "enviada", label: "Enviada", color: "blue" },
  { value: "vista", label: "Vista", color: "orange" },
  { value: "aprobada", label: "Aprobada", color: "green" },
  { value: "rechazada", label: "Rechazada", color: "red" },
  { value: "convertida", label: "Convertida", color: "green" },
  { value: "cancelada", label: "Cancelada", color: "gray" },
]

export const TAX_REGIMES = [
  "601 - General de Ley Personas Morales",
  "603 - Personas Morales con Fines no Lucrativos",
  "605 - Sueldos y Salarios e Ingresos Asimilados",
  "606 - Arrendamiento",
  "607 - Régimen de Enajenación o Adquisición de Bienes",
  "608 - Demás ingresos",
  "610 - Residentes en el Extranjero sin Establecimiento Permanente",
  "611 - Ingresos por Dividendos (Socios y Accionistas)",
  "612 - Personas Físicas con Actividades Empresariales y Profesionales",
  "614 - Ingresos por intereses",
  "615 - Régimen de los ingresos por obtención de premios",
  "616 - Sin obligaciones fiscales",
  "620 - Sociedades Cooperativas de Producción",
  "621 - Incorporación Fiscal",
  "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
  "623 - Opcional para Grupos de Sociedades",
  "624 - Coordinados",
  "625 - Régimen de Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
  "626 - Régimen Simplificado de Confianza",
]

export const CFDI_USAGES = [
  "G01 - Adquisición de mercancías",
  "G02 - Devoluciones, descuentos o bonificaciones",
  "G03 - Gastos en general",
  "I01 - Construcciones",
  "I02 - Mobiliario y equipo de oficina",
  "I03 - Equipo de transporte",
  "I04 - Equipo de cómputo",
  "I05 - Dados, troqueles, moldes, matrices y herramental",
  "I06 - Comunicaciones telefónicas",
  "I07 - Comunicaciones satelitales",
  "I08 - Otra maquinaria y equipo",
  "D01 - Honorarios médicos, dentales y gastos hospitalarios",
  "D02 - Gastos médicos por incapacidad o discapacidad",
  "D03 - Gastos funerales",
  "D04 - Donativos",
  "D05 - Intereses reales efectivamente pagados por créditos hipotecarios",
  "D06 - Aportaciones voluntarias al SAR",
  "D07 - Primas por seguros de gastos médicos",
  "D08 - Transporte escolar obligatorio",
  "D09 - Depósitos en cuentas para el ahorro",
  "D10 - Pagos por servicios educativos",
  "P01 - Por definir",
]
