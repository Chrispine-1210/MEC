import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, RefreshCw, RotateCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, authFetch, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PaymentRow = {
  payment: {
    id: number;
    status: string;
    providerStatus: string | null;
    amountTotal: number;
    amountRefunded: number;
    currency: string;
    paymentMethod: string | null;
    productName: string | null;
    receiptStatus: string;
    stripePaymentIntentId: string | null;
    createdAt: string | null;
  };
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
};

type PaymentList = { rows: PaymentRow[]; total: number; limit: number; offset: number };
type PaymentSummary = {
  byStatus: Array<{ status: string; count: number; amount: number }>;
  paidToday: { count: number; amount: number };
  failedWebhookEvents: number;
  failedReceipts: number;
};
type PaymentDiagnostics = {
  ready: boolean;
  mode: string;
  providerReachable: boolean | null;
  chargesEnabled: boolean | null;
  webhookEndpointVerified: boolean | null;
  requiredEventsConfigured: boolean | null;
  blockingReasons: Array<{ code: string; message: string }>;
};
type StripeEventList = {
  rows: Array<{
    id: number;
    stripeEventId: string;
    eventType: string;
    objectId: string;
    processingStatus: string;
    attemptCount: number;
    error: string | null;
    createdAt: string | null;
  }>;
  total: number;
};

const formatAmount = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);

const statusClass = (status: string) => {
  if (["paid", "sent"].includes(status)) return "bg-emerald-500/15 text-emerald-700 border-emerald-500/20";
  if (["failed", "disputed", "refunded"].includes(status)) return "bg-destructive/15 text-destructive border-destructive/20";
  return "bg-amber-500/15 text-amber-700 border-amber-500/20";
};

