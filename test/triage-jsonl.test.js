import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../scripts/triage-jsonl.js", import.meta.url));
const base = { scope: "avril.lab.support_ticket", createdAt: "2026-11-04T10:00:00.000Z", email: "a@example.com", category: "other", stripeSessionId: null, labSlug: null, locale: "es", clientIp: "203.0.113.5" };
const run = (lines) => {
  const d = mkdtempSync(join(tmpdir(), "triage-"));
  const f = join(d, "in.jsonl");
  writeFileSync(f, lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n") + "\n");
  const r = spawnSync(process.execPath, [SCRIPT, f, join(d, "out")], { encoding: "utf8" });
  return { r, d, files: readdirSync(join(d, "out", "handoffs")).sort(), log: readFileSync(join(d, "out", "tickets-log.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) };
};

test("ticketId repetido NO sobrescribe el handoff anterior (reporte de valrami-hue, PR #3)", () => {
  const { r, files, log, d } = run([
    { ...base, ticketId: "LAB-20261104-AAAA", message: "¿Cuánto cuesta el trial?" },
    { ...base, ticketId: "LAB-20261104-AAAA", message: "quiero mi reembolso" },
  ]);
  assert.equal(r.status, 0);
  assert.deepEqual(files, ["LAB-20261104-AAAA.json", "LAB-20261104-AAAA__dup2.json"]);
  assert.ok(r.stdout.includes("ticketId repetido"));
  assert.ok(r.stdout.includes("1 ids repetidos"));
  assert.equal(log[1].duplicateOf, "LAB-20261104-AAAA");
  const first = JSON.parse(readFileSync(join(d, "out", "handoffs", files[0]), "utf8"));
  assert.equal(first.devHandoff.category, "faq"); // el primero sigue siendo el de FAQ
});

test("una línea inválida no detiene el resto y se reporta", () => {
  const { r, log } = run(["esto no es json", { ...base, ticketId: "LAB-20261104-BBBB", message: "hola" }]);
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes("1 con error"));
  assert.equal(log.length, 2);
});
