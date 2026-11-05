import { test } from "node:test";
import assert from "node:assert/strict";
import { triage } from "../src/harness.js";
test("rechaza tickets sin id en lugar de asignar UNKNOWN", () => {
  assert.throws(() => triage({ message: "¿Qué es Avril Lab?" }), /Ticket sin id/);
});
test("rechaza id vacío o solo espacios", () => {
  assert.throws(() => triage({ id: "   ", message: "¿Qué es Avril Lab?" }), /Ticket sin id/);
});
test("conserva un id válido", () => {
  assert.equal(triage({ id: "LAB-22", message: "¿Qué es Avril Lab?" }).ticketId, "LAB-22");
});
