import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import DataTable from "@/components/admin/DataTable";
import { apiRequest, authFetch, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCreateAction } from "@/hooks/use-create-action";
import { getInitialUrlSearchParam } from "@/hooks/use-url-search-param";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  MapPin,
  Plus,
  ShieldCheck,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type AdminEvent = {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  description: string;
  category: string;
  eventType: string;
  organizer?: string | null;
  location: string;
  venueName?: string | null;
  address?: string | null;
  mapUrl?: string | null;
  isVirtual?: boolean | null;
  virtualUrl?: string | null;
  livestreamUrl?: string | null;
  isPaid?: boolean | null;
  priceAmount?: number | null;
  currency?: string | null;
  capacity?: number | null;
  rsvpEnabled?: boolean | null;
  startAt: string;
  endAt: string;
  registrationDeadline?: string | null;
  coverImage?: string | null;
  videoUrl?: string | null;
  tags?: string[] | null;
  ticketTypes?: Array<Record<string, unknown>> | null;
  customFields?: Array<Record<string, unknown>> | null;
  agenda?: Array<Record<string, unknown>> | null;
  speakers?: Array<Record<string, unknown>> | null;
  sponsors?: Array<Record<string, unknown>> | null;
  partners?: Array<Record<string, unknown>> | null;
  resources?: Array<Record<string, unknown>> | null;
  attachments?: Array<Record<string, unknown>> | null;
  seoMeta?: Record<string, unknown> | null;
  socialMeta?: Record<string, unknown> | null;
  status: "draft" | "published" | "archived" | "cancelled" | string;
  runtimeStatus?: string;
  isFeatured?: boolean | null;
  isRecommended?: boolean | null;
  isTrending?: boolean | null;
  allowComments?: boolean | null;
  requiresApproval?: boolean | null;
  registrationCount?: number;
  approvedRegistrationCount?: number;
  remainingSeats?: number | null;
  conversionRate?: number;
  viewCount?: number | null;
  shareCount?: number | null;
  likeCount?: number | null;
  createdAt?: string | null;
};

type EventRegistration = {
  id: number;
  eventId: number;
  fullName: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  ticketType?: string | null;
  status: string;
  ticketCode: string;
  attendanceStatus: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  createdAt?: string | null;
};

type EventFormState = {
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string;
  eventType: string;
  organizer: string;
  location: string;
  venueName: string;
  address: string;
  mapUrl: string;
  isVirtual: boolean;
  virtualUrl: string;
  livestreamUrl: string;
  isPaid: boolean;
  priceAmount: string;
  currency: string;
  capacity: string;
  rsvpEnabled: boolean;
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  coverImage: string;
  videoUrl: string;
  tags: string;
  ticketTypes: string;
  customFields: string;
  agenda: string;
  speakers: string;
  sponsors: string;
  partners: string;
  resources: string;
  attachments: string;
  seoTitle: string;
  seoDescription: string;
  status: "draft" | "published" | "archived" | "cancelled";
  isFeatured: boolean;
  isRecommended: boolean;
  isTrending: boolean;
  allowComments: boolean;
  requiresApproval: boolean;
};

const futureLocalDate = (days: number, hour = 9) => {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  date.setHours(hour, 0, 0, 0);
  return toDateTimeLocal(date.toISOString());
};

