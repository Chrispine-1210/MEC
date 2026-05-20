import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, ShieldAlert, Zap, History, Bot, User, Eye, RefreshCw, XCircle } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import { authFetch, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getInitialUrlSearchParam } from "@/hooks/use-url-search-param";

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

  const closeConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authFetch(`/api/admin/ai-chat/conversations/${id}/close`, { method: "PUT" });
      if (!response.ok) throw new Error("Failed to close conversation");
      return response.json();
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-chat/conversations"] });
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
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

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




