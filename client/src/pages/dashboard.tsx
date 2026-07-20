import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link, useLocation } from "wouter";
import ApplicationTracker from "@/components/user/application-tracker";
import ReferralSystem from "@/components/user/referral-system";
import CheckoutButton from "@/components/user/checkout-button";
import ProfileSettingsDialog from "@/components/user/profile-settings-dialog";
import ExpandingNav from "@/components/expanding-nav";
import type { ApiApplication, ApiReferralDashboard } from "@/lib/api-types";
import { getProfileCompletion } from "@/lib/profile-completion";
import {
  User,
  FileText,
  Briefcase,
  Plus,
  Search,
  Users,
  Award,
  TrendingUp,
} from "lucide-react";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: applications } = useQuery<ApiApplication[]>({
    queryKey: ["/api/applications"],
    enabled: !!user,
  });

  const { data: referralDashboard } = useQuery<ApiReferralDashboard>({
    queryKey: ["/api/referrals/me"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mtendere-gray flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const completedApplications = applications?.filter((app) => app.status === "approved").length || 0;
  const pendingApplications = applications?.filter((app) => app.status === "pending").length || 0;
  const totalReferrals = referralDashboard?.stats.signups || 0;

  const profileCompletionDetails = getProfileCompletion(user);
  const profileCompletion = profileCompletionDetails.percent;
  const missingProfileLabels = profileCompletionDetails.missingItems.map((item) => item.label);
  const userInitials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "ME";

  return (
    <div className="min-h-screen bg-mtendere-gray">
      <ExpandingNav />

      {/* Header Section */}
      <section className="bg-gradient-to-r from-mtendere-blue to-mtendere-green py-16 text-white">
        <div className="container mx-auto px-4">
          <div className="hero-panel flex flex-col items-center gap-6 rounded-3xl p-6 md:flex-row md:p-8">
            <Avatar className="h-20 w-20 flex-shrink-0 border border-white/20 bg-white/20 shadow-lg shadow-black/10">
              <AvatarImage src={user.profilePicture || ""} alt={`${user.firstName} ${user.lastName}`} />
              <AvatarFallback className="bg-white/20 text-xl font-bold text-white">
                {user.profilePicture ? <User className="h-10 w-10" /> : userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold">Welcome back, {user.firstName}!</h1>
              <p className="text-xl opacity-90 mt-1">{user.role === "user" ? "Student" : user.role}</p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  Profile {profileCompletion}% Complete
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  {applications?.length || 0} Applications
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Applications</p>
                      <p className="text-2xl font-bold text-mtendere-blue">{applications?.length || 0}</p>
                    </div>
                    <FileText className="w-8 h-8 text-mtendere-blue" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Approved</p>
                      <p className="text-2xl font-bold text-mtendere-green">{completedApplications}</p>
                    </div>
                    <Award className="w-8 h-8 text-mtendere-green" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-mtendere-orange">{pendingApplications}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-mtendere-orange" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Referrals</p>
                      <p className="text-2xl font-bold text-mtendere-blue">{totalReferrals}</p>
                    </div>
                    <Users className="w-8 h-8 text-mtendere-blue" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Application Tracker */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">Application Status</CardTitle>
                <CardDescription>Track your scholarship and job applications</CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationTracker applications={applications || []} />
              </CardContent>
            </Card>

            {/* Referral System */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">Referral Program</CardTitle>
                <CardDescription>Earn rewards by referring friends to Mtendere</CardDescription>
              </CardHeader>
              <CardContent>
                <ReferralSystem dashboard={referralDashboard} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Completion */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">Profile Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-semibold mb-2">
                      <span>Profile Progress</span>
                      <span>{profileCompletion}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-3" />
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {missingProfileLabels.length > 0
                      ? `Add ${missingProfileLabels.slice(0, 3).join(", ")}${missingProfileLabels.length > 3 ? ", and more" : ""} to finish your profile.`
                      : "Your profile is complete and ready for applications."}
                  </p>

                  <ProfileSettingsDialog user={user}>
                    <Button className="w-full" variant="outline">
                      {profileCompletion === 100 ? "Manage Profile" : "Complete Profile"}
                    </Button>
                  </ProfileSettingsDialog>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">Secure Checkout</CardTitle>
                <CardDescription>Application support deposit</CardDescription>
              </CardHeader>
              <CardContent>
                <CheckoutButton />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full bg-mtendere-blue hover:bg-mtendere-blue/90">
                  <Link href="/scholarships">
                    <Plus className="w-4 h-4 mr-2" />
                    New Application
                  </Link>
                </Button>

                <Button asChild className="w-full bg-mtendere-green hover:bg-mtendere-green/90">
                  <Link href="/scholarships">
                    <Search className="w-4 h-4 mr-2" />
                    Find Scholarships
                  </Link>
                </Button>

                <Button asChild className="w-full bg-mtendere-orange hover:bg-mtendere-orange/90">
                  <Link href="/jobs">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Browse Jobs
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white"
                >
                  <Link href="/referrals">
                    <Users className="w-4 h-4 mr-2" />
                    Refer a Friend
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications?.slice(0, 3).map((application) => (
                    <div key={application.id} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-mtendere-blue rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Applied for {application.type}</p>
                        <p className="text-xs text-muted-foreground">Status: {application.status}</p>
                      </div>
                    </div>
                  ))}

                  {(!applications || applications.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

