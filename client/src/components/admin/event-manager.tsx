import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  Edit,
  Eye,
  Filter,
  LineChart,
  Mail,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiEvent, ApiEventRegistration } from "@/lib/api-types";

type AdminEventsResponse = {
  data: ApiEvent[];
  total: number;
};

type AdminEventAnalytics = {
  totalEvents: number;
  publishedEvents: number;
  liveEvents: number;
  upcomingEvents: number;
  registrations: number;
  approvedRegistrations: number;
  views: number;
  shares: number;
  conversionRate: number;
  categoryStats: Record<string, number>;
  topEvents: ApiEvent[];
};

type EventFormState = {
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string;
  eventType: string;
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
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  coverImage: string;
  videoUrl: string;
  tags: string;
  agenda: string;
  speakers: string;
  sponsors: string;
  faqs: string;
  resources: string;
  status: "draft" | "published" | "archived" | "cancelled";
  isFeatured: boolean;
  isRecommended: boolean;
  isTrending: boolean;
  allowComments: boolean;
  requiresApproval: boolean;
};

const emptyForm = (): EventFormState => {
  const start = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);

  return {
    title: "",
    slug: "",
    summary: "",
    description: "",
    category: "Scholarships",
    eventType: "Workshop",
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
    capacity: "100",
    startAt: toDateTimeLocal(start.toISOString()),
    endAt: toDateTimeLocal(end.toISOString()),
    registrationDeadline: "",
    coverImage: "events/IMG-20250321-WA0250.jpg",
    videoUrl: "",
    tags: "scholarships, applications, students",
    agenda: "08:30 | Registration and orientation\n09:00 | Main session\n11:30 | Questions and next steps",
    speakers: "Mtendere Consulting Team | Host",
    sponsors: "",
    faqs: "",
    resources: "",
    status: "draft",
    isFeatured: false,
    isRecommended: true,
    isTrending: false,
    allowComments: true,
    requiresApproval: false,
  };
};

