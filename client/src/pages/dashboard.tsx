import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  CheckCircle2,
  Circle,
} from "lucide-react";

const isFilled = (value?: string | null) => typeof value === "string" && value.trim().length > 0;

const hasValidDate = (value?: string | null) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

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
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, setLocation, user]);

  const profileChecklist = useMemo(
    () => [
      { key: "firstName", label: "First name", complete: isFilled(user?.firstName) },
      { key: "lastName", label: "Last name", complete: isFilled(user?.lastName) },
      { key: "email", label: "Email", complete: isFilled(user?.email) },
      { key: "username", label: "Username", complete: isFilled(user?.username) },
      { key: "phone", label: "Phone number", complete: isFilled(user?.phone) },
      { key: "dateOfBirth", label: "Date of birth", complete: hasValidDate(user?.dateOfBirth) },
      { key: "profilePicture", label: "Profile picture", complete: isFilled(user?.profilePicture) },
    ],
    [user],
  );

  const completedProfileFields = profileChecklist.filter((field) => field.complete).length;
  const profileCompletion = Math.round((completedProfileFields / profileChecklist.length) * 100);
  const missingProfileFields = profileChecklist.filter((field) => !field.complete).map((field) => field.label);

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

  if (!user) {
    return null;
  }

  const completedApplications =
    applications?.filter((app) => ["approved", "accepted"].includes(app.status.toLowerCase())).length || 0;
  const pendingApplications =
    applications?.filter((app) => ["pending", "under review"].includes(app.status.toLowerCase())).length || 0;
  const totalReferrals = referrals?.length || 0;

  const openProfileChecklist = () => {
    if (missingProfileFields.length === 0) {
      toast({
        title: "Profile complete",
        description: "All profile fields are complete. You are ready to apply.",
      });
      return;
    }

    toast({
      title: "Complete your profile",
      description: `Missing: ${missingProfileFields.join(", ")}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-mtendere-gray/40">
      <ExpandingNav />

      <section className="bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10" />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold">Welcome back, {user.firstName}!</h1>
              <p className="text-lg opacity-90 mt-1 capitalize">{user.role === "user" ? "Student" : user.role}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  Profile {profileCompletion}% Complete
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  {applications?.length || 0} Applications
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  {totalReferrals} Referrals
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-border/60 shadow-sm">
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

              <Card className="border-border/60 shadow-sm">
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

              <Card className="border-border/60 shadow-sm">
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

              <Card className="border-border/60 shadow-sm">
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

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">Application Status</CardTitle>
                <CardDescription>Track your scholarship and job applications</CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationTracker applications={applications || []} />
              </CardContent>
            </Card>

            <Card id="referral-program" className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">Referral Program</CardTitle>
                <CardDescription>Earn rewards by referring friends to Mtendere</CardDescription>
              </CardHeader>
              <CardContent>
                <ReferralSystem referrals={referrals || []} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">Profile Completion</CardTitle>
                <CardDescription>
                  {completedProfileFields}/{profileChecklist.length} fields completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-semibold mb-2">
                      <span>Profile Progress</span>
                      <span>{profileCompletion}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-3 bg-mtendere-blue/10" />
                  </div>

                  <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                    {profileChecklist.map((field) => (
                      <div key={field.key} className="flex items-center justify-between text-sm">
                        <span className="text-foreground/85">{field.label}</span>
                        <span className={field.complete ? "text-mtendere-green" : "text-muted-foreground"}>
                          {field.complete ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full" variant="outline" onClick={openProfileChecklist}>
                    View Missing Fields
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
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
                  variant="outline"
                  className="w-full border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white"
                  onClick={() =>
                    document.getElementById("referral-program")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  <Users className="w-4 h-4 mr-2" />
                  Refer a Friend
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
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
                        <p className="text-xs text-muted-foreground capitalize">Status: {application.status}</p>
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
