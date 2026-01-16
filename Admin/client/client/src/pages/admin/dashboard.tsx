import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatsCard from "@/components/admin/StatsCard";
import AnalyticsChart from "@/components/admin/AnalyticsChart";
import DataTable from "@/components/admin/DataTable";
import MotivationalModal from "@/components/admin/MotivationalModal";
import { useDashboardStats, useRecentActivity } from "@/hooks/use-admin";
import {
  Users,
  GraduationCap,
  Briefcase,
  FileText,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from "lucide-react";

export default function AdminDashboard() {
  const [showMotivation, setShowMotivation] = useState(true);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMotivation(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const chartData = [
    { name: "Jan", value: 45 },
    { name: "Feb", value: 52 },
    { name: "Mar", value: 61 },
    { name: "Apr", value: 58 },
    { name: "May", value: 67 },
    { name: "Jun", value: 74 },
  ];

  const applicationStatusData = [
    { name: "Pending", value: stats?.applicationStats?.pending || 0 },
    { name: "Approved", value: stats?.applicationStats?.approved || 0 },
    { name: "Rejected", value: stats?.applicationStats?.rejected || 0 },
  ];

  const recentColumns = [
    { key: 'action', header: 'Action' },
    { key: 'entityType', header: 'Type' },
    { key: 'details', header: 'Details' },
    {
      key: 'createdAt',
      header: 'Time',
      render: (value: any) => new Date(value).toLocaleString()
    },
  ];

  return (
    <div className="space-y-6">
      <MotivationalModal 
        open={showMotivation} 
        onOpenChange={setShowMotivation}
      />

      {/* Page Header */}
      <div className="animate-slideInDown">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <Sparkles className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back! Here's what's happening with your platform.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideInUp">
        <style>{`
          .grid > :nth-child(1) { animation: slideInUp 0.5s ease-out 0.1s both; }
          .grid > :nth-child(2) { animation: slideInUp 0.5s ease-out 0.2s both; }
          .grid > :nth-child(3) { animation: slideInUp 0.5s ease-out 0.3s both; }
          .grid > :nth-child(4) { animation: slideInUp 0.5s ease-out 0.4s both; }
        `}</style>
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          description="Active registered users"
          icon={<Users className="h-5 w-5" />}
          trend={{
            value: 12,
            period: "this month",
            isPositive: true,
          }}
          loading={statsLoading}
        />

        <StatsCard
          title="Active Scholarships"
          value={stats?.activeScholarships || 0}
          description="Currently available"
          icon={<GraduationCap className="h-5 w-5" />}
          trend={{
            value: 5,
            period: "new this week",
            isPositive: true,
          }}
          loading={statsLoading}
        />

        <StatsCard
          title="Job Opportunities"
          value={stats?.activeJobs || 0}
          description="Open positions"
          icon={<Briefcase className="h-5 w-5" />}
          trend={{
            value: 8,
            period: "added recently",
            isPositive: true,
          }}
          loading={statsLoading}
        />

        <StatsCard
          title="Applications"
          value={stats?.totalApplications || 0}
          description="Total submissions"
          icon={<FileText className="h-5 w-5" />}
          trend={{
            value: 23,
            period: "this month",
            isPositive: true,
          }}
          loading={statsLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="User Growth"
          data={chartData}
          type="line"
          height={300}
        />

        <AnalyticsChart
          title="Application Status"
          data={applicationStatusData}
          type="pie"
          height={300}
        />
      </div>

      {/* Recent Activity and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Table */}
        <div className="lg:col-span-2">
          <DataTable
            title="Recent Activity"
            data={stats?.recentActivity || []}
            columns={recentColumns}
            pagination={{
              page: 1,
              limit: 10,
              total: stats?.recentActivity?.length || 0,
              onPageChange: () => {},
              onLimitChange: () => {},
            }}
            loading={activityLoading}
          />
        </div>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>System Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Response</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Normal
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">File Uploads</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>Alerts</span>
              </CardTitle>
              <CardDescription>
                Important notifications that need attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Pending Reviews
                    </p>
                    <p className="text-xs text-yellow-600">
                      {stats?.pendingApplications || 0} applications need review
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex">
                  <TrendingUp className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      High Activity
                    </p>
                    <p className="text-xs text-blue-600">
                      Traffic increased by 25% this week
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      All Systems Operational
                    </p>
                    <p className="text-xs text-green-600">
                      No issues detected
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}