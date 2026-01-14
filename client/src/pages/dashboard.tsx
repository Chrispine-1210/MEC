import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link, useLocation } from "wouter";
import ApplicationTracker from "@/components/user/application-tracker";
import ReferralSystem from "@/components/user/referral-system";
import ExpandingNav from "@/components/expanding-nav";
import { 
  User, 
  FileText, 
  GraduationCap, 
  Briefcase, 
  Star,
  Plus,
  Search,
  Users,
  Award,
  TrendingUp
} from "lucide-react";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: applications } = useQuery({
    queryKey: ["/api/applications"],
    enabled: !!user,
  });

  const { data: referrals } = useQuery({
    queryKey: ["/api/referrals"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mtendere-gray flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const completedApplications = applications?.filter(app => app.status === "approved").length || 0;
  const pendingApplications = applications?.filter(app => app.status === "pending").length || 0;
  const totalReferrals = referrals?.length || 0;
  const completedReferrals = referrals?.filter(ref => ref.status === "completed").length || 0;
  const profileCompletion = 85; // This would be calculated based on filled profile fields

  return (
    <div className="min-h-screen bg-mtendere-gray">
      <ExpandingNav />
      
      {/* Header Section */}
      <section className="bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <User className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                Welcome back, {user.firstName}!
              </h1>
              <p className="text-xl opacity-90">{user.role === 'user' ? 'Student' : user.role}</p>
              <div className="flex items-center space-x-4 mt-3">
                <Badge variant="secondary" className="bg-white bg-opacity-20 text-white">
                  Profile {profileCompletion}% Complete
                </Badge>
                <Badge variant="secondary" className="bg-white bg-opacity-20 text-white">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Applications</p>
                      <p className="text-2xl font-bold text-mtendere-blue">
                        {applications?.length || 0}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-mtendere-blue" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-mtendere-green">
                        {completedApplications}
                      </p>
                    </div>
                    <Award className="w-8 h-8 text-mtendere-green" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-mtendere-orange">
                        {pendingApplications}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-mtendere-orange" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Referrals</p>
                      <p className="text-2xl font-bold text-mtendere-blue">
                        {totalReferrals}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-mtendere-blue" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Application Tracker */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">
                  Application Status
                </CardTitle>
                <CardDescription>
                  Track your scholarship and job applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationTracker applications={applications || []} />
              </CardContent>
            </Card>

            {/* Referral System */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">
                  Referral Program
                </CardTitle>
                <CardDescription>
                  Earn rewards by referring friends to Mtendere
                </CardDescription>
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
                <CardTitle className="text-lg text-mtendere-blue">
                  Profile Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Profile Progress</span>
                      <span>{profileCompletion}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-2" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Complete your profile to increase your chances of success
                  </p>
                  <Button className="w-full" variant="outline">
                    Complete Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full bg-mtendere-blue hover:bg-blue-700">
                  <Link href="/scholarships">
                    <Plus className="w-4 h-4 mr-2" />
                    New Application
                  </Link>
                </Button>
                
                <Button asChild className="w-full bg-mtendere-green hover:bg-green-700">
                  <Link href="/scholarships">
                    <Search className="w-4 h-4 mr-2" />
                    Find Scholarships
                  </Link>
                </Button>
                
                <Button asChild className="w-full bg-mtendere-orange hover:bg-orange-600">
                  <Link href="/jobs">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Browse Jobs
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white">
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
                <CardTitle className="text-lg text-mtendere-blue">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications?.slice(0, 3).map((application) => (
                    <div key={application.id} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-mtendere-blue rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Applied for {application.type}
                        </p>
                        <p className="text-xs text-gray-500">
                          Status: {application.status}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {(!applications || applications.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No recent activity
                    </p>
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
