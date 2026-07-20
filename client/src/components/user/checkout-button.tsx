import { useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type PaymentProduct = {
  code: "application_support_deposit";
  amount: number;
  currency: string;
  name: string;
  productType: string;
};

type PaymentConfig = {
  enabled: boolean;
  ready: boolean;
  provider: "stripe";
  products: PaymentProduct[];
  message: string | null;
};

export default function CheckoutButton() {
  const { toast } = useToast();
  const idempotencyKey = useRef(crypto.randomUUID());
  const { data: config, isLoading } = useQuery<PaymentConfig>({
    queryKey: ["/api/payments/config"],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const product = config?.products.find((item) => item.code === "application_support_deposit");

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payments/checkout", {
        productCode: "application_support_deposit",
        idempotencyKey: idempotencyKey.current,
      });
      return response.json() as Promise<{ id: string; url: string | null }>;
    },
    onSuccess: (session) => {
      if (!session.url) {
        toast({
          title: "Checkout unavailable",
          description: "Stripe did not return a checkout URL.",
          variant: "destructive",
        });
        return;
      }

      window.location.assign(session.url);
    },
    onError: (error) => {
      toast({
        title: "Checkout unavailable",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    },
  });

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product?.currency || "USD",
  }).format((product?.amount || 0) / 100);

  if (isLoading) {
    return (
      <div className="flex min-h-28 items-center justify-center" aria-live="polite">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Checking secure checkout" />
      </div>
    );
  }

  if (!config?.ready || !product) {
    return (
      <div className="flex min-h-28 items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
        <p>{config?.message || "Secure checkout is temporarily unavailable. No payment has been taken."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Due today</p>
          <p className="text-2xl font-bold text-mtendere-blue">{formattedAmount}</p>
        </div>
        <Badge className="bg-mtendere-green/15 text-mtendere-green border-mtendere-green/20">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          Stripe
        </Badge>
      </div>

      <Button
        className="w-full bg-mtendere-green hover:bg-mtendere-green/90"
        onClick={() => checkoutMutation.mutate()}
        disabled={checkoutMutation.isPending || !config.ready}
      >
        {checkoutMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="mr-2 h-4 w-4" />
        )}
        Pay Securely
      </Button>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        <span>Cards, mobile wallets, and Link by Stripe where available.</span>
      </div>
    </div>
  );
}
