#!/usr/bin/env node
// Uso: node scripts/anonymize-jsonl.js <entrada.jsonl> <salida.jsonl>
// Lee tickets reales (SupportTicketRecord, una línea por ticket) y escribe una copia anonimizada.
// No se conecta a nada. REVISA a mano la salida (sobre todo `message`) antes de subirla a Git.
import { readFileSync, writeFileSync } from "node:fs";
import { makeAnonymizer } from "../src/anonymize.js";

const [inp, outp] = process.argv.slice(2);
if (!inp || !outp) { console.error("Uso: node scripts/anonymize-jsonl.js <entrada.jsonl> <salida.jsonl>"); process.exit(2); }
const anon = makeAnonymizer();
let n = 0, bad = 0;
const out = [];
for (const l of readFileSync(inp, "utf8").split(/\r?\n/).filter(Boolean)) {
  try { out.push(JSON.stringify(anon(JSON.parse(l)))); n++; } catch { bad++; }
}
writeFileSync(outp, out.join("\n") + "\n");
console.log(`${n} tickets anonimizados, ${bad} líneas inválidas omitidas → ${outp}\nREVISA a mano el campo 'message' antes de subir el archivo a Git.`);
