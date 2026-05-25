import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch, queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getInitialUrlSearchParam } from "@/hooks/use-url-search-param";
import DataTable from "@/components/admin/DataTable";
import { ClipboardList, CheckCircle, XCircle, Clock, AlertCircle, Eye, ChevronRight, Star, CalendarClock } from "lucide-react";
import type { Application } from "@shared/schema";

type AdminApplication = Application & {
  applicantName?: string;
  applicantEmail?: string;
  opportunityTitle?: string;
  opportunityType?: string;
  coverLetter?: string;
  submittedAt?: string;
  meta?: Record<string, any>;
};

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-warning/15 text-warning", icon: Clock, label: "Pending" },
  approved: { color: "bg-success/15 text-success", icon: CheckCircle, label: "Approved" },
  rejected: { color: "bg-destructive/15 text-destructive", icon: XCircle, label: "Rejected" },
  waitlisted: { color: "bg-info/15 text-info", icon: AlertCircle, label: "Waitlisted" },
  under_review: { color: "bg-primary/10 text-primary", icon: Eye, label: "Under Review" },
};

const statCardStyles: Record<string, { card: string; icon: string }> = {
  amber: { card: "border-l-4 border-l-warning bg-warning/5", icon: "text-warning" },
  green: { card: "border-l-4 border-l-success bg-success/5", icon: "text-success" },
  red: { card: "border-l-4 border-l-destructive bg-destructive/5", icon: "text-destructive" },
};

