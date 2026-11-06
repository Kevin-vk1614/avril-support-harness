#!/usr/bin/env node
// Uso: node src/cli.js <ticket.json>   |   cat ticket.json | node src/cli.js -
// Acepta un objeto SupportTicketRecord o un arreglo. Imprime JSON a stdout. No usa red.
// En un arreglo, un ticket inválido NO tumba el lote: su posición trae {index, error} y el código de salida es 1.
import { readFileSync } from "node:fs";
import { triage } from "./harness.js";

const arg = process.argv[2];
if (!arg) {
  console.error("Uso: node src/cli.js <ticket.json | ->");
  process.exit(2);
}
try {
  const raw = JSON.parse(readFileSync(arg === "-" ? 0 : arg, "utf8"));
  if (Array.isArray(raw)) {
    let failed = 0;
    const out = raw.map((r, index) => {
      try { return triage(r); } catch (e) { failed++; return { index, error: e.message }; }
    });
    console.log(JSON.stringify(out, null, 2));
    if (failed) { console.error(`${failed} de ${raw.length} tickets con error (ver "error" en la salida)`); process.exit(1); }
  } else {
    console.log(JSON.stringify(triage(raw), null, 2));
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
