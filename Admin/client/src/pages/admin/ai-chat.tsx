import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Bot,
  Brain,
  Database,
  Eye,
  Gauge,
  History,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import { authFetch, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getInitialUrlSearchParam } from "@/hooks/use-url-search-param";

type AiCommandCenter = {
  generatedAt: string;
  overview: {
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    flaggedConversations: number;
    escalatedConversations: number;
    memoryEnabledConversations: number;
  };
  quality: {
    averageConfidence: number;
    fallbackRate: number;
    escalationRate: number;
    flaggedRate: number;
  };
  security: {
    riskLevels: Record<string, number>;
    flags: Record<string, number>;
    blockedActionRequests: number;
    approvalRequired: number;
  };
  agents: Record<string, number>;
  actions: {
    statuses: Record<string, number>;
    requiredPermissions: Record<string, number>;
  };
  knowledge: {
    activeScholarships: number | null;
    activeJobs: number | null;
    activePartners: number | null;
    publishedBlogPosts: number | null;
    applications: number | null;
    retrievalSources: Record<string, number>;
    degradedSources: string[];
  };
  reliability: {
    providers: Record<string, number>;
    fallbackConversations: number;
    modelStatus: string;
  };
  recentAuditTrail: any[];
};

const formatPercent = (value?: number | null) =>
  typeof value === "number" ? `${Math.round(value <= 1 ? value * 100 : value)}%` : "0%";

const formatDecimalPercent = (value?: number | null) =>
  typeof value === "number" ? `${value.toFixed(1)}%` : "0.0%";

const topEntries = (record?: Record<string, number>, limit = 4) =>
  Object.entries(record ?? {})
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

const humanizeKey = (value: string) => value.replace(/_/g, " ");

