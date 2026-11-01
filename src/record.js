// Normaliza un SupportTicketRecord a un objeto canónico.
// SUPUESTO: la forma exacta vive en `lib/support-tickets.ts` (repo Lab-Avril-Life), al que no
// tengo acceso. Aquí se aceptan alias comunes; ajustar ALIASES cuando se compare con el .ts real.
const ALIASES = {
  id: ["id", "ticketId", "ticket_id"],
  createdAt: ["createdAt", "created_at", "ts"],
  status: ["status"],
  source: ["source", "channel"],
  contact: ["email", "contact", "contactEmail"],
  subject: ["subject", "title"],
  message: ["message", "body", "description", "text"],
  userCategory: ["category", "topic"],
  wallet: ["wallet", "walletAddress", "wallet_address"],
  stripeSessionId: ["stripeSessionId", "stripe_session_id", "sessionId", "session_id"],
  stripePaymentIntentId: ["stripePaymentIntentId", "paymentIntentId", "payment_intent"],
  paymentStatus: ["paymentStatus", "payment_status"],
  slug: ["slug", "rentalSlug", "agentSlug", "companySlug"],
  rentalStatus: ["rentalStatus", "rental_status", "deploymentStatus"],
  deploymentId: ["deploymentId", "deployment_id"],
  controlUiUrl: ["controlUiUrl", "control_ui_url"],
};

const pick = (r, keys) => {
  for (const k of keys) if (r[k] !== undefined && r[k] !== null && r[k] !== "") return r[k];
  return null;
};

export function normalizeRecord(raw) {
  if (!raw || typeof raw !== "object") throw new TypeError("SupportTicketRecord debe ser un objeto JSON");
  const rec = {};
  for (const [canon, keys] of Object.entries(ALIASES)) rec[canon] = pick(raw, keys);
  if (!rec.message || typeof rec.message !== "string") {
    throw new TypeError(`Ticket ${rec.id ?? "(sin id)"}: falta 'message' (o alias body/description/text)`);
  }
  rec.id = rec.id ?? "UNKNOWN";
  rec.warnings = [];
  if (!/^LAB-/.test(String(rec.id))) rec.warnings.push(`id '${rec.id}' no empieza con LAB-`);
  rec.paid =
    !!rec.stripePaymentIntentId ||
    ["paid", "succeeded", "complete"].includes(String(rec.paymentStatus ?? "").toLowerCase());
  return rec;
}