export default function EventManager() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ApiEvent | null>(null);
  const [formData, setFormData] = useState<EventFormState>(() => emptyForm());
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const eventsQuery = useQuery<AdminEventsResponse>({
    queryKey: [
      "/api/admin/events",
      {
        search: search || undefined,
        status: status === "all" ? undefined : status,
        limit: 100,
      },
    ],
  });

  const analyticsQuery = useQuery<AdminEventAnalytics>({
    queryKey: ["/api/admin/events/analytics"],
  });

  const events = eventsQuery.data?.data ?? [];
  const analytics = analyticsQuery.data;
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;

  const registrationsQuery = useQuery<ApiEventRegistration[]>({
    queryKey: selectedEvent ? [`/api/admin/events/${selectedEvent.id}/registrations`] : ["/api/admin/events/0/registrations"],
    enabled: Boolean(selectedEvent),
  });

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const resetForm = () => {
    setEditingEvent(null);
    setFormData(emptyForm());
    setFormOpen(false);
  };

  const eventMutation = useMutation({
    mutationFn: async () => {
      const payload = buildEventPayload(formData);
      const response = editingEvent
        ? await apiRequest("PUT", `/api/admin/events/${editingEvent.id}`, payload)
        : await apiRequest("POST", "/api/admin/events", payload);
      return (await response.json()) as ApiEvent;
    },
    onSuccess: (event) => {
      toast({
        title: editingEvent ? "Event updated" : "Event created",
        description: `${event.title} is now controlled from Admin.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setSelectedEventId(event.id);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Event save failed",
        description: error instanceof Error ? error.message : "Please review the event details.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest("DELETE", `/api/admin/events/${eventId}`);
      return eventId;
    },
    onSuccess: () => {
      toast({ title: "Event removed", description: "The public event listing has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: () => {
      toast({ title: "Delete failed", description: "The event could not be removed.", variant: "destructive" });
    },
  });

  const registrationMutation = useMutation({
    mutationFn: async ({
      registrationId,
      payload,
    }: {
      registrationId: number;
      payload: { status?: string; attendanceStatus?: string };
    }) => {
      const response = await apiRequest("PUT", `/api/admin/event-registrations/${registrationId}`, payload);
      return (await response.json()) as ApiEventRegistration;
    },
    onSuccess: () => {
      toast({ title: "Registration updated", description: "The attendee status has been synchronized." });
      if (selectedEvent) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${selectedEvent.id}/registrations`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const openCreate = () => {
    setEditingEvent(null);
    setFormData(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (event: ApiEvent) => {
    setEditingEvent(event);
    setFormData(formFromEvent(event));
    setFormOpen(true);
  };

  const registrations = registrationsQuery.data ?? [];
  const categoryEntries = useMemo(
    () => Object.entries(analytics?.categoryStats ?? {}).sort((left, right) => right[1] - left[1]),
    [analytics?.categoryStats],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card p-6 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge className="mb-3 bg-mtendere-blue text-white">
            <CalendarDays className="mr-1 h-3.5 w-3.5" />
            Event Control Center
          </Badge>
          <h1 className="text-2xl font-bold text-mtendere-blue">Events, bookings, engagement, and analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create public events, publish updates, review registrations, and monitor performance from one place.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-mtendere-blue hover:bg-mtendere-blue/90">
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Total Events" value={analytics?.totalEvents ?? events.length} icon={CalendarDays} tone="blue" />
        <KpiCard title="Published" value={analytics?.publishedEvents ?? 0} icon={ShieldCheck} tone="green" />
        <KpiCard title="Happening Now" value={analytics?.liveEvents ?? 0} icon={Activity} tone="orange" />
        <KpiCard title="Registrations" value={analytics?.registrations ?? 0} icon={Ticket} tone="blue" />
        <KpiCard title="Conversion" value={`${analytics?.conversionRate ?? 0}%`} icon={LineChart} tone="green" />
      </div>

      {formOpen && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl text-mtendere-blue">
                {editingEvent ? "Edit event" : "Create event"}
              </CardTitle>
              <CardDescription>Changes here immediately control the public event experience.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={resetForm} aria-label="Close event form">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <EventForm
              value={formData}
              onChange={(field, value) => setFormData((previous) => ({ ...previous, [field]: value }))}
              onSubmit={() => eventMutation.mutate()}
              onCancel={resetForm}
              isSaving={eventMutation.isPending}
              isEditing={Boolean(editingEvent)}
            />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="events" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-3 md:w-[520px]">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-5">
          <Card className="border border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-10"
                    placeholder="Search events, locations, categories..."
                  />
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {eventsQuery.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <Card className="border border-dashed border-border/70">
              <CardContent className="py-12 text-center">
                <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <h2 className="text-xl font-bold text-mtendere-blue">No events found</h2>
                <p className="mt-2 text-sm text-muted-foreground">Create the first centrally managed event.</p>
                <Button onClick={openCreate} className="mt-5 bg-mtendere-blue hover:bg-mtendere-blue/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {events.map((event) => (
                <EventAdminCard
                  key={event.id}
                  event={event}
                  onEdit={() => openEdit(event)}
                  onDelete={() => {
                    if (window.confirm(`Delete ${event.title}?`)) {
                      deleteMutation.mutate(event.id);
                    }
                  }}
                  onRegistrations={() => setSelectedEventId(event.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="registrations" className="space-y-5">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-mtendere-blue">Registration workflow</CardTitle>
              <CardDescription>Approve attendees, manage waitlists, confirm attendance, and export event data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <Select
                  value={selectedEvent ? String(selectedEvent.id) : ""}
                  onValueChange={(value) => setSelectedEventId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={String(event.id)}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => exportRegistrationsCsv(selectedEvent, registrations)}
                  disabled={!selectedEvent || registrations.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              {selectedEvent && (
                <div className="grid gap-3 md:grid-cols-4">
                  <MiniStat label="Registered" value={registrations.length} />
                  <MiniStat label="Approved" value={registrations.filter((item) => item.status === "approved" || item.status === "checked_in").length} />
                  <MiniStat label="Pending" value={registrations.filter((item) => item.status === "pending").length} />
                  <MiniStat label="Checked In" value={registrations.filter((item) => item.status === "checked_in" || item.attendanceStatus === "checked_in").length} />
                </div>
              )}

              {registrationsQuery.isLoading ? (
                <div className="h-40 animate-pulse rounded-lg bg-muted" />
              ) : registrations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                  No registrations for the selected event yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {registrations.map((registration) => (
                    <div
                      key={registration.id}
                      className="grid gap-4 rounded-lg border border-border/60 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-foreground">{registration.fullName}</p>
                          <Badge variant="outline" className="capitalize">
                            {registration.status.replace(/_/g, " ")}
                          </Badge>
                          <Badge variant="secondary" className="capitalize">
                            {registration.attendanceStatus.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {registration.email}
                          </span>
                          {registration.phone && <span>{registration.phone}</span>}
                          <span className="font-mono text-xs">{registration.ticketCode}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            registrationMutation.mutate({
                              registrationId: registration.id,
                              payload: { status: "approved", attendanceStatus: "registered" },
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            registrationMutation.mutate({
                              registrationId: registration.id,
                              payload: { status: "waitlisted", attendanceStatus: "registered" },
                            })
                          }
                        >
                          Waitlist
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            registrationMutation.mutate({
                              registrationId: registration.id,
                              payload: { status: "checked_in", attendanceStatus: "checked_in" },
                            })
                          }
                        >
                          Check in
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            registrationMutation.mutate({
                              registrationId: registration.id,
                              payload: { status: "rejected", attendanceStatus: "cancelled" },
                            })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-mtendere-blue">
                  <BarChart3 className="h-5 w-5 text-mtendere-orange" />
                  Category performance
                </CardTitle>
                <CardDescription>Distribution across event content controlled by Admin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No category analytics yet.</p>
                ) : (
                  categoryEntries.map(([category, count]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{category}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-mtendere-blue"
                          style={{
                            width: `${Math.max(8, Math.round((count / Math.max(analytics?.totalEvents ?? count, 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-mtendere-blue">
                  <Eye className="h-5 w-5 text-mtendere-orange" />
                  Top events
                </CardTitle>
                <CardDescription>Ranked by tracked public views.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(analytics?.topEvents ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No view data yet.</p>
                ) : (
                  analytics?.topEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border border-border/60 p-3">
                      <p className="line-clamp-1 font-semibold text-foreground">{event.title}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{event.category}</span>
                        <span>{event.viewCount ?? 0} views</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  isEditing,
}: {
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
        <Field label="Slug" value={value.slug} onChange={(next) => onChange("slug", next)} placeholder="auto-generated from title" />
        <Field label="Category" value={value.category} onChange={(next) => onChange("category", next)} />
        <Field label="Type" value={value.eventType} onChange={(next) => onChange("eventType", next)} />
      </div>

      <div>
        <Label>Summary</Label>
        <Textarea value={value.summary} onChange={(event) => onChange("summary", event.target.value)} rows={2} />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea value={value.description} onChange={(event) => onChange("description", event.target.value)} rows={5} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Start" type="datetime-local" value={value.startAt} onChange={(next) => onChange("startAt", next)} />
        <Field label="End" type="datetime-local" value={value.endAt} onChange={(next) => onChange("endAt", next)} />
        <Field
          label="Registration Deadline"
          type="datetime-local"
          value={value.registrationDeadline}
          onChange={(next) => onChange("registrationDeadline", next)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Location" value={value.location} onChange={(next) => onChange("location", next)} />
        <Field label="Venue" value={value.venueName} onChange={(next) => onChange("venueName", next)} />
        <Field label="Address" value={value.address} onChange={(next) => onChange("address", next)} />
        <Field label="Google Maps URL" value={value.mapUrl} onChange={(next) => onChange("mapUrl", next)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Field label="Cover Image" value={value.coverImage} onChange={(next) => onChange("coverImage", next)} />
        <Field label="Video URL" value={value.videoUrl} onChange={(next) => onChange("videoUrl", next)} />
        <Field label="Virtual URL" value={value.virtualUrl} onChange={(next) => onChange("virtualUrl", next)} />
        <Field label="Livestream URL" value={value.livestreamUrl} onChange={(next) => onChange("livestreamUrl", next)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Field label="Capacity" type="number" value={value.capacity} onChange={(next) => onChange("capacity", next)} />
        <Field label="Price" type="number" value={value.priceAmount} onChange={(next) => onChange("priceAmount", next)} />
        <Field label="Currency" value={value.currency} onChange={(next) => onChange("currency", next)} />
        <div>
          <Label>Status</Label>
          <Select value={value.status} onValueChange={(next) => onChange("status", next as EventFormState["status"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Tags</Label>
        <Input value={value.tags} onChange={(event) => onChange("tags", event.target.value)} placeholder="scholarships, study abroad, workshop" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TextAreaField label="Agenda" value={value.agenda} onChange={(next) => onChange("agenda", next)} placeholder="09:00 | Welcome | Orientation" />
        <TextAreaField label="Speakers" value={value.speakers} onChange={(next) => onChange("speakers", next)} placeholder="Name | Role" />
        <TextAreaField label="Sponsors" value={value.sponsors} onChange={(next) => onChange("sponsors", next)} placeholder="Partner name | Contribution" />
        <TextAreaField label="FAQs" value={value.faqs} onChange={(next) => onChange("faqs", next)} placeholder="Question | Answer" />
        <TextAreaField label="Resources" value={value.resources} onChange={(next) => onChange("resources", next)} placeholder="Document title | URL" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ToggleField label="Virtual Event" checked={value.isVirtual} onCheckedChange={(checked) => onChange("isVirtual", checked)} />
        <ToggleField label="Paid Event" checked={value.isPaid} onCheckedChange={(checked) => onChange("isPaid", checked)} />
        <ToggleField label="Requires Approval" checked={value.requiresApproval} onCheckedChange={(checked) => onChange("requiresApproval", checked)} />
        <ToggleField label="Allow Comments" checked={value.allowComments} onCheckedChange={(checked) => onChange("allowComments", checked)} />
        <ToggleField label="Featured" checked={value.isFeatured} onCheckedChange={(checked) => onChange("isFeatured", checked)} />
        <ToggleField label="Recommended" checked={value.isRecommended} onCheckedChange={(checked) => onChange("isRecommended", checked)} />
        <ToggleField label="Trending" checked={value.isTrending} onCheckedChange={(checked) => onChange("isTrending", checked)} />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSaving || !value.title || !value.description || !value.startAt || !value.endAt}
          className="bg-mtendere-blue hover:bg-mtendere-blue/90"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Publish to Admin"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} />
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
      <Label className="text-sm font-medium">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function EventAdminCard({
  event,
  onEdit,
  onDelete,
  onRegistrations,
}: {
  event: ApiEvent;
  onEdit: () => void;
  onDelete: () => void;
  onRegistrations: () => void;
}) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge className={event.status === "published" ? "bg-mtendere-green text-white" : "bg-muted text-foreground"}>
                {event.status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {String(event.runtimeStatus ?? "scheduled").replace(/_/g, " ")}
              </Badge>
              {event.isFeatured && <Badge className="bg-mtendere-blue text-white">Featured</Badge>}
              {event.isTrending && <Badge className="bg-mtendere-orange text-white">Trending</Badge>}
            </div>
            <CardTitle className="line-clamp-2 text-xl text-mtendere-blue">{event.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">{event.summary || event.description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" onClick={onEdit} aria-label={`Edit ${event.title}`}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="destructive" onClick={onDelete} aria-label={`Delete ${event.title}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <Info icon={CalendarDays} text={formatDate(event.startAt)} />
          <Info icon={MapPin} text={event.isVirtual ? "Virtual event" : event.location} />
          <Info icon={Users} text={`${event.registrationCount ?? 0} registrations`} />
          <Info icon={Eye} text={`${event.viewCount ?? 0} views`} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MiniStat label="Likes" value={event.likeCount ?? 0} compact />
          <MiniStat label="Shares" value={event.shareCount ?? 0} compact />
          <MiniStat label="Seats" value={event.remainingSeats === null ? "Open" : event.remainingSeats ?? 0} compact />
          <MiniStat label="CTR" value={`${event.conversionRate ?? 0}%`} compact />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRegistrations}>
            <Ticket className="mr-2 h-4 w-4" />
            Registrations
          </Button>
          <Button asChild variant="outline">
            <a href={`/events/${event.slug || event.id}`} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" />
              View
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(`${window.location.origin}/events/${event.slug || event.id}`);
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  tone: "blue" | "green" | "orange";
}) {
  const toneClass =
    tone === "green"
      ? "bg-mtendere-green/10 text-mtendere-green"
      : tone === "orange"
        ? "bg-mtendere-orange/10 text-mtendere-orange"
        : "bg-mtendere-blue/10 text-mtendere-blue";

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-2xl font-black text-mtendere-blue">{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-border/60 bg-muted/20 ${compact ? "p-2" : "p-3"}`}>
      <div className={`${compact ? "text-lg" : "text-2xl"} font-black text-mtendere-blue`}>{value}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Info({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-mtendere-orange" />
      {text}
    </span>
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
    startAt: new Date(form.startAt).toISOString(),
    endAt: new Date(form.endAt).toISOString(),
    registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
    coverImage: form.coverImage || null,
    videoUrl: form.videoUrl || null,
    tags: form.tags,
    agenda: parseLines(form.agenda, ["time", "title", "description"]),
    speakers: parseLines(form.speakers, ["name", "role", "bio"]),
    sponsors: parseLines(form.sponsors, ["name", "description"]),
    faqs: parseLines(form.faqs, ["question", "answer"]),
    resources: parseLines(form.resources, ["title", "url", "description"]),
    status: form.status,
    isFeatured: form.isFeatured,
    isRecommended: form.isRecommended,
    isTrending: form.isTrending,
    allowComments: form.allowComments,
    requiresApproval: form.requiresApproval,
  };
}

function formFromEvent(event: ApiEvent): EventFormState {
  return {
    ...emptyForm(),
    title: event.title,
    slug: event.slug ?? "",
    summary: event.summary ?? "",
    description: event.description,
    category: event.category,
    eventType: event.eventType,
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
    startAt: toDateTimeLocal(event.startAt),
    endAt: toDateTimeLocal(event.endAt),
    registrationDeadline: event.registrationDeadline ? toDateTimeLocal(event.registrationDeadline) : "",
    coverImage: event.coverImage ?? "",
    videoUrl: event.videoUrl ?? "",
    tags: (event.tags ?? []).join(", "),
    agenda: linesFromObjects(event.agenda, ["time", "title", "description"]),
    speakers: linesFromObjects(event.speakers, ["name", "role", "bio"]),
    sponsors: linesFromObjects(event.sponsors, ["name", "description"]),
    faqs: linesFromObjects(event.faqs, ["question", "answer"]),
    resources: linesFromObjects(event.resources, ["title", "url", "description"]),
    status: normalizeStatus(event.status),
    isFeatured: Boolean(event.isFeatured),
    isRecommended: Boolean(event.isRecommended),
    isTrending: Boolean(event.isTrending),
    allowComments: event.allowComments !== false,
    requiresApproval: Boolean(event.requiresApproval),
  };
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
  return items
    .map((item) =>
      keys
        .map((key) => String(item[key] ?? ""))
        .join(" | ")
        .replace(/\s+\|\s+$/g, ""),
    )
    .join("\n");
}

function normalizeStatus(value: string): EventFormState["status"] {
  if (value === "published" || value === "archived" || value === "cancelled") return value;
  return "draft";
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportRegistrationsCsv(event: ApiEvent | null, registrations: ApiEventRegistration[]) {
  if (!event || registrations.length === 0) return;
  const rows = [
    ["Name", "Email", "Phone", "Organization", "Status", "Attendance", "Ticket", "Registered At"],
    ...registrations.map((registration) => [
      registration.fullName,
      registration.email,
      registration.phone ?? "",
      registration.organization ?? "",
      registration.status,
      registration.attendanceStatus,
      registration.ticketCode,
      registration.createdAt ?? "",
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.slug || `event-${event.id}`}-registrations.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
