import { norm } from "./text.js";
import { redact, maskEmail } from "./redact.js";
import { normalizeRecord } from "./record.js";
import { matchFaq, matchNotConfirmed } from "./faq.js";
import { detectSignals, pickCategory, SEVERITY } from "./classify.js";

export const SCHEMA = "avril.support-triage/v1";
const RUNBOOK_NOT_READY = "docs/guides/lab-paid-not-ready.md (repo Lab-Avril-Life)";
const OPS_GUIDE = "docs/guides/lab-support-ops.md (repo Lab-Avril-Life)";

const snippet = (t, n = 280) => (t.length > n ? `${t.slice(0, n)}…` : t);

// Hipótesis y pasos técnicos: SOLO lo que las fuentes (Reality Audit / CURRENT-STATE) documentan.
const PLAYBOOK = {
  secrets_exposed: {
    hypotheses: ["El comprador pegó credenciales en el ticket (riesgo de exposición; ya enmascaradas en esta salida)."],
    next: [
      "NO copiar el valor original a otros sistemas; purgarlo del registro del ticket si es posible.",
      "Si es llave de Stripe/wallet/servicio: indicar al comprador que la rote/revoque desde su proveedor.",
      "Responder manualmente (humano). Nunca pedir contraseñas ni tokens.",
    ],
  },
  credentials_or_keys: {
    hypotheses: ["Pregunta sobre llaves/BYOK/tokens. BYOK es WIP (no pulido como experiencia de provisioning)."],
    next: ["Humano responde sin solicitar la llave por ticket; guiar a canal seguro definido por ops."],
  },
  refund: {
    hypotheses: ["Solicitud de reembolso. No hay política de reembolso en las fuentes confirmadas."],
    next: [
      "Ops verifica el cobro en Stripe con los ids de este handoff (solo lectura).",
      "Revisar si el entorno llegó a estar 'ready' antes de decidir.",
      "Decisión y ejecución del reembolso: humano en Stripe. El arnés no procesa pagos ni promete reembolsos.",
    ],
  },
  paid_not_ready: {
    hypotheses: [
      "Webhook de Stripe no entregado o launchCompany falló (app/api/webhooks/stripe/route.ts → launchCompany).",
      "Soft-fail documentado: launcher_not_configured / paid_waiting_infra (app/api/rentals/route.ts).",
      "Capacidad de VPS agotada (~3 seats/VPS) o health check/Caddy/SSH fallando en LaunchOpenClaw.",
    ],
    next: [
      "Seguir runbook " + RUNBOOK_NOT_READY + ".",
      "Revisar entrega del webhook para el stripeSessionId en el dashboard de Stripe.",
      "Consultar estado: GET /api/rentals?session_id=<stripeSessionId> y el deployment record del slug en LaunchOpenClaw.",
      "NO volver a lanzar ni cobrar de nuevo hasta confirmar que no existe un seat duplicado.",
    ],
  },
  paid_no_agent: {
    hypotheses: [
      "Mapeo owner→agente frágil (persistencia en JSON de owner-agents) o wallet distinta a la del pago.",
      "Webhook no procesado, o checkout en modo mock (sin launch).",
    ],
    next: [
      "Buscar el rental por stripeSessionId/PaymentIntent y comparar wallet del pago vs. sesión del comprador.",
      "Revisar si existe deployment en LaunchOpenClaw sin dueño asociado.",
      "Seguir " + RUNBOOK_NOT_READY + " si el seat existe pero no está ready.",
    ],
  },
  access_failure: {
    hypotheses: [
      "Control UI no disponible (health check, Caddy, subdominio *.avril.life) o seat no ready.",
      "Falla de sign-in con wallet.",
    ],
    next: [
      "Verificar estado del seat y URL del Control UI (patrón *.avril.life).",
      "Probar sign-in con wallet en entorno de prueba; no pedir credenciales al comprador.",
    ],
  },
  data_privacy: {
    hypotheses: ["Solicitud sobre datos personales (acceso/borrado/qué se guarda). No hay política de datos en fuentes confirmadas."],
    next: ["Ops/legal responde. Registrar la solicitud; no borrar ni exportar datos con el arnés."],
  },
  topic_not_confirmed: {
    hypotheses: ["El tema está marcado UNKNOWN/MOCK/no enviado en las fuentes; responder solo traería riesgo de promesa falsa."],
    next: ["Humano responde sin prometer. Si se repite, evaluar agregar una entrada FAQ confirmada."],
  },
  no_match: {
    hypotheses: ["Sin coincidencia con FAQ confirmada."],
    next: ["Humano clasifica y responde; evaluar nueva entrada FAQ."],
  },
  faq: { hypotheses: [], next: ["Ninguno: pregunta cubierta por FAQ confirmada (borrador sujeto a aprobación humana)."] },
};

