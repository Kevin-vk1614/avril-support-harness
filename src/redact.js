// Detecta y enmascara secretos ANTES de que cualquier texto llegue a la salida.
// Todos los patrones son insensibles a mayúsculas (reporte de valrami-hue, PR #1: SK_LIVE_… salía completa).
// Regla: ningún secreto detectado puede aparecer en devHandoff / handoffSummary / log.
const PATTERNS = [
  { type: "stripe_secret_key", re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9_]{8,}/gi },
  { type: "stripe_webhook_secret", re: /\bwhsec_[A-Za-z0-9_]{8,}/gi },
  { type: "private_key_pem", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/gi },
  { type: "wallet_private_key_hex", re: /\b0x[a-fA-F0-9]{64}\b/g },
  { type: "jwt_or_bearer", re: /\b(?:Bearer\s+[A-Za-z0-9._~+\/-]{16,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})/gi },
  { type: "generic_api_key", re: /\b(?:sk|pk|key|api|tok)[-_][A-Za-z0-9_-]{20,}\b/gi },
  { type: "seed_phrase", re: /\b(?:seed phrase|frase semilla|mnemonic|frase de recuperaci[oó]n)\b\s*[:=]?\s*(?:[a-z]+\s+){5,}[a-z]+/gi },
  // "contraseña es X", "password: X", "mi clave = X"
 { type: "password", re: /\b(?:contrase[nñ]a|password|passwd|clave|pwd)\b\s*(?:es|is|:|=)\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|\S+)/gi },
];

export function redact(text) {
  let out = String(text ?? "");
  const findings = [];
  for (const { type, re } of PATTERNS) {
    out = out.replace(re, () => {
      findings.push(type);
      return `[REDACTED:${type}]`;
    });
  }
  return { text: out, findings: [...new Set(findings)] };
}

// j***@e***.com — el email no necesita viajar completo al handoff.
export function maskEmail(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) return null;
  const [u, d] = email.split("@");
  return `${u[0] ?? "*"}***@${d[0] ?? "*"}***${d.includes(".") ? d.slice(d.lastIndexOf(".")) : ""}`;
}

// Emails y teléfonos escritos dentro del mensaje: se enmascaran en TODA la salida (no cuentan como secreto).
export function maskPiiInText(text) {
  return String(text ?? "")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[EMAIL]")
    .replace(/(?<![\w-])\+?\d[\d\s().-]{8,}\d(?![\w-])/g, "[TEL]");
}
