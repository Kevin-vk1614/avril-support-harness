import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { norm } from "./text.js";

const FAQ_PATH = fileURLToPath(new URL("../data/faq.json", import.meta.url));
export const FAQ = JSON.parse(readFileSync(FAQ_PATH, "utf8"));

const esc = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Prefijo con límite de palabra (permite raíces: "garantiz"). Keywords cortas (<=4) exigen palabra completa,
// para que "sla" no coincida con "isla" ni "mcp" con texto arbitrario.
export const countHits = (text, kws) =>
  kws.filter((k) => {
    const n = norm(k);
    const re = new RegExp(`(^|[^a-z0-9])${esc(n)}${n.length <= 4 ? "($|[^a-z0-9])" : ""}`);
    return re.test(text);
  });

// Devuelve { entry, score, hits } o null. Coincide si >=1 palabra fuerte o >=2 débiles.
export function matchFaq(messageNorm) {
  let best = null;
  for (const entry of FAQ.entries) {
    const strong = countHits(messageNorm, entry.strong);
    const weak = countHits(messageNorm, entry.weak);
    if (strong.length === 0 && weak.length < 2) continue;
    const score = strong.length * 3 + weak.length;
    if (!best || score > best.score) best = { entry, score, hits: [...strong, ...weak] };
  }
  return best;
}

// Temas que las fuentes marcan UNKNOWN / MOCK / no enviados: NUNCA se responden solos.
export function matchNotConfirmed(messageNorm) {
  return FAQ.notConfirmed.filter((nc) => countHits(messageNorm, nc.keywords).length > 0);
}
