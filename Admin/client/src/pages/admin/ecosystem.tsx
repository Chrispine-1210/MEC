import { useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

type EcosystemModule = {
  id: string;
  name: string;
  total: number;
  active: number;
  workflowItems: number;
  risk: number;
};

type EcosystemOverview = {
  generatedAt: string;
  totals: {
    totalRecords: number;
    activeRecords: number;
    workflowItems: number;
    riskItems: number;
  };
  modules: EcosystemModule[];
  analyticsEvents: number;
  security: {
    rbacRoles: number;
    permissions: number;
    auditEvents: number;
  };
  automationReadiness: Record<string, boolean>;
};

const moduleIcons: Record<string, any> = {
  scholarships: GraduationCap,
  jobs: Briefcase,
  partners: Building2,
  blog: FileText,
  team: UserCheck,
  users: Users,
  applications: ClipboardList,
  events: CalendarDays,
};

const moduleTone: Record<string, string> = {
  scholarships: "text-emerald-700 bg-emerald-50 border-emerald-200",
  jobs: "text-amber-700 bg-amber-50 border-amber-200",
  partners: "text-cyan-700 bg-cyan-50 border-cyan-200",
  blog: "text-indigo-700 bg-indigo-50 border-indigo-200",
  team: "text-rose-700 bg-rose-50 border-rose-200",
  users: "text-slate-700 bg-slate-50 border-slate-200",
  applications: "text-blue-700 bg-blue-50 border-blue-200",
  events: "text-orange-700 bg-orange-50 border-orange-200",
};

export default function EcosystemPage() {
  const { data, isLoading } = useQuery<EcosystemOverview>({
    queryKey: ["/api/admin/ecosystem/overview"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/ecosystem/overview");
      if (!res.ok) throw new Error("Failed to fetch ecosystem overview");
      return res.json();
    },
  });

  const modules = data?.modules ?? [];
  const readiness = data ? Object.entries(data.automationReadiness) : [];
  const healthScore = data?.totals.totalRecords
    ? Math.max(0, Math.round(((data.totals.activeRecords - data.totals.riskItems) / data.totals.totalRecords) * 100))
    : 100;

  const exportReport = async () => {
    const rows = [
      ["Module", "Total", "Active", "Workflow Items", "Risk Items"],
      ...modules.map((item) => [item.name, item.total, item.active, item.workflowItems, item.risk]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mtendere-ecosystem-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SEO title="Management Ecosystem" description="Unified enterprise command center for Mtendere platform operations." />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Management Ecosystem</h1>
              <p className="text-muted-foreground">
                Enterprise control plane for content, users, applications, reporting, security, and automation readiness.
              </p>
            </div>
          </div>
          {data?.generatedAt && (
            <p className="mt-2 text-xs text-muted-foreground">Last generated {new Date(data.generatedAt).toLocaleString()}</p>
          )}
        </div>
        <Button variant="outline" onClick={exportReport} disabled={!data}>
          <Download className="mr-2 h-4 w-4" />
          Export Overview
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Total Records" value={data?.totals.totalRecords} icon={BarChart3} loading={isLoading} />
        <Metric title="Active Records" value={data?.totals.activeRecords} icon={Activity} loading={isLoading} />
        <Metric title="Workflow Items" value={data?.totals.workflowItems} icon={ClipboardList} loading={isLoading} />
        <Metric title="Risk Items" value={data?.totals.riskItems} icon={ShieldCheck} loading={isLoading} tone="warning" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Module Health</CardTitle>
            <CardDescription>Operational load, live records, and attention points across every management domain.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {modules.map((module) => {
                  const Icon = moduleIcons[module.id] ?? FileText;
                  const activeRatio = module.total ? Math.round((module.active / module.total) * 100) : 0;
                  return (
                    <div key={module.id} className="rounded-lg border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${moduleTone[module.id] ?? moduleTone.users}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{module.name}</p>
                            <p className="text-xs text-muted-foreground">{module.workflowItems} workflow items</p>
                          </div>
                        </div>
                        <Badge className={module.risk > 0 ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}>
                          {module.risk} risk
                        </Badge>
                      </div>
                      <div className="mt-4">
                        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                          <span>{module.active} active</span>
                          <span>{activeRatio}%</span>
                        </div>
                        <Progress value={activeRatio} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Health</CardTitle>
              <CardDescription>Combined operating readiness score from active records and risk load.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40 w-full" /> : (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-foreground">{healthScore}</span>
                      <span className="text-sm text-muted-foreground">/ 100</span>
                    </div>
                    <Progress value={healthScore} className="mt-3 h-3" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Roles" value={data?.security.rbacRoles ?? 0} />
                    <MiniStat label="Perms" value={data?.security.permissions ?? 0} />
                    <MiniStat label="Audit" value={data?.security.auditEvents ?? 0} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automation Readiness</CardTitle>
              <CardDescription>Hooks prepared for reports, queues, AI, and external integrations.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-36 w-full" /> : (
                <div className="space-y-2">
                  {readiness.map(([key, ready]) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                      <Badge className={ready ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
                        {ready ? "Ready" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI-Ready Signals
              </CardTitle>
              <CardDescription>Structured data is prepared for recommendations, smart search, scoring, and predictive reporting.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, icon: Icon, loading, tone = "default" }: { title: string; value?: number; icon: any; loading: boolean; tone?: "default" | "warning" }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{value ?? 0}</p>
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone === "warning" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"}`}>
              <Icon className="h-5 w-5" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
    </div>
  );
}
