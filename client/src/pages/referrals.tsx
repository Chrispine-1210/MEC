import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import ReferralSystem from "@/components/user/referral-system";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import type { ApiReferralDashboard } from "@/lib/api-types";

export default function Referrals() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: dashboard, isLoading: referralLoading } = useQuery<ApiReferralDashboard>({
    queryKey: ["/api/referrals/me"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  if (isLoading || referralLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ExpandingNav />
        <div className="container mx-auto max-w-6xl px-4 py-24">
          <Skeleton className="mb-4 h-10 w-72" />
          <Skeleton className="mb-8 h-5 w-96 max-w-full" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />
      <section className="mt-16 bg-gradient-to-r from-mtendere-blue to-mtendere-green py-16 text-white">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="hero-panel max-w-3xl rounded-3xl p-6 md:p-8">
            <h1 className="text-4xl font-bold md:text-5xl">Referral Program</h1>
            <p className="mt-4 max-w-2xl text-white/85">
              Share Mtendere with students and families who need clearer education guidance, then track rewards from your
              dashboard.
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-6xl px-4 py-10">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-mtendere-blue">Your referral workspace</CardTitle>
            <CardDescription>Invite, track, and request payouts from one connected page.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReferralSystem dashboard={dashboard} />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
