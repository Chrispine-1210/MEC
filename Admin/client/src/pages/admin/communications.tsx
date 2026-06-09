import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch, apiRequest, queryClient } from "@/lib/queryClient";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle,
  ClipboardList,
  Clock,
  Copy,
  Eye,
  FileText,
  Inbox,
  Mail,
  MessageCircle,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  Server,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";

type CommunicationChannel = "email" | "sms" | "whatsapp" | "inapp" | "document" | string;
type CommunicationPriority = "high" | "medium" | "low" | string;
type TemplateType = "email" | "sms" | "document" | "inapp" | string;

type QualityIssue = {
  severity?: string;
  code?: string;
  message?: string;
};

type VariableDiagnostics = {
  used?: string[];
  declared?: string[];
  undeclared?: string[];
  unusedDeclared?: string[];
  missingPayloadValues?: string[];
};

type TemplateQuality = {
  score?: number;
  subjectLength?: number;
  spamSignals?: string[];
  issues?: QualityIssue[];
};

type CommunicationTemplate = {
  template_id: string;
  type: TemplateType;
  event_trigger: string;
  category?: string;
  language?: string;
  version?: number;
  status?: string;
  subject?: string;
  title?: string;
  preheader?: string;
  body?: string;
  documentType?: string;
  sensitivity?: string;
  brandVoice?: string;
  variables?: string[];
  variableDiagnostics?: VariableDiagnostics;
  quality?: TemplateQuality;
};

type RouteDefinition = {
  eventType: string;
  channel: CommunicationChannel;
  templateId: string;
  priority: CommunicationPriority;
  emailCategory?: string;
  recipientField?: string;
};

type CommunicationMessage = {
  message_id?: string;
  event_id?: string | null;
  event_type?: string;
  channel?: CommunicationChannel;
  status?: string;
  recipient?: string | null;
  template_id?: string | null;
  subject?: string | null;
  priority?: CommunicationPriority;
  provider?: string | null;
  provider_message_id?: string | null;
  metadata?: Record<string, unknown> | null;
  diagnostics?: Record<string, unknown> | null;
  timestamp?: string | null;
  sourceEvent?: {
    event_type?: string;
    source?: string;
    user_id?: number | null;
    priority?: CommunicationPriority;
    timestamp?: string;
  } | null;
};

type CommunicationAnalytics = {
  total: number;
  problemRate: number;
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
  byTemplate: Record<string, number>;
  byEventType: Record<string, number>;
  problemCount: number;
  recentProblems: CommunicationMessage[];
};

type CommunicationDiagnostics = {
  templates: {
    total: number;
    byType: Record<string, number>;
    diagnostics: Array<{
      templateId: string;
      type: TemplateType;
      category: string;
      language: string;
      version: number;
      eventTrigger: string;
      used?: string[];
      declared?: string[];
      undeclared?: string[];
      unusedDeclared?: string[];
      quality?: TemplateQuality;
    }>;
    orphanTemplates: string[];
  };
  routes: {
    total: number;
    byChannel: Record<string, number>;
    missingTemplates: Array<{ eventType: string; channel: CommunicationChannel; templateId: string }>;
  };
  providers: {
    email?: { configured?: boolean; provider?: string };
    sms?: { configured?: boolean; providers?: Array<{ name: string; configured: boolean }> };
    whatsapp?: { configured?: boolean; providers?: Array<{ name: string; configured: boolean }> };
    push?: { configured?: boolean; providers?: Array<{ name: string; configured: boolean }> };
  };
  generatedDocuments: {
    directory?: string;
    linkTtlDays?: number;
  };
  channelMatrix?: Record<string, Record<string, boolean>>;
  workflows?: {
    total?: number;
    active?: number;
    triggers?: string[];
  };
  governance?: Record<string, string | boolean | number>;
};

type EmailHealth = {
  reliability?: {
    sent?: number;
    delivered?: number;
    failed?: number;
    bounced?: number;
    spamComplaints?: number;
    deliveryRate?: number | null;
    bounceRate?: number | null;
    spamComplaintRate?: number | null;
  };
  queueOperations?: {
    queued?: number;
    retryScheduled?: number;
    processing?: number;
    deadLetter?: number;
    congestion?: number;
    retrySchedule?: string[];
    deadLetterStatus?: string;
  };
  alerts?: Array<{ severity?: string; code?: string; message?: string }>;
  providers?: {
    active?: string[];
    configured?: string[];
    dryRunEnabled?: boolean;
  };
  deliverability?: DeliverabilityDiagnostics;
};

type DeliverabilityDiagnostics = {
  ready?: boolean;
  summary?: { pass?: number; warn?: number; fail?: number };
  checks?: Array<{
    name?: string;
    status?: string;
    message?: string;
    value?: string;
    expected?: string;
    severity?: string;
  }>;
  error?: string;
};

type PreviewResponse = {
  preview: {
    template: CommunicationTemplate;
    event: {
      event_type: string;
      timestamp: string;
      source: string;
      user_id?: number | null;
      payload: Record<string, unknown>;
    };
    rendered: {
      subject: string;
      title: string;
      html: string;
      text: string;
    };
    quality: TemplateQuality;
    variableDiagnostics: VariableDiagnostics;
  };
};

type TimelineResponse = {
  query: { userId?: number | null; email?: string | null };
  total: number;
  items: CommunicationMessage[];
};

type EventEmissionResult = {
  eventId?: string;
  status?: string;
  results?: Array<Record<string, unknown>>;
  documents?: Array<Record<string, unknown>>;
  workflowTasks?: Array<Record<string, unknown>>;
};

type CommunicationDocument = {
  id?: string;
  eventId?: string | null;
  eventType?: string;
  templateId?: string | null;
  documentType?: string;
  referenceId?: string | null;
  recipient?: string | null;
  fileName?: string;
  downloadUrl?: string;
  status?: string;
  expiresAt?: string | null;
  createdAt?: string | null;
};

type WorkflowStep = {
  stepId: string;
  action: string;
  delayMinutes: number;
  eventType?: string;
  description: string;
};

type WorkflowDefinition = {
  workflowId: string;
  name: string;
  eventTrigger: string;
  active: boolean;
  owner: string;
  steps: WorkflowStep[];
  pendingTasks?: number;
};

type WorkflowTask = {
  id?: string;
  workflowId?: string;
  stepId?: string;
  eventId?: string | null;
  eventType?: string;
  status?: string;
  scheduledFor?: string;
  executedAt?: string | null;
  attempts?: number;
  lastError?: string | null;
};

type WorkflowsResponse = {
  workflows: WorkflowDefinition[];
  tasks: WorkflowTask[];
};

type CampaignRecord = {
  id?: number;
  name?: string;
  category?: string;
  status?: string;
  subject?: string;
  audienceSegment?: Record<string, unknown> | null;
  templateKey?: string | null;
  scheduledFor?: string | null;
  sentAt?: string | null;
  metrics?: Record<string, unknown> | null;
  createdAt?: string | null;
};

type CampaignBlueprint = {
  key: string;
  name: string;
  category: string;
  templateKey: string;
  audience: string;
  governance: string;
};

type CampaignsResponse = {
  campaigns: CampaignRecord[];
  blueprints: CampaignBlueprint[];
};

type TemplateVersionRecord = {
  id?: number;
  templateId?: string;
  type?: string;
  eventTrigger?: string;
  category?: string;
  language?: string;
  version?: number;
  status?: string;
  subject?: string | null;
  title?: string | null;
  quality?: TemplateQuality | Record<string, unknown> | null;
  createdAt?: string | null;
};

type AiAssistance = {
  templateId: string;
  spamRiskScore: number;
  toneConsistencyScore: number;
  subjectSuggestions: string[];
  riskyClaims: string[];
  toneFlags: string[];
  missingPayloadValues: string[];
  governanceNotes: string[];
  quality: TemplateQuality;
};

