import { any } from "./text.js";

// Prioridad de escalamiento: lo más sensible gana. Las señales secundarias se reportan igual.
export const CATEGORY_PRIORITY = [
  "secrets_exposed",
  "credentials_or_keys",
  "refund",
  "paid_not_ready",
  "paid_no_agent",
  "access_failure",
  "data_privacy",
  "topic_not_confirmed",
  "faq",
  "no_match",
];

const NOT_READY_STATUS = ["not_ready", "paid_waiting_infra", "launcher_not_configured", "provisioning", "pending", "failed", "error"];

export function detectSignals(rec, msgNorm, redactionFindings) {
  const s = new Set();

  if (redactionFindings.length) s.add("secrets_exposed");
  if (any(msgNorm, [/\b(llave|llaves|api ?key|apikey|token|clave privada|private key|seed|semilla)\b/])) s.add("credentials_or_keys");

  if (any(msgNorm, [/reembols|devoluc|\brefund|chargeback|contracargo|quiero mi dinero|me regresen? (el|mi) (dinero|pago)|cancel\w*.*(cobro|pago)|cobr\w+ (dos|2) veces|doble cobro|(cobro|cargo) duplicado/])) s.add("refund");

  const paidText = any(msgNorm, [/\bpague\b|\bpagu[eo]\b|me cobraron|me cobro|cobro|me descontaron|\bpaid\b|\bcharged\b|pago (exitoso|aprobado|realizado|hecho)/]);
  const paid = rec.paid || paidText;
  const rs = String(rec.rentalStatus ?? "").toLowerCase();
  const notReadyStatus = NOT_READY_STATUS.includes(rs);
  const notReadyText = any(msgNorm, [/no (esta|est[aá]) list[ao]|not ready|sigue (en )?(provisioning|espera|pendiente)|esperando.*(agente|seat|entorno)|paid_waiting_infra/]);
  const noAgentText = any(msgNorm, [/no (me )?(aparece|tengo|veo|llego|han dado)|sin agente|no hay (agente|seat)|mis agentes.*(vac|nada)/]);
  const hasSeat = !!(rec.slug || rec.deploymentId);

  if (paid && (notReadyStatus || notReadyText)) s.add("paid_not_ready");
  if (paid && (noAgentText || (!hasSeat && !rec.rentalStatus && paidText && !s.has("paid_not_ready")))) s.add("paid_no_agent");

  if (any(msgNorm, [/no puedo (entrar|acceder|abrir|iniciar)|control ui.*(error|no abre|no carga|no funciona|falla|roto|\b50[234]\b)|(error|no abre|no carga|no funciona|falla).*control ui|\b50[234]\b|timeout|no abre|no carga|inicio de sesion|iniciar sesion|login|enlace.*(roto|no funciona)|link.*(roto|no funciona)|error al (entrar|acceder|conectar)|no me deja (entrar|acceder)/])) s.add("access_failure");

  if (any(msgNorm, [/mis datos|datos personales|privacidad|\bgdpr\b|\barco\b|(borrar|eliminar|exportar|exporten) (mi|mis|todos mis)|que datos (guardan|tienen|almacenan)|derecho al olvido/])) s.add("data_privacy");

  return { signals: s, paid };
}

export function pickCategory(signals, hasFaq, hasNotConfirmed) {
  const s = new Set(signals);
  if (hasNotConfirmed) s.add("topic_not_confirmed");
  if (hasFaq) s.add("faq");
  for (const c of CATEGORY_PRIORITY) if (s.has(c)) return { category: c, secondary: [...s].filter((x) => x !== c && x !== "faq") };
  return { category: "no_match", secondary: [] };
}

export const SEVERITY = {
  secrets_exposed: "critical",
  credentials_or_keys: "high",
  refund: "high",
  paid_not_ready: "high",
  paid_no_agent: "high",
  access_failure: "medium",
  data_privacy: "high",
  topic_not_confirmed: "low",
  no_match: "low",
  faq: "none",
};
