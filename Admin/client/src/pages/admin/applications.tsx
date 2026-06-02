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
import {
  AlertCircle,
  Briefcase,
  CalendarClock,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  GraduationCap,
  Link as LinkIcon,
  MapPin,
  Star,
  UserRound,
  XCircle,
} from "lucide-react";
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
  shortlisted: { color: "bg-success/15 text-success", icon: Star, label: "Shortlisted" },
  interview: { color: "bg-info/15 text-info", icon: CalendarClock, label: "Interview" },
  assessment: { color: "bg-warning/15 text-warning", icon: ClipboardList, label: "Assessment" },
  offer: { color: "bg-success/15 text-success", icon: CheckCircle, label: "Offer" },
  hired: { color: "bg-success/20 text-success", icon: CheckCircle, label: "Hired" },
};

const pipelineStatusOptions = [
  "pending",
  "under_review",
  "shortlisted",
  "interview",
  "assessment",
  "offer",
  "hired",
  "approved",
  "waitlisted",
  "rejected",
];

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
  const [evaluationCategory, setEvaluationCategory] = useState("Overall fit");
  const [interviewNotes, setInterviewNotes] = useState("");
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
    setEvaluationCategory("Overall fit");
    setInterviewNotes("");
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
          interviewNotes: interviewNotes || undefined,
          evaluationScores: reviewScore
            ? [{ category: evaluationCategory || "Overall fit", score: Number(reviewScore), stage: reviewStage }]
            : undefined,
        },
      });
  };

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
              {pipelineStatusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {statusConfig[option]?.label ?? option}
                </SelectItem>
              ))}
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
            { label: "Shortlisted", count: analytics?.shortlisted ?? analytics?.byStatus?.shortlisted ?? 0, color: "green", icon: Star },
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
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
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

              <CandidateProfile application={selectedApp} analytics={analytics} />

              <Separator />

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Update Status</label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineStatusOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {statusConfig[option]?.label ?? option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Review Stage</label>
                    <Input value={reviewStage} onChange={(event) => setReviewStage(event.target.value)} placeholder="review, interview, final" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Score Category</label>
                    <Input value={evaluationCategory} onChange={(event) => setEvaluationCategory(event.target.value)} placeholder="Technical, culture, academic" />
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
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Interview Notes</label>
                  <Textarea
                    value={interviewNotes}
                    onChange={e => setInterviewNotes(e.target.value)}
                    placeholder="Capture interview observations, strengths, risks, and next steps..."
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

function CandidateProfile({ application, analytics }: { application: AdminApplication; analytics?: any }) {
  const meta = application.meta ?? {};
  const applicant = asRecord(meta.applicantSnapshot);
  const professional = asRecord(meta.professionalSnapshot);
  const education = asRecordArray(meta.educationHistory);
  const experience = asRecordArray(meta.experienceHistory);
  const references = asRecordArray(meta.references);
  const roleAnswers = asRecord(meta.roleAnswers);
  const documents = [
    ...asRecordArray(meta.documents),
    ...asRecordArray((application as any).documents),
  ];
  const pipeline = asRecordArray(meta.pipeline);
  const source = typeof meta.source === "string" ? meta.source : "public";
  const country = textValue(applicant.country) || "Unspecified";

  return (
    <div className="space-y-4">
      <Separator />
      <div className="grid gap-3 md:grid-cols-4">
        <SnapshotCard icon={UserRound} label="Country" value={country} />
        <SnapshotCard icon={Briefcase} label="Source" value={source} />
        <SnapshotCard icon={Star} label="ATS Score" value={textValue(meta.atsScore) || "Not scored"} />
        <SnapshotCard icon={MapPin} label="Source Volume" value={textValue(analytics?.sourceTracking?.[source]) || "0"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard
          icon={UserRound}
          title="Personal Information"
          entries={[
            ["First name", applicant.firstName],
            ["Last name", applicant.lastName],
            ["Email", applicant.email || application.applicantEmail],
            ["Phone", applicant.phone],
            ["Nationality", applicant.nationality],
            ["Address", applicant.address],
          ]}
        />
        <InfoCard
          icon={LinkIcon}
          title="Professional Links"
          entries={[
            ["Resume", professional.resume || professional.cv],
            ["Cover letter", professional.coverLetter],
            ["Portfolio", professional.portfolio],
            ["LinkedIn", professional.linkedin],
            ["Github", professional.github],
            ["Behance", professional.behance],
            ["Website", professional.website],
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RecordList icon={GraduationCap} title="Education" records={education} empty="No education history was captured." />
        <RecordList icon={Briefcase} title="Experience" records={experience} empty="No experience history was captured." />
        <RecordList icon={UserRound} title="References" records={references} empty="No references were captured." />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnswerList title="Role-Specific Answers" answers={roleAnswers} />
        <RecordList icon={FileText} title="Documents" records={documents} empty="No supporting documents were captured." />
      </div>

      {pipeline.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" />
              Candidate Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {pipeline.map((stage, index) => (
              <Badge key={`${stage.id ?? stage.label ?? index}`} variant={stage.completedAt ? "default" : "outline"}>
                {textValue(stage.label) || textValue(stage.id) || `Stage ${index + 1}`}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SnapshotCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="border border-border/60">
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoCard({
  icon: Icon,
  title,
  entries,
}: {
  icon: any;
  title: string;
  entries: Array<[string, unknown]>;
}) {
  const filtered = entries.filter(([, value]) => textValue(value));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.length ? (
          filtered.map(([label, value]) => <ValueRow key={label} label={label} value={value} />)
        ) : (
          <p className="text-sm text-muted-foreground">No details captured.</p>
        )}
      </CardContent>
    </Card>
  );
}

function RecordList({ icon: Icon, title, records, empty }: { icon: any; title: string; records: Record<string, unknown>[]; empty: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.length ? (
          records.map((record, index) => (
            <div key={String(record.id ?? index)} className="rounded-lg border border-border/60 p-3">
              {Object.entries(record)
                .filter(([key, value]) => key !== "id" && textValue(value))
                .slice(0, 6)
                .map(([key, value]) => (
                  <ValueRow key={key} label={formatKey(key)} value={value} compact />
                ))}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function AnswerList({ title, answers }: { title: string; answers: Record<string, unknown> }) {
  const entries = Object.entries(answers).filter(([, value]) => textValue(value));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length ? (
          entries.map(([label, value]) => <ValueRow key={label} label={formatKey(label)} value={value} />)
        ) : (
          <p className="text-sm text-muted-foreground">No role-specific answers were captured.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ValueRow({ label, value, compact = false }: { label: string; value: unknown; compact?: boolean }) {
  const text = textValue(value);
  if (!text) return null;
  const isLink = /^https?:\/\//i.test(text);
  return (
    <div className={compact ? "mb-1" : "flex justify-between gap-4 border-b border-border/50 pb-2 last:border-0"}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {isLink ? (
        <a className="max-w-[70%] truncate text-xs font-medium text-primary underline-offset-4 hover:underline" href={text} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ) : (
        <span className="text-right text-xs font-medium text-foreground/80">{text}</span>
      )}
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function textValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${formatKey(key)}: ${textValue(item)}`)
      .filter((item) => !item.endsWith(": "))
      .join("; ");
  }
  return "";
}

function formatKey(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}




