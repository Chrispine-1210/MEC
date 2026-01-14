import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AnalyticsDashboard from "@/components/admin/analytics-dashboard";
import ContentManager from "@/components/admin/content-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  FileText, 
  GraduationCap, 
  Briefcase,
  Activity,
  TrendingUp,
  Eye,
  Settings,
  Bell
} from "lucide-react";

type AdminView = 'dashboard' | 'analytics' | 'scholarships' | 'jobs' | 'users' | 'blog-posts' | 'testimonials' | 'partners' | 'team-members';

export default function Admin() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics/summary"],
    enabled: !!user && (user.role === 'admin' || user.role === 'super_admin'),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/analytics"],
    enabled: !!user && (user.role === 'admin' || user.role === 'super_admin'),
  });

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'admin' && user.role !== 'super_admin'))) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mtendere-gray flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'scholarships':
      case 'jobs':
      case 'users':
      case 'blog-posts':
      case 'testimonials':
      case 'partners':
      case 'team-members':
        return <ContentManager contentType={activeView} />;
      default:
        return (
          <div className="space-y-8">
            {/* Admin Header */}
            <div className="bg-white rounded-lg shadow-soft p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-mtendere-blue">
                    Admin Dashboard
                  </h1>
                  <p className="text-gray-600">
                    Welcome back, {user.firstName}. Here's what's happening.
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge className="bg-mtendere-green text-white">
                    <Activity className="w-3 h-3 mr-1" />
                    LIVE
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Bell className="w-4 h-4 mr-2" />
                    Notifications
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-mtendere-blue">
                        {analytics?.totalUsers || 0}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-mtendere-blue" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Applications</p>
                      <p className="text-2xl font-bold text-mtendere-green">
                        {analytics?.totalApplications || 0}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-mtendere-green" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Scholarships</p>
                      <p className="text-2xl font-bold text-mtendere-orange">
                        {analytics?.totalScholarships || 0}
                      </p>
                    </div>
                    <GraduationCap className="w-8 h-8 text-mtendere-orange" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Job Openings</p>
                      <p className="text-2xl font-bold text-mtendere-blue">
                        {analytics?.totalJobs || 0}
                      </p>
                    </div>
                    <Briefcase className="w-8 h-8 text-mtendere-blue" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-mtendere-blue">
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Latest user interactions and system events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {recentActivity?.slice(0, 10).map((activity, index) => (
                      <div key={activity.id || index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-mtendere-green rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {activity.event?.replace(/_/g, ' ').toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Just now'}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {(!recentActivity || recentActivity.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No recent activity
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-mtendere-blue">
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Common administrative tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full bg-mtendere-blue hover:bg-blue-700" 
                    onClick={() => setActiveView('scholarships')}
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Manage Scholarships
                  </Button>
                  
                  <Button 
                    className="w-full bg-mtendere-green hover:bg-green-700" 
                    onClick={() => setActiveView('jobs')}
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Manage Jobs
                  </Button>
                  
                  <Button 
                    className="w-full bg-mtendere-orange hover:bg-orange-600" 
                    onClick={() => setActiveView('users')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white"
                    onClick={() => setActiveView('analytics')}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-mtendere-gray flex">
      {/* Sidebar */}
      <AdminSidebar 
        activeView={activeView}
        onViewChange={setActiveView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b p-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Content Area */}
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
