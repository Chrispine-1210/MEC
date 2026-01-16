import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  const data = [
    { month: "Jan", scholarships: 40, jobs: 24, applications: 24 },
    { month: "Feb", scholarships: 30, jobs: 13, applications: 22 },
    { month: "Mar", scholarships: 20, jobs: 98, applications: 29 },
    { month: "Apr", scholarships: 27, jobs: 39, applications: 20 },
    { month: "May", scholarships: 18, jobs: 48, applications: 21 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Users</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">1,234</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Applications</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">567</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Conversion Rate</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">45.2%</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Activity Trends</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="scholarships" fill="#3b82f6" />
              <Bar dataKey="jobs" fill="#10b981" />
              <Bar dataKey="applications" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
