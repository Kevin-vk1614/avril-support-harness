// Anonimiza un SupportTicketRecord REAL (de data/support-tickets.jsonl) para usarlo como fixture.
// Reemplazos consistentes (mismo valor → misma etiqueta). Conserva forma, category, locale y fecha.
// OJO: el texto libre (message) se limpia con reglas (secretos, emails, teléfonos) pero DEBE revisarse a mano.
import { redact, maskPiiInText } from "./redact.js";

export function makeAnonymizer() {
  const maps = { email: new Map(), ip: new Map(), session: new Map(), slug: new Map() };
  const label = (kind, value, fmt) => {
    if (value == null || value === "") return value ?? null;
    const m = maps[kind];
    if (!m.has(value)) m.set(value, fmt(m.size + 1));
    return m.get(value);
  };
  return function anonymize(rec) {
    const out = { ...rec };
    out.email = label("email", rec.email, (n) => `anon${n}@example.com`);
    out.clientIp = label("ip", rec.clientIp, (n) => `203.0.113.${n}`);
    out.stripeSessionId = label("session", rec.stripeSessionId, (n) => `cs_test_ANON${n}`);
    out.labSlug = label("slug", rec.labSlug, (n) => `seat-anon-${n}`);
    out.message = maskPiiInText(redact(rec.message ?? "").text);
    return out;
  };
}
