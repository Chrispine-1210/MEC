import { useMutation } from "@tanstack/react-query";
import { CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type CheckoutButtonProps = {
  amount: number;
  currency: string;
  productName: string;
  productType: string;
};

export default function CheckoutButton({
  amount,
  currency,
  productName,
  productType,
}: CheckoutButtonProps) {
  const { toast } = useToast();

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payments/checkout", {
        amount,
        currency,
        productName,
        productType,
        mode: "payment",
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
    currency,
  }).format(amount / 100);

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
        disabled={checkoutMutation.isPending}
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
