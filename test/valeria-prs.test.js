// Pruebas de los problemas reportados por valrami-hue en los PRs #5–#10 (reproducidos y corregidos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { triage } from "../src/harness.js";
import { safeFileName } from "../src/text.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE = { scope: "avril.lab.support_ticket", ticketId: "LAB-20261105-A0FF", createdAt: "2026-11-05T10:00:00.000Z", email: "x@example.com", category: "other", stripeSessionId: null, labSlug: null, locale: "es", clientIp: "203.0.113.5" };
const run = (script, args) => spawnSync(process.execPath, [join(ROOT, script), ...args], { encoding: "utf8" });
const FAKE_KEY = "sk_" + "live_" + "FAKE0000000000000000EXAMPLE";

// ---- #10 contraseña entre comillas con espacios ----
test("#10 contraseñas entre comillas (rectas, curvas, «») con espacios se enmascaran completas", () => {
  const casos = [
    ['mi contraseña es "mi clave secreta larga" ya entra?', "secreta larga"],
    ["password: 'otra clave con espacios' gracias", "clave con espacios"],
    ["mi clave = “abc def ghi”", "def ghi"],
    ["pwd es «uno dos tres»", "dos tres"],
    ["contraseña es Hunter2secreta", "Hunter2secreta"], // sin comillas sigue funcionando
  ];
  for (const [m, secreto] of casos) {
    const o = triage({ ...BASE, message: m });
    assert.ok(!JSON.stringify(o).includes(secreto), m);
    assert.equal(o.category, "secrets_exposed", m);
  }
});

// ---- #9 llave en campos identificadores ----
test("#9 una llave pegada en labSlug o stripeSessionId se enmascara y escala como crítico", () => {
  for (const campo of ["labSlug", "stripeSessionId"]) {
    const o = triage({ ...BASE, category: "not_ready", message: "no está listo", [campo]: FAKE_KEY });
    assert.ok(!JSON.stringify(o).includes("FAKE0000000000000000EXAMPLE"), campo);
    assert.equal(o.category, "secrets_exposed", campo);
    assert.equal(o.severity, "critical", campo);
  }
});

test("#9 control negativo: un slug legítimo largo no se marca como llave", () => {
  const o = triage({ ...BASE, category: "not_ready", message: "no está listo", labSlug: "api-company-os-demo-agent", stripeSessionId: "cs_test_a1B2c3D4e5F6" });
  assert.equal(o.category, "paid_not_ready");
  assert.equal(o.devHandoff.identifiers.labSlug, "api-company-os-demo-agent");
});

// ---- #8 id peligroso en nombre de archivo ----
test("#8 safeFileName elimina separadores de ruta y '..'", () => {
  for (const id of ["../../evil", "..\\..\\evil", "a/b/c", "/etc/passwd", ".hidden", "..", ""]) {
    const f = safeFileName(id);
    assert.ok(!/[\\/]/.test(f) && !f.includes("..") && !f.startsWith("."), `${id} → ${f}`);
  }
  assert.equal(safeFileName("LAB-20261105-A0FF"), "LAB-20261105-A0FF");
});

test("#8 un ticketId con ../ no escribe fuera de la carpeta de salida", () => {
  const d = mkdtempSync(join(tmpdir(), "p8-"));
  const out = join(d, "salida", "x");
  writeFileSync(join(d, "in.jsonl"), JSON.stringify({ ...BASE, ticketId: "../../../evil", message: "hola" }) + "\n");
  const r = run("scripts/triage-jsonl.js", [join(d, "in.jsonl"), out]);
  assert.equal(r.status, 0);
  assert.ok(!existsSync(join(d, "evil.json")) && !existsSync(join(d, "salida", "evil.json")));
  assert.equal(readdirSync(join(out, "handoffs")).length, 1);
  assert.ok(JSON.parse(readFileSync(join(out, "handoffs", readdirSync(join(out, "handoffs"))[0]), "utf8")).devHandoff.ticketId.includes("evil")); // el dato se conserva, solo cambia el nombre del archivo
});

test("#8 el ticketId inseguro genera aviso", () => {
  assert.ok(triage({ ...BASE, ticketId: "../x", message: "hola" }).warnings.some((w) => w.includes("no seguros")));
});

// ---- #6 lote con un ticket bueno y uno malo ----
test("#6 cli: un ticket malo en el arreglo no tumba al bueno", () => {
  const d = mkdtempSync(join(tmpdir(), "p6-"));
  const f = join(d, "lote.json");
  writeFileSync(f, JSON.stringify([{ ...BASE, ticketId: "LAB-20261105-AAAA", message: "¿cuánto cuesta el trial?" }, { ...BASE, ticketId: "LAB-20261105-BBBB" }]));
  const r = run("src/cli.js", [f]);
  assert.equal(r.status, 1); // hay un error → código 1, pero la salida existe
  const out = JSON.parse(r.stdout);
  assert.equal(out.length, 2);
  assert.equal(out[0].category, "faq");
  assert.equal(out[1].index, 1);
  assert.ok(out[1].error.includes("falta 'message'"));
});

test("#6 cli: lote sin errores sale con código 0", () => {
  const d = mkdtempSync(join(tmpdir(), "p6b-"));
  const f = join(d, "lote.json");
  writeFileSync(f, JSON.stringify([{ ...BASE, message: "¿qué es Avril Lab?" }]));
  assert.equal(run("src/cli.js", [f]).status, 0);
});

// ---- #5 entradas sin ID ----
test("#5 un ticket sin ticketId (ni id) se rechaza con mensaje claro", () => {
  const { ticketId, ...sin } = BASE;
  assert.throws(() => triage({ ...sin, message: "hola" }), /sin 'ticketId'/);
  assert.throws(() => triage({ ...BASE, ticketId: "   ", message: "hola" }), /sin 'ticketId'/);
});

test("#5 triage-jsonl reporta los tickets sin id como error y sigue con los demás", () => {
  const d = mkdtempSync(join(tmpdir(), "p5-"));
  const { ticketId, ...sin } = BASE;
  writeFileSync(join(d, "in.jsonl"), [JSON.stringify({ ...sin, message: "sin id" }), JSON.stringify({ ...BASE, ticketId: "LAB-20261105-CCCC", message: "hola" })].join("\n") + "\n");
  const r = run("scripts/triage-jsonl.js", [join(d, "in.jsonl"), join(d, "out")]);
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes("sin 'ticketId'"));
  assert.ok(r.stdout.includes("1 con error"));
  assert.deepEqual(readdirSync(join(d, "out", "handoffs")), ["LAB-20261105-CCCC.json"]);
});

// ---- #7 escenarios dos veces = misma salida ----
test("#7 npm run scenarios dos veces produce exactamente la misma salida (sin tiempos en los archivos)", () => {
  const leer = () => ["out/scenario-report.md", "out/results.json", "out/tickets-log.jsonl"].map((f) => readFileSync(join(ROOT, f), "utf8")).join("\n=====\n");
  assert.equal(run("scripts/run-scenarios.js", []).status, 0);
  const a = leer();
  assert.equal(run("scripts/run-scenarios.js", []).status, 0);
  assert.equal(leer(), a);
  assert.ok(!/\d+(\.\d+)? ms/.test(a), "el reporte no debe incluir tiempos en ms");
});
