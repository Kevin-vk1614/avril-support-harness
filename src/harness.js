import { norm } from "./text.js";
import { redact, redactIdentifier, maskEmail, maskPiiInText } from "./redact.js";
import { normalizeRecord } from "./record.js";
import { matchFaq, matchNotConfirmed } from "./faq.js";
import { detectSignals, pickCategory, SEVERITY } from "./classify.js";
import { matchFailureCases } from "./failures.js";

const RANK = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };

export const SCHEMA = "avril.support-triage/v1";
const RUNBOOK_NOT_READY = "docs/guides/lab-paid-not-ready.md (repo Lab-Avril-Life)";
const OPS_GUIDE = "docs/guides/lab-support-ops.md (repo Lab-Avril-Life)";

// Mensaje oficial al comprador, copiado del runbook lab-paid-not-ready.md (2026-10-16, "Buyer message").
const RUNBOOK_BUYER_MESSAGE = {
  es: "Tu pago está registrado. No vuelvas a pagar. Estamos reparando el laboratorio; avísanos con el session_id de Stripe si tarda más de unos minutos.",
  en: "Payment is recorded — do not pay again. We are repairing the lab; send us the Stripe session_id if it takes more than a few minutes.",
};
// "What not to do" del mismo runbook.
const RUNBOOK_DO_NOT = [
  "No abrir un segundo Checkout para el mismo session_id: reparar o lista de espera; nunca pedir que paguen otra vez.",
  "No pegar contratos del wizard, modelos del CEO ni volcados crudos de Zod del launcher en chat o UI.",
  "No rotar STRIPE_WEBHOOK_SECRET sin actualizar el env de Lab y reiniciar.",
  "No tratar success:false del launcher durante 'provisioning' como seat faltante ni llamar launchCompany otra vez (doble launch).",
];

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
      "Ops verifica el cobro en Stripe con el stripeSessionId de este handoff (solo lectura).",
      "Revisar si el entorno llegó a estar 'ready' antes de decidir.",
      "Decisión y ejecución del reembolso: humano en Stripe. El arnés no procesa pagos ni promete reembolsos.",
    ],
  },
  paid_not_ready: {
    hypotheses: [
      "Webhook de Stripe no entregado o con error: https://lab.avril.life/api/webhooks/stripe debe dar 2xx; un 301 o un host equivocado rompe la firma; si Lab estuvo caído hay que repetir el evento (runbook pasos 2–3).",
      "STRIPE_WEBHOOK_SECRET que no coincide con las llaves (live/test) o LAUNCHER_TOKEN distinto entre Lab y los launchers → 401 (pasos 3–4).",
      "Sin capacidad (NO_CAPACITY / available: 0): el comprador queda en lista de espera (pasos 4–5).",
      "Falla ~15 s después del pago con el contenedor ya arriba: script de dedupe del Caddyfile ausente, 'Caddy/TLS setup failed' o 'no SSH key worked' (paso 6).",
      "Incidente en incidents.jsonl (PROVISION_THREW, REMOTE_DEPLOY_FAILED, HEALTHCHECK_TIMEOUT, CADDY_SITE_FAILED, UPSTREAM_PROBE_FAILED); seat 'ready' degradado (PUBLIC_PROBE_DEGRADED / CADDY_TLS_SYNC_FAILED: el reconcile reintenta cada 5 min); o slug envenenado si falla <~20 s con ruta /tmp/oc-* (lab-seat-failures.md §3, §7).",
    ],
    next: [
      "Seguir el runbook " + RUNBOOK_NOT_READY + " en orden: dinero → webhook → env → launchers → metadata → logs → contenedor.",
      "Confirmar el pago en Stripe (session cs_…) y que la entrega del webhook dio 2xx; repetir el evento si Lab estuvo caído.",
      "Metadata de la sesión en Stripe: ¿tiene deploymentId? Si falta y está pagada, /api/rentals?repair relanza UNA vez; con launchStatus=no_capacity esperar capacidad; con launchError leer logs antes de limpiarlo.",
      "Para fallos leer Admin → Incidentes (incidents.jsonl), NO pay-ready.jsonl: el embudo se queda en payment_verified si el comprador cerró la pestaña.",
      "Si el seat está ready degradado, esperar el reconcile (≤5 min); no re-provisionar. Contenedor muerto con id en metadata: destruir y relanzar UNA vez (mismo pago).",
    ],
  },
  paid_no_agent: {
    hypotheses: [
      "La metadata de la sesión no recibió deploymentId (webhook no procesado): la ruta /api/rentals?repair debería lanzar una sola vez (runbook paso 5).",
      "El comprador cerró la pestaña: provision_fail no llegó al embudo; el fallo está solo en incidents.jsonl (lab-seat-failures.md §2).",
      "Mapeo owner→agente frágil (persistencia en JSON de owner-agents) o wallet distinta a la del pago (Reality Audit 2026-10-02).",
    ],
    next: [
      "Seguir el runbook " + RUNBOOK_NOT_READY + ": confirmar el pago, el webhook (2xx) y la metadata (deploymentId).",
      "Buscar el seat y sus incidentes en Admin → Incidentes por stripeSessionId/labSlug antes de asumir que no se creó.",
      "Comparar la wallet del pago vs. la de la sesión del comprador (el ticket no guarda wallet).",
    ],
  },
  access_failure: {
    hypotheses: [
      "Error TLS ('tlsv1 alert internal error') = Caddy sin bloque para el hostname; el seat está sano y el reconcile lo repara en ≤5 min (§5).",
      "Contenedor unhealthy con healthz externo funcionando = agotamiento de pids, no falla del gateway (§7.4).",
      "Control UI no disponible (health check, Caddy, subdominio *.avril.life) o seat no ready; falla de sign-in con wallet.",
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
  const red = redact(rec.message);
  // Un secreto pegado en un campo identificador también cuenta (y no debe salir en ids ni en el resumen).
  for (const f of ["stripeSessionId", "labSlug"]) {
    const r = redactIdentifier(rec[f]);
    if (r.findings.length) { rec[f] = r.value; red.findings.push(...r.findings.map((t) => `${t}@${f}`)); }
  }
  red.findings = [...new Set(red.findings)];
  const safeText = maskPiiInText(red.text).replace(/\s+/g, " ").trim(); // sin secretos, emails ni teléfonos
  const rawNorm = norm(rec.message);

  // 2) Señales (sobre texto crudo normalizado para no perder señales; el texto emitido es el redactado)
  const { signals, paid } = detectSignals(rec, rawNorm, red.findings);
  const faqHit = matchFaq(rawNorm);
  const nc = matchNotConfirmed(rawNorm);
  // Fallas reales conocidas (post-mortems): siempre escalan; si no había otra señal, cuentan como falla de seat/acceso.
  const failures = matchFailureCases(rawNorm, { paid: paid || !!rec.stripeSessionId });
  if (failures.length) signals.add("access_failure");
  const hasEscalation = [...signals].length > 0;

  // FAQ solo si NO hay señal de escalamiento ni tema no confirmado.
  const faqUsable = !!faqHit && !hasEscalation && nc.length === 0;
  const { category, secondary } = pickCategory(signals, faqUsable, nc.length > 0);

  const mustEscalate = category !== "faq";
  let severity = SEVERITY[category];
  for (const f of failures) if (mustEscalate && RANK[f.severity] > RANK[severity]) severity = f.severity;
  const play = PLAYBOOK[category];

  const reasons = [];
  if (mustEscalate) reasons.push(category, ...secondary.filter((x) => x !== category));
  if (nc.length) reasons.push(...nc.map((x) => x.id));
  if (mustEscalate && rec.userCategory !== "other") reasons.push(`user_selected_${rec.userCategory}`);

  // Solo identificadores del tipo real. clientIp y email completo NUNCA se emiten.
  const identifiers = {
    stripeSessionId: rec.stripeSessionId,
    labSlug: rec.labSlug,
    userSelectedCategory: rec.userCategory,
    locale: rec.locale,
    createdAt: rec.createdAt,
    contactMasked: maskEmail(rec.contact),
  };

  // Qué falta para que el dev pueda actuar (el tipo real solo trae stripeSessionId y labSlug).
  const missingForTriage = [];
  if (["paid_not_ready", "paid_no_agent", "refund"].includes(category) && !rec.stripeSessionId)
    missingForTriage.push("stripeSessionId: ubicar el pago en Stripe por email y fecha del ticket");
  if (category === "paid_not_ready" && !rec.labSlug)
    missingForTriage.push("labSlug vacío: el seat pudo no crearse; revisar webhook de Stripe y launchCompany");

  const devHandoff = {
    ticketId: rec.ticketId,
    category,
    severity,
    symptom: snippet(safeText),
    identifiers,
    missingForTriage,
    hypotheses: play.hypotheses,
    nextTechnicalStep: play.next,
    runbook: ["paid_not_ready", "paid_no_agent"].includes(category) ? RUNBOOK_NOT_READY : OPS_GUIDE,
    doNot: ["paid_not_ready", "paid_no_agent"].includes(category) ? RUNBOOK_DO_NOT : [],
    knownFailureIds: failures.map((f) => f.id),
    notConfirmedTopics: nc.map((x) => ({ id: x.id, note: x.note, source: x.source })),
    reproducible: "node src/cli.js <ticket.json>  (determinista, sin red)",
  };

  // handoffSummary: texto corto para pegar en el campo "Handoff a dev" de /admin.
  const idBits = [rec.stripeSessionId && `session=${rec.stripeSessionId}`, rec.labSlug && `slug=${rec.labSlug}`, rec.userCategory !== "other" && `elegida=${rec.userCategory}`].filter(Boolean).join(" ");
  const handoffSummary = mustEscalate
    ? `[${severity.toUpperCase()}] ${rec.ticketId} · ${category}` +
      (secondary.length ? ` (+${secondary.join(",")})` : "") +
      `. ${idBits ? idBits + ". " : ""}Síntoma: ${snippet(safeText, 160)} ` +
      (failures.length ? ` Posible falla conocida: ${failures.map((f) => f.id).join(",")}.` : "") +
      ` Siguiente: ${play.next[0]}` +
      (red.findings.length ? ` ⚠ Secretos enmascarados: ${red.findings.join(",")}.` : "")
    : null;

  const publicReplyDraft = faqUsable
    ? {
        faqId: faqHit.entry.id,
        text: faqHit.entry.answer,
        caveat: faqHit.entry.caveat ?? null,
        sources: faqHit.entry.sources,
        replyLanguage: "es",
        needsTranslation: rec.locale === "en", // el comprador escribió en inglés; la FAQ está en español
        requiresHumanApproval: true,
        sendStatus: "NOT_SENT",
      }
    : null;

  // customerUpdate: borrador para correo aprobado por un humano (lab-support-ops.md). Nunca se envía.
  let customerUpdate = null, customerUpdateSource = null, customerUpdateLanguage = rec.locale;
  if (publicReplyDraft) { customerUpdate = publicReplyDraft.text; customerUpdateSource = `faq:${publicReplyDraft.faqId}`; customerUpdateLanguage = "es"; }
  else if (["paid_not_ready", "paid_no_agent"].includes(category)) { customerUpdate = RUNBOOK_BUYER_MESSAGE[rec.locale]; customerUpdateSource = "runbook:lab-paid-not-ready"; }
  else if (failures.length && !["secrets_exposed", "refund", "data_privacy", "credentials_or_keys"].includes(category)) { customerUpdate = failures[0].respuesta; customerUpdateSource = `failure:${failures[0].id}`; customerUpdateLanguage = "es"; }

  const devHandoffText = [
    `[${severity.toUpperCase()}] ${rec.ticketId} · ${category}${secondary.length ? ` (+${secondary.join(",")})` : ""}`,
    `Síntoma: ${snippet(safeText)}`,
    idBits ? `Ids: ${idBits}` : null,
    missingForTriage.length ? `Falta: ${missingForTriage.join("; ")}` : null,
    failures.length ? `Posible falla conocida: ${failures.map((f) => f.id).join(", ")}` : null,
    play.hypotheses.length ? `Hipótesis:\n${play.hypotheses.map((h) => `- ${h}`).join("\n")}` : null,
    `Siguiente paso:\n${play.next.map((n) => `- ${n}`).join("\n")}`,
    devHandoff.doNot.length ? `No hacer:\n${devHandoff.doNot.map((n) => `- ${n}`).join("\n")}` : null,
    `Runbook: ${devHandoff.runbook}`,
  ].filter(Boolean).join("\n");

  const followUpProposal = {
    ticketId: rec.ticketId,
    source: "harness",
    devHandoff: devHandoffText,
    customerUpdate,
    customerUpdateSource,
    customerUpdateLanguage,
    requiresHumanApproval: true,
    caution: "PROPUESTA: solo se conocen estos campos de data/support-ticket-follow-up.jsonl (ticketId, devHandoff, customerUpdate, source). El esquema real y los campos de estado/nota interna de ops no se verificaron. La última línea por ticketId gana: no escribir sin fusionar lo que ops ya guardó. El arnés nunca escribe ahí.",
  };

  return {
    schema: SCHEMA,
    ticketId: rec.ticketId,
    category,
    secondaryCategories: secondary,
    severity,
    mustEscalate,
    escalationReasons: [...new Set(reasons)],
    handoffSummary,
    devHandoff,
    publicReplyDraft,
    // Fallas reales conocidas: qué ve el cliente, borrador de acuse (NO enviado; ops aprueba), cuándo escalar a dev y diagnóstico.
    followUpProposal,
    knownFailureMatches: failures.map((f) => ({
      id: f.id, title: f.title, postMortem: f.postMortem, incidentCodes: f.incidentCodes, severity: f.severity,
      queVeElCliente: f.queVeElCliente,
      replyDraft: { text: f.respuesta, antesDeEnviar: f.antesDeEnviar, replyLanguage: "es", needsTranslation: rec.locale === "en", requiresHumanApproval: true, sendStatus: "NOT_SENT" },
      cuandoEscalar: f.cuandoEscalar, diagnostico: f.diagnostico, regla: f.regla, fuente: f.fuente,
    })),
    redactions: red.findings,
    warnings: rec.warnings,
    safety: { autonomousSend: false, paymentActions: false, externalCalls: false, asksForCredentials: false },
  };
}
