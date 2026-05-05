import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Share2, Users, DollarSign, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function ReferralsPage() {
  const { user } = useAuth();
  const referralCode = user?.referralCode || 'MTN' + Math.random().toString(36).substr(2, 6).toUpperCase();

  const { data: stats } = useQuery({
    queryKey: ['referrals-stats'],
    queryFn: async () => {
      const res = await fetch('/api/referrals/stats', { credentials: 'include' });
      return res.json();
    },
  });

  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-mtendere-blue flex items-center gap-3">
            <TrendingUp className="w-8 h-8" />
            Referral Program
          </CardTitle>
          <CardDescription>
            Earn 10% commission on first payment from your referrals + 5% from their referrals. Unlimited earnings!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Your Referral Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <span className="font-mono font-bold text-xl bg-background px-4 py-2 rounded">{referralCode}</span>
                  <Button onClick={copyLink} size="sm" className="bg-mtendere-orange">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-3">Share: {referralLink}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-mtendere-green" />
                  Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-mtendere-green">${stats?.balance || 0}</div>
                <p className="text-2xl text-muted-foreground">${stats?.pending || 0} pending</p>
                <Button className="w-full mt-4 bg-mtendere-green hover:bg-mtendere-green/90">
                  Withdraw
                </Button>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recent?.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{r.email}</div>
                      <Badge>{r.status}</Badge>
                    </div>
                    <div className="text-right">
                      <div>${r.reward}</div>
                      <div className="text-sm text-muted-foreground">L{r.tier}</div>
                    </div>
                  </div>
                )) || 'No referrals yet. Share your link!'}
              </div>
            </CardContent>
          </Card>
          <div className="text-center">
            <Button size="lg" className="bg-gradient text-white font-bold">
              <Share2 className="mr-2 h-5 w-5" />
              Share Referral Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

