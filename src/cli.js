#!/usr/bin/env node
// Uso: node src/cli.js <ticket.json>   |   cat ticket.json | node src/cli.js -
// Acepta un objeto SupportTicketRecord o un arreglo de ellos. Imprime JSON a stdout. No usa red.
import { readFileSync } from "node:fs";
import { triage } from "./harness.js";

const arg = process.argv[2];
if (!arg) {
  console.error("Uso: node src/cli.js <ticket.json | ->");
  process.exit(2);
}
try {
  const raw = JSON.parse(readFileSync(arg === "-" ? 0 : arg, "utf8"));
  const out = Array.isArray(raw) ? raw.map(triage) : triage(raw);
  console.log(JSON.stringify(out, null, 2));
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
