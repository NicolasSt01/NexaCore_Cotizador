/** Utilidades puras (sin dependencias de servidor) para mostrar estados. */

/** Estados en los que una cotización aún puede considerarse activa. */
const ACTIVE_STATUSES = ["borrador", "enviada", "vista"]

/**
 * Una cotización se considera "vencida" cuando tiene fecha límite (validUntil)
 * y ya pasó, siempre que siga en un estado activo (no aprobada/rechazada/
 * convertida/cancelada, que cierran el flujo).
 */
export function isQuotationExpired(validUntil: Date | string | null, status: string): boolean {
  if (!validUntil) return false
  if (!ACTIVE_STATUSES.includes(status)) return false
  return new Date(validUntil).getTime() < Date.now()
}

/** Estado mostrado en UI: "vencida" es un estado derivado, no almacenado. */
export function displayStatus(status: string, validUntil: Date | string | null): string {
  if (isQuotationExpired(validUntil, status)) return "Vencida"
  return status
}