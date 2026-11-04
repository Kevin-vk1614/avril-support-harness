import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { countHits } from "./faq.js";

const PATH = fileURLToPath(new URL("../data/failure-cases.json", import.meta.url));
export const FAILURE_CASES = JSON.parse(readFileSync(PATH, "utf8")).cases;

// Casos de fallas reales (lab-seat-failures.md). Coincide por palabra fuerte, patrón, o >=2 débiles.
export function matchFailureCases(rawNorm, ctx = {}) {
  const out = [];
  for (const c of FAILURE_CASES) {
    if (c.requirePaid && !ctx.paid) continue; // p. ej. "¿hay lista de espera?" antes de comprar NO es una falla
    const strong = countHits(rawNorm, c.strong);
    const weak = countHits(rawNorm, c.weak);
    const pat = (c.patterns ?? []).some((p) => new RegExp(p).test(rawNorm));
    if (strong.length || pat || weak.length >= 2) out.push(c);
  }
  return out;
}
