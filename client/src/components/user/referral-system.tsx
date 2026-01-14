import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Gift, 
  Share, 
  Copy, 
  Mail, 
  MessageCircle,
  DollarSign,
  Trophy,
  Star,
  CheckCircle,
  Clock,
  Send
} from "lucide-react";

interface Referral {
  id: number;
  referrerId: number;
  referredUserId?: number;
  referredEmail: string;
  status: string;
  rewardAmount: number;
  createdAt: string;
  completedAt?: string;
}

interface ReferralSystemProps {
  referrals: Referral[];
}

export default function ReferralSystem({ referrals }: ReferralSystemProps) {
  const [referralEmail, setReferralEmail] = useState("");
  const [showShareOptions, setShowShareOptions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const referralMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest("POST", "/api/referrals", {
        referredEmail: email,
        rewardAmount: 50, // Default reward amount
      });
    },
    onSuccess: () => {
      toast({
        title: "Referral Sent!",
        description: "Your referral has been sent successfully. You'll earn rewards when they join!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      setReferralEmail("");
    },
    onError: () => {
      toast({
        title: "Referral Failed",
        description: "Failed to send referral. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendReferral = () => {
    if (!referralEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to send the referral.",
        variant: "destructive",
      });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(referralEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    referralMutation.mutate(referralEmail);
  };

  const handleCopyReferralLink = () => {
    const referralLink = `${window.location.origin}/register?ref=USER123`; // Replace with actual referral code
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link Copied!",
      description: "Referral link has been copied to your clipboard.",
    });
  };

  const handleShareEmail = () => {
    const subject = "Join Mtendere Education - Transform Your Career!";
    const body = `Hi there!\n\nI wanted to share an amazing platform that has helped me with my educational journey. Mtendere Education Consultants offers incredible scholarships and job opportunities.\n\nJoin using my referral link: ${window.location.origin}/register?ref=USER123\n\nBest regards!`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleShareWhatsApp = () => {
    const message = `🎓 Transform your career with Mtendere Education! \n\nJoin using my referral link and unlock amazing scholarships and job opportunities: ${window.location.origin}/register?ref=USER123`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Mail className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const totalReferrals = referrals.length;
  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const totalEarnings = referrals
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Referrals</p>
              <p className="text-2xl font-bold text-blue-700">{totalReferrals}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Successful</p>
              <p className="text-2xl font-bold text-green-700">{completedReferrals}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-700">{pendingReferrals}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Earned</p>
              <p className="text-2xl font-bold text-green-700">${totalEarnings}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Send Referral */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-mtendere-blue flex items-center">
            <Gift className="w-5 h-5 mr-2" />
            Invite Friends & Earn Rewards
          </CardTitle>
          <CardDescription>
            Invite your friends to join Mtendere and earn $50 for each successful referral!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="referralEmail">Friend's Email Address</Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  id="referralEmail"
                  type="email"
                  placeholder="Enter your friend's email"
                  value={referralEmail}
                  onChange={(e) => setReferralEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendReferral()}
                />
                <Button 
                  onClick={handleSendReferral}
                  disabled={referralMutation.isPending}
                  className="bg-mtendere-blue hover:bg-blue-700"
                >
                  {referralMutation.isPending ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Share Options</Label>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyReferralLink}
                  title="Copy Referral Link"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShareEmail}
                  title="Share via Email"
                >
                  <Mail className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShareWhatsApp}
                  title="Share via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-mtendere-gray rounded-lg p-4 mt-6">
            <h4 className="font-semibold text-mtendere-blue mb-3">How it works:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-mtendere-blue rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                <div>
                  <p className="font-medium">Send Invitation</p>
                  <p className="text-gray-600">Invite friends via email or share your referral link</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-mtendere-green rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                <div>
                  <p className="font-medium">Friend Joins</p>
                  <p className="text-gray-600">Your friend registers and creates their profile</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-mtendere-orange rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                <div>
                  <p className="font-medium">Earn Rewards</p>
                  <p className="text-gray-600">Get $50 when they make their first application</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-mtendere-blue">Referral History</CardTitle>
          <CardDescription>Track your referrals and earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Referrals Yet</h3>
              <p className="text-gray-500 mb-6">Start inviting friends to earn rewards!</p>
              <Button 
                onClick={() => document.getElementById('referralEmail')?.focus()}
                className="bg-mtendere-blue hover:bg-blue-700"
              >
                Send Your First Referral
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-mtendere-blue to-mtendere-green rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{referral.referredEmail}</p>
                      <p className="text-sm text-gray-500">
                        Invited: {formatDate(referral.createdAt)}
                        {referral.completedAt && (
                          <span> • Joined: {formatDate(referral.completedAt)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge className={`${getStatusColor(referral.status)} border`}>
                      {getStatusIcon(referral.status)}
                      <span className="ml-1 capitalize">{referral.status}</span>
                    </Badge>
                    
                    {referral.status === 'completed' && (
                      <div className="text-right">
                        <p className="font-semibold text-green-600">${referral.rewardAmount}</p>
                        <p className="text-xs text-gray-500">Earned</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewards Program */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-mtendere-blue flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Rewards Program
          </CardTitle>
          <CardDescription>Special milestones and bonus rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bronze Tier */}
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-amber-600" />
              </div>
              <h4 className="font-semibold text-amber-700 mb-2">Bronze Member</h4>
              <p className="text-sm text-gray-600 mb-3">1-4 successful referrals</p>
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                $50 per referral
              </Badge>
            </div>

            {/* Silver Tier */}
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-gray-600" />
              </div>
              <h4 className="font-semibold text-gray-700 mb-2">Silver Member</h4>
              <p className="text-sm text-gray-600 mb-3">5-9 successful referrals</p>
              <Badge variant="outline" className="border-gray-300 text-gray-700">
                $75 per referral
              </Badge>
            </div>

            {/* Gold Tier */}
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <h4 className="font-semibold text-yellow-700 mb-2">Gold Member</h4>
              <p className="text-sm text-gray-600 mb-3">10+ successful referrals</p>
              <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                $100 per referral
              </Badge>
            </div>
          </div>

          {/* Progress to Next Tier */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-blue-700">Progress to Silver</span>
              <span className="text-sm text-blue-600">{completedReferrals}/5 referrals</span>
            </div>
            <Progress value={(completedReferrals / 5) * 100} className="h-2" />
            <p className="text-sm text-blue-600 mt-2">
              {5 - completedReferrals} more successful referrals to unlock Silver tier rewards!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
