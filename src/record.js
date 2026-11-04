// CONTRATO VERIFICADO contra el tipo real `SupportTicketRecord` de
// Avril-Systems/Lab-Avril-Life/lib/support-tickets.ts (archivo compartido por Kevin, 2026-11).
//
//   scope: 'avril.lab.support_ticket'      ticketId: string  (LAB-YYYYMMDD-XXXX; XXXX = 4 hex en prod, 4 alfanuméricos en fixtures dev)
//   createdAt: string (ISO)                email: string
//   category: 'not_ready' | 'refund' | 'other'     (la elige el comprador en el formulario)
//   message: string
//   stripeSessionId: string | null         labSlug: string | null
//   locale: 'en' | 'es'                    clientIp: string   (dato personal: NUNCA sale del arnés)
//
// NO existen en el tipo real: id, subject, status, source, wallet, stripePaymentIntentId, paymentStatus,
// rentalStatus, deploymentId, controlUiUrl. Se aceptan como alias legados solo `id` → ticketId (con aviso).
export const REAL_FIELDS = ["scope", "ticketId", "createdAt", "email", "category", "message", "stripeSessionId", "labSlug", "locale", "clientIp"];
export const REAL_CATEGORIES = ["not_ready", "refund", "other"];
const TICKET_ID_RE = /^LAB-\d{8}-[0-9A-Z]{4}$/; // el generador real da 4 hex (randomBytes(2)); los fixtures dev usan DEV1/DEV2

export function normalizeRecord(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("SupportTicketRecord debe ser un objeto JSON");
  const warnings = [];
  const ticketId = raw.ticketId ?? raw.id ?? null;
  if (raw.ticketId == null && raw.id != null) warnings.push("campo 'id' no existe en el contrato real; usar 'ticketId'");

  if (typeof raw.message !== "string" || !raw.message.trim()) {
    throw new TypeError(`Ticket ${ticketId ?? "(sin ticketId)"}: falta 'message' (texto no vacío)`);
  }
  if (raw.scope !== "avril.lab.support_ticket") warnings.push(`scope '${raw.scope ?? "(ausente)"}' distinto de 'avril.lab.support_ticket'`);
  if (!TICKET_ID_RE.test(String(ticketId))) warnings.push(`ticketId '${ticketId ?? "(ausente)"}' no cumple LAB-YYYYMMDD-XXXX (4 alfanuméricos mayúsculas)`);
  let userCategory = raw.category;
  if (!REAL_CATEGORIES.includes(userCategory)) {
    warnings.push(`category '${userCategory ?? "(ausente)"}' no es not_ready|refund|other; se trata como 'other'`);
    userCategory = "other";
  }
  if (raw.locale && !["en", "es"].includes(raw.locale)) warnings.push(`locale '${raw.locale}' no es en|es`);
  const extra = Object.keys(raw).filter((k) => !REAL_FIELDS.includes(k) && k !== "id");
  if (extra.length) warnings.push(`campos fuera del contrato real (ignorados): ${extra.join(", ")}`);

  return {
    ticketId: ticketId ?? "UNKNOWN",
    createdAt: raw.createdAt ?? null,
    contact: raw.email ?? null,
    userCategory,
    message: raw.message,
    stripeSessionId: raw.stripeSessionId ?? null,
    labSlug: raw.labSlug ?? null,
    locale: raw.locale === "en" ? "en" : "es",
    warnings,
  };
}
