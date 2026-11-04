import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { triage } from "../src/harness.js";
import { FAILURE_CASES } from "../src/failures.js";

const BASE = { scope: "avril.lab.support_ticket", ticketId: "LAB-20261102-A0FF", createdAt: "2026-11-02T10:00:00.000Z", email: "x@example.com", category: "other", stripeSessionId: null, labSlug: null, locale: "es", clientIp: "203.0.113.5" };
const t = (message, extra = {}) => triage({ ...BASE, message, ...extra });
const ids = (o) => o.knownFailureMatches.map((m) => m.id);

test("hay al menos 4 casos de fallas reales y cada uno trae qué ve el cliente, respuesta y cuándo escalar", () => {
  assert.ok(FAILURE_CASES.length >= 4);
  for (const c of FAILURE_CASES) {
    for (const campo of ["queVeElCliente", "respuesta", "cuandoEscalar", "postMortem", "fuente", "diagnostico", "regla"]) assert.ok(c[campo] && c[campo].length, `${c.id}.${campo}`);
  }
});

test("data/failure-cases.json no filtra infraestructura (el repo es público)", () => {
  const raw = readFileSync(new URL("../data/failure-cases.json", import.meta.url), "utf8");
  for (const re of [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, /\bssh\s+(-\w+\s+)*\S+@\S+/i, /\bssh\s+-i\b/i, /id_(rsa|ed25519)/i, /avril0\d/i, /ed25519/i, /LAUNCHER_TOKEN/, /vps-avril/i, /gerry@/i, /Bearer /]) assert.ok(!re.test(raw), String(re));
});

test("control negativo: 'Control UI da error 502' NO es la falla del sitio lab.avril.life", () => {
  const o = t("Mi Control UI da error 502 y no puedo entrar");
  assert.equal(o.category, "access_failure");
  assert.ok(!ids(o).includes("lab-site-502-deploy"));
});

test("control negativo: una pregunta de FAQ no dispara fallas conocidas", () => {
  for (const q of ["¿Cuánto cuesta el trial?", "¿Qué es Avril Lab?", "¿Qué harnesses están disponibles?", "¿Qué es BYOK?"]) {
    const o = t(q);
    assert.equal(o.knownFailureMatches.length, 0, q);
    assert.equal(o.mustEscalate, false, q);
  }
});

test("la severidad sube a la de la falla conocida (502 del sitio = critical)", () => {
  const o = t("lab.avril.life me da 502, no carga el sitio");
  assert.equal(o.severity, "critical");
  assert.ok(o.handoffSummary.includes("lab-site-502-deploy"));
});

test("la falla conocida siempre escala, nunca produce publicReplyDraft y el acuse queda sin enviar", () => {
  for (const msg of ["error SSL al abrir mi dirección", "Permission denied al rentar", "websocket 1006 en el chat", "cerré la pestaña y no veo mi agente", "Caddy agent site could not be configured"]) {
    const o = t(msg, { stripeSessionId: "cs_test_1" });
    assert.equal(o.mustEscalate, true, msg);
    assert.equal(o.publicReplyDraft, null, msg);
    assert.ok(o.knownFailureMatches.length >= 1, msg);
    for (const m of o.knownFailureMatches) { assert.equal(m.replyDraft.sendStatus, "NOT_SENT"); assert.equal(m.replyDraft.requiresHumanApproval, true); }
  }
});

test("falla conocida + locale en: el acuse avisa que requiere traducción", () => {
  const o = t("I get an SSL error on my address", { locale: "en" });
  assert.equal(o.knownFailureMatches[0].replyDraft.needsTranslation, true);
});

test("los acuses no prometen reembolsos ni plazos no confirmados", () => {
  for (const c of FAILURE_CASES) assert.ok(!/reembols|garantiz|en \d+ (minutos|horas)/i.test(c.respuesta), c.id);
});

