#!/usr/bin/env node
// Modo "tickets reales exportados": lee un .jsonl (uno por línea) o un .json (objeto/arreglo) con
// SupportTicketRecord exportados por un HUMANO (p. ej. desde /admin o el JSONL de Lab) y genera handoffs.
// NO se conecta a Lab, NO envía nada. Salida en out/live/ (ignorada por git: puede venir de datos reales).
// Uso: node scripts/triage-jsonl.js <archivo> [directorio-salida]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { triage } from "../src/harness.js";
import { safeFileName } from "../src/text.js";

const [file, outDir = "out/live"] = process.argv.slice(2);
if (!file) { console.error("Uso: node scripts/triage-jsonl.js <archivo.jsonl|.json> [dir-salida]"); process.exit(2); }

const text = readFileSync(file, "utf8").trim();
let records;
if (file.endsWith(".jsonl")) {
  records = text.split(/\r?\n/).filter(Boolean).map((l, i) => { try { return JSON.parse(l); } catch { return { __parseError: `línea ${i + 1} no es JSON` }; } });
} else {
  const j = JSON.parse(text);
  records = Array.isArray(j) ? j : [j];
}

mkdirSync(`${outDir}/handoffs`, { recursive: true });
const lines = [];
let esc = 0, ok = 0, bad = 0, dups = 0;
const seen = new Map(); // ticketId -> veces vistas (un id repetido NO debe sobrescribir el handoff anterior)
for (const r of records) {
  try {
    if (r.__parseError) throw new Error(r.__parseError);
    const o = triage(r);
    ok++; if (o.mustEscalate) esc++;
    const n = (seen.get(o.ticketId) ?? 0) + 1;
    seen.set(o.ticketId, n);
    const base = safeFileName(o.ticketId); // un ticketId con "../" no puede escribir fuera de la carpeta de salida
    const handoffFile = n === 1 ? `${base}.json` : `${base}__dup${n}.json`;
    if (n > 1) { dups++; console.log(`AVISO   ticketId repetido ${o.ticketId} (aparición ${n}): se guarda como ${handoffFile}`); }
    writeFileSync(`${outDir}/handoffs/${handoffFile}`, JSON.stringify({ ticketId: o.ticketId, mustEscalate: o.mustEscalate, handoffSummary: o.handoffSummary, devHandoff: o.devHandoff, publicReplyDraft: o.publicReplyDraft, followUpProposal: o.followUpProposal, knownFailureMatches: o.knownFailureMatches }, null, 2));
    lines.push(JSON.stringify({ ticketId: o.ticketId, category: o.category, severity: o.severity, mustEscalate: o.mustEscalate, resolvedByAgent: !o.mustEscalate, source: "exported-ticket", handoffFile: `${outDir}/handoffs/${handoffFile}`, ...(n > 1 ? { duplicateOf: o.ticketId, occurrence: n } : {}) }));
    console.log(`${o.mustEscalate ? "ESCALA" : "FAQ   "}  ${o.ticketId}  ${o.category}  ${o.severity}`);
  } catch (e) { bad++; lines.push(JSON.stringify({ error: e.message })); console.log(`ERROR   ${e.message}`); }
}
writeFileSync(`${outDir}/tickets-log.jsonl`, lines.join("\n") + "\n");
console.log(`\n${ok} procesados · ${esc} escalan · ${ok - esc} FAQ · ${bad} con error · ${dups} ids repetidos → ${outDir}/`);
