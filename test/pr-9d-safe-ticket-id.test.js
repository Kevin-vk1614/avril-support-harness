import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(
  new URL("../scripts/triage-jsonl.js", import.meta.url)
);

const base = {
  scope: "avril.lab.support_ticket",
  createdAt: "2026-11-04T10:00:00.000Z",
  email: "a@example.com",
  category: "other",
  stripeSessionId: null,
  labSlug: null,
  locale: "es",
  clientIp: "203.0.113.5",
  message: "Hola, necesito ayuda",
};

test("rechaza ticketId con path traversal y no escribe fuera de handoffs", () => {
  const d = mkdtempSync(join(tmpdir(), "triage-path-"));
  const input = join(d, "in.jsonl");
  const out = join(d, "out");

  writeFileSync(
    input,
    [
      JSON.stringify({ ...base, ticketId: "../ESCAPED" }),
      JSON.stringify({ ...base, ticketId: "LAB-20261104-A0FF" }),
    ].join("\n") + "\n"
  );

  const r = spawnSync(process.execPath, [SCRIPT, input, out], {
    encoding: "utf8",
  });

  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes("ticketId inválido"));
  assert.ok(!existsSync(join(out, "ESCAPED.json")));

  const files = readdirSync(join(out, "handoffs")).sort();
  assert.deepEqual(files, ["LAB-20261104-A0FF.json"]);

  const log = readFileSync(join(out, "tickets-log.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

  assert.equal(log.length, 2);
  assert.ok(log[0].error.includes("ticketId inválido"));
  assert.equal(log[1].ticketId, "LAB-20261104-A0FF");
});