const eventSamples: Record<string, Record<string, unknown>> = {
  "lead.created": {
    lead_name: "Takondwa Phiri",
    email: "lead@example.com",
    interest_area: "study abroad options",
    reference_id: "MEC-LEAD-1001",
    event_title: "Lead created",
    message: "A new prospective student inquiry was received.",
  },
  "student.registered": {
    student_name: "Chisomo Banda",
    email: "student@example.com",
    reference_id: "MEC-STU-1001",
    event_title: "Student registered",
    message: "A new student profile has been created.",
  },
  "student.application_submitted": {
    student_name: "Chisomo Banda",
    email: "student@example.com",
    program_name: "Bachelor of Computer Science",
    reference_id: "MEC-APP-1001",
    event_title: "Application submitted",
    message: "A student application has entered review.",
  },
  "student.enrolled": {
    student_name: "Chisomo Banda",
    email: "student@example.com",
    course_name: "International Foundation Programme",
    enrollment_status: "confirmed",
    reference_id: "MEC-ENR-1001",
    event_title: "Enrollment confirmed",
    message: "Enrollment has been confirmed by administration.",
  },
  "student.application_approved": {
    student_name: "Chisomo Banda",
    email: "student@example.com",
    program_name: "Bachelor of Business Administration",
    reference_id: "MEC-ADM-1001",
    event_title: "Application approved",
    message: "The student's application has been approved.",
  },
  "payment.received": {
    recipient_name: "Chisomo Banda",
    email: "student@example.com",
    phone: "+265999000000",
    whatsapp_opt_in: true,
    amount: "350",
    currency: "USD",
    payment_status: "confirmed",
    reference_id: "MEC-PAY-1001",
    event_title: "Payment received",
    message: "A payment has been recorded.",
  },
  "payment.failed": {
    recipient_name: "Chisomo Banda",
    email: "student@example.com",
    phone: "+265999000000",
    amount: "350",
    currency: "USD",
    payment_status: "failed",
    reference_id: "MEC-PAY-1002",
    event_title: "Payment failed",
    message: "Payment could not be confirmed. Please retry or contact support.",
  },
  "invoice.generated": {
    recipient_name: "Chisomo Banda",
    email: "student@example.com",
    amount: "350",
    currency: "USD",
    invoice_number: "MEC-INV-1001",
    due_date: "2026-06-30",
    reference_id: "MEC-INV-1001",
    event_title: "Invoice generated",
    message: "An invoice has been generated.",
  },
  "student.offer_letter_requested": {
    student_name: "Chisomo Banda",
    email: "student@example.com",
    program_name: "Bachelor of Business Administration",
    reference_id: "MEC-OFFER-1001",
    event_title: "Offer letter requested",
    message: "Generate an official offer letter.",
  },
  "student.enrollment_certificate_requested": {
    student_name: "Chisomo Banda",
    email: "student@example.com",
    course_name: "International Foundation Programme",
    enrollment_status: "confirmed",
    reference_id: "MEC-CERT-1001",
    event_title: "Enrollment certificate requested",
    message: "Generate an enrollment certificate.",
  },
  "system.alert": {
    event_title: "Operational alert",
    message: "A system alert was recorded for operator review.",
    reference_id: "MEC-SYS-1001",
  },
  "system.security_event": {
    event_title: "Security event",
    message: "A sensitive administrative action was detected.",
    source: "admin",
    whatsapp_opt_in: true,
    reference_id: "MEC-SEC-1001",
  },
};

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await authFetch(url);
  if (!response.ok) {
    throw new Error(await safeResponseMessage(response, "Request failed"));
  }
  return response.json() as Promise<T>;
};

const safeResponseMessage = async (response: Response, fallback: string) => {
  const text = await response.text().catch(() => "");
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as { message?: string; error?: string };
    return parsed.error || parsed.message || fallback;
  } catch {
    return text.slice(0, 240);
  }
};

const formatNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "0";

const formatPercent = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "n/a";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const titleize = (value?: string | null) =>
  (value || "unknown")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const asJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const parseJsonPayload = (value: string) => {
  const parsed = JSON.parse(value || "{}") as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Payload must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
};

const statusTone = (status?: string | null) => {
  const normalized = (status || "").toLowerCase();
  if (/sent|delivered|generated|created|processed|ready|pass|success/.test(normalized)) {
    return "bg-success/15 text-success border-success/30";
  }
  if (/queued|retry|processing|received|warn|pending|dry/.test(normalized)) {
    return "bg-warning/15 text-warning border-warning/30";
  }
  if (/failed|missing|unsupported|rate|rejected|bounced|complaint|fail|critical|error/.test(normalized)) {
    return "bg-destructive/15 text-destructive border-destructive/30";
  }
  return "bg-muted text-muted-foreground border-border/60";
};

const priorityTone = (priority?: string | null) => {
  if (priority === "high") return "bg-destructive/15 text-destructive border-destructive/30";
  if (priority === "medium") return "bg-info/15 text-info border-info/30";
  if (priority === "low") return "bg-muted text-muted-foreground border-border/60";
  return "bg-primary/10 text-primary border-primary/30";
};

const channelIcon = (channel?: string | null) => {
  switch ((channel || "").toLowerCase()) {
    case "email":
      return Mail;
    case "sms":
      return Smartphone;
    case "whatsapp":
      return MessageCircle;
    case "inapp":
      return Bell;
    case "document":
      return FileText;
    default:
      return Inbox;
  }
};