const emptyForm = (): EventFormState => ({
  title: "",
  slug: "",
  summary: "",
  description: "",
  category: "Scholarships",
  eventType: "Workshop",
  organizer: "Mtendere Education Consult",
  location: "Lilongwe, Malawi",
  venueName: "Mtendere Education Consult",
  address: "Lilongwe, Malawi",
  mapUrl: "",
  isVirtual: false,
  virtualUrl: "",
  livestreamUrl: "",
  isPaid: false,
  priceAmount: "0",
  currency: "MWK",
  capacity: "120",
  rsvpEnabled: true,
  startAt: futureLocalDate(14, 9),
  endAt: futureLocalDate(14, 12),
  registrationDeadline: futureLocalDate(13, 17),
  coverImage: "events/events-default.jpg",
  videoUrl: "",
  tags: "event, education, partnership",
  ticketTypes: '[{"name":"General Admission","priceAmount":0,"currency":"MWK","capacity":120}]',
  customFields: '[{"name":"country","label":"Country","type":"text","required":false}]',
  agenda: "09:00 | Registration and orientation\n09:30 | Main session\n11:30 | Questions and next steps",
  speakers: "Mtendere Consulting Team | Host | Admissions and pathway guidance",
  sponsors: "",
  partners: "",
  resources: "",
  attachments: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
  isFeatured: false,
  isRecommended: true,
  isTrending: false,
  allowComments: true,
  requiresApproval: false,
});

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(() => getInitialUrlSearchParam());
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [formData, setFormData] = useState<EventFormState>(() => emptyForm());
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const { toast } = useToast();

  useCreateAction(() => openCreate());

  const eventsQuery = useQuery<{ data: AdminEvent[]; total: number }>({
    queryKey: ["/api/admin/events", page, limit, search, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      const res = await authFetch(`/api/admin/events?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const analyticsQuery = useQuery<any>({
    queryKey: ["/api/admin/events/analytics"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/events/analytics");
      if (!res.ok) throw new Error("Failed to fetch event analytics");
      return res.json();
    },
  });

  const reportQuery = useQuery<any>({
    queryKey: ["/api/admin/events/reports/summary"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/events/reports/summary");
      if (!res.ok) throw new Error("Failed to fetch event report");
      return res.json();
    },
  });

  const events = eventsQuery.data?.data ?? [];
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;

  const registrationsQuery = useQuery<EventRegistration[]>({
    queryKey: selectedEvent ? [`/api/admin/events/${selectedEvent.id}/registrations`] : ["/api/admin/events/0/registrations"],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const res = await authFetch(`/api/admin/events/${selectedEvent.id}/registrations`);
      if (!res.ok) throw new Error("Failed to fetch registrations");
      return res.json();
    },
    enabled: Boolean(selectedEvent),
  });

  useEffect(() => {
    if (!selectedEventId && events.length > 0) setSelectedEventId(events[0].id);
  }, [events, selectedEventId]);

  const eventMutation = useMutation({
    mutationFn: async () => {
      const payload = buildEventPayload(formData);
      const response = editingEvent
        ? await apiRequest("PUT", `/api/admin/events/${editingEvent.id}`, payload)
        : await apiRequest("POST", "/api/admin/events", payload);
      return response.json();
    },
    onSuccess: (event: AdminEvent) => {
      toast({ title: editingEvent ? "Event updated" : "Event created", description: `${event.title} is ready for operations.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events/reports/summary"] });
      setSelectedEventId(event.id);
      resetForm();
    },
    onError: (error) => toast({ title: "Event save failed", description: error instanceof Error ? error.message : "Review event details.", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: string }) =>
      apiRequest("PATCH", `/api/admin/events/${id}/status`, { status: nextStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events/analytics"] });
      toast({ title: "Event status updated" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/events/${id}/duplicate`),
    onSuccess: async (res) => {
      const event = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      setSelectedEventId(event.id);
      toast({ title: "Event duplicated", description: "A draft copy has been created." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events/analytics"] });
      toast({ title: "Event deleted", description: "Linked registration records were safely removed." });
    },
  });

  const registrationMutation = useMutation({
    mutationFn: ({ id, action, payload }: { id: number; action?: "check-in" | "check-out"; payload?: Record<string, unknown> }) => {
      if (action) return apiRequest("POST", `/api/admin/event-registrations/${id}/${action}`);
      return apiRequest("PUT", `/api/admin/event-registrations/${id}`, payload);
    },
    onSuccess: () => {
      if (selectedEvent) queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${selectedEvent.id}/registrations`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events/analytics"] });
      toast({ title: "Registration updated" });
    },
  });

  const registrations = registrationsQuery.data ?? [];
  const chartData = useMemo(
    () => Object.entries(analyticsQuery.data?.categoryStats ?? {}).map(([name, value]) => ({ name, value })),
    [analyticsQuery.data?.categoryStats],
  );

  const openCreate = () => {
    setEditingEvent(null);
    setFormData(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (event: AdminEvent) => {
    setEditingEvent(event);
    setFormData(formFromEvent(event));
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormData(emptyForm());
    setFormOpen(false);
  };

  const eventColumns = [
    {
      key: "title",
      header: "Event",
      sortable: true,
      render: (_: string, row: AdminEvent) => (
        <div>
          <p className="font-semibold text-foreground">{row.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(row.startAt)} | {row.location}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (value: string) => <Badge variant="outline">{value}</Badge> },
    { key: "status", header: "Status", render: (_: string, row: AdminEvent) => <StatusBadge event={row} /> },
    { key: "registrationCount", header: "Registrations", render: (value: number) => value ?? 0 },
    { key: "conversionRate", header: "Conversion", render: (value: number) => `${value ?? 0}%` },
    { key: "remainingSeats", header: "Seats", render: (value: number | null) => value === null || value === undefined ? "Open" : value },
  ];

  const registrationColumns = [
    {
      key: "fullName",
      header: "Attendee",
      render: (_: string, row: EventRegistration) => (
        <div>
          <p className="font-semibold">{row.fullName}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    { key: "organization", header: "Organization" },
    { key: "ticketType", header: "Ticket" },
    { key: "status", header: "Status", render: (value: string) => <Badge variant="outline" className="capitalize">{value.replace(/_/g, " ")}</Badge> },
    { key: "attendanceStatus", header: "Attendance", render: (value: string) => <Badge className="capitalize bg-primary/10 text-primary">{value.replace(/_/g, " ")}</Badge> },
    { key: "ticketCode", header: "Code", render: (value: string) => <span className="font-mono text-xs">{value}</span> },
  ];

  return (
    <div className="space-y-6">
      <SEO title="Events Management" description="Enterprise event lifecycle, registrations, ticketing, attendance, and event analytics." />

      <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground"><CalendarDays className="mr-1 h-3.5 w-3.5" /> Events Operations</Badge>
            <Badge variant="outline">RBAC protected</Badge>
            <Badge variant="outline">Public sync enabled</Badge>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Events Management System</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plan, publish, register, check in, report, and archive events from one operational command center.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadReport()}><Download className="mr-2 h-4 w-4" />Report JSON</Button>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Event</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Kpi title="Total Events" value={analyticsQuery.data?.totalEvents ?? 0} icon={<CalendarDays className="h-5 w-5" />} />
        <Kpi title="Published" value={analyticsQuery.data?.publishedEvents ?? 0} icon={<ShieldCheck className="h-5 w-5" />} />
        <Kpi title="Upcoming" value={analyticsQuery.data?.upcomingEvents ?? 0} icon={<Activity className="h-5 w-5" />} />
        <Kpi title="Registrations" value={analyticsQuery.data?.registrations ?? 0} icon={<Ticket className="h-5 w-5" />} />
        <Kpi title="Attendance" value={`${attendanceRate(registrations)}%`} icon={<Users className="h-5 w-5" />} />
        <Kpi title="Revenue" value={`${reportQuery.data?.totals?.revenue ?? 0} MWK`} icon={<BarChart3 className="h-5 w-5" />} />
      </div>

      {formOpen && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{editingEvent ? "Edit event" : "Create event"}</CardTitle>
              <CardDescription>All fields are synchronized to public pages, registrations, ticketing, analytics, and reporting.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={resetForm} aria-label="Close form"><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <EventForm
              value={formData}
              onChange={(field, nextValue) => setFormData((previous) => ({ ...previous, [field]: nextValue }))}
              onSubmit={() => eventMutation.mutate()}
              onCancel={resetForm}
              isSaving={eventMutation.isPending}
              isEditing={Boolean(editingEvent)}
            />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="events" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-4 lg:w-[680px]">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
              <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="past">Past</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable
            columns={eventColumns}
            data={events}
            loading={eventsQuery.isLoading}
            searchable
            selectable
            refreshable
            onRefresh={() => eventsQuery.refetch()}
            searchPlaceholder="Search event title, category, venue, or location..."
            onSearch={(value) => { setSearch(value); setPage(1); }}
            onRowClick={(row) => setSelectedEventId(row.id)}
            onRowAction={(action, row: AdminEvent) => {
              if (action === "edit") openEdit(row);
              if (action === "duplicate") duplicateMutation.mutate(row.id);
              if (action === "publish") statusMutation.mutate({ id: row.id, nextStatus: row.status === "published" ? "draft" : "published" });
              if (action === "archive") statusMutation.mutate({ id: row.id, nextStatus: "archived" });
              if (action === "delete" && confirm(`Delete ${row.title}? This also removes registrations.`)) deleteMutation.mutate(row.id);
            }}
            actions={[
              { label: "Edit", action: "edit" },
              { label: "Duplicate", action: "duplicate", icon: <Copy className="h-4 w-4" /> },
              { label: "Publish / Unpublish", action: "publish", icon: <ShieldCheck className="h-4 w-4" /> },
              { label: "Archive", action: "archive" },
              { label: "Delete", action: "delete", variant: "destructive" },
            ]}
            pagination={{ page, limit, total: eventsQuery.data?.total ?? 0, onPageChange: setPage, onLimitChange: setLimit }}
          />
        </TabsContent>

        <TabsContent value="registrations" className="space-y-4">
          <Card>
            <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <Select value={selectedEvent ? String(selectedEvent.id) : ""} onValueChange={(value) => setSelectedEventId(Number(value))}>
                <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                <SelectContent>{events.map((event) => <SelectItem key={event.id} value={String(event.id)}>{event.title}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" disabled={!selectedEvent} onClick={() => selectedEvent && downloadRegistrations(selectedEvent.id, "csv")}><Download className="mr-2 h-4 w-4" />CSV</Button>
              <Button variant="outline" disabled={!selectedEvent} onClick={() => selectedEvent && downloadRegistrations(selectedEvent.id, "excel")}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Kpi title="Registered" value={registrations.length} icon={<Ticket className="h-5 w-5" />} />
            <Kpi title="Approved" value={registrations.filter((item) => ["approved", "checked_in"].includes(item.status)).length} icon={<CheckCircle2 className="h-5 w-5" />} />
            <Kpi title="Waitlisted" value={registrations.filter((item) => item.status === "waitlisted").length} icon={<Users className="h-5 w-5" />} />
            <Kpi title="Checked In" value={registrations.filter((item) => ["checked_in", "checked_out"].includes(item.attendanceStatus)).length} icon={<Activity className="h-5 w-5" />} />
          </div>

          <DataTable
            columns={registrationColumns}
            data={registrations}
            loading={registrationsQuery.isLoading}
            searchable
            searchPlaceholder="Search attendees, email, organization, or ticket code..."
            onRowAction={(action, row: EventRegistration) => {
              if (action === "approve") registrationMutation.mutate({ id: row.id, payload: { status: "approved", attendanceStatus: "registered" } });
              if (action === "waitlist") registrationMutation.mutate({ id: row.id, payload: { status: "waitlisted" } });
              if (action === "check-in") registrationMutation.mutate({ id: row.id, action: "check-in" });
              if (action === "check-out") registrationMutation.mutate({ id: row.id, action: "check-out" });
              if (action === "reject") registrationMutation.mutate({ id: row.id, payload: { status: "rejected", attendanceStatus: "cancelled" } });
            }}
            actions={[
              { label: "Approve", action: "approve" },
              { label: "Waitlist", action: "waitlist" },
              { label: "Check In", action: "check-in" },
              { label: "Check Out", action: "check-out" },
              { label: "Reject", action: "reject", variant: "destructive" },
            ]}
          />
        </TabsContent>

        <TabsContent value="analytics" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Events by category</CardTitle>
              <CardDescription>Operational distribution for planning, resourcing, and public content cadence.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Executive report</CardTitle>
              <CardDescription>Downloadable event performance summary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Events", reportQuery.data?.totals?.events ?? 0],
                ["Registrations", reportQuery.data?.totals?.registrations ?? 0],
                ["Attended", reportQuery.data?.totals?.attended ?? 0],
                ["Conversion", `${reportQuery.data?.totals?.conversionRate ?? 0}%`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="font-bold text-foreground">{value}</span>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={() => downloadReport()}><Download className="mr-2 h-4 w-4" />Download report</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="grid gap-4 md:grid-cols-3">
          {[
            ["Email confirmations", "Registration and status emails are queued with retry logs."],
            ["Webhook-ready events", "Create/update/register/check-in events emit realtime payloads and are ready for outbound webhook delivery."],
            ["AI-ready data", "Tags, metadata, custom fields, and analytics are structured for recommendations and semantic search."],
          ].map(([title, description]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">{description}</CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventForm({ value, onChange, onSubmit, onCancel, isSaving, isEditing }: {
  value: EventFormState;
  onChange: <K extends keyof EventFormState>(field: K, nextValue: EventFormState[K]) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isEditing: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Title" value={value.title} onChange={(next) => onChange("title", next)} />
        <Field label="Slug" value={value.slug} onChange={(next) => onChange("slug", next)} placeholder="auto-generated if empty" />
        <Field label="Category" value={value.category} onChange={(next) => onChange("category", next)} />
        <Field label="Type" value={value.eventType} onChange={(next) => onChange("eventType", next)} />
        <Field label="Organizer" value={value.organizer} onChange={(next) => onChange("organizer", next)} />
        <Field label="Currency" value={value.currency} onChange={(next) => onChange("currency", next)} />
      </div>
      <TextAreaField label="Short description" value={value.summary} onChange={(next) => onChange("summary", next)} rows={2} />
      <TextAreaField label="Full rich-text content" value={value.description} onChange={(next) => onChange("description", next)} rows={5} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Start" type="datetime-local" value={value.startAt} onChange={(next) => onChange("startAt", next)} />
        <Field label="End" type="datetime-local" value={value.endAt} onChange={(next) => onChange("endAt", next)} />
        <Field label="Registration deadline" type="datetime-local" value={value.registrationDeadline} onChange={(next) => onChange("registrationDeadline", next)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Location" value={value.location} onChange={(next) => onChange("location", next)} />
        <Field label="Venue" value={value.venueName} onChange={(next) => onChange("venueName", next)} />
        <Field label="Address" value={value.address} onChange={(next) => onChange("address", next)} />
        <Field label="Google Maps embed URL" value={value.mapUrl} onChange={(next) => onChange("mapUrl", next)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <Field label="Featured image" value={value.coverImage} onChange={(next) => onChange("coverImage", next)} />
        <Field label="Promo video URL" value={value.videoUrl} onChange={(next) => onChange("videoUrl", next)} />
        <Field label="Virtual URL" value={value.virtualUrl} onChange={(next) => onChange("virtualUrl", next)} />
        <Field label="Capacity" type="number" value={value.capacity} onChange={(next) => onChange("capacity", next)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TextAreaField label="Ticket types JSON" value={value.ticketTypes} onChange={(next) => onChange("ticketTypes", next)} rows={4} />
        <TextAreaField label="Dynamic registration fields JSON" value={value.customFields} onChange={(next) => onChange("customFields", next)} rows={4} />
        <TextAreaField label="Agenda" value={value.agenda} onChange={(next) => onChange("agenda", next)} rows={4} />
        <TextAreaField label="Speakers" value={value.speakers} onChange={(next) => onChange("speakers", next)} rows={4} />
        <TextAreaField label="Sponsors" value={value.sponsors} onChange={(next) => onChange("sponsors", next)} rows={3} />
        <TextAreaField label="Partners" value={value.partners} onChange={(next) => onChange("partners", next)} rows={3} />
        <TextAreaField label="Attachments / PDFs" value={value.attachments} onChange={(next) => onChange("attachments", next)} rows={3} />
        <TextAreaField label="Resources" value={value.resources} onChange={(next) => onChange("resources", next)} rows={3} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="SEO title" value={value.seoTitle} onChange={(next) => onChange("seoTitle", next)} />
        <Field label="SEO description" value={value.seoDescription} onChange={(next) => onChange("seoDescription", next)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <Field label="Price" type="number" value={value.priceAmount} onChange={(next) => onChange("priceAmount", next)} />
        <div>
          <Label>Status</Label>
          <Select value={value.status} onValueChange={(next) => onChange("status", next as EventFormState["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field label="Tags" value={value.tags} onChange={(next) => onChange("tags", next)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Toggle label="Physical / virtual" checked={value.isVirtual} onCheckedChange={(checked) => onChange("isVirtual", checked)} />
        <Toggle label="RSVP enabled" checked={value.rsvpEnabled} onCheckedChange={(checked) => onChange("rsvpEnabled", checked)} />
        <Toggle label="Paid event" checked={value.isPaid} onCheckedChange={(checked) => onChange("isPaid", checked)} />
        <Toggle label="Requires approval" checked={value.requiresApproval} onCheckedChange={(checked) => onChange("requiresApproval", checked)} />
        <Toggle label="Featured" checked={value.isFeatured} onCheckedChange={(checked) => onChange("isFeatured", checked)} />
        <Toggle label="Recommended" checked={value.isRecommended} onCheckedChange={(checked) => onChange("isRecommended", checked)} />
        <Toggle label="Trending" checked={value.isTrending} onCheckedChange={(checked) => onChange("isTrending", checked)} />
        <Toggle label="Comments" checked={value.allowComments} onCheckedChange={(checked) => onChange("allowComments", checked)} />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSubmit} disabled={isSaving || !value.title || !value.description || !value.startAt || !value.endAt}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : isEditing ? "Save event" : "Create event"}
        </Button>
      </div>
    </div>
  );
}

function Kpi({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ event }: { event: AdminEvent }) {
  if (event.status === "published") return <Badge className="bg-success/15 text-success">Published</Badge>;
  if (event.status === "archived") return <Badge variant="secondary">Archived</Badge>;
  if (event.status === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TextAreaField({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} />
    </div>
  );
}

function Toggle({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function buildEventPayload(form: EventFormState) {
  return {
    title: form.title,
    slug: form.slug || undefined,
    summary: form.summary || null,
    description: form.description,
    category: form.category,
    eventType: form.eventType,
    organizer: form.organizer || null,
    location: form.location,
    venueName: form.venueName || null,
    address: form.address || null,
    mapUrl: form.mapUrl || null,
    isVirtual: form.isVirtual,
    virtualUrl: form.virtualUrl || null,
    livestreamUrl: form.livestreamUrl || null,
    isPaid: form.isPaid,
    priceAmount: form.isPaid ? Number.parseInt(form.priceAmount || "0", 10) : 0,
    currency: form.currency || "MWK",
    capacity: form.capacity ? Number.parseInt(form.capacity, 10) : null,
    rsvpEnabled: form.rsvpEnabled,
    startAt: new Date(form.startAt).toISOString(),
    endAt: new Date(form.endAt).toISOString(),
    registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
    coverImage: form.coverImage || null,
    videoUrl: form.videoUrl || null,
    tags: form.tags,
    ticketTypes: parseJsonArray(form.ticketTypes),
    customFields: parseJsonArray(form.customFields),
    agenda: parseLines(form.agenda, ["time", "title", "description"]),
    speakers: parseLines(form.speakers, ["name", "role", "bio"]),
    sponsors: parseLines(form.sponsors, ["name", "description"]),
    partners: parseLines(form.partners, ["name", "role", "website"]),
    resources: parseLines(form.resources, ["title", "url", "description"]),
    attachments: parseLines(form.attachments, ["title", "url", "type"]),
    seoMeta: { title: form.seoTitle || form.title, description: form.seoDescription || form.summary },
    socialMeta: { title: form.seoTitle || form.title, description: form.seoDescription || form.summary, image: form.coverImage },
    status: form.status,
    isFeatured: form.isFeatured,
    isRecommended: form.isRecommended,
    isTrending: form.isTrending,
    allowComments: form.allowComments,
    requiresApproval: form.requiresApproval,
  };
}

function formFromEvent(event: AdminEvent): EventFormState {
  return {
    ...emptyForm(),
    title: event.title,
    slug: event.slug ?? "",
    summary: event.summary ?? "",
    description: event.description,
    category: event.category,
    eventType: event.eventType,
    organizer: event.organizer ?? "",
    location: event.location,
    venueName: event.venueName ?? "",
    address: event.address ?? "",
    mapUrl: event.mapUrl ?? "",
    isVirtual: Boolean(event.isVirtual),
    virtualUrl: event.virtualUrl ?? "",
    livestreamUrl: event.livestreamUrl ?? "",
    isPaid: Boolean(event.isPaid),
    priceAmount: String(event.priceAmount ?? 0),
    currency: event.currency ?? "MWK",
    capacity: event.capacity === null || event.capacity === undefined ? "" : String(event.capacity),
    rsvpEnabled: event.rsvpEnabled !== false,
    startAt: toDateTimeLocal(event.startAt),
    endAt: toDateTimeLocal(event.endAt),
    registrationDeadline: event.registrationDeadline ? toDateTimeLocal(event.registrationDeadline) : "",
    coverImage: event.coverImage ?? "",
    videoUrl: event.videoUrl ?? "",
    tags: (event.tags ?? []).join(", "),
    ticketTypes: JSON.stringify(event.ticketTypes ?? [], null, 2),
    customFields: JSON.stringify(event.customFields ?? [], null, 2),
    agenda: linesFromObjects(event.agenda, ["time", "title", "description"]),
    speakers: linesFromObjects(event.speakers, ["name", "role", "bio"]),
    sponsors: linesFromObjects(event.sponsors, ["name", "description"]),
    partners: linesFromObjects(event.partners, ["name", "role", "website"]),
    resources: linesFromObjects(event.resources, ["title", "url", "description"]),
    attachments: linesFromObjects(event.attachments, ["title", "url", "type"]),
    seoTitle: String(event.seoMeta?.title ?? ""),
    seoDescription: String(event.seoMeta?.description ?? ""),
    status: ["published", "archived", "cancelled"].includes(event.status) ? event.status as EventFormState["status"] : "draft",
    isFeatured: Boolean(event.isFeatured),
    isRecommended: Boolean(event.isRecommended),
    isTrending: Boolean(event.isTrending),
    allowComments: event.allowComments !== false,
    requiresApproval: Boolean(event.requiresApproval),
  };
}

function parseJsonArray(value: string) {
  if (!value.trim()) return [];
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [];
}

function parseLines(value: string, keys: string[]) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return keys.reduce<Record<string, string>>((acc, key, index) => {
        if (parts[index]) acc[key] = parts[index];
        return acc;
      }, {});
    });
}

function linesFromObjects(items: Array<Record<string, unknown>> | null | undefined, keys: string[]) {
  if (!items?.length) return "";
  return items.map((item) => keys.map((key) => String(item[key] ?? "")).join(" | ").replace(/\s+\|\s+$/g, "")).join("\n");
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function attendanceRate(registrations: EventRegistration[]) {
  if (!registrations.length) return 0;
  const attended = registrations.filter((item) => ["checked_in", "checked_out", "attended"].includes(item.attendanceStatus)).length;
  return Math.round((attended / registrations.length) * 100);
}

async function downloadRegistrations(eventId: number, format: "csv" | "excel") {
  const res = await authFetch(`/api/admin/events/${eventId}/registrations/export?format=${format}`);
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `event-${eventId}-registrations.${format === "excel" ? "xls" : "csv"}`;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadReport() {
  const res = await authFetch("/api/admin/events/reports/summary");
  if (!res.ok) throw new Error("Report failed");
  const payload = await res.json();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "events-executive-report.json";
  link.click();
  URL.revokeObjectURL(url);
}
