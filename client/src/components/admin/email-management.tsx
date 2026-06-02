import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Mail, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type EmailStats = {
  totals: Record<string, number>;
  byCategory: Record<string, Record<string, number>>;
  queue: Record<string, number>;
  recentFailures: Array<{
    id: string;
    category: string;
    recipient: string;
    subject: string;
    attempts: number;
    lastError?: string | null;
    updatedAt?: string | null;
  }>;
  providers: {
    active: string[];
    configured: string[];
    dryRunEnabled: boolean;
  };
  templates: Array<{
    key: string;
    category: string;
    name: string;
  }>;
};

const metricLabels = [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "spam_complaint",
  "unsubscribed",
  "suppressed",
];

const categoryLabels: Record<string, string> = {
  account_verification: "Verification Emails",
  scholarship_recommended: "Scholarship Alerts",
  newsletter: "Newsletter Campaigns",
  application_status_update: "Application Updates",
  password_reset: "Password Resets",
};

const providerTone = (provider: string) => {
  if (provider === "dry_run") return "border-mtendere-orange/30 bg-mtendere-orange/10 text-mtendere-orange";
  return "border-mtendere-green/30 bg-mtendere-green/10 text-mtendere-green";
};

export default function EmailManagement() {
  const { data, isLoading } = useQuery<EmailStats>({
    queryKey: ["/api/admin/email/stats"],
  });

  const categories = useMemo(() => {
    const stats = data?.byCategory || {};
    const priority = Object.keys(categoryLabels);
    return [...priority, ...Object.keys(stats).filter((key) => !priority.includes(key))]
      .filter((key) => stats[key])
      .slice(0, 8);
  }, [data?.byCategory]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, index) => <Skeleton key={index} className="h-24" />)}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const totals = data?.totals || {};
  const queue = data?.queue || {};
  const activeProviders = data?.providers.active || [];
  const templates = data?.templates || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Sent", value: totals.sent || 0, icon: Mail, tone: "text-mtendere-blue" },
          { label: "Delivered", value: totals.delivered || 0, icon: CheckCircle2, tone: "text-mtendere-green" },
          { label: "Queued", value: queue.queued || 0, icon: Clock, tone: "text-mtendere-orange" },
          { label: "Failed", value: queue.failed || 0, icon: AlertTriangle, tone: "text-destructive" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className={`text-2xl font-bold ${item.tone}`}>{item.value}</p>
              </div>
              <item.icon className={`h-6 w-6 ${item.tone}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-mtendere-blue">Delivery Analytics</CardTitle>
            <CardDescription>Transactional, campaign, and scholarship email events from the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              {metricLabels.map((metric) => (
                <div key={metric} className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{totals[metric] || 0}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border border-border/60">
              <div className="grid grid-cols-[1.2fr_repeat(4,0.6fr)] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <span>Flow</span>
                <span>Sent</span>
                <span>Opened</span>
                <span>Clicked</span>
                <span>Bounced</span>
              </div>
              <div className="divide-y">
                {categories.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No email events recorded yet.</div>
                ) : (
                  categories.map((category) => {
                    const row = data?.byCategory[category] || {};
                    return (
                      <div key={category} className="grid grid-cols-[1.2fr_repeat(4,0.6fr)] gap-3 px-4 py-3 text-sm">
                        <span className="font-medium">{categoryLabels[category] || category.replace(/_/g, " ")}</span>
                        <span>{row.sent || 0}</span>
                        <span>{row.opened || 0}</span>
                        <span>{row.clicked || 0}</span>
                        <span>{row.bounced || 0}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-mtendere-blue">
                <Server className="h-5 w-5" />
                Provider Failover
              </CardTitle>
              <CardDescription>Configured send order for transactional redundancy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeProviders.length === 0 ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  No active email provider is configured.
                </div>
              ) : (
                activeProviders.map((provider, index) => (
                  <div key={provider} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={providerTone(provider)}>{index + 1}</Badge>
                      <span className="font-medium capitalize">{provider.replace("_", " ")}</span>
                    </div>
                    <ShieldCheck className="h-4 w-4 text-mtendere-green" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-mtendere-blue">
                <RefreshCw className="h-5 w-5" />
                Queue Health
              </CardTitle>
              <CardDescription>Retry schedule: 1 minute, 5 minutes, 15 minutes, 1 hour.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {["queued", "processing", "retry_scheduled", "sent", "failed"].map((status) => (
                <div key={status} className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{status.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-lg font-bold">{queue[status] || 0}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-mtendere-blue">Recent Failures</CardTitle>
            <CardDescription>Final failures that need administrator attention.</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.recentFailures?.length ? (
              <div className="space-y-3">
                {data.recentFailures.slice(0, 8).map((job) => (
                  <div key={job.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{job.subject}</p>
                        <p className="text-xs text-muted-foreground">{job.recipient} - {job.category}</p>
                      </div>
                      <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">
                        {job.attempts} tries
                      </Badge>
                    </div>
                    {job.lastError && <p className="mt-2 text-xs text-muted-foreground">{job.lastError}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                No final failures recorded.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-mtendere-blue">Template Library</CardTitle>
            <CardDescription>Branded transactional and campaign templates available to the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {templates.map((template) => (
                <div key={template.key} className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.category}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
