import { prisma } from "./prisma"

interface LogChangeInput {
  quotationId: number
  /** ID del usuario autenticado; null para acciones públicas (cliente/vista). */
  userId?: number | null
  fromStatus?: string | null
  toStatus: string
  note?: string | null
}

/** Registra en el historial un cambio de estado de una cotización. */
export async function logQuotationChange({
  quotationId,
  userId = null,
  fromStatus = null,
  toStatus,
  note = null,
}: LogChangeInput) {
  try {
    await prisma.quotationLog.create({
      data: {
        quotationId,
        userId,
        fromStatus,
        toStatus,
        note,
      },
    })
  } catch (err) {
    // La auditoría no debe romper la operación principal.
    console.error("Error escribiendo log de cotización:", err)
  }
}