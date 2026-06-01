import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Building2,
  BookOpen,
  CalendarDays,
  Clock,
  BarChart3,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function StatCard({ title, value, description, icon, color = "blue", loading }: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  color?: string;
  loading?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: "from-primary to-primary/80",
    green: "from-success to-success/80",
    amber: "from-warning to-warning/80",
    purple: "from-chart-4 to-chart-4/80",
    rose: "from-chart-5 to-chart-5/80",
    teal: "from-accent to-accent/80",
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-0">
        <div className="flex items-center">
          <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.blue} p-5 flex items-center justify-center`}>
            <div className="text-white">{icon}</div>
          </div>
          <div className="p-4 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/dashboard/stats"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30000,
  });
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });
  const displayName = user?.firstName || user?.username || "there";

  const applicationChartData = stats ? [
    { name: "Pending", value: stats.applicationStats?.pending || 0, fill: "hsl(var(--chart-3))" },
    { name: "Approved", value: stats.applicationStats?.approved || 0, fill: "hsl(var(--chart-2))" },
    { name: "Rejected", value: stats.applicationStats?.rejected || 0, fill: "hsl(var(--destructive))" },
    { name: "Waitlisted", value: stats.applicationStats?.waitlisted || 0, fill: "hsl(var(--chart-4))" },
  ].filter(d => d.value > 0) : [];

  const contentBarData = stats ? [
    { name: "Scholarships", total: stats.totalScholarships || 0, published: stats.activeScholarships || 0 },
    { name: "Jobs", total: stats.totalJobs || 0, published: stats.activeJobs || 0 },
    { name: "Events", total: stats.totalEvents || 0, published: stats.publishedEvents || 0 },
    { name: "Blog Posts", total: stats.totalBlogPosts || 0, published: stats.publishedPosts || 0 },
    { name: "Partners", total: stats.totalPartners || 0, published: stats.totalPartners || 0 },
  ] : [];

  return (
    <div className="space-y-6">
      <SEO
        title="Admin Dashboard"
        description="Overview of Mtendere Education Platform management, stats, and activities."
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-chart-4 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-7 w-7 animate-pulse" />
          <h1 className="text-2xl font-bold">{greeting}, {displayName}!</h1>
        </div>
        <p className="text-primary-foreground/80">Here's what's happening on the Mtendere Education Platform today.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {stats?.pendingApplications > 0 && (
            <Badge className="bg-card/20 text-white border-white/30 hover:bg-card/30">
              <Clock className="h-3 w-3 mr-1" />
              {stats.pendingApplications} pending reviews
            </Badge>
          )}
          <Badge className="bg-card/20 text-white border-white/30">
            <Activity className="h-3 w-3 mr-1" />
            System Operational
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="xl:col-span-2">
          <StatCard title="Total Users" value={stats?.totalUsers ?? 0} description="Registered accounts" icon={<Users className="h-6 w-6" />} color="blue" loading={isLoading} />
        </div>
        <div className="xl:col-span-2">
          <StatCard title="Active Scholarships" value={stats?.activeScholarships ?? 0} description={`of ${stats?.totalScholarships ?? 0} total`} icon={<GraduationCap className="h-6 w-6" />} color="green" loading={isLoading} />
        </div>
        <div className="xl:col-span-2">
          <StatCard title="Open Jobs" value={stats?.activeJobs ?? 0} description={`of ${stats?.totalJobs ?? 0} total`} icon={<Briefcase className="h-6 w-6" />} color="amber" loading={isLoading} />
        </div>
        <div className="xl:col-span-2">
          <StatCard title="Applications" value={stats?.totalApplications ?? 0} description={`${stats?.pendingApplications ?? 0} pending review`} icon={<FileText className="h-6 w-6" />} color="purple" loading={isLoading} />
        </div>
        <div className="xl:col-span-2">
          <StatCard title="Events" value={stats?.totalEvents ?? 0} description={`${stats?.eventRegistrations ?? 0} registrations`} icon={<CalendarDays className="h-6 w-6" />} color="blue" loading={isLoading} />
        </div>
        <div className="xl:col-span-2">
          <StatCard title="Partners" value={stats?.totalPartners ?? 0} description="Partner institutions" icon={<Building2 className="h-6 w-6" />} color="teal" loading={isLoading} />
        </div>
        <div className="xl:col-span-2">
          <StatCard title="Blog Posts" value={stats?.publishedPosts ?? 0} description="Published articles" icon={<BookOpen className="h-6 w-6" />} color="rose" loading={isLoading} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Content Overview
            </CardTitle>
            <CardDescription>Total vs published content by category</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={contentBarData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="published" name="Published" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-success" />
              Application Status
            </CardTitle>
            <CardDescription>Distribution of application statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : applicationChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={applicationChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {applicationChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground/70">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No applications yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-info" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest admin actions across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : stats?.recentActivity?.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentActivity.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-primary/100 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.action} - {item.entityType}</p>
                        <p className="text-xs text-muted-foreground/70">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground/70">
                  <div className="text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No recent activity yet</p>
                    <p className="text-xs">Actions will appear here after you create content</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Status & Alerts */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "API Server", status: "Online" },
                { label: "File Storage", status: "Active" },
                { label: "Authentication", status: "Secure" },
              ].map(({ label, status }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <Badge className="bg-success/15 text-success text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats?.pendingApplications > 0 && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-xs font-medium text-warning">
                    {stats.pendingApplications} application{stats.pendingApplications !== 1 ? "s" : ""} need review
                  </p>
                </div>
              )}
              <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                <p className="text-xs font-medium text-success">All systems operational</p>
              </div>
              {stats?.totalUsers === 0 && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <p className="text-xs font-medium text-primary">Add content to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




