import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import DataTable from "@/components/admin/DataTable";
import { authFetch, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getInitialUrlSearchParam } from "@/hooks/use-url-search-param";
import { CheckCheck, Eye, Inbox, Mail, MessageSquare, Phone, RefreshCw, User } from "lucide-react";

type AdminMessage = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  isRead?: boolean | null;
  createdAt?: string | null;
};

type MessagesResponse = {
  messages: AdminMessage[];
  total: number;
  unread: number;
};

export default function MessagesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(() => getInitialUrlSearchParam());
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<MessagesResponse>({
    queryKey: ["/api/admin/messages", page, limit, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const response = await authFetch(`/api/admin/messages?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await authFetch(`/api/admin/messages/${id}/read`, { method: "PUT" });
      if (!response.ok) throw new Error("Failed to mark message as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      toast({ title: "Message updated", description: "The message has been marked as read." });
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not update this message.", variant: "destructive" });
    },
  });

  const columns = [
    {
      key: "name",
      header: "Sender",
      render: (value: string, row: AdminMessage) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      render: (value: string | null, row: AdminMessage) => (
        <div>
          <p className="line-clamp-1 text-sm font-medium">{value || "General inquiry"}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{row.message}</p>
        </div>
      ),
    },
    {
      key: "isRead",
      header: "Status",
      render: (value: boolean | null) => (
        <Badge className={`border-0 ${value ? "bg-muted text-muted-foreground" : "bg-info/15 text-info"}`}>
          {value ? "Read" : "Unread"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Received",
      render: (value: string | null) => (
        <span className="text-xs text-muted-foreground">
          {value ? new Date(value).toLocaleString() : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_: unknown, row: AdminMessage) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMessage(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          {!row.isRead && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markReadMutation.mutate(row.id)}>
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SEO title="Messages" description="Review and respond to contact messages from the public website." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Inbox className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">Search, triage, and review contact inquiries.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Mail className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{data?.total ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total messages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <MessageSquare className="h-8 w-8 text-info" />
            <div>
              <p className="text-2xl font-bold">{data?.unread ?? 0}</p>
              <p className="text-sm text-muted-foreground">Unread</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCheck className="h-8 w-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{Math.max(0, (data?.total ?? 0) - (data?.unread ?? 0))}</p>
              <p className="text-sm text-muted-foreground">Reviewed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "unread", "read"] as const).map((status) => (
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
      </div>

      <DataTable
        columns={columns}
        data={data?.messages || []}
        loading={isLoading}
        pagination={{ page, limit, total: data?.total || 0, onPageChange: setPage, onLimitChange: setLimit }}
        searchPlaceholder="Search by sender, email, phone, subject, or message..."
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />

      <Dialog open={!!selectedMessage} onOpenChange={(open) => { if (!open) setSelectedMessage(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject || "General inquiry"}</DialogTitle>
            <DialogDescription>Contact message details</DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedMessage.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Email</p>
                  <a className="font-medium text-primary" href={`mailto:${selectedMessage.email}`}>{selectedMessage.email}</a>
                </div>
                {selectedMessage.phone && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Phone</p>
                    <p className="flex items-center gap-1 font-medium"><Phone className="h-3.5 w-3.5" />{selectedMessage.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Received</p>
                  <p className="font-medium">{selectedMessage.createdAt ? new Date(selectedMessage.createdAt).toLocaleString() : "-"}</p>
                </div>
              </div>
              <ScrollArea className="max-h-72 rounded-lg border border-border/60 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6">{selectedMessage.message}</p>
              </ScrollArea>
              <div className="flex justify-end gap-2">
                {!selectedMessage.isRead && (
                  <Button onClick={() => markReadMutation.mutate(selectedMessage.id)} className="gap-2">
                    <CheckCheck className="h-4 w-4" />
                    Mark Read
                  </Button>
                )}
                <Button asChild variant="outline">
                  <a href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(`Re: ${selectedMessage.subject || "Mtendere inquiry"}`)}`}>Reply by Email</a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