test("fixtures de desarrollo de Lab (support-tickets.dev.jsonl) cumplen el contrato real", () => {
  const lines = readFileSync(new URL("../fixtures/support-tickets.dev.jsonl", import.meta.url), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(lines.length, 2);
  const [a, b] = lines.map(triage);
  assert.deepEqual(a.warnings, []);
  assert.deepEqual(b.warnings, []);
  assert.equal(a.category, "paid_not_ready");
  assert.equal(b.publicReplyDraft?.faqId, "faq-byok");
  assert.equal(b.publicReplyDraft.needsTranslation, true);
});

test("tickets en inglés también detectan las fallas conocidas", () => {
  const casos = {
    "My address shows an SSL error": "seat-public-https-degraded",
    "I paid, closed the tab and now I see no agent": "funnel-gap-closed-tab",
    "The chat keeps dropping with websocket errors": "pids-starvation-chat-drops",
    "lab.avril.life is down, bad gateway": "lab-site-502-deploy",
    "Renting fails instantly and fails again on retry, Permission denied": "poisoned-slug",
  };
  for (const [msg, id] of Object.entries(casos)) assert.ok(ids(t(msg, { locale: "en", stripeSessionId: "cs_test_1" })).includes(id), `${msg} → ${id}`);
});

// ---- Verificación contra lab-paid-not-ready.md y lab-support-ops.md ----
const OFICIAL_ES = "Tu pago está registrado. No vuelvas a pagar. Estamos reparando el laboratorio; avísanos con el session_id de Stripe si tarda más de unos minutos.";
const OFICIAL_EN = "Payment is recorded — do not pay again. We are repairing the lab; send us the Stripe session_id if it takes more than a few minutes.";

test("paid_not_ready usa el mensaje oficial del runbook, en el idioma del comprador", () => {
  assert.equal(t("Pagué y no está listo", { category: "not_ready", stripeSessionId: "cs_test_1" }).followUpProposal.customerUpdate, OFICIAL_ES);
  const en = t("I paid and it is not ready", { category: "not_ready", stripeSessionId: "cs_test_1", locale: "en" }).followUpProposal;
  assert.equal(en.customerUpdate, OFICIAL_EN);
  assert.equal(en.customerUpdateSource, "runbook:lab-paid-not-ready");
});

test("paid_not_ready y paid_no_agent incluyen el 'No hacer' del runbook (sin segundo Checkout)", () => {
  for (const o of [t("Pagué y no está listo", { category: "not_ready" }), t("Me cobraron y no me aparece ningún agente", { stripeSessionId: "cs_test_1" })]) {
    assert.ok(o.devHandoff.doNot.some((x) => x.includes("segundo Checkout")));
    assert.ok(o.devHandoff.doNot.some((x) => x.includes("launchCompany")));
  }
  assert.deepEqual(t("quiero un reembolso", { category: "refund" }).devHandoff.doNot, []);
});

test("control negativo: '¿hay lista de espera?' antes de comprar NO es una falla conocida", () => {
  const o = t("¿Hay lista de espera para el plan Monthly?");
  assert.equal(o.knownFailureMatches.length, 0);
  assert.equal(o.category, "topic_not_confirmed");
});

test("tras pagar, 'lista de espera' sí es la falla de capacidad del runbook", () => {
  const o = t("Pagué y me aparece lista de espera", { stripeSessionId: "cs_test_1" });
  assert.ok(ids(o).includes("paid-waitlist-no-capacity"));
});

test("followUpProposal: solo campos conocidos, advierte 'última línea gana' y nunca se envía", () => {
  const f = t("Pagué y no está listo", { category: "not_ready", stripeSessionId: "cs_test_1" }).followUpProposal;
  assert.equal(f.source, "harness");
  assert.equal(f.requiresHumanApproval, true);
  assert.ok(f.caution.includes("última línea"));
  assert.ok(f.devHandoff.includes("Runbook:") && f.devHandoff.includes("No hacer:"));
  assert.ok(!JSON.stringify(f).includes("203.0.113.5"));
});

test("sin customerUpdate cuando hay secretos, reembolso o datos personales", () => {
  assert.equal(t("mi llave SK_LIVE_FAKE0000000000000000EXAMPLE").followUpProposal.customerUpdate, null);
  assert.equal(t("quiero mi reembolso", { category: "refund" }).followUpProposal.customerUpdate, null);
  assert.equal(t("borren mis datos personales").followUpProposal.customerUpdate, null);
});

test("FAQ resuelta: customerUpdate = borrador FAQ", () => {
  const f = t("¿Cuánto cuesta el trial?").followUpProposal;
  assert.equal(f.customerUpdateSource, "faq:faq-pricing-duration");
});

test("ninguna respuesta sugiere pagar otra vez (regla bloqueada del runbook)", () => {
  for (const c of FAILURE_CASES) assert.ok(!/(?<!no )(vuelve a pagar|paga de nuevo|pagar otra vez|pagues otra vez)/i.test(c.respuesta), c.id);
});