export default function Payments() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [refundRow, setRefundRow] = useState<PaymentRow | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const query = useMemo(() => ({
    search: search.trim() || undefined,
    status: status === "all" ? undefined : status,
    provider: "stripe",
    paymentMethod: paymentMethod === "all" ? undefined : paymentMethod,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    limit: 100,
  }), [from, paymentMethod, search, status, to]);
  const { data: payments, isLoading } = useQuery<PaymentList>({
    queryKey: ["/api/admin/payments", query],
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
  const { data: summary } = useQuery<PaymentSummary>({
    queryKey: ["/api/admin/payments/summary"],
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
  const { data: diagnostics } = useQuery<PaymentDiagnostics>({
    queryKey: ["/api/admin/payments/diagnostics"],
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const { data: webhookEvents } = useQuery<StripeEventList>({
    queryKey: ["/api/admin/payments/webhook-events", { limit: 50 }],
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
  const reconcile = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/payments/reconcile", { limit: 100 });
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/payments"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/summary"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/diagnostics"] }),
      ]);
      toast({ title: "Reconciliation complete", description: "Pending Stripe events and receipts were checked." });
    },
    onError: (error) => toast({
      title: "Reconciliation failed",
      description: error instanceof Error ? error.message : "Please try again.",
      variant: "destructive",
    }),
  });
  const refund = useMutation({
    mutationFn: async () => {
      if (!refundRow) throw new Error("Select a payment to refund.");
      const amount = refundAmount.trim()
        ? Math.round(Number(refundAmount) * 100)
        : undefined;
      if (amount !== undefined && (!Number.isInteger(amount) || amount <= 0)) {
        throw new Error("Enter a valid refund amount.");
      }
      const response = await apiRequest("POST", `/api/admin/payments/${refundRow.payment.id}/refunds`, {
        amount,
        reason: refundReason.trim(),
        idempotencyKey: crypto.randomUUID(),
      });
      return response.json();
    },
    onSuccess: async () => {
      setRefundRow(null);
      setRefundAmount("");
      setRefundReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/payments"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/summary"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/webhook-events"] }),
      ]);
      toast({ title: "Refund submitted", description: "Stripe accepted the request. The webhook will finalize payment status." });
    },
    onError: (error) => toast({
      title: "Refund not submitted",
      description: error instanceof Error ? error.message : "Please review the payment and try again.",
      variant: "destructive",
    }),
  });

  const exportPayments = async () => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && key !== "limit") params.set(key, String(value));
    });
    const response = await authFetch(`/api/admin/payments/export.csv?${params.toString()}`);
    if (!response.ok) {
      toast({ title: "Export failed", description: "The payment report could not be generated.", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mec-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const paid = summary?.byStatus.find((item) => item.status === "paid");
  const failed = summary?.byStatus.find((item) => item.status === "failed");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stripe transactions, webhook processing, and receipt delivery.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPayments}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => reconcile.mutate()} disabled={reconcile.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${reconcile.isPending ? "animate-spin" : ""}`} />
            Reconcile
          </Button>
        </div>
      </div>

      {diagnostics && !diagnostics.ready && (
        <div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-destructive" />
          <div>
            <p className="font-medium text-foreground">Stripe is not ready for production checkout</p>
            <p className="mt-1 text-muted-foreground">
              {diagnostics.blockingReasons.map((reason) => reason.message).join(" ") || "Provider verification failed."}
            </p>
          </div>
        </div>
      )}

      {diagnostics?.ready && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-800" role="status">
          <CheckCircle2 className="h-4 w-4" /> Stripe live checkout and webhook events are verified.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Paid volume</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{formatAmount(paid?.amount ?? 0)}</p><p className="text-xs text-muted-foreground">{paid?.count ?? 0} payments</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Paid today</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{formatAmount(summary?.paidToday.amount ?? 0)}</p><p className="text-xs text-muted-foreground">{summary?.paidToday.count ?? 0} payments</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Failed payments</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{failed?.count ?? 0}</p><p className="text-xs text-muted-foreground">Requires review</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Delivery failures</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{(summary?.failedWebhookEvents ?? 0) + (summary?.failedReceipts ?? 0)}</p><p className="text-xs text-muted-foreground">Webhooks and receipts</p></CardContent></Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_12rem_12rem_10rem_10rem]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search email or Stripe reference" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="partially_refunded">Partially refunded</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="link">Link</SelectItem>
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <Label htmlFor="payments-from" className="sr-only">Payments from date</Label>
          <Input id="payments-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Payments from date" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="payments-to" className="sr-only">Payments to date</Label>
          <Input id="payments-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="Payments to date" />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Receipt</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading payments...</TableCell></TableRow>}
            {!isLoading && (payments?.rows.length ?? 0) === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No payments found.</TableCell></TableRow>}
            {payments?.rows.map((row) => (
              <TableRow key={row.payment.id}>
                <TableCell><p className="font-medium">{`${row.userFirstName || ""} ${row.userLastName || ""}`.trim() || "Customer"}</p><p className="text-xs text-muted-foreground">{row.userEmail || "No email"}</p></TableCell>
                <TableCell><p>{row.payment.productName || "Payment"}</p><p className="max-w-48 truncate text-xs text-muted-foreground">{row.payment.stripePaymentIntentId || `PAY-${row.payment.id}`}</p><p className="text-xs text-muted-foreground">{row.payment.paymentMethod || "Provider pending"}</p></TableCell>
                <TableCell>
                  <p>{formatAmount(row.payment.amountTotal, row.payment.currency)}</p>
                  {row.payment.amountRefunded > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatAmount(row.payment.amountRefunded, row.payment.currency)} refunded
                    </p>
                  )}
                </TableCell>
                <TableCell><Badge variant="outline" className={statusClass(row.payment.status)}>{row.payment.status}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={statusClass(row.payment.receiptStatus)}>{row.payment.receiptStatus}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.payment.createdAt ? new Date(row.payment.createdAt).toLocaleString() : "-"}</TableCell>
                <TableCell className="text-right">
                  {["paid", "partially_refunded"].includes(row.payment.status) && row.payment.amountRefunded < row.payment.amountTotal && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRefundRow(row);
                        setRefundAmount(((row.payment.amountTotal - row.payment.amountRefunded) / 100).toFixed(2));
                        setRefundReason("");
                      }}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      Refund
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{payments?.total ?? 0} total payment records</p>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Stripe webhook history</h2>
          <p className="text-sm text-muted-foreground">{webhookEvents?.total ?? 0} durable provider events</p>
        </div>
        <div className="overflow-hidden rounded-md border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Object</TableHead><TableHead>Status</TableHead><TableHead>Attempts</TableHead><TableHead>Received</TableHead><TableHead>Error</TableHead></TableRow></TableHeader>
            <TableBody>
              {(webhookEvents?.rows.length ?? 0) === 0 && <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">No Stripe events recorded.</TableCell></TableRow>}
              {webhookEvents?.rows.map((event) => (
                <TableRow key={event.id}>
                  <TableCell><p className="font-medium">{event.eventType}</p><p className="max-w-52 truncate text-xs text-muted-foreground">{event.stripeEventId}</p></TableCell>
                  <TableCell className="max-w-40 truncate">{event.objectId}</TableCell>
                  <TableCell><Badge variant="outline" className={statusClass(event.processingStatus)}>{event.processingStatus}</Badge></TableCell>
                  <TableCell>{event.attemptCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{event.createdAt ? new Date(event.createdAt).toLocaleString() : "-"}</TableCell>
                  <TableCell className="max-w-56 truncate text-sm text-destructive">{event.error || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={Boolean(refundRow)} onOpenChange={(open) => !open && setRefundRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Stripe refund</DialogTitle>
            <DialogDescription>
              The payment remains unchanged until Stripe signs and delivers the refund webhook.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund amount ({refundRow?.payment.currency || "USD"})</Label>
              <Input id="refund-amount" inputMode="decimal" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason</Label>
              <Input id="refund-reason" value={refundReason} onChange={(event) => setRefundReason(event.target.value)} maxLength={500} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundRow(null)} disabled={refund.isPending}>Cancel</Button>
            <Button onClick={() => refund.mutate()} disabled={refund.isPending || refundReason.trim().length < 5}>
              {refund.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Submit refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
