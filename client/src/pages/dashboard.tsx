import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link, useLocation } from "wouter";
import ApplicationTracker from "@/components/user/application-tracker";
import ReferralSystem from "@/components/user/referral-system";
import ExpandingNav from "@/components/expanding-nav";
import type { ApiApplication, ApiReferral } from "@/lib/api-types";
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
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: applications } = useQuery<ApiApplication[]>({
    queryKey: ["/api/applications"],
    enabled: !!user,
  });

  const { data: referrals } = useQuery<ApiReferral[]>({
    queryKey: ["/api/referrals"],
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
  const totalReferrals = referrals?.length || 0;

  // Calculate real profile completion from available user fields
  const profileFields = [
    user?.firstName,
    user?.lastName,
    user?.email,
    user?.username,
    user?.phone,
    user?.dateOfBirth,
    user?.profilePicture,
  ];
  const filledFields = profileFields.filter(Boolean).length;
  const profileCompletion = Math.round((filledFields / profileFields.length) * 100);

  return (
    <div className="min-h-screen bg-mtendere-gray">
      <ExpandingNav />

      {/* Header Section */}
      <section className="bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10" />
            </div>
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
                <ReferralSystem referrals={referrals || []} />
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
                    Complete your profile to increase your chances of success
                  </p>

                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() =>
                      toast({
                        title: "Profile Settings",
                        description:
                          "Profile editing will be available in the next update. Fill in your phone, date of birth, and profile picture to reach 100%.",
                      })
                    }
                  >
                    Complete Profile
                  </Button>
                </div>
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

