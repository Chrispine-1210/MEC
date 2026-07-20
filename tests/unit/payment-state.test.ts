import assert from "node:assert/strict";
import test from "node:test";
import { calculateCommissionReversalTarget, getProviderPaymentMismatch, resolvePaymentStatus } from "../../server/payment-state";

test("paid payments cannot be downgraded by out-of-order Stripe events", () => {
  assert.equal(resolvePaymentStatus("paid", "processing"), "paid");
  assert.equal(resolvePaymentStatus("paid", "failed"), "paid");
  assert.equal(resolvePaymentStatus("paid", "checkout_created"), "paid");
});

test("successful late events can recover failed or expired payment attempts", () => {
  assert.equal(resolvePaymentStatus("failed", "paid"), "paid");
  assert.equal(resolvePaymentStatus("expired", "paid"), "paid");
  assert.equal(resolvePaymentStatus("cancelled", "paid"), "paid");
  assert.equal(resolvePaymentStatus("cancelled", "expired"), "cancelled");
});

test("refund and dispute states remain irreversible", () => {
  assert.equal(resolvePaymentStatus("paid", "partially_refunded"), "partially_refunded");
  assert.equal(resolvePaymentStatus("partially_refunded", "paid"), "partially_refunded");
  assert.equal(resolvePaymentStatus("partially_refunded", "refunded"), "refunded");
  assert.equal(resolvePaymentStatus("partially_refunded", "disputed"), "disputed");
  assert.equal(resolvePaymentStatus("paid", "refunded"), "refunded");
  assert.equal(resolvePaymentStatus("paid", "disputed"), "disputed");
  assert.equal(resolvePaymentStatus("refunded", "paid"), "refunded");
  assert.equal(resolvePaymentStatus("disputed", "processing"), "disputed");
});

test("partial refunds reverse only the cumulative proportional commission", () => {
  assert.equal(calculateCommissionReversalTarget({
    commissionAmount: 1_000,
    grossPaymentAmount: 10_000,
    paymentReversedAmount: 2_500,
  }), 250);
  assert.equal(calculateCommissionReversalTarget({
    commissionAmount: 333,
    grossPaymentAmount: 1_000,
    paymentReversedAmount: 500,
  }), 166);
  assert.equal(calculateCommissionReversalTarget({
    commissionAmount: 1_000,
    grossPaymentAmount: 10_000,
    paymentReversedAmount: 20_000,
  }), 1_000);
  assert.equal(calculateCommissionReversalTarget({
    commissionAmount: 1_000,
    grossPaymentAmount: 10_000,
    paymentReversedAmount: 1,
    fullReversal: true,
  }), 1_000);
});

test("provider payment facts must exactly match the server-created transaction", () => {
  const local = { userId: 12, amountTotal: 5_000, currency: "USD", productType: "application_support" };
  assert.equal(getProviderPaymentMismatch(local, { ...local }), null);
  assert.equal(getProviderPaymentMismatch(local, { ...local, userId: 13 }), "user");
  assert.equal(getProviderPaymentMismatch(local, { ...local, amountTotal: 50 }), "amount");
  assert.equal(getProviderPaymentMismatch(local, { ...local, currency: "MWK" }), "currency");
  assert.equal(getProviderPaymentMismatch(local, { ...local, productType: "subscription" }), "product");
});
