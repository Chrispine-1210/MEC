const irreversiblePaymentStatuses = new Set(["refunded", "disputed"]);

export const resolvePaymentStatus = (currentStatus: string, incomingStatus: string) => {
  if (currentStatus === incomingStatus) return currentStatus;
  if (irreversiblePaymentStatuses.has(currentStatus)) return currentStatus;
  if (currentStatus === "cancelled" && incomingStatus !== "paid") return currentStatus;
  if (currentStatus === "partially_refunded") {
    return irreversiblePaymentStatuses.has(incomingStatus) ? incomingStatus : currentStatus;
  }
  if (
    currentStatus === "paid"
    && incomingStatus !== "partially_refunded"
    && !irreversiblePaymentStatuses.has(incomingStatus)
  ) return currentStatus;
  return incomingStatus;
};

export const calculateCommissionReversalTarget = (input: {
  commissionAmount: number;
  grossPaymentAmount: number;
  paymentReversedAmount: number;
  fullReversal?: boolean;
}) => {
  const commissionAmount = Math.max(0, Math.trunc(input.commissionAmount));
  if (input.fullReversal) return commissionAmount;

  const grossPaymentAmount = Math.max(1, Math.trunc(input.grossPaymentAmount));
  const paymentReversedAmount = Math.min(
    grossPaymentAmount,
    Math.max(0, Math.trunc(input.paymentReversedAmount)),
  );
  return Number(
    (BigInt(commissionAmount) * BigInt(paymentReversedAmount)) / BigInt(grossPaymentAmount),
  );
};

export const getProviderPaymentMismatch = (
  existing: { userId: number; amountTotal: number; currency: string; productType: string },
  incoming: { userId: number; amountTotal: number; currency: string; productType: string },
) => {
  if (existing.userId !== incoming.userId) return "user" as const;
  if (existing.amountTotal !== incoming.amountTotal) return "amount" as const;
  if (existing.currency.toUpperCase() !== incoming.currency.toUpperCase()) return "currency" as const;
  if (existing.productType !== incoming.productType) return "product" as const;
  return null;
};