export default function ApplicationsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(() => getInitialUrlSearchParam());
  const [status, setStatus] = useState("");
  const [selectedApp, setSelectedApp] = useState<AdminApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [reviewStage, setReviewStage] = useState("review");
  const [reviewScore, setReviewScore] = useState("");
  const [interviewAt, setInterviewAt] = useState("");
  const [shortlist, setShortlist] = useState(false);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ applications: Application[], total: number }>({
    queryKey: ["/api/admin/applications", page, limit, search, status],
    queryFn: async () => {
      const response = await authFetch(`/api/admin/applications?page=${page}&limit=${limit}&search=${search}&status=${status}`);
      if (!response.ok) throw new Error("Failed to fetch applications");
      return response.json();
    },
  });

  const { data: analytics } = useQuery<any>({
    queryKey: ["/api/admin/applications/analytics"],
    queryFn: async () => {
      const response = await authFetch("/api/admin/applications/analytics");
      if (!response.ok) throw new Error("Failed to fetch application analytics");
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/admin/applications/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      setSelectedApp(null);
      toast({ title: "Application updated", description: "Status has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update application", variant: "destructive" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const response = await authFetch(`/api/admin/applications/export${suffix}`);
      if (!response.ok) throw new Error("Failed to export applications");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mtendere-applications-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({ title: "Export ready", description: "Applications CSV has been downloaded." });
    },
    onError: (error: Error) => {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
    },
  });

  const quickUpdate = (id: string, status: string) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const openReview = (app: any) => {
    setSelectedApp(app as AdminApplication);
    setNewStatus(app.status);
    setReviewNotes("");
    setReviewStage(app.meta?.stage || "review");
    setReviewScore(typeof app.meta?.score === "number" ? String(app.meta.score) : "");
    setInterviewAt("");
    setShortlist(Boolean(app.meta?.shortlist));
  };

  const submitReview = (statusOverride?: string) => {
    if (!selectedApp) return;
    updateMutation.mutate({
      id: selectedApp.id,
        data: {
          status: statusOverride ?? newStatus,
          reviewNotes,
          stage: reviewStage,
          score: reviewScore ? Number(reviewScore) : undefined,
          shortlist,
          interviewAt: interviewAt || undefined,
        },
      });
  };

  // Summary stats
  const pendingCount = data?.applications?.filter(a => a.status === "pending").length ?? 0;
  const approvedCount = data?.applications?.filter(a => a.status === "approved").length ?? 0;
  const rejectedCount = data?.applications?.filter(a => a.status === "rejected").length ?? 0;

  const columns = [
    {
      key: "applicantName",
      header: "Applicant",
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs font-bold">
              {value?.[0]?.toUpperCase() || "A"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{value || "Anonymous"}</p>
            <p className="text-xs text-muted-foreground">{row.applicantEmail || ""}</p>
          </div>
        </div>
      )
    },
    { key: "opportunityTitle", header: "Opportunity", render: (v: string) => <span className="text-sm font-medium">{v}</span> },
    {
      key: "opportunityType",
      header: "Type",
      render: (v: string) => (
        <Badge variant="outline" className="text-xs capitalize">{v}</Badge>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (v: string) => {
        const cfg = statusConfig[v] || statusConfig.pending;
        const Icon = cfg.icon;
        return (
          <Badge className={`${cfg.color} border-0 text-xs`}>
            <Icon className="h-3 w-3 mr-1" />
            {cfg.label}
          </Badge>
        );
      }
    },
    {
      key: "createdAt",
      header: "Applied",
      render: (v: string) => <span className="text-xs text-muted-foreground">{new Date(v).toLocaleDateString()}</span>
    },
    {
      key: "actions",
      header: "Actions",
      render: (_: any, row: any) => (
        <div className="flex gap-1 items-center">
          {row.status === "pending" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-success hover:bg-success/10 hover:text-success text-xs"
                onClick={(e) => { e.stopPropagation(); quickUpdate(row.id, "approved"); }}
                disabled={updateMutation.isPending}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
                onClick={(e) => { e.stopPropagation(); quickUpdate(row.id, "rejected"); }}
                disabled={updateMutation.isPending}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
            onClick={() => openReview(row)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <SEO title="Applications" description="Review and manage student and professional applications." />

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
            <ClipboardList className="h-8 w-8 text-primary" />
            Applications
          </h1>
          <p className="text-muted-foreground mt-1">{data?.total ?? 0} total applications on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="waitlisted">Waitlisted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      {data && data.applications.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: "Pending Review", count: data.applications.filter(a => a.status === "pending").length, color: "amber", icon: Clock },
            { label: "Approved", count: data.applications.filter(a => a.status === "approved").length, color: "green", icon: CheckCircle },
            { label: "Rejected", count: data.applications.filter(a => a.status === "rejected").length, color: "red", icon: XCircle },
            { label: "Shortlisted", count: analytics?.shortlisted ?? 0, color: "green", icon: Star },
            { label: "Interviews", count: analytics?.interviewsScheduled ?? 0, color: "amber", icon: CalendarClock },
          ].map(({ label, count, color, icon: Icon }) => (
            <Card key={label} className={statCardStyles[color].card}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-8 w-8 ${statCardStyles[color].icon}`} />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.applications || []}
        loading={isLoading}
        pagination={{ page, limit, total: data?.total || 0, onPageChange: setPage, onLimitChange: setLimit }}
        searchPlaceholder="Search applications by applicant, email, opportunity, type, status, or cover note..."
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        exportable
        onExport={() => exportMutation.mutate()}
      />

      {/* Review Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => { if (!open) setSelectedApp(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Review Application
            </DialogTitle>
            <DialogDescription>Review and update application status</DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/40 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Applicant</span>
                  <span className="text-sm font-medium">{selectedApp.applicantName || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm">{selectedApp.applicantEmail || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Opportunity</span>
                  <span className="text-sm font-medium">{selectedApp.opportunityTitle || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="outline" className="text-xs capitalize">{selectedApp.opportunityType}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Applied</span>
                  <span className="text-sm">{new Date(selectedApp.createdAt ?? selectedApp.submittedAt ?? Date.now()).toLocaleString()}</span>
                </div>
              </div>

              {selectedApp.coverLetter && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Cover Letter</p>
                    <div className="p-3 bg-muted/40 rounded-lg text-sm text-foreground/80 max-h-32 overflow-y-auto">
                      {selectedApp.coverLetter}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Update Status</label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="waitlisted">Waitlisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Review Stage</label>
                    <Input value={reviewStage} onChange={(event) => setReviewStage(event.target.value)} placeholder="review, interview, final" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Score</label>
                    <Input value={reviewScore} onChange={(event) => setReviewScore(event.target.value)} type="number" min={0} max={100} placeholder="0-100" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Interview</label>
                    <Input value={interviewAt} onChange={(event) => setInterviewAt(event.target.value)} type="datetime-local" />
                  </div>
                </div>
                <label className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm">
                  <input type="checkbox" checked={shortlist} onChange={(event) => setShortlist(event.target.checked)} />
                  Shortlist this applicant
                </label>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Review Notes (optional)</label>
                  <Textarea
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    placeholder="Add notes about this application..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-1">
                <Button variant="outline" onClick={() => setSelectedApp(null)}>Cancel</Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="text-success border-success/40 hover:bg-success/10"
                    onClick={() => submitReview("approved")}
                    disabled={updateMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => submitReview("rejected")}
                    disabled={updateMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button onClick={() => submitReview()} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}




