import { useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch } from "@/lib/queryClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users as UsersIcon, FileText, GraduationCap, Briefcase, Building2, BookOpen, BarChart2 } from "lucide-react";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/dashboard/stats"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const contentData = stats ? [
    { name: "Scholarships", total: stats.totalScholarships || 0, published: stats.activeScholarships || 0, draft: Math.max(0, (stats.totalScholarships || 0) - (stats.activeScholarships || 0)) },
    { name: "Jobs", total: stats.totalJobs || 0, published: stats.activeJobs || 0, draft: Math.max(0, (stats.totalJobs || 0) - (stats.activeJobs || 0)) },
    { name: "Blog Posts", total: stats.totalBlogPosts || 0, published: stats.publishedPosts || 0, draft: Math.max(0, (stats.totalBlogPosts || 0) - (stats.publishedPosts || 0)) },
    { name: "Partners", total: stats.totalPartners || 0, published: stats.totalPartners || 0, draft: 0 },
  ] : [];

  const applicationPieData = stats ? [
    { name: "Pending", value: stats.applicationStats?.pending || 0 },
    { name: "Approved", value: stats.applicationStats?.approved || 0 },
    { name: "Rejected", value: stats.applicationStats?.rejected || 0 },
    { name: "Waitlisted", value: stats.applicationStats?.waitlisted || 0 },
  ].filter(d => d.value > 0) : [];

  const kpiCards = [
    { title: "Total Users", value: stats?.totalUsers ?? 0, icon: <UsersIcon className="h-5 w-5" />, color: "bg-primary" },
    { title: "Active Scholarships", value: stats?.activeScholarships ?? 0, icon: <GraduationCap className="h-5 w-5" />, color: "bg-success" },
    { title: "Open Jobs", value: stats?.activeJobs ?? 0, icon: <Briefcase className="h-5 w-5" />, color: "bg-warning" },
    { title: "Total Applications", value: stats?.totalApplications ?? 0, icon: <FileText className="h-5 w-5" />, color: "bg-info" },
    { title: "Partners", value: stats?.totalPartners ?? 0, icon: <Building2 className="h-5 w-5" />, color: "bg-accent" },
    { title: "Blog Posts", value: stats?.publishedPosts ?? 0, icon: <BookOpen className="h-5 w-5" />, color: "bg-chart-4" },
  ];

  return (
    <div className="space-y-6">
      <SEO
        title="Analytics Dashboard"
        description="Comprehensive insights into platform performance and user engagement."
      />

      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-primary to-chart-4 rounded-lg">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Real-time insights from your platform data</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              {isLoading ? <Skeleton className="h-16 w-full" /> : (
                <>
                  <div className={`w-8 h-8 rounded-lg ${kpi.color} flex items-center justify-center text-white mb-2`}>
                    {kpi.icon}
                  </div>
                  <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.title}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              Content by Category
            </CardTitle>
            <CardDescription>Published vs total content in each category</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-72 w-full" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={contentData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Bar dataKey="published" name="Published" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="draft" name="Draft" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Status Breakdown</CardTitle>
            <CardDescription>Distribution of all submitted applications</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-72 w-full" /> : applicationPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={applicationPieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {applicationPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground/70">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No applications submitted yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Summary</CardTitle>
          <CardDescription>Complete overview of all content and engagement metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40 w-full" /> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Content Items", value: (stats?.totalScholarships || 0) + (stats?.totalJobs || 0) + (stats?.totalPartners || 0), badge: "All" },
                { label: "Pending Applications", value: stats?.pendingApplications || 0, badge: "Needs Action", badgeColor: "bg-warning/15 text-warning" },
                { label: "Published Content", value: (stats?.activeScholarships || 0) + (stats?.activeJobs || 0) + (stats?.publishedPosts || 0), badge: "Live" },
                { label: "Active Chats", value: stats?.totalActiveChats || 0, badge: "AI" },
              ].map(({ label, value, badge, badgeColor }) => (
                <div key={label} className="p-4 rounded-lg border bg-muted/40 text-center">
                  <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
                  <p className="text-sm text-muted-foreground mb-2">{label}</p>
                  <Badge className={badgeColor || "bg-primary/10 text-primary"}>{badge}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



