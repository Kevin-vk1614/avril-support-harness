import test from "node:test";
import assert from "node:assert/strict";
import { triage } from "../src/harness.js";

const BASE = {
  scope: "avril.lab.support_ticket",
  ticketId: "LAB-20261029-A010",
  createdAt: "2026-10-29T10:00:00.000Z",
  email: "x@example.com",
  category: "not_ready",
  stripeSessionId: null,
  labSlug: null,
  locale: "es",
  clientIp: "203.0.113.50",
  message: "No está listo",
};

test("enmascara secretos dentro de labSlug en todas las salidas", () => {
  const secret = ["sk", "live", "FAKE0000000000000000EXAMPLE"].join("_");
  const result = triage({
    ...BASE,
    labSlug: `seat-${secret}`,
  });

  const output = JSON.stringify(result);

  assert.ok(!output.includes(secret));
  assert.ok(
    result.devHandoff.identifiers.labSlug.includes(
      "[REDACTED:stripe_secret_key]"
    )
  );
  assert.ok(result.redactions.includes("stripe_secret_key"));
  assert.ok(!result.handoffSummary?.includes(secret));
  assert.ok(!result.followUpProposal.devHandoff.includes(secret));
});

test("conserva los labSlug normales sin modificarlos", () => {
  const result = triage({
    ...BASE,
    labSlug: "acme-corp",
  });

  assert.equal(result.devHandoff.identifiers.labSlug, "acme-corp");
});