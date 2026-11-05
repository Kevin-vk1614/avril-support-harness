import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
test("procesa tickets válidos aunque otro elemento del arreglo sea inválido", () => {
  const dir = mkdtempSync(join(tmpdir(), "avril-7c-"));
  try {
    const input = join(dir, "tickets.json"), out = join(dir, "out");
    writeFileSync(input, JSON.stringify([{ id: "LAB-GOOD", message: "¿Qué es Avril Lab?" }, { id: "LAB-BAD" }]));
    const run = spawnSync(process.execPath, ["scripts/triage-jsonl.js", input, out], { encoding: "utf8" });
    assert.equal(run.status, 1, run.stderr);
    assert.ok(existsSync(join(out, "handoffs", "LAB-GOOD.json")));
    assert.equal(existsSync(join(out, "handoffs", "UNKNOWN.json")), false);
    const log = readFileSync(join(out, "tickets-log.jsonl"), "utf8");
    assert.match(log, /LAB-GOOD/); assert.match(log, /falta 'message'/);
    assert.match(run.stdout, /1 procesados/); assert.match(run.stdout, /1 con error/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