export function triage(rawRecord) {
  const rec = normalizeRecord(rawRecord);

  // 1) Redactar ANTES de analizar o emitir. Todo lo que sale usa el texto redactado.
  const red = redact(`${rec.subject ?? ""}\n${rec.message}`);
  const msgNorm = norm(red.text);
  const rawNorm = norm(`${rec.subject ?? ""}\n${rec.message}`);

  // 2) Señales (sobre texto crudo normalizado para no perder señales; el texto emitido es el redactado)
  const { signals } = detectSignals(rec, rawNorm, red.findings);
  const faqHit = matchFaq(rawNorm);
  const nc = matchNotConfirmed(rawNorm);
  const hasEscalation = [...signals].length > 0;

  // FAQ solo si NO hay señal de escalamiento ni tema no confirmado.
  const faqUsable = !!faqHit && !hasEscalation && nc.length === 0;
  const { category, secondary } = pickCategory(signals, faqUsable, nc.length > 0);

  const mustEscalate = category !== "faq";
  const severity = SEVERITY[category];
  const play = PLAYBOOK[category];

  const reasons = [];
  if (mustEscalate) reasons.push(category, ...secondary.filter((x) => x !== category));
  if (nc.length) reasons.push(...nc.map((x) => x.id));
  if (mustEscalate && rec.paid && !reasons.includes("payment_succeeded")) reasons.push("payment_succeeded");

  const identifiers = {
    stripeSessionId: rec.stripeSessionId,
    stripePaymentIntentId: rec.stripePaymentIntentId,
    slug: rec.slug,
    deploymentId: rec.deploymentId,
    rentalStatus: rec.rentalStatus,
    paymentStatus: rec.paymentStatus,
    walletPresent: !!rec.wallet,
    contactMasked: maskEmail(rec.contact),
  };

  const devHandoff = {
    ticketId: rec.id,
    category,
    severity,
    symptom: snippet(red.text.replace(/\s+/g, " ").trim()),
    identifiers,
    hypotheses: play.hypotheses,
    nextTechnicalStep: play.next,
    runbook: ["paid_not_ready", "paid_no_agent"].includes(category) ? RUNBOOK_NOT_READY : OPS_GUIDE,
    notConfirmedTopics: nc.map((x) => ({ id: x.id, note: x.note, source: x.source })),
    reproducible: "node src/cli.js <ticket.json>  (determinista, sin red)",
  };

  // handoffSummary: texto corto para pegar en el campo "Handoff a dev" de /admin.
  const idBits = [rec.stripeSessionId && `session=${rec.stripeSessionId}`, rec.stripePaymentIntentId && `pi=${rec.stripePaymentIntentId}`, rec.slug && `slug=${rec.slug}`, rec.rentalStatus && `rental=${rec.rentalStatus}`].filter(Boolean).join(" ");
  const handoffSummary = mustEscalate
    ? `[${severity.toUpperCase()}] ${rec.id} · ${category}` +
      (secondary.length ? ` (+${secondary.join(",")})` : "") +
      `. ${idBits ? idBits + ". " : ""}Síntoma: ${snippet(red.text.replace(/\s+/g, " ").trim(), 160)} ` +
      `Siguiente: ${play.next[0]}` +
      (red.findings.length ? ` ⚠ Secretos enmascarados: ${red.findings.join(",")}.` : "")
    : null;

  const publicReplyDraft = faqUsable
    ? {
        faqId: faqHit.entry.id,
        text: faqHit.entry.answer,
        caveat: faqHit.entry.caveat ?? null,
        sources: faqHit.entry.sources,
        requiresHumanApproval: true,
        sendStatus: "NOT_SENT",
      }
    : null;

  return {
    schema: SCHEMA,
    ticketId: rec.id,
    category,
    secondaryCategories: secondary,
    severity,
    mustEscalate,
    escalationReasons: [...new Set(reasons)],
    handoffSummary,
    devHandoff,
    publicReplyDraft,
    redactions: red.findings,
    warnings: rec.warnings,
    safety: { autonomousSend: false, paymentActions: false, externalCalls: false, asksForCredentials: false },
  };
}
