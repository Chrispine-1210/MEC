import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { AlertCircle, CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import ExpandingNav from "@/components/expanding-nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

type PaymentStatusResponse = {
  payment: {
    id: number;
    status: string;
    providerStatus: string | null;
    amountTotal: number;
    amountRefunded: number;
    currency: string;
    productName: string | null;
    receiptStatus: string;
    failureReason: string | null;
    paidAt: string | null;
  };
  checkout: { id: string; status: string | null; paymentStatus: string };
};

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);

export function PaymentSuccess() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const sessionId = new URLSearchParams(window.location.search).get("session_id") || "";
  const paymentQuery = useQuery<PaymentStatusResponse>({
    queryKey: [`/api/payments/checkout/${encodeURIComponent(sessionId)}`],
    enabled: Boolean(user && sessionId),
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data as PaymentStatusResponse | undefined;
      return data && ["processing", "checkout_created"].includes(data.payment.status) ? 3_000 : false;
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [authLoading, setLocation, user]);

  if (authLoading || (!paymentQuery.data && paymentQuery.isLoading)) {
    return <PaymentResultShell icon={<Loader2 className="h-10 w-10 animate-spin" />} title="Confirming payment" />;
  }

  if (!sessionId || paymentQuery.isError) {
    return (
      <PaymentResultShell
        icon={<AlertCircle className="h-10 w-10 text-amber-600" />}
        title="Payment status unavailable"
        description={paymentQuery.error instanceof Error ? paymentQuery.error.message : "The checkout reference is missing."}
      />
    );
  }

  const payment = paymentQuery.data?.payment;
  if (!payment) return null;
  const paid = payment.status === "paid";
  const partiallyRefunded = payment.status === "partially_refunded";
  const processing = payment.status === "processing" || payment.status === "checkout_created";

  return (
    <PaymentResultShell
      icon={paid
        ? <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        : partiallyRefunded
          ? <AlertCircle className="h-10 w-10 text-amber-600" />
        : processing
          ? <Clock3 className="h-10 w-10 text-amber-600" />
          : <XCircle className="h-10 w-10 text-red-600" />}
      title={paid ? "Payment confirmed" : partiallyRefunded ? "Payment partially refunded" : processing ? "Payment processing" : "Payment not completed"}
      description={paid
        ? `We recorded ${formatAmount(payment.amountTotal, payment.currency)} for ${payment.productName || "your service"}.`
        : partiallyRefunded
          ? `${formatAmount(payment.amountRefunded, payment.currency)} of this payment has been refunded.`
        : processing
          ? "Stripe is still confirming this payment. This page will update automatically."
          : payment.failureReason || "Stripe did not confirm this payment."}
      reference={`Payment ${payment.id}`}
    />
  );
}

export function PaymentCancelled() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const sessionId = new URLSearchParams(window.location.search).get("session_id") || "";
  const cancellation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/payments/checkout/${encodeURIComponent(sessionId)}/cancel`);
      return response.json() as Promise<{ payment: PaymentStatusResponse["payment"] }>;
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (user && sessionId && cancellation.isIdle) cancellation.mutate();
  }, [authLoading, cancellation.isIdle, sessionId, setLocation, user]);

  if (authLoading || !user || cancellation.isPending) {
    return <PaymentResultShell icon={<Loader2 className="h-10 w-10 animate-spin" />} title="Closing checkout" />;
  }
  if (!sessionId) {
    return (
      <PaymentResultShell
        icon={<AlertCircle className="h-10 w-10 text-amber-600" />}
        title="Checkout reference unavailable"
        description="No payment status was changed. Return to your dashboard before starting another checkout."
      />
    );
  }
  if (cancellation.isError) {
    return (
      <PaymentResultShell
        icon={<AlertCircle className="h-10 w-10 text-amber-600" />}
        title="Cancellation not confirmed"
        description={cancellation.error instanceof Error ? cancellation.error.message : "Please review the payment from your dashboard."}
      />
    );
  }
  const payment = cancellation.data?.payment;
  if (payment?.status === "paid") {
    return (
      <PaymentResultShell
        icon={<CheckCircle2 className="h-10 w-10 text-emerald-600" />}
        title="Payment confirmed"
        description={`Stripe completed ${formatAmount(payment.amountTotal, payment.currency)} before checkout closed.`}
        reference={`Payment ${payment.id}`}
      />
    );
  }
  if (payment?.status === "processing") {
    return (
      <PaymentResultShell
        icon={<Clock3 className="h-10 w-10 text-amber-600" />}
        title="Payment processing"
        description="Stripe had already started processing this payment when checkout closed. Review the final status from your dashboard."
        reference={`Payment ${payment.id}`}
      />
    );
  }
  return (
    <PaymentResultShell
      icon={<XCircle className="h-10 w-10 text-muted-foreground" />}
      title="Checkout cancelled"
      description="Stripe Checkout was closed and the cancellation was recorded. No payment receipt was issued."
      reference={payment ? `Payment ${payment.id}` : undefined}
    />
  );
}

function PaymentResultShell({
  icon,
  title,
  description,
  reference,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  reference?: string;
}) {
  return (
    <div className="min-h-screen bg-mtendere-gray">
      <ExpandingNav />
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center px-4 py-12">
        <section className="w-full rounded-md border bg-background p-6 text-center shadow-sm sm:p-8" aria-live="polite">
          <div className="mb-5 flex justify-center">{icon}</div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description && <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>}
          {reference && <p className="mt-4 text-xs font-medium text-muted-foreground">{reference}</p>}
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard">Return to dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">Contact support</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
