import assert from "node:assert/strict";
import { assessOrder } from "../src/invoice_service.js";

const captured = { orderId: "a", patientReference: "p", amountCents: 1000, currency: "USD", paymentEvents: [{ type: "captured" as const, at: "2026-01-01" }] };
assert.equal(assessOrder(captured), "issue");
assert.equal(assessOrder({ ...captured, paymentEvents: [{ type: "authorized", at: "2026-01-01" }] }), "review");
assert.equal(assessOrder({ ...captured, amountCents: 500001 }), "review");
console.log("invoice decision test passed");
