import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AnalyticsDashboard from "@/components/admin/analytics-dashboard";
import ContentManager from "@/components/admin/content-manager";
import EventManager from "@/components/admin/event-manager";
import SubscriberManager from "@/components/admin/subscriber-manager";
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
  CalendarDays,
  TrendingUp,
  Eye,
  Settings,
  Bell,
  Mail
} from "lucide-react";

type AdminView = 'dashboard' | 'analytics' | 'events' | 'scholarships' | 'jobs' | 'users' | 'blog-posts' | 'testimonials' | 'partners' | 'team-members' | 'subscribers';

export default function Admin() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: analytics } = useQuery<any>({
    queryKey: ["/api/analytics/summary"],
    enabled: !!user && (user.role === 'admin' || user.role === 'super_admin'),
  });

  const { data: recentActivity } = useQuery<any[]>({
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
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
      case 'events':
        return <EventManager />;
      case 'subscribers':
        return <SubscriberManager />;
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
            <div className="bg-card rounded-lg border border-border/60 shadow-soft p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-mtendere-blue">
                    Admin Dashboard
                  </h1>
                  <p className="text-muted-foreground">
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
                      <p className="text-sm text-muted-foreground">Total Users</p>
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
                      <p className="text-sm text-muted-foreground">Applications</p>
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
                      <p className="text-sm text-muted-foreground">Events</p>
                      <p className="text-2xl font-bold text-mtendere-orange">
                        {analytics?.totalEvents || 0}
                      </p>
                    </div>
                    <CalendarDays className="w-8 h-8 text-mtendere-orange" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Subscribers</p>
                      <p className="text-2xl font-bold text-mtendere-blue">
                        {analytics?.totalSubscribers || 0}
                      </p>
                    </div>
                    <Mail className="w-8 h-8 text-mtendere-blue" />
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
                          <p className="text-xs text-muted-foreground">
                            {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Just now'}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {(!recentActivity || recentActivity.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-8">
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
                    className="w-full bg-mtendere-blue hover:bg-mtendere-blue/90" 
                    onClick={() => setActiveView('events')}
                  >
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Manage Events
                  </Button>

                  <Button 
                    className="w-full bg-mtendere-blue hover:bg-mtendere-blue/90" 
                    onClick={() => setActiveView('scholarships')}
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Manage Scholarships
                  </Button>
                  
                  <Button 
                    className="w-full bg-mtendere-green hover:bg-mtendere-green/90" 
                    onClick={() => setActiveView('jobs')}
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Manage Jobs
                  </Button>
                  
                  <Button 
                    className="w-full bg-mtendere-orange hover:bg-mtendere-orange/90" 
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

                  <Button
                    variant="outline"
                    className="w-full border-mtendere-green text-mtendere-green hover:bg-mtendere-green hover:text-white"
                    onClick={() => setActiveView('subscribers')}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Manage Subscribers
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AdminSidebar 
        activeView={activeView}
        onViewChange={(view) => setActiveView(view as AdminView)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Mobile Header */}
        <div className="lg:hidden bg-card/90 backdrop-blur shadow-sm border-b border-border/60 p-4">
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