export default function AiChatPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(() => getInitialUrlSearchParam());
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");
  const [flagFilter, setFlagFilter] = useState<"all" | "flagged">("all");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ conversations: any[], total: number }>({
    queryKey: ["/api/admin/ai-chat/conversations", page, limit, search, statusFilter, flagFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (flagFilter === "flagged") params.set("flag", "any");
      const response = await authFetch(`/api/admin/ai-chat/conversations?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const {
    data: commandCenter,
    isLoading: isCommandCenterLoading,
    refetch: refetchCommandCenter,
  } = useQuery<AiCommandCenter>({
    queryKey: ["/api/admin/ai-chat/command-center"],
    queryFn: async () => {
      const response = await authFetch("/api/admin/ai-chat/command-center");
      if (!response.ok) throw new Error("Failed to fetch AI command center");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const closeConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authFetch(`/api/admin/ai-chat/conversations/${id}/close`, { method: "PUT" });
      if (!response.ok) throw new Error("Failed to close conversation");
      return response.json();
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-chat/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-chat/command-center"] });
      setSelectedConversation((current: any) => current?.id === conversation.id ? conversation : current);
      toast({ title: "Conversation closed", description: "The AI chat session has been marked as closed." });
    },
    onError: () => {
      toast({ title: "Close failed", description: "Could not close this AI conversation.", variant: "destructive" });
    },
  });

  const activeCount = data?.conversations?.filter(c => c.isActive).length ?? 0;
  const totalMessages = data?.conversations?.reduce((acc, c) => acc + (c.messages?.length || 0), 0) ?? 0;
  const flaggedCount = data?.conversations?.filter(c => c.moderationFlags?.length > 0).length ?? 0;
  const commandOverview = commandCenter?.overview;
  const commandQuality = commandCenter?.quality;
  const commandSecurity = commandCenter?.security;
  const commandActions = commandCenter?.actions;
  const commandKnowledge = commandCenter?.knowledge;
  const commandReliability = commandCenter?.reliability;
  const recentAuditTrail = commandCenter?.recentAuditTrail ?? [];

  const refreshAll = () => {
    refetch();
    refetchCommandCenter();
  };

  const getActionBadgeClass = (status?: string) => {
    if (status === "blocked") return "bg-destructive/15 text-destructive border-destructive/20";
    if (status === "requires_approval") return "bg-amber-500/15 text-amber-700 border-amber-500/20";
    if (status === "proposed") return "bg-info/15 text-info border-info/20";
    return "bg-emerald-500/15 text-emerald-700 border-emerald-500/20";
  };

  const formatAuditTime = (value?: string) =>
    value ? new Date(value).toLocaleString() : "Unknown time";

  const columns = [
    {
      key: "userId",
      header: "Session",
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-info/15 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-info" />
          </div>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{(value || "anon").slice(0, 10)}...</code>
        </div>
      )
    },
    {
      key: "messages",
      header: "Messages",
      render: (value: any[]) => (
        <div className="flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span className="text-sm">{value?.length || 0}</span>
        </div>
      )
    },
    {
      key: "moderationFlags",
      header: "Flags",
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {value?.length ? value.map((flag) => (
            <Badge key={flag} className="border-0 bg-warning/15 text-warning text-xs capitalize">{flag}</Badge>
          )) : <span className="text-xs text-muted-foreground">None</span>}
        </div>
      )
    },
    {
      key: "isActive",
      header: "Status",
      render: (value: boolean) => (
        <Badge className={`border-0 text-xs ${value ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${value ? "bg-success/100 animate-pulse" : "bg-muted-foreground/60"}`} />
          {value ? "Active" : "Closed"}
        </Badge>
      )
    },
    {
      key: "createdAt",
      header: "Started",
      render: (value: string) => <span className="text-xs text-muted-foreground">{new Date(value).toLocaleString()}</span>
    },
    {
      key: "actions",
      header: "Actions",
      render: (_: any, row: any) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
            onClick={() => setSelectedConversation(row)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {row.isActive && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => closeConversationMutation.mutate(row.id)}
              disabled={closeConversationMutation.isPending}
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <SEO title="AI Chat Management" description="Monitor and moderate AI-powered student advisor conversations." />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary to-chart-4 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Chat Management</h1>
            <p className="text-muted-foreground">Monitor and moderate AI-powered student advisor conversations</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Command Center */}
      <Card className="border-primary/20 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4" />
            AI Command Center
          </CardTitle>
          <CardDescription>
            Live intelligence, knowledge grounding, action governance, and reliability signals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCommandCenterLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full max-w-xl grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="audit">Audit</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg confidence</p>
                    <p className="mt-2 text-2xl font-semibold">{formatPercent(commandQuality?.averageConfidence)}</p>
                    <p className="text-xs text-muted-foreground">Across active conversations</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Fallback rate</p>
                    <p className="mt-2 text-2xl font-semibold">{formatDecimalPercent(commandQuality?.fallbackRate)}</p>
                    <p className="text-xs text-muted-foreground">Local safe mode usage</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Escalation rate</p>
                    <p className="mt-2 text-2xl font-semibold">{formatDecimalPercent(commandQuality?.escalationRate)}</p>
                    <p className="text-xs text-muted-foreground">Human review required</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Memory enabled</p>
                    <p className="mt-2 text-2xl font-semibold">{commandOverview ? `${commandOverview.memoryEnabledConversations}/${commandOverview.totalConversations || 0}` : "0/0"}</p>
                    <p className="text-xs text-muted-foreground">Stored preference state</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Agent routing</p>
                        <p className="text-xs text-muted-foreground">Supervisor-selected specialists by task type</p>
                      </div>
                      <Badge variant="outline" className="bg-background">
                        {commandReliability?.modelStatus ?? "unknown"}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-2">
                      {topEntries(commandCenter?.agents).length > 0 ? (
                        topEntries(commandCenter?.agents).map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between text-sm">
                            <span className="capitalize">{humanizeKey(label)}</span>
                            <Badge variant="outline">{value}</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No routed conversations yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Knowledge grounding</p>
                        <p className="text-xs text-muted-foreground">Platform data counts and retrieval sources</p>
                      </div>
                      <Badge variant="outline">{commandKnowledge?.degradedSources.length ?? 0} degraded</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-md border border-border/60 p-3">
                        <p className="text-muted-foreground">Scholarships</p>
                        <p className="mt-1 text-lg font-semibold">{commandKnowledge?.activeScholarships ?? 0}</p>
                      </div>
                      <div className="rounded-md border border-border/60 p-3">
                        <p className="text-muted-foreground">Jobs</p>
                        <p className="mt-1 text-lg font-semibold">{commandKnowledge?.activeJobs ?? 0}</p>
                      </div>
                      <div className="rounded-md border border-border/60 p-3">
                        <p className="text-muted-foreground">Partners</p>
                        <p className="mt-1 text-lg font-semibold">{commandKnowledge?.activePartners ?? 0}</p>
                      </div>
                      <div className="rounded-md border border-border/60 p-3">
                        <p className="text-muted-foreground">Blog posts</p>
                        <p className="mt-1 text-lg font-semibold">{commandKnowledge?.publishedBlogPosts ?? 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <p className="text-sm font-semibold">Action governance</p>
                    <p className="text-xs text-muted-foreground">Requests are prepared, validated, and approved before execution</p>
                    <div className="mt-4 space-y-2">
                      {topEntries(commandActions?.statuses).length > 0 ? (
                        topEntries(commandActions?.statuses).map(([status, value]) => (
                          <div key={status} className="flex items-center justify-between gap-3">
                            <Badge variant="outline" className={getActionBadgeClass(status)}>
                              {humanizeKey(status)}
                            </Badge>
                            <span className="text-sm font-medium">{value}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No action requests recorded yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <p className="text-sm font-semibold">Reliability</p>
                    <p className="text-xs text-muted-foreground">Model and provider failover visibility</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">
                        {commandReliability?.providers?.openai ?? 0} openai
                      </Badge>
                      <Badge className="bg-info/15 text-info border-info/20">
                        {commandReliability?.fallbackConversations ?? 0} fallback
                      </Badge>
                      <Badge variant="outline">
                        {commandOverview?.activeConversations ?? 0} active
                      </Badge>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      {commandKnowledge?.retrievalSources && topEntries(commandKnowledge.retrievalSources).length > 0 ? (
                        <div className="space-y-1">
                          {topEntries(commandKnowledge.retrievalSources).map(([source, value]) => (
                            <div key={source} className="flex items-center justify-between">
                              <span className="capitalize">{humanizeKey(source)}</span>
                              <span>{value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No retrieval source breakdown yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Flagged conversations</p>
                    <p className="mt-2 text-2xl font-semibold">{commandOverview?.flaggedConversations ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Escalations</p>
                    <p className="mt-2 text-2xl font-semibold">{commandOverview?.escalatedConversations ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Blocked actions</p>
                    <p className="mt-2 text-2xl font-semibold">{commandSecurity?.blockedActionRequests ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Approval required</p>
                    <p className="mt-2 text-2xl font-semibold">{commandSecurity?.approvalRequired ?? 0}</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <p className="text-sm font-semibold">Risk levels</p>
                    <div className="mt-4 space-y-2">
                      {topEntries(commandSecurity?.riskLevels).length > 0 ? (
                        topEntries(commandSecurity?.riskLevels).map(([risk, value]) => (
                          <div key={risk} className="flex items-center justify-between gap-3">
                            <Badge variant="outline" className={getActionBadgeClass(risk)}>
                              {humanizeKey(risk)}
                            </Badge>
                            <span className="text-sm font-medium">{value}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No risk data yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <p className="text-sm font-semibold">Safety flags</p>
                    <div className="mt-4 space-y-2">
                      {topEntries(commandSecurity?.flags).length > 0 ? (
                        topEntries(commandSecurity?.flags).map(([flag, value]) => (
                          <div key={flag} className="flex items-center justify-between gap-3">
                            <span className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-medium capitalize">
                              {humanizeKey(flag)}
                            </span>
                            <span className="text-sm font-medium">{value}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No safety flags recorded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="audit" className="mt-4 space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Recent audit trail</p>
                      <p className="text-xs text-muted-foreground">Latest AI turns with routing, action plan, and confidence data</p>
                    </div>
                    <Badge variant="outline">{recentAuditTrail.length} events</Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {recentAuditTrail.length > 0 ? (
                      recentAuditTrail.map((entry) => (
                        <div key={String(entry.id ?? `${entry.conversationId}-${entry.at}`)} className="rounded-md border border-border/60 bg-background p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{humanizeKey(String(entry.event ?? "event"))}</Badge>
                            <Badge variant="outline" className={getActionBadgeClass(String(entry.actionStatus ?? "not_required"))}>
                              {humanizeKey(String(entry.actionStatus ?? "not_required"))}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatAuditTime(String(entry.at ?? ""))}</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-foreground">{String(entry.summary ?? "AI conversation")}</p>
                          <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                            <span>Agent: {humanizeKey(String(entry.selectedAgent ?? "unknown"))}</span>
                            <span>Risk: {humanizeKey(String(entry.riskLevel ?? "unknown"))}</span>
                            <span>Confidence: {formatPercent(Number(entry.confidence ?? 0))}</span>
                            <span>Permission: {humanizeKey(String(entry.requiredPermission ?? "none"))}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No audit entries yet.</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: "Total Conversations", value: data?.total ?? 0, icon: History, color: "from-primary to-chart-4", description: "All time" },
          { title: "Active Now", value: activeCount, icon: Zap, color: "from-success to-accent", description: "Live sessions" },
          { title: "Total Messages", value: totalMessages, icon: MessageCircle, color: "from-info to-primary", description: "Processed" },
          { title: "Flagged Content", value: flaggedCount, icon: ShieldAlert, color: "from-warning to-destructive", description: "Needs review" },
        ].map(({ title, value, icon: Icon, color, description }) => (
          <Card key={title} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className={`bg-gradient-to-br ${color} p-4 flex items-center justify-center`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="p-4">
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? <Skeleton className="h-7 w-8 inline-block" /> : value}
                  </p>
                  <p className="text-xs font-medium text-foreground/80">{title}</p>
                  <p className="text-xs text-muted-foreground/70">{description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-info/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Bot className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-info">AI Chat Assistant</p>
            <p className="text-xs text-info mt-0.5">
              The AI assistant helps students find scholarships, jobs, and educational opportunities. Conversations are monitored for quality and content moderation.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Conversation History
          </CardTitle>
          <CardDescription>All AI chat sessions with message counts and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["all", "active", "closed"] as const).map((status) => (
              <Button
                key={status}
                type="button"
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                className="capitalize"
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
              >
                {status}
              </Button>
            ))}
            <Button
              type="button"
              variant={flagFilter === "flagged" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFlagFilter(flagFilter === "flagged" ? "all" : "flagged");
                setPage(1);
              }}
            >
              Flagged
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={data?.conversations || []}
            loading={isLoading}
            pagination={{ page, limit, total: data?.total || 0, onPageChange: setPage, onLimitChange: setLimit }}
            searchPlaceholder="Search conversations by user, message, summary, channel, or flag..."
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          {!isLoading && (!data?.conversations || data.conversations.length === 0) && (
            <div className="text-center py-12 text-muted-foreground/70">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs">AI chat sessions will appear here when users start conversations</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Viewer Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={(open) => { if (!open) setSelectedConversation(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversation Details
            </DialogTitle>
            <DialogDescription>
              Session: <code className="text-xs">{(selectedConversation?.userId || selectedConversation?.id || "anon").slice(0, 16)}...</code>
            </DialogDescription>
          </DialogHeader>
          {selectedConversation?.moderationFlags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedConversation.moderationFlags.map((flag: string) => (
                <Badge key={flag} className="border-0 bg-warning/15 text-warning capitalize">{flag}</Badge>
              ))}
            </div>
          )}
          {selectedConversation?.intelligence && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-background">
                  Agent: {humanizeKey(String(selectedConversation.intelligence.selectedAgent ?? "unknown"))}
                </Badge>
                <Badge variant="outline" className={getActionBadgeClass(String(selectedConversation.intelligence.actionPlan?.status ?? "not_required"))}>
                  Action: {humanizeKey(String(selectedConversation.intelligence.actionPlan?.status ?? "not_required"))}
                </Badge>
                <Badge variant="outline" className="bg-background">
                  Confidence: {formatPercent(selectedConversation.intelligence.confidence)}
                </Badge>
                <Badge variant="outline" className="bg-background">
                  Risk: {humanizeKey(String(selectedConversation.intelligence.riskLevel ?? "low"))}
                </Badge>
              </div>
              <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="rounded-md border border-border/60 bg-background p-3">
                  <p className="font-medium text-foreground">Action plan</p>
                  <p className="mt-1">{String(selectedConversation.intelligence.actionPlan?.rationale ?? "No action requested.")}</p>
                  <p className="mt-2">Permission: {humanizeKey(String(selectedConversation.intelligence.actionPlan?.requiredPermission ?? "none"))}</p>
                </div>
                <div className="rounded-md border border-border/60 bg-background p-3">
                  <p className="font-medium text-foreground">Memory</p>
                  <p className="mt-1">Enabled: {selectedConversation.memory?.enabled === false ? "No" : "Yes"}</p>
                  <p className="mt-1">
                    Preferences: {selectedConversation.memory?.userPreferences?.length ? selectedConversation.memory.userPreferences.slice(0, 3).join("; ") : "None"}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="rounded-md border border-border/60 bg-background p-3">
                  <p className="font-medium text-foreground">Sources</p>
                  <p className="mt-1">
                    {selectedConversation.intelligence.retrievalSources?.length
                      ? selectedConversation.intelligence.retrievalSources.map((source: any) => source.title || source.type || "source").slice(0, 3).join(" · ")
                      : "No retrieval sources"}
                  </p>
                </div>
                <div className="rounded-md border border-border/60 bg-background p-3">
                  <p className="font-medium text-foreground">Audit</p>
                  <p className="mt-1">
                    {selectedConversation.auditTrail?.length || 0} event(s) • {selectedConversation.intelligence.provider || "local"} / {selectedConversation.intelligence.model || "local"}
                  </p>
                </div>
              </div>
            </div>
          )}
          <ScrollArea className="max-h-96">
            {selectedConversation?.messages?.length > 0 ? (
              <div className="space-y-3 pr-3">
                {selectedConversation.messages.map((msg: any, i: number) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === "assistant" ? "bg-info/15" : "bg-primary/10"}`}>
                      {msg.role === "assistant" ? <Bot className="h-3.5 w-3.5 text-info" /> : <User className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <div className={`max-w-xs p-2.5 rounded-lg text-sm ${msg.role === "assistant" ? "bg-muted text-foreground" : "bg-primary text-white"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground/70 py-8 text-sm">No messages in this conversation</p>
            )}
          </ScrollArea>
          {selectedConversation?.isActive && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => closeConversationMutation.mutate(selectedConversation.id)}
                disabled={closeConversationMutation.isPending}
              >
                <XCircle className="h-4 w-4" />
                Close Conversation
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}