const channelTone = (channel?: string | null) => {
  switch ((channel || "").toLowerCase()) {
    case "email":
      return "bg-primary/10 text-primary";
    case "sms":
      return "bg-success/15 text-success";
    case "whatsapp":
      return "bg-emerald-100 text-emerald-700";
    case "inapp":
      return "bg-info/15 text-info";
    case "document":
      return "bg-warning/15 text-warning";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const copyText = async (value: string) => {
  if (!navigator.clipboard) return false;
  await navigator.clipboard.writeText(value);
  return true;
};

export default function CommunicationsPage() {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateTypeFilter, setTemplateTypeFilter] = useState("all");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const [previewPayload, setPreviewPayload] = useState(() => asJson(eventSamples["student.enrolled"]));
  const [previewEventType, setPreviewEventType] = useState("student.enrolled");
  const [previewSource, setPreviewSource] = useState("admin");
  const [previewResult, setPreviewResult] = useState<PreviewResponse["preview"] | null>(null);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditChannel, setAuditChannel] = useState("all");
  const [auditStatus, setAuditStatus] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<CommunicationMessage | null>(null);
  const [timelineEmail, setTimelineEmail] = useState("");
  const [timelineUserId, setTimelineUserId] = useState("");
  const [timelineRequest, setTimelineRequest] = useState<{ email?: string; userId?: string } | null>(null);
  const [eventType, setEventType] = useState("student.enrolled");
  const [eventSource, setEventSource] = useState("admin");
  const [eventPriority, setEventPriority] = useState("medium");
  const [eventUserId, setEventUserId] = useState("");
  const [eventPayload, setEventPayload] = useState(() => asJson(eventSamples["student.enrolled"]));
  const [eventResult, setEventResult] = useState<EventEmissionResult | null>(null);
  const [aiAssistance, setAiAssistance] = useState<AiAssistance | null>(null);
  const [campaignName, setCampaignName] = useState("Application Follow-Up");
  const [campaignCategory, setCampaignCategory] = useState("admissions");
  const [campaignSubject, setCampaignSubject] = useState("Mtendere application follow-up");
  const [campaignTemplateKey, setCampaignTemplateKey] = useState("application_submitted_email");
  const [campaignAudience, setCampaignAudience] = useState(() => asJson({ status: "pending_review", source: "communication_center" }));

  const templatesQuery = useQuery<{ templates: CommunicationTemplate[] }>({
    queryKey: ["/api/admin/communications/templates"],
    queryFn: () => fetchJson("/api/admin/communications/templates"),
    staleTime: 30000,
  });

  const routesQuery = useQuery<{ routes: RouteDefinition[] }>({
    queryKey: ["/api/admin/communications/routes"],
    queryFn: () => fetchJson("/api/admin/communications/routes"),
    staleTime: 30000,
  });

  const diagnosticsQuery = useQuery<CommunicationDiagnostics>({
    queryKey: ["/api/admin/communications/diagnostics"],
    queryFn: () => fetchJson("/api/admin/communications/diagnostics"),
    staleTime: 30000,
  });

  const analyticsQuery = useQuery<CommunicationAnalytics>({
    queryKey: ["/api/admin/communications/analytics", 500],
    queryFn: () => fetchJson("/api/admin/communications/analytics?limit=500"),
    refetchInterval: 30000,
  });

  const auditQuery = useQuery<{ messages: CommunicationMessage[] }>({
    queryKey: ["/api/admin/communications/audit", 100],
    queryFn: () => fetchJson("/api/admin/communications/audit?limit=100"),
    refetchInterval: 30000,
  });

  const emailHealthQuery = useQuery<EmailHealth>({
    queryKey: ["/api/admin/email/stats", 30],
    queryFn: () => fetchJson("/api/admin/email/stats?days=30"),
    staleTime: 30000,
  });

  const deliverabilityQuery = useQuery<DeliverabilityDiagnostics>({
    queryKey: ["/api/admin/email/deliverability"],
    queryFn: () => fetchJson("/api/admin/email/deliverability"),
    staleTime: 60000,
  });

  const documentsQuery = useQuery<{ documents: CommunicationDocument[] }>({
    queryKey: ["/api/admin/communications/documents", 100],
    queryFn: () => fetchJson("/api/admin/communications/documents?limit=100"),
    refetchInterval: 30000,
  });

  const workflowsQuery = useQuery<WorkflowsResponse>({
    queryKey: ["/api/admin/communications/workflows", 100],
    queryFn: () => fetchJson("/api/admin/communications/workflows?limit=100"),
    refetchInterval: 30000,
  });

  const campaignsQuery = useQuery<CampaignsResponse>({
    queryKey: ["/api/admin/communications/campaigns", 100],
    queryFn: () => fetchJson("/api/admin/communications/campaigns?limit=100"),
    staleTime: 30000,
  });

  const templateVersionsQuery = useQuery<{ versions: TemplateVersionRecord[] }>({
    queryKey: ["/api/admin/communications/template-versions", 100],
    queryFn: () => fetchJson("/api/admin/communications/template-versions?limit=100"),
    staleTime: 30000,
  });

  const timelineQuery = useQuery<TimelineResponse>({
    queryKey: ["/api/admin/communications/timeline", timelineRequest],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (timelineRequest?.email) params.set("email", timelineRequest.email);
      if (timelineRequest?.userId) params.set("userId", timelineRequest.userId);
      return fetchJson(`/api/admin/communications/timeline?${params.toString()}`);
    },
    enabled: Boolean(timelineRequest),
  });

  const templates = templatesQuery.data?.templates ?? [];
  const routes = routesQuery.data?.routes ?? [];
  const diagnostics = diagnosticsQuery.data;
  const analytics = analyticsQuery.data;
  const auditMessages = auditQuery.data?.messages ?? [];
  const emailHealth = emailHealthQuery.data;
  const deliverability = deliverabilityQuery.data ?? emailHealth?.deliverability;
  const documents = documentsQuery.data?.documents ?? [];
  const workflows = workflowsQuery.data?.workflows ?? [];
  const workflowTasks = workflowsQuery.data?.tasks ?? [];
  const campaigns = campaignsQuery.data?.campaigns ?? [];
  const campaignBlueprints = campaignsQuery.data?.blueprints ?? [];
  const templateVersions = templateVersionsQuery.data?.versions ?? [];

  const eventOptions = useMemo(() => {
    const values = new Set<string>();
    routes.forEach((route) => values.add(route.eventType));
    templates.forEach((template) => template.event_trigger !== "*" && values.add(template.event_trigger));
    Object.keys(eventSamples).forEach((sample) => values.add(sample));
    return Array.from(values).sort();
  }, [routes, templates]);

  const templateTypes = useMemo(() => Array.from(new Set(templates.map((template) => template.type))).sort(), [templates]);
  const templateCategories = useMemo(() => Array.from(new Set(templates.map((template) => template.category || "system"))).sort(), [templates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.template_id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  );

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = templateSearch.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesType = templateTypeFilter === "all" || template.type === templateTypeFilter;
      const matchesCategory = templateCategoryFilter === "all" || (template.category || "system") === templateCategoryFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          template.template_id,
          template.event_trigger,
          template.subject,
          template.title,
          template.category,
          template.type,
        ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
      return matchesType && matchesCategory && matchesSearch;
    });
  }, [templateCategoryFilter, templateSearch, templateTypeFilter, templates]);

  const filteredAuditMessages = useMemo(() => {
    const normalizedSearch = auditSearch.trim().toLowerCase();
    return auditMessages.filter((message) => {
      const matchesChannel = auditChannel === "all" || message.channel === auditChannel;
      const matchesStatus = auditStatus === "all" || message.status === auditStatus;
      const matchesSearch =
        !normalizedSearch ||
        [
          message.message_id,
          message.event_id,
          message.event_type,
          message.channel,
          message.status,
          message.recipient,
          message.template_id,
          message.subject,
          message.provider,
        ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
      return matchesChannel && matchesStatus && matchesSearch;
    });
  }, [auditChannel, auditMessages, auditSearch, auditStatus]);

  const auditChannels = useMemo(() => Array.from(new Set(auditMessages.map((message) => message.channel || "unknown"))).sort(), [auditMessages]);
  const auditStatuses = useMemo(() => Array.from(new Set(auditMessages.map((message) => message.status || "unknown"))).sort(), [auditMessages]);

  const routesByEvent = useMemo<Array<[string, RouteDefinition[]]>>(() => {
    const grouped = new Map<string, RouteDefinition[]>();
    routes.forEach((route) => {
      grouped.set(route.eventType, [...(grouped.get(route.eventType) ?? []), route]);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [routes]);

  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].template_id);
    }
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (selectedTemplate && selectedTemplate.event_trigger !== "*") {
      setPreviewEventType(selectedTemplate.event_trigger);
      const sample = eventSamples[selectedTemplate.event_trigger];
      if (sample) setPreviewPayload(asJson(sample));
    }
  }, [selectedTemplate?.event_trigger, selectedTemplate]);

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("Select a template first.");
      const payload = parseJsonPayload(previewPayload);
      const response = await apiRequest("POST", `/api/admin/communications/templates/${encodeURIComponent(selectedTemplate.template_id)}/preview`, {
        eventType: previewEventType,
        source: previewSource,
        payload,
      });
      return response.json() as Promise<PreviewResponse>;
    },
    onSuccess: (data) => {
      setPreviewResult(data.preview);
      toast({ title: "Template preview rendered", description: "Dynamic variables were rendered with safe fallbacks." });
    },
    onError: (error: Error) => {
      toast({ title: "Preview failed", description: error.message, variant: "destructive" });
    },
  });

  const emitEventMutation = useMutation({
    mutationFn: async () => {
      const payload = parseJsonPayload(eventPayload);
      const response = await apiRequest("POST", "/api/admin/communications/events", {
        eventType,
        source: eventSource,
        priority: eventPriority,
        userId: eventUserId ? Number(eventUserId) : undefined,
        payload,
      });
      return response.json() as Promise<EventEmissionResult>;
    },
    onSuccess: (data) => {
      setEventResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communications/audit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communications/analytics"] });
      toast({ title: "Event accepted", description: `Communication event ${data.eventId || ""} was processed.` });
    },
    onError: (error: Error) => {
      toast({ title: "Event failed", description: error.message, variant: "destructive" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest("POST", `/api/admin/communications/messages/${encodeURIComponent(messageId)}/resend`);
      return response.json() as Promise<EventEmissionResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communications/audit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communications/analytics"] });
      toast({ title: "Resend queued", description: "The source event has been replayed with resend metadata." });
    },
    onError: (error: Error) => {
      toast({ title: "Resend failed", description: error.message, variant: "destructive" });
    },
  });

  const replayMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest("POST", `/api/admin/communications/events/${encodeURIComponent(eventId)}/replay`);
      return response.json() as Promise<EventEmissionResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communications/audit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communications/analytics"] });
      toast({ title: "Event replayed", description: "The communication event has been routed again." });
    },
    onError: (error: Error) => {
      toast({ title: "Replay failed", description: error.message, variant: "destructive" });
    },
  });

  const syncTemplateVersionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/communications/template-versions/sync");
      return response.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: () => {
      templateVersionsQuery.refetch();
      toast({ title: "Template versions synced", description: "Built-in templates were written to the governed version registry." });
    },
    onError: (error: Error) => {
      toast({ title: "Template sync failed", description: error.message, variant: "destructive" });
    },
  });

  const aiAssistMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("Select a template first.");
      const payload = parseJsonPayload(previewPayload);
      const response = await apiRequest("POST", `/api/admin/communications/templates/${encodeURIComponent(selectedTemplate.template_id)}/ai-assist`, {
        payload,
      });
      const data = await response.json() as { assistance: AiAssistance };
      return data.assistance;
    },
    onSuccess: (assistance) => {
      setAiAssistance(assistance);
      toast({ title: "AI assistance ready", description: "Template quality, tone, and risk checks were generated." });
    },
    onError: (error: Error) => {
      toast({ title: "AI assistance failed", description: error.message, variant: "destructive" });
    },
  });

  const processWorkflowMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/communications/workflows/process-due?limit=25");
      return response.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: () => {
      workflowsQuery.refetch();
      auditQuery.refetch();
      analyticsQuery.refetch();
      toast({ title: "Workflow processor ran", description: "Due communication workflow tasks were processed." });
    },
    onError: (error: Error) => {
      toast({ title: "Workflow processing failed", description: error.message, variant: "destructive" });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      const audienceSegment = parseJsonPayload(campaignAudience);
      const response = await apiRequest("POST", "/api/admin/communications/campaigns", {
        name: campaignName,
        category: campaignCategory,
        subject: campaignSubject,
        templateKey: campaignTemplateKey,
        audienceSegment,
      });
      return response.json() as Promise<{ campaign: CampaignRecord }>;
    },
    onSuccess: () => {
      campaignsQuery.refetch();
      toast({ title: "Campaign draft created", description: "The campaign is ready for governed review before sending." });
    },
    onError: (error: Error) => {
      toast({ title: "Campaign creation failed", description: error.message, variant: "destructive" });
    },
  });

  const copyMutation = useMutation({
    mutationFn: copyText,
    onSuccess: (copied) => {
      if (copied) toast({ title: "Copied", description: "The JSON payload has been copied." });
    },
  });

  const providerReadyCount = [
    diagnostics?.providers.email?.configured,
    diagnostics?.providers.sms?.configured,
    diagnostics?.providers.whatsapp?.configured,
  ].filter(Boolean).length;

  const routeProblemCount = (diagnostics?.routes.missingTemplates.length ?? 0) + (diagnostics?.templates.orphanTemplates.length ?? 0);
  const templateAverageScore =
    templates.length > 0
      ? Math.round(
          templates.reduce((sum, template) => sum + (template.quality?.score ?? 0), 0) / templates.length,
        )
      : 0;

  const loading =
    templatesQuery.isLoading ||
    routesQuery.isLoading ||
    diagnosticsQuery.isLoading ||
    analyticsQuery.isLoading ||
    auditQuery.isLoading ||
    documentsQuery.isLoading ||
    workflowsQuery.isLoading ||
    campaignsQuery.isLoading;

  const refreshAll = () => {
    templatesQuery.refetch();
    routesQuery.refetch();
    diagnosticsQuery.refetch();
    analyticsQuery.refetch();
    auditQuery.refetch();
    emailHealthQuery.refetch();
    deliverabilityQuery.refetch();
    documentsQuery.refetch();
    workflowsQuery.refetch();
    campaignsQuery.refetch();
    templateVersionsQuery.refetch();
  };

  const applySamplePayload = (event: string, target: "preview" | "emit") => {
    const sample = eventSamples[event] ?? {
      event_title: titleize(event),
      message: `Sample ${event} communication event.`,
      reference_id: `MEC-${Date.now()}`,
    };
    if (target === "preview") {
      setPreviewEventType(event);
      setPreviewPayload(asJson(sample));
    } else {
      setEventType(event);
      setEventPayload(asJson(sample));
      setEventPriority(event.includes("payment") || event.includes("security") ? "high" : "medium");
    }
  };

  const submitTimelineSearch = () => {
    const email = timelineEmail.trim();
    const userId = timelineUserId.trim();
    if (!email && !userId) {
      toast({ title: "Timeline needs a recipient", description: "Enter an email address or user ID.", variant: "destructive" });
      return;
    }
    setTimelineRequest({ email: email || undefined, userId: userId || undefined });
  };

  return (
    <div className="space-y-6">
      <SEO
        title="Communication Center"
        description="Event-driven notifications, templates, document generation, routing, and audit tracking."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Communication Center</h1>
            <p className="text-muted-foreground">
              Event bus, templates, routing, documents, and audit controls for {BRAND_NAME}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={refreshAll} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="gap-2" onClick={() => emitEventMutation.mutate()} disabled={emitEventMutation.isPending}>
            <Send className="h-4 w-4" />
            Emit Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Inbox}
          label="Messages Audited"
          value={formatNumber(analytics?.total ?? auditMessages.length)}
          note={`${formatNumber(analytics?.problemCount ?? 0)} need review`}
          tone="primary"
        />
        <MetricCard
          icon={ClipboardList}
          label="Event Routes"
          value={formatNumber(diagnostics?.routes.total ?? routes.length)}
          note={`${formatNumber(routeProblemCount)} routing issues`}
          tone={routeProblemCount > 0 ? "warning" : "success"}
        />
        <MetricCard
          icon={FileText}
          label="Templates"
          value={formatNumber(diagnostics?.templates.total ?? templates.length)}
          note={`${templateAverageScore}% average quality`}
          tone={templateAverageScore >= 80 ? "success" : "warning"}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Delivery Readiness"
          value={`${providerReadyCount}/3`}
          note={`Email ${deliverability?.ready ? "DNS aligned" : "DNS review"}`}
          tone={deliverability?.ready ? "success" : "warning"}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/70 p-1">
          <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><FileText className="h-4 w-4" />Templates</TabsTrigger>
          <TabsTrigger value="routing" className="gap-2"><Activity className="h-4 w-4" />Routing</TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" />Documents</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><ClipboardList className="h-4 w-4" />Audit</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2"><Search className="h-4 w-4" />Timeline</TabsTrigger>
          <TabsTrigger value="automation" className="gap-2"><Clock className="h-4 w-4" />Automation</TabsTrigger>
          <TabsTrigger value="event-lab" className="gap-2"><Send className="h-4 w-4" />Event Lab</TabsTrigger>
          <TabsTrigger value="governance" className="gap-2"><ShieldCheck className="h-4 w-4" />Governance</TabsTrigger>
          <TabsTrigger value="deliverability" className="gap-2"><ShieldCheck className="h-4 w-4" />Deliverability</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Message Flow</CardTitle>
                <CardDescription>Recent channel mix and delivery state across audited communications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <CountBars title="By Channel" counts={analytics?.byChannel ?? {}} />
                <CountBars title="By Status" counts={analytics?.byStatus ?? {}} toneByStatus />
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Problem Rate" value={formatPercent(analytics?.problemRate)} />
                  <MiniStat label="Delivery Rate" value={formatPercent(emailHealth?.reliability?.deliveryRate)} />
                  <MiniStat label="Queue Load" value={formatNumber(emailHealth?.queueOperations?.congestion ?? 0)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operational Readiness</CardTitle>
                <CardDescription>Providers, DNS, routing, and document link controls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ReadinessRow label="Email queue" ready={diagnostics?.providers.email?.configured} detail={diagnostics?.providers.email?.provider || "email_queue"} />
                <ReadinessRow label="SMS" ready={diagnostics?.providers.sms?.configured} detail={`${diagnostics?.providers.sms?.providers?.filter((item) => item.configured).length ?? 0} configured`} />
                <ReadinessRow label="WhatsApp" ready={diagnostics?.providers.whatsapp?.configured} detail={`${diagnostics?.providers.whatsapp?.providers?.filter((item) => item.configured).length ?? 0} configured`} />
                <ReadinessRow label="Email DNS" ready={deliverability?.ready} detail={`${deliverability?.summary?.fail ?? 0} failed checks`} />
                <ReadinessRow label="Template routes" ready={routeProblemCount === 0} detail={`${routeProblemCount} issues`} />
                <ReadinessRow label="Document links" ready detail={`${diagnostics?.generatedDocuments.linkTtlDays ?? 7} day TTL`} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Problems</CardTitle>
                <CardDescription>Failed, missing, unsupported, rate-limited, bounced, or complaint records.</CardDescription>
              </CardHeader>
              <CardContent>
                <MessageList
                  messages={analytics?.recentProblems ?? []}
                  empty="No recent communication problems were found."
                  onView={setSelectedMessage}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template Quality</CardTitle>
                <CardDescription>Brand consistency, support notice, spam signal, and variable hygiene.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {diagnostics?.templates.diagnostics.slice(0, 8).map((template) => (
                  <div key={template.templateId} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{template.templateId}</p>
                        <p className="text-xs text-muted-foreground">{template.type} to {template.eventTrigger}</p>
                      </div>
                      <QualityBadge score={template.quality?.score ?? 0} />
                    </div>
                    <Progress value={template.quality?.score ?? 0} className="mt-3 h-2" />
                  </div>
                )) ?? <EmptyState text="Template diagnostics are not available yet." />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Template Registry</CardTitle>
                <CardDescription>Unified email, SMS, in-app, and document templates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                  <Input
                    value={templateSearch}
                    onChange={(event) => setTemplateSearch(event.target.value)}
                    placeholder="Search templates..."
                    className="sm:col-span-3 xl:col-span-1"
                  />
                  <Select value={templateTypeFilter} onValueChange={setTemplateTypeFilter}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {templateTypes.map((type) => <SelectItem key={type} value={type}>{titleize(type)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {templateCategories.map((category) => <SelectItem key={category} value={category}>{titleize(category)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => selectedTemplate && applySamplePayload(selectedTemplate.event_trigger, "preview")}>
                    Load Sample
                  </Button>
                </div>

                <ScrollArea className="h-[620px] pr-3">
                  <div className="space-y-2">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.template_id}
                        type="button"
                        onClick={() => setSelectedTemplateId(template.template_id)}
                        className={cn(
                          "w-full rounded-lg border p-3 text-left transition-colors",
                          selectedTemplate?.template_id === template.template_id
                            ? "border-primary/60 bg-primary/10"
                            : "border-border/60 bg-card hover:bg-muted/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{template.template_id}</p>
                            <p className="truncate text-xs text-muted-foreground">{template.event_trigger}</p>
                          </div>
                          <QualityBadge score={template.quality?.score ?? 0} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{template.type}</Badge>
                          <Badge variant="secondary" className="border-0 bg-muted text-[10px] text-muted-foreground">
                            {template.category || "system"}
                          </Badge>
                          {(template.variableDiagnostics?.undeclared?.length ?? 0) > 0 && (
                            <Badge className="border-0 bg-destructive/15 text-[10px] text-destructive">
                              {template.variableDiagnostics?.undeclared?.length} undeclared
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                    {filteredTemplates.length === 0 && <EmptyState text="No templates match those filters." />}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>{selectedTemplate?.template_id || "Select a template"}</CardTitle>
                      <CardDescription>
                        {selectedTemplate ? `${titleize(selectedTemplate.type)} template for ${selectedTemplate.event_trigger}` : "Choose a template to inspect and preview."}
                      </CardDescription>
                    </div>
                    {selectedTemplate && (
                      <div className="flex flex-wrap gap-2">
                        <Badge className={channelTone(selectedTemplate.type)}>{selectedTemplate.type}</Badge>
                        <Badge variant="outline">v{selectedTemplate.version ?? 1}</Badge>
                        <QualityBadge score={selectedTemplate.quality?.score ?? 0} />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {selectedTemplate ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-3">
                        <InfoBlock label="Subject or Title" value={selectedTemplate.subject || selectedTemplate.title || "-"} />
                        <InfoBlock label="Category" value={titleize(selectedTemplate.category)} />
                        <InfoBlock label="Language" value={(selectedTemplate.language || "en").toUpperCase()} />
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-medium">Variable Contract</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedTemplate.variables ?? []).map((variable) => (
                            <Badge key={variable} variant="outline" className="bg-background font-mono text-[11px]">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <DiagnosticPill
                          label="Used"
                          value={selectedTemplate.variableDiagnostics?.used?.length ?? 0}
                          tone="primary"
                        />
                        <DiagnosticPill
                          label="Undeclared"
                          value={selectedTemplate.variableDiagnostics?.undeclared?.length ?? 0}
                          tone={(selectedTemplate.variableDiagnostics?.undeclared?.length ?? 0) > 0 ? "danger" : "success"}
                        />
                        <DiagnosticPill
                          label="Unused Declared"
                          value={selectedTemplate.variableDiagnostics?.unusedDeclared?.length ?? 0}
                          tone={(selectedTemplate.variableDiagnostics?.unusedDeclared?.length ?? 0) > 0 ? "warning" : "success"}
                        />
                      </div>

                      <IssueList issues={selectedTemplate.quality?.issues ?? []} />
                    </>
                  ) : (
                    <EmptyState text="Templates are still loading." />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Safe Render Preview</CardTitle>
                  <CardDescription>Preview uses the server template engine with sanitized variables and default fallbacks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label htmlFor="preview-event">Event Type</Label>
                      <Select value={previewEventType} onValueChange={(value) => applySamplePayload(value, "preview")}>
                        <SelectTrigger id="preview-event" className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {eventOptions.map((event) => <SelectItem key={event} value={event}>{event}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="preview-source">Source</Label>
                      <Select value={previewSource} onValueChange={setPreviewSource}>
                        <SelectTrigger id="preview-source" className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button className="w-full gap-2" onClick={() => previewMutation.mutate()} disabled={!selectedTemplate || previewMutation.isPending}>
                        <Eye className="h-4 w-4" />
                        {previewMutation.isPending ? "Rendering" : "Preview"}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="preview-payload">Payload JSON</Label>
                    <Textarea
                      id="preview-payload"
                      value={previewPayload}
                      onChange={(event) => setPreviewPayload(event.target.value)}
                      className="mt-1 min-h-48 font-mono text-xs"
                      spellCheck={false}
                    />
                  </div>
                  {previewResult && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-border/60 p-4">
                        <p className="text-sm font-semibold">{previewResult.rendered.subject || previewResult.rendered.title}</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {previewResult.rendered.text || "No text body generated."}
                        </p>
                        {(previewResult.variableDiagnostics.missingPayloadValues?.length ?? 0) > 0 && (
                          <div className="mt-3 rounded-md bg-warning/10 p-3 text-xs text-warning">
                            Missing payload values: {previewResult.variableDiagnostics.missingPayloadValues?.join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border/60">
                        {previewResult.rendered.html ? (
                          <iframe
                            title="Communication template HTML preview"
                            srcDoc={previewResult.rendered.html}
                            sandbox=""
                            className="h-[360px] w-full bg-white"
                          />
                        ) : (
                          <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                            HTML preview is not available for this template type.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="routing" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Event Routing Matrix</CardTitle>
                <CardDescription>Event Bus to Notification Router to Template Engine to Delivery Providers.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {routesByEvent.map(([event, eventRoutes]) => (
                    <div key={event} className="rounded-lg border border-border/60 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{event}</p>
                          <p className="text-sm text-muted-foreground">{eventRoutes.length} channel route{eventRoutes.length === 1 ? "" : "s"}</p>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => applySamplePayload(event, "emit")}>
                          <Send className="h-4 w-4" />
                          Load in Event Lab
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-2 lg:grid-cols-2">
                        {eventRoutes.map((route) => (
                          <RouteRow key={`${route.eventType}-${route.channel}-${route.templateId}`} route={route} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {routesByEvent.length === 0 && <EmptyState text="Routes are not available yet." />}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Channel Coverage</CardTitle>
                  <CardDescription>Configured route count by delivery channel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CountBars counts={diagnostics?.routes.byChannel ?? {}} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Routing Diagnostics</CardTitle>
                  <CardDescription>Missing templates and orphan templates.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(diagnostics?.routes.missingTemplates.length ?? 0) > 0 ? (
                    diagnostics?.routes.missingTemplates.map((item) => (
                      <div key={`${item.eventType}-${item.channel}-${item.templateId}`} className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        Missing {item.templateId} for {item.eventType} on {item.channel}
                      </div>
                    ))
                  ) : (
                    <ReadinessRow label="Missing templates" ready detail="None found" />
                  )}
                  {(diagnostics?.templates.orphanTemplates.length ?? 0) > 0 ? (
                    diagnostics?.templates.orphanTemplates.map((templateId) => (
                      <div key={templateId} className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                        Orphan template: {templateId}
                      </div>
                    ))
                  ) : (
                    <ReadinessRow label="Orphan templates" ready detail="None found" />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Generated Documents</CardTitle>
                  <CardDescription>Official PDFs, signed download links, expiry, reference numbers, and source events.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => documentsQuery.refetch()}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Document</th>
                      <th className="px-4 py-3 text-left">Reference</th>
                      <th className="px-4 py-3 text-left">Recipient</th>
                      <th className="px-4 py-3 text-left">Event</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Expires</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 bg-card">
                    {documents.map((document) => (
                      <tr key={document.id || document.fileName} className="hover:bg-muted/40">
                        <td className="max-w-[220px] px-4 py-3">
                          <p className="truncate font-medium">{titleize(document.documentType)}</p>
                          <p className="truncate text-xs text-muted-foreground">{document.fileName}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{document.referenceId || "-"}</td>
                        <td className="max-w-[180px] px-4 py-3">
                          <span className="truncate text-xs text-muted-foreground">{document.recipient || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs">{document.eventType || "-"}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{document.eventId || "no event"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusTone(document.status)}>{document.status || "unknown"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(document.expiresAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <IconButton
                              label="Copy link"
                              onClick={() => document.downloadUrl && copyMutation.mutate(document.downloadUrl)}
                              disabled={!document.downloadUrl}
                            >
                              <Copy className="h-4 w-4" />
                            </IconButton>
                            <IconButton
                              label="Replay source event"
                              onClick={() => document.eventId && replayMutation.mutate(document.eventId)}
                              disabled={!document.eventId || replayMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {documents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12">
                          <EmptyState text="No generated documents have been recorded yet." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>Communication Audit Trail</CardTitle>
                  <CardDescription>Every rendered message, delivery result, generated document, and skipped route.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={auditSearch}
                    onChange={(event) => setAuditSearch(event.target.value)}
                    placeholder="Search audit..."
                    className="w-full sm:w-64"
                  />
                  <Select value={auditChannel} onValueChange={setAuditChannel}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All channels</SelectItem>
                      {auditChannels.map((channel) => <SelectItem key={channel} value={channel}>{titleize(channel)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={auditStatus} onValueChange={setAuditStatus}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {auditStatuses.map((status) => <SelectItem key={status} value={status}>{titleize(status)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Message</th>
                      <th className="px-4 py-3 text-left">Event</th>
                      <th className="px-4 py-3 text-left">Channel</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Recipient</th>
                      <th className="px-4 py-3 text-left">Provider</th>
                      <th className="px-4 py-3 text-left">Time</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 bg-card">
                    {filteredAuditMessages.map((message, index) => {
                      const ChannelIcon = channelIcon(message.channel);
                      return (
                        <tr key={message.message_id || `${message.event_id}-${index}`} className="hover:bg-muted/40">
                          <td className="max-w-[230px] px-4 py-3">
                            <p className="truncate font-medium">{message.subject || message.template_id || message.message_id}</p>
                            <p className="truncate text-xs text-muted-foreground">{message.message_id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs">{message.event_type || "-"}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{message.event_id || "no event"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={cn("border-0 gap-1.5", channelTone(message.channel))}>
                              <ChannelIcon className="h-3 w-3" />
                              {message.channel || "unknown"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={statusTone(message.status)}>
                              {message.status || "unknown"}
                            </Badge>
                          </td>
                          <td className="max-w-[180px] px-4 py-3">
                            <span className="truncate text-xs text-muted-foreground">{message.recipient || "-"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">{message.provider || "-"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">{formatDateTime(message.timestamp)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <IconButton label="View diagnostics" onClick={() => setSelectedMessage(message)}>
                                <Eye className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label="Resend message"
                                onClick={() => message.message_id && resendMutation.mutate(message.message_id)}
                                disabled={!message.message_id || resendMutation.isPending}
                              >
                                <RotateCw className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label="Replay source event"
                                onClick={() => message.event_id && replayMutation.mutate(message.event_id)}
                                disabled={!message.event_id || replayMutation.isPending}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredAuditMessages.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12">
                          <EmptyState text="No audit records match those filters." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recipient Timeline</CardTitle>
              <CardDescription>Look up every channel touchpoint tied to a student, applicant, admin, or system recipient.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <div>
                  <Label htmlFor="timeline-email">Recipient Email</Label>
                  <Input
                    id="timeline-email"
                    value={timelineEmail}
                    onChange={(event) => setTimelineEmail(event.target.value)}
                    placeholder="student@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="timeline-user">User ID</Label>
                  <Input
                    id="timeline-user"
                    value={timelineUserId}
                    onChange={(event) => setTimelineUserId(event.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Optional"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button className="w-full gap-2" onClick={submitTimelineSearch} disabled={timelineQuery.isFetching}>
                    <Search className="h-4 w-4" />
                    {timelineQuery.isFetching ? "Searching" : "Search"}
                  </Button>
                </div>
              </div>

              {timelineRequest ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div>
                      <p className="text-sm font-semibold">Timeline results</p>
                      <p className="text-xs text-muted-foreground">
                        {timelineQuery.data?.total ?? 0} touchpoint{timelineQuery.data?.total === 1 ? "" : "s"} found
                      </p>
                    </div>
                    <Badge variant="outline">
                      {timelineRequest.email || `User ${timelineRequest.userId}`}
                    </Badge>
                  </div>
                  <MessageList
                    messages={timelineQuery.data?.items ?? []}
                    empty={timelineQuery.isFetching ? "Searching timeline..." : "No communication history found for this recipient."}
                    onView={setSelectedMessage}
                  />
                </div>
              ) : (
                <EmptyState text="Search by email or user ID to build a communication timeline." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>Workflow Automation</CardTitle>
                      <CardDescription>Event-triggered follow-up chains, review checkpoints, and due task processing.</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => processWorkflowMutation.mutate()}
                      disabled={processWorkflowMutation.isPending}
                    >
                      <RefreshCw className={cn("h-4 w-4", processWorkflowMutation.isPending && "animate-spin")} />
                      Process Due
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {workflows.map((workflow) => (
                    <div key={workflow.workflowId} className="rounded-lg border border-border/60 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{workflow.name}</p>
                          <p className="text-sm text-muted-foreground">{workflow.eventTrigger} - {workflow.owner}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className={workflow.active ? statusTone("processed") : statusTone("draft")}>
                            {workflow.active ? "active" : "inactive"}
                          </Badge>
                          <Badge variant="outline">{workflow.pendingTasks ?? 0} pending</Badge>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {workflow.steps.map((step) => (
                          <div key={`${workflow.workflowId}-${step.stepId}`} className="rounded-lg bg-muted/30 p-3 text-sm">
                            <p className="font-medium">{titleize(step.stepId)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Badge variant="secondary" className="border-0 text-[10px]">{step.action}</Badge>
                              <Badge variant="outline" className="text-[10px]">{step.delayMinutes} min</Badge>
                              {step.eventType && <Badge variant="outline" className="text-[10px]">{step.eventType}</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {workflows.length === 0 && <EmptyState text="No workflow definitions are available yet." />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Workflow Tasks</CardTitle>
                  <CardDescription>Scheduled automation tasks created by emitted events.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {workflowTasks.slice(0, 12).map((task) => (
                      <div key={task.id} className="rounded-lg border border-border/60 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{task.workflowId} - {task.stepId}</p>
                            <p className="text-xs text-muted-foreground">{task.eventType} scheduled {formatDateTime(task.scheduledFor)}</p>
                          </div>
                          <Badge variant="outline" className={statusTone(task.status)}>{task.status || "pending"}</Badge>
                        </div>
                        {task.lastError && <p className="mt-2 text-xs text-destructive">{task.lastError}</p>}
                      </div>
                    ))}
                    {workflowTasks.length === 0 && <EmptyState text="No workflow tasks have been scheduled yet." />}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Draft</CardTitle>
                  <CardDescription>Create governed campaign records before delivery review.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="campaign-name">Name</Label>
                    <Input id="campaign-name" value={campaignName} onChange={(event) => setCampaignName(event.target.value)} className="mt-1" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="campaign-category">Category</Label>
                      <Input id="campaign-category" value={campaignCategory} onChange={(event) => setCampaignCategory(event.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="campaign-template">Template</Label>
                      <Input id="campaign-template" value={campaignTemplateKey} onChange={(event) => setCampaignTemplateKey(event.target.value)} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="campaign-subject">Subject</Label>
                    <Input id="campaign-subject" value={campaignSubject} onChange={(event) => setCampaignSubject(event.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="campaign-audience">Audience Segment JSON</Label>
                    <Textarea
                      id="campaign-audience"
                      value={campaignAudience}
                      onChange={(event) => setCampaignAudience(event.target.value)}
                      className="mt-1 min-h-28 font-mono text-xs"
                      spellCheck={false}
                    />
                  </div>
                  <Button className="w-full gap-2" onClick={() => createCampaignMutation.mutate()} disabled={createCampaignMutation.isPending}>
                    <Send className="h-4 w-4" />
                    {createCampaignMutation.isPending ? "Creating" : "Create Draft"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Campaign Blueprints</CardTitle>
                  <CardDescription>Reusable campaign strategies with governance notes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {campaignBlueprints.map((blueprint) => (
                    <button
                      key={blueprint.key}
                      type="button"
                      className="w-full rounded-lg border border-border/60 p-3 text-left transition-colors hover:bg-muted/50"
                      onClick={() => {
                        setCampaignName(blueprint.name);
                        setCampaignCategory(blueprint.category);
                        setCampaignTemplateKey(blueprint.templateKey);
                        setCampaignSubject(`${BRAND_NAME}: ${blueprint.name}`);
                      }}
                    >
                      <p className="text-sm font-semibold">{blueprint.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{blueprint.audience}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{blueprint.governance}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Campaign Records</CardTitle>
                  <CardDescription>Drafts and scheduled campaign shells.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {campaigns.slice(0, 8).map((campaign) => (
                    <div key={campaign.id || campaign.name} className="rounded-lg border border-border/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{campaign.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{campaign.subject}</p>
                        </div>
                        <Badge variant="outline" className={statusTone(campaign.status)}>{campaign.status || "draft"}</Badge>
                      </div>
                    </div>
                  ))}
                  {campaigns.length === 0 && <EmptyState text="No campaign records have been created yet." />}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="event-lab" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
            <Card>
              <CardHeader>
                <CardTitle>Event Lab</CardTitle>
                <CardDescription>Emit internal communication events through the real router and providers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="event-type">Event Type</Label>
                    <Select value={eventType} onValueChange={(value) => applySamplePayload(value, "emit")}>
                      <SelectTrigger id="event-type" className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {eventOptions.map((event) => <SelectItem key={event} value={event}>{event}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="event-source">Source</Label>
                    <Select value={eventSource} onValueChange={setEventSource}>
                      <SelectTrigger id="event-source" className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="event-priority">Priority</Label>
                    <Select value={eventPriority} onValueChange={setEventPriority}>
                      <SelectTrigger id="event-priority" className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                  <div>
                    <Label htmlFor="event-user">User ID</Label>
                    <Input
                      id="event-user"
                      value={eventUserId}
                      onChange={(event) => setEventUserId(event.target.value.replace(/[^\d]/g, ""))}
                      placeholder="Optional"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => copyMutation.mutate(eventPayload)}>
                      <Copy className="h-4 w-4" />
                      Copy Payload
                    </Button>
                    <Button className="gap-2" onClick={() => emitEventMutation.mutate()} disabled={emitEventMutation.isPending}>
                      <Send className="h-4 w-4" />
                      {emitEventMutation.isPending ? "Emitting" : "Emit Event"}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="event-payload">Payload JSON</Label>
                  <Textarea
                    id="event-payload"
                    value={eventPayload}
                    onChange={(event) => setEventPayload(event.target.value)}
                    className="mt-1 min-h-[360px] font-mono text-xs"
                    spellCheck={false}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sample Events</CardTitle>
                  <CardDescription>Load brand-ready payload examples for common Mtendere workflows.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.keys(eventSamples).map((sample) => (
                    <Button
                      key={sample}
                      variant={sample === eventType ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => applySamplePayload(sample, "emit")}
                    >
                      {sample}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Last Event Result</CardTitle>
                  <CardDescription>Result returned by the communication router.</CardDescription>
                </CardHeader>
                <CardContent>
                  {eventResult ? (
                    <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted/60 p-3 text-xs">
                      {asJson(eventResult)}
                    </pre>
                  ) : (
                    <EmptyState text="Emit an event to see route results and generated document links." />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="governance" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>Governance Controls</CardTitle>
                      <CardDescription>Template injection protection, consent, document signing, priority policy, and audit readiness.</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => syncTemplateVersionsMutation.mutate()}
                      disabled={syncTemplateVersionsMutation.isPending}
                    >
                      <RefreshCw className={cn("h-4 w-4", syncTemplateVersionsMutation.isPending && "animate-spin")} />
                      Sync Versions
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(diagnostics?.governance ?? {}).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-border/60 p-3">
                      <p className="text-sm font-semibold">{titleize(key)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{String(value)}</p>
                    </div>
                  ))}
                  {Object.keys(diagnostics?.governance ?? {}).length === 0 && <EmptyState text="Governance diagnostics are not available yet." />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Template Version Registry</CardTitle>
                  <CardDescription>Governed snapshots of templates currently available to the communication center.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-border/60">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left">Template</th>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-left">Event</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Version</th>
                          <th className="px-4 py-3 text-left">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 bg-card">
                        {templateVersions.map((version) => (
                          <tr key={`${version.templateId}-${version.version}-${version.id}`}>
                            <td className="max-w-[220px] px-4 py-3">
                              <p className="truncate font-medium">{version.templateId}</p>
                              <p className="truncate text-xs text-muted-foreground">{version.subject || version.title || "-"}</p>
                            </td>
                            <td className="px-4 py-3">{version.type}</td>
                            <td className="px-4 py-3 font-mono text-xs">{version.eventTrigger}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={statusTone(version.status)}>{version.status || "unknown"}</Badge>
                            </td>
                            <td className="px-4 py-3">v{version.version ?? 1}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(version.createdAt)}</td>
                          </tr>
                        ))}
                        {templateVersions.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-12">
                              <EmptyState text="No governed template versions are stored yet. Sync built-ins to create version records." />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Template Assistance</CardTitle>
                  <CardDescription>Subject suggestions, tone consistency, spam risk, variable gaps, and governance notes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full gap-2" onClick={() => aiAssistMutation.mutate()} disabled={!selectedTemplate || aiAssistMutation.isPending}>
                    <BarChart3 className="h-4 w-4" />
                    {aiAssistMutation.isPending ? "Analyzing" : "Analyze Selected Template"}
                  </Button>
                  {aiAssistance ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <MiniStat label="Spam Risk" value={`${aiAssistance.spamRiskScore}%`} />
                        <MiniStat label="Tone Score" value={`${aiAssistance.toneConsistencyScore}%`} />
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-semibold">Subject Suggestions</p>
                        <div className="space-y-2">
                          {aiAssistance.subjectSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              className="w-full rounded-lg border border-border/60 p-3 text-left text-sm hover:bg-muted/50"
                              onClick={() => copyMutation.mutate(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                      <IssueList
                        issues={[
                          ...aiAssistance.toneFlags.map((message) => ({ severity: "warning", code: "tone", message })),
                          ...aiAssistance.riskyClaims.map((message) => ({ severity: "warning", code: "claim_risk", message })),
                          ...aiAssistance.missingPayloadValues.map((message) => ({ severity: "info", code: "missing_variable", message })),
                        ]}
                      />
                      <div className="space-y-2">
                        {aiAssistance.governanceNotes.map((note) => (
                          <div key={note} className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                            {note}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="Run AI assistance on the selected template to inspect tone, risk, and subject options." />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Route Coverage</CardTitle>
                  <CardDescription>Event-to-channel coverage produced by the notification router.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(diagnostics?.channelMatrix ?? {}).map(([event, channels]) => (
                    <div key={event} className="rounded-lg border border-border/60 p-3">
                      <p className="truncate font-mono text-xs font-semibold">{event}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(channels).filter(([, enabled]) => enabled).map(([channel]) => {
                          const Icon = channelIcon(channel);
                          return (
                            <Badge key={channel} className={cn("border-0 gap-1.5", channelTone(channel))}>
                              <Icon className="h-3 w-3" />
                              {channel}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="deliverability" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
            <Card>
              <CardHeader>
                <CardTitle>Email Deliverability</CardTitle>
                <CardDescription>SPF, DKIM, DMARC, BIMI, provider, and delivery alignment checks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <MiniStat label="Ready" value={deliverability?.ready ? "Yes" : "No"} />
                  <MiniStat label="Pass" value={formatNumber(deliverability?.summary?.pass ?? 0)} />
                  <MiniStat label="Warn" value={formatNumber(deliverability?.summary?.warn ?? 0)} />
                  <MiniStat label="Fail" value={formatNumber(deliverability?.summary?.fail ?? 0)} />
                </div>

                <div className="space-y-2">
                  {(deliverability?.checks ?? []).map((check, index) => (
                    <div key={`${check.name}-${index}`} className="rounded-lg border border-border/60 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{check.name || `Check ${index + 1}`}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{check.message || "No message provided."}</p>
                        </div>
                        <Badge variant="outline" className={statusTone(check.status || check.severity)}>
                          {check.status || check.severity || "unknown"}
                        </Badge>
                      </div>
                      {(check.value || check.expected) && (
                        <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                          <InfoBlock label="Observed" value={check.value || "-"} />
                          <InfoBlock label="Expected" value={check.expected || "-"} />
                        </div>
                      )}
                    </div>
                  ))}
                  {(deliverability?.checks ?? []).length === 0 && (
                    <EmptyState text={deliverability?.error || "Deliverability checks are not available yet."} />
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Reliability</CardTitle>
                  <CardDescription>Last 30 days of email queue and provider performance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MiniStat label="Sent" value={formatNumber(emailHealth?.reliability?.sent ?? 0)} />
                  <MiniStat label="Delivered" value={formatNumber(emailHealth?.reliability?.delivered ?? 0)} />
                  <MiniStat label="Failed" value={formatNumber(emailHealth?.reliability?.failed ?? 0)} />
                  <MiniStat label="Bounced" value={formatNumber(emailHealth?.reliability?.bounced ?? 0)} />
                  <Separator />
                  <MiniStat label="Queued" value={formatNumber(emailHealth?.queueOperations?.queued ?? 0)} />
                  <MiniStat label="Retry Scheduled" value={formatNumber(emailHealth?.queueOperations?.retryScheduled ?? 0)} />
                  <MiniStat label="Dead Letter" value={formatNumber(emailHealth?.queueOperations?.deadLetter ?? 0)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Provider Alerts</CardTitle>
                  <CardDescription>Items that need operator review before production scale.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(emailHealth?.alerts ?? []).map((alert) => (
                    <div key={alert.code || alert.message} className={cn("rounded-lg border p-3 text-sm", statusTone(alert.severity))}>
                      <p className="font-semibold">{titleize(alert.severity)}</p>
                      <p className="mt-1">{alert.message}</p>
                    </div>
                  ))}
                  {(emailHealth?.alerts ?? []).length === 0 && <EmptyState text="No provider alerts are currently reported." />}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedMessage} onOpenChange={(open) => { if (!open) setSelectedMessage(null); }}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Communication Message</DialogTitle>
            <DialogDescription>Delivery metadata, diagnostics, provider data, and replay identifiers.</DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <InfoBlock label="Message ID" value={selectedMessage.message_id || "-"} />
                <InfoBlock label="Event ID" value={selectedMessage.event_id || "-"} />
                <InfoBlock label="Event Type" value={selectedMessage.event_type || "-"} />
                <InfoBlock label="Channel" value={selectedMessage.channel || "-"} />
                <InfoBlock label="Status" value={selectedMessage.status || "-"} />
                <InfoBlock label="Recipient" value={selectedMessage.recipient || "-"} />
                <InfoBlock label="Template" value={selectedMessage.template_id || "-"} />
                <InfoBlock label="Provider" value={selectedMessage.provider || "-"} />
                <InfoBlock label="Timestamp" value={formatDateTime(selectedMessage.timestamp)} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Raw Audit Record</p>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => copyMutation.mutate(asJson(selectedMessage))}>
                    <Copy className="h-4 w-4" />
                    Copy JSON
                  </Button>
                </div>
                <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted/60 p-3 text-xs">
                  {asJson(selectedMessage)}
                </pre>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => selectedMessage.event_id && replayMutation.mutate(selectedMessage.event_id)}
                  disabled={!selectedMessage.event_id || replayMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                  Replay Event
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => selectedMessage.message_id && resendMutation.mutate(selectedMessage.message_id)}
                  disabled={!selectedMessage.message_id || resendMutation.isPending}
                >
                  <RotateCw className="h-4 w-4" />
                  Resend
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note: string;
  tone: "primary" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning"
        : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function DiagnosticPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "warning" | "danger";
}) {
  const className = {
    primary: "bg-primary/10 text-primary border-primary/30",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-destructive/15 text-destructive border-destructive/30",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-3", className)}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function QualityBadge({ score }: { score: number }) {
  const tone = score >= 85
    ? "bg-success/15 text-success border-success/30"
    : score >= 70
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <Badge variant="outline" className={cn("shrink-0", tone)}>
      {score}%
    </Badge>
  );
}

function ReadinessRow({ label, ready, detail }: { label: string; ready?: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      {ready ? (
        <CheckCircle className="h-5 w-5 shrink-0 text-success" />
      ) : (
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
      )}
    </div>
  );
}

function CountBars({
  title,
  counts,
  toneByStatus = false,
}: {
  title?: string;
  counts: Record<string, number>;
  toneByStatus?: boolean;
}) {
  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (entries.length === 0) return <EmptyState text="No counts available yet." />;
  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
      {entries.map(([label, count]) => {
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        const Icon = channelIcon(label);
        return (
          <div key={label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                {!toneByStatus && <Icon className="h-4 w-4 text-muted-foreground" />}
                <span className="truncate font-medium">{titleize(label)}</span>
                {toneByStatus && <Badge variant="outline" className={statusTone(label)}>{label}</Badge>}
              </div>
              <span className="text-muted-foreground">{formatNumber(count)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IssueList({ issues }: { issues: QualityIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
        No quality issues reported for this template.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Quality Notes</p>
      {issues.map((issue, index) => (
        <div key={`${issue.code}-${index}`} className={cn("rounded-lg border p-3 text-sm", statusTone(issue.severity))}>
          <p className="font-medium">{issue.code ? titleize(issue.code) : titleize(issue.severity)}</p>
          <p className="mt-1">{issue.message || "No message provided."}</p>
        </div>
      ))}
    </div>
  );
}

function RouteRow({ route }: { route: RouteDefinition }) {
  const Icon = channelIcon(route.channel);
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", channelTone(route.channel))}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{route.templateId}</p>
              <p className="text-xs text-muted-foreground">{route.emailCategory || route.recipientField || "platform route"}</p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className={priorityTone(route.priority)}>
          {route.priority}
        </Badge>
      </div>
    </div>
  );
}

function MessageList({
  messages,
  empty,
  onView,
}: {
  messages: CommunicationMessage[];
  empty: string;
  onView: (message: CommunicationMessage) => void;
}) {
  if (messages.length === 0) return <EmptyState text={empty} />;
  return (
    <div className="space-y-2">
      {messages.map((message, index) => {
        const Icon = channelIcon(message.channel);
        return (
          <button
            key={message.message_id || `${message.event_id}-${index}`}
            type="button"
            className="w-full rounded-lg border border-border/60 p-3 text-left transition-colors hover:bg-muted/50"
            onClick={() => onView(message)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", channelTone(message.channel))}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {message.subject || message.template_id || message.event_type || "Communication"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {message.recipient || "No recipient"} - {formatDateTime(message.timestamp)}
                  </span>
                </span>
              </div>
              <Badge variant="outline" className={statusTone(message.status)}>{message.status || "unknown"}</Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
      <Inbox className="mb-2 h-8 w-8 text-muted-foreground/50" />
      {text}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
