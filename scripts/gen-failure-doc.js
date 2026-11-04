#!/usr/bin/env node
// Genera docs/FAQ-FALLAS-REALES.md a partir de data/failure-cases.json (así doc y datos no se desfasan).
import { readFileSync, writeFileSync } from "node:fs";
const { cases } = JSON.parse(readFileSync(new URL("../data/failure-cases.json", import.meta.url), "utf8"));
let md = `# FAQ de fallas reales de seats (post-mortems y runbook)\n\nFuentes: \`Lab-Avril-Life/docs/guides/lab-seat-failures.md\` (post-mortems, actualizado 2026-11-01) y \`lab-paid-not-ready.md\` (runbook, 2026-10-16). Generado con \`node scripts/gen-failure-doc.js\` desde \`data/failure-cases.json\`.\n\n` +
  `**Reglas:** estos casos **siempre escalan a un humano**. La respuesta es un **borrador de acuse** que ops aprueba y envía; el arnés nunca envía nada. ` +
  `No incluye nombres de servidores, IPs, rutas de llaves ni tokens (el repo es público).\n\n| # | Caso | Post-mortem | Severidad |\n|---|---|---|---|\n`;
cases.forEach((c, i) => (md += `| ${i + 1} | ${c.title} | ${c.postMortem} | ${c.severity} |\n`));
cases.forEach((c, i) => {
  md += `\n## ${i + 1}. ${c.title}\n\n- **Qué ve el cliente:** ${c.queVeElCliente}\n- **Qué se responde (borrador, requiere aprobación):** ${c.respuesta}\n- **Antes de enviar:** ${c.antesDeEnviar}\n- **Cuándo escalar a dev:** ${c.cuandoEscalar}\n` +
    `- **Códigos de incidente:** ${c.incidentCodes.length ? c.incidentCodes.join(", ") : "(ninguno)"}\n- **Regla clave:** ${c.regla}\n- **Diagnóstico interno:**\n${c.diagnostico.map((d) => `  - ${d}`).join("\n")}\n`;
});
writeFileSync(new URL("../docs/FAQ-FALLAS-REALES.md", import.meta.url), md);
console.log(`docs/FAQ-FALLAS-REALES.md generado (${cases.length} casos)`);
