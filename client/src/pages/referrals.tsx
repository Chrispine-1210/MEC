import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import ReferralSystem from "@/components/user/referral-system";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { ApiReferral } from "@/lib/api-types";
import { Copy, Share2, Users, DollarSign, TrendingUp, Clock, ShieldCheck } from "lucide-react";

interface ReferralStats {
  balance: number;
  pending: number;
  recent: Array<{
    id: number | string;
    email: string;
    status: string;
    reward: number;
    tier: number;
  }>;
}

export default function ReferralsPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, setLocation, user]);

  const referralCode = useMemo(() => {
    const rawCode = (user as any)?.referralCode || user?.username || (user?.id ? `MTN${user.id}` : "MTENDERE");
    return String(rawCode).trim().toUpperCase();
  }, [user]);

  const { data: referrals = [] } = useQuery<ApiReferral[]>({
    queryKey: ["/api/referrals"],
    enabled: !!user,
  });

  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/referrals/stats");
      return res.json();
    },
    enabled: !!user,
  });

  const referralLink = `${window.location.origin}/register?ref=${encodeURIComponent(referralCode)}`;
  const completedLegacyEarnings = referrals
    .filter((referral) => referral.status.toLowerCase() === "completed")
    .reduce((total, referral) => total + (referral.rewardAmount ?? 0), 0);
  const availableBalance = stats?.balance ?? completedLegacyEarnings;
  const pendingAmount = stats?.pending ?? 0;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Referral link copied",
      description: "Share it with someone who could use Mtendere's support.",
    });
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Join Mtendere Education",
        text: "Explore scholarships, job opportunities, and study abroad support through Mtendere.",
        url: referralLink,
      });
      return;
    }

    copyLink();
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <ExpandingNav />
        <main className="container mx-auto px-4 py-32">
          <Card className="mx-auto max-w-md border-border/60 shadow-sm">
            <CardContent className="py-10 text-center text-muted-foreground">Loading your referral dashboard...</CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-mtendere-gray/50">
      <ExpandingNav />
      <main className="container mx-auto px-4 py-24 sm:py-28">
        <section className="mb-8 rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-4 bg-mtendere-green/15 text-mtendere-green border-mtendere-green/20">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Active referral dashboard
              </Badge>
              <h1 className="text-3xl font-bold text-mtendere-blue sm:text-4xl">Referral Program</h1>
              <p className="mt-3 text-muted-foreground">
                Share Mtendere with students and professionals in your network. Track invitations, completed referrals, and reward progress from one place.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
              <Card className="border-mtendere-green/20 bg-mtendere-green/10 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-mtendere-green">Available</p>
                      <p className="text-2xl font-bold text-mtendere-green">${availableBalance}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-mtendere-green" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-mtendere-orange/30 bg-mtendere-orange/10 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-mtendere-orange">Pending</p>
                      <p className="text-2xl font-bold text-mtendere-orange">${pendingAmount}</p>
                    </div>
                    <Clock className="h-8 w-8 text-mtendere-orange" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <ReferralSystem referrals={referrals} />
          </div>

          <aside className="space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-mtendere-blue">
                  <TrendingUp className="h-5 w-5" />
                  Your Referral Code
                </CardTitle>
                <CardDescription>Use this code or direct link when inviting someone.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/50 p-4">
                  <p className="break-all font-mono text-xl font-bold text-foreground">{referralCode}</p>
                </div>
                <p className="break-all rounded-lg bg-mtendere-blue/10 p-3 text-sm text-mtendere-blue">{referralLink}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={copyLink} variant="outline">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button onClick={shareLink} className="bg-mtendere-blue hover:bg-mtendere-blue/90">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-mtendere-blue">
                  <Users className="h-5 w-5" />
                  Recent Engine Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recent?.length ? (
                  <div className="space-y-3">
                    {stats.recent.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.email}</p>
                          <Badge variant="outline" className="mt-1 capitalize">{item.status}</Badge>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold">${item.reward}</p>
                          <p className="text-muted-foreground">L{item.tier}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                    New referral engine activity will appear here after tracked signups begin.
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

