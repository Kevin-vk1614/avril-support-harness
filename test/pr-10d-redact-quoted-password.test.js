import test from "node:test";
import assert from "node:assert/strict";
import { redact } from "../src/redact.js";

test("enmascara completa una contraseña entre comillas dobles con espacios", () => {
  const secret = "mi clave secreta 123";
  const result = redact(`password is "${secret}"`);

  assert.equal(result.text, "[REDACTED:password]");
  assert.ok(!result.text.includes(secret));
  assert.deepEqual(result.findings, ["password"]);
});

test("enmascara completa una contraseña entre comillas simples con espacios", () => {
  const secret = "otra clave privada 456";
  const result = redact(`password: '${secret}'`);

  assert.equal(result.text, "[REDACTED:password]");
  assert.ok(!result.text.includes(secret));
  assert.deepEqual(result.findings, ["password"]);
});

test("conserva el comportamiento de contraseñas sin comillas", () => {
  const result = redact("password: ejemplo123");

  assert.equal(result.text, "[REDACTED:password]");
  assert.deepEqual(result.findings, ["password"]);
});