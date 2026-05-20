import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiReferralDashboard } from "@/lib/api-types";
import {
  CheckCircle,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Mail,
  MessageCircle,
  Send,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";

type ReferralSystemProps = {
  dashboard?: ApiReferralDashboard | null;
};

const emptyDashboard: ApiReferralDashboard = {
  referralCode: null,
  referralLink: null,
  stats: {
    clicks: 0,
    signups: 0,
    paidConversions: 0,
    conversionRate: 0,
    pendingEarnings: 0,
    availableEarnings: 0,
    lifetimeEarned: 0,
  },
  wallet: null,
  referrals: [],
  ledger: [],
};

export default function ReferralSystem({ dashboard }: ReferralSystemProps) {
  const [referralEmail, setReferralEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const data = dashboard ?? emptyDashboard;
  const currency = data.wallet?.currency || "USD";
  const referralLink = data.referralLink || `${window.location.origin}/dashboard`;

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest("POST", "/api/referrals/invites", { referredEmail: email });
    },
    onSuccess: () => {
      toast({
        title: "Referral Sent",
        description: "The invitation has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/me"] });
      setReferralEmail("");
    },
    onError: () => {
      toast({
        title: "Referral Failed",
        description: "Please check the email address and try again.",
        variant: "destructive",
      });
    },
  });

  const payoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/payouts", {
        amount: data.stats.availableEarnings,
        method: "manual",
        destination: { note: "Manual payout review" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Payout Requested",
        description: "Your withdrawal request is queued for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payouts"] });
    },
    onError: (error) => {
      toast({
        title: "Payout Unavailable",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const paidProgress = Math.min((data.stats.paidConversions / 5) * 100, 100);
  const leaderboardTier =
    data.stats.paidConversions >= 10
      ? "Gold"
      : data.stats.paidConversions >= 5
        ? "Silver"
        : data.stats.paidConversions >= 1
          ? "Bronze"
          : "Starter";

  const formatMoney = (minorUnits: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format((minorUnits || 0) / 100);

  const formatDate = (value?: string | null) => {
    if (!value) return "Pending";
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSendReferral = () => {
    if (!/\S+@\S+\.\S+/.test(referralEmail.trim())) {
      toast({
        title: "Valid Email Required",
        description: "Enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    inviteMutation.mutate(referralEmail.trim());
  };

  const handleCopyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link Copied",
      description: "Your referral link is ready to share.",
    });
  };

  const handleShareEmail = () => {
    const subject = "Join Mtendere Education";
    const body = `Join Mtendere Education using my referral link: ${referralLink}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleShareWhatsApp = () => {
    const message = `Join Mtendere Education using my referral link: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const statusBadge = (status: string, fraudStatus: string) => {
    if (fraudStatus === "hold" || fraudStatus === "review") {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
          <ShieldAlert className="mr-1 h-3.5 w-3.5" />
          Review
        </Badge>
      );
    }

    if (status === "activated") {
      return (
        <Badge className="bg-mtendere-green/15 text-mtendere-green border-mtendere-green/20">
          <CheckCircle className="mr-1 h-3.5 w-3.5" />
          Paid
        </Badge>
      );
    }

    return (
      <Badge className="bg-mtendere-orange/15 text-mtendere-orange border-mtendere-orange/30">
        <Clock className="mr-1 h-3.5 w-3.5" />
        Pending
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric label="Clicks" value={data.stats.clicks} icon={<ExternalLink className="h-7 w-7" />} tone="blue" />
        <Metric label="Signups" value={data.stats.signups} icon={<Users className="h-7 w-7" />} tone="green" />
        <Metric label="Paid" value={data.stats.paidConversions} icon={<CheckCircle className="h-7 w-7" />} tone="orange" />
        <Metric label="Rate" value={`${data.stats.conversionRate}%`} icon={<Trophy className="h-7 w-7" />} tone="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <div className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="referralLink">Referral Link</Label>
              <div className="flex gap-2">
                <Input id="referralLink" value={referralLink} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={handleCopyReferralLink} title="Copy referral link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handleShareEmail} title="Share by email">
                <Mail className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleShareWhatsApp} title="Share on WhatsApp">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:items-end">
            <div className="space-y-2">
              <Label htmlFor="referralEmail">Invite by Email</Label>
              <Input
                id="referralEmail"
                type="email"
                placeholder="friend@example.com"
                value={referralEmail}
                onChange={(event) => setReferralEmail(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSendReferral()}
              />
            </div>
            <Button
              onClick={handleSendReferral}
              disabled={inviteMutation.isPending}
              className="bg-mtendere-blue hover:bg-mtendere-blue/90"
            >
              <Send className="mr-2 h-4 w-4" />
              Send Invite
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold text-mtendere-green">{formatMoney(data.stats.availableEarnings)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-mtendere-green" />
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Pending: {formatMoney(data.stats.pendingEarnings)}
          </div>
          <Button
            className="mt-4 w-full bg-mtendere-green hover:bg-mtendere-green/90"
            disabled={data.stats.availableEarnings <= 0 || payoutMutation.isPending}
            onClick={() => payoutMutation.mutate()}
          >
            Request Payout
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-mtendere-blue">Rewards Tier</h3>
            <p className="text-sm text-muted-foreground">{leaderboardTier} tier</p>
          </div>
          <Badge variant="outline" className="border-mtendere-blue/40 text-mtendere-blue">
            {data.stats.paidConversions}/5 paid conversions
          </Badge>
        </div>
        <Progress value={paidProgress} className="mt-4 h-2" />
      </div>

      <div className="rounded-lg border bg-background">
        <div className="border-b p-4">
          <h3 className="font-semibold text-mtendere-blue">Referral Activity</h3>
          <p className="text-sm text-muted-foreground">Revenue-qualified referrals and commission status</p>
        </div>

        {data.referrals.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No referrals yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {data.referrals.map((referral) => (
              <div key={referral.id} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="font-medium">{referral.referredEmail}</p>
                  <p className="text-sm text-muted-foreground">
                    Joined {formatDate(referral.createdAt)} · Release {formatDate(referral.releaseAt)}
                  </p>
                </div>
                {statusBadge(referral.status, referral.fraudStatus)}
                <div className="text-left md:text-right">
                  <p className="font-semibold text-mtendere-green">{formatMoney(referral.commissionAmount)}</p>
                  <p className="text-xs text-muted-foreground">{referral.commissionStatus || "No commission"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone: "blue" | "green" | "orange";
}) {
  const toneClass =
    tone === "green"
      ? "bg-mtendere-green/10 text-mtendere-green"
      : tone === "orange"
        ? "bg-mtendere-orange/10 text-mtendere-orange"
        : "bg-mtendere-blue/10 text-mtendere-blue";

  return (
    <div className={`rounded-lg p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}
