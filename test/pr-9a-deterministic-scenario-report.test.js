import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

test("el reporte de escenarios es idéntico entre dos ejecuciones", () => {
  const first = spawnSync(
    process.execPath,
    ["scripts/run-scenarios.js"],
    { encoding: "utf8" }
  );

  assert.equal(first.status, 0, first.stderr);

  const report1 = readFileSync("out/scenario-report.md", "utf8");

  const second = spawnSync(
    process.execPath,
    ["scripts/run-scenarios.js"],
    { encoding: "utf8" }
  );

  assert.equal(second.status, 0, second.stderr);

  const report2 = readFileSync("out/scenario-report.md", "utf8");

  assert.equal(
    report2,
    report1,
    "El reporte cambió entre dos ejecuciones"
  );
});