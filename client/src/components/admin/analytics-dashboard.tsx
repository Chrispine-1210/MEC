import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Filter
} from "lucide-react";

export default function AnalyticsDashboard() {
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ["/api/analytics/summary"],
  });

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["/api/analytics"],
  });

  const handleRefresh = () => {
    refetchSummary();
    refetchAnalytics();
  };

  const getEventCounts = () => {
    if (!analytics) return {};
    
    const counts: Record<string, number> = {};
    analytics.forEach((event: any) => {
      counts[event.event] = (counts[event.event] || 0) + 1;
    });
    
    return counts;
  };

  const getRecentActivity = () => {
    if (!analytics) return [];
    
    return analytics
      .slice(0, 10)
      .map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      }));
  };

  const getPopularPages = () => {
    const events = getEventCounts();
    return Object.entries(events)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const formatEventName = (event: string) => {
    return event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (summaryLoading || analyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-mtendere-blue">Analytics Dashboard</h1>
          <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="bg-gray-200 h-4 w-20 rounded"></div>
                  <div className="bg-gray-200 h-8 w-16 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const eventCounts = getEventCounts();
  const recentActivity = getRecentActivity();
  const popularPages = getPopularPages();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-mtendere-blue">Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time insights into user activity and platform performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-mtendere-blue hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-mtendere-blue">
                  {summary?.totalUsers || 0}
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
                  {summary?.totalApplications || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-mtendere-green" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-mtendere-orange">
                  {analytics?.length || 0}
                </p>
              </div>
              <Activity className="w-8 h-8 text-mtendere-orange" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-mtendere-blue">
                  {Object.keys(eventCounts).length}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-mtendere-blue" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-mtendere-blue">Event Activity</CardTitle>
            <CardDescription>Most popular user actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popularPages.map(([event, count]) => (
                <div key={event} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-mtendere-blue bg-opacity-10 rounded-full flex items-center justify-center">
                      <Activity className="w-4 h-4 text-mtendere-blue" />
                    </div>
                    <span className="font-medium">{formatEventName(event)}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              
              {popularPages.length === 0 && (
                <p className="text-center text-gray-500 py-8">No activity data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-mtendere-blue">Recent Activity</CardTitle>
            <CardDescription>Latest user interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <div key={activity.id || index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-mtendere-green rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {formatEventName(activity.event)}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {activity.userId ? `User ID: ${activity.userId}` : 'Anonymous'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {activity.metadata && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {JSON.stringify(activity.metadata)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {recentActivity.length === 0 && (
                <p className="text-center text-gray-500 py-8">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-mtendere-blue">Detailed Analytics</CardTitle>
              <CardDescription>Comprehensive breakdown of platform metrics</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-mtendere-blue">Content Metrics</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Scholarships:</span>
                  <span className="font-medium">{summary?.totalScholarships || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Jobs:</span>
                  <span className="font-medium">{summary?.totalJobs || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Published Blogs:</span>
                  <span className="font-medium">{summary?.publishedBlogPosts || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Approved Testimonials:</span>
                  <span className="font-medium">{summary?.activeTestimonials || 0}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-mtendere-green">User Engagement</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>User Registrations:</span>
                  <span className="font-medium">{eventCounts['user_registered'] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Login Sessions:</span>
                  <span className="font-medium">{eventCounts['user_logged_in'] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Applications Submitted:</span>
                  <span className="font-medium">{eventCounts['application_submitted'] || 0}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-mtendere-orange">Performance</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="font-medium text-green-600">95%</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg. Response Time:</span>
                  <span className="font-medium">1.2s</span>
                </div>
                <div className="flex justify-between">
                  <span>System Uptime:</span>
                  <span className="font-medium text-green-600">99.9%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
