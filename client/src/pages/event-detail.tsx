import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Heart,
  MapPin,
  MessageSquare,
  MonitorPlay,
  Send,
  Share2,
  ShieldCheck,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import InstitutionLogo from "@/components/institution-logo";
import EventRegistrationDialog from "@/components/event-registration-dialog";
import SaveItemButton from "@/components/save-item-button";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiEvent, ApiEventComment } from "@/lib/api-types";
import {
  buildBreadcrumbSchema,
  buildEventSchema,
  buildFaqSchema,
  buildOrganizationSchema,
  buildRelatedItemListSchema,
  buildWebsiteSchema,
  canonicalUrl,
  generateKeywords,
  seoDescription,
  toSeoFaqs,
} from "@/lib/seo";

export default function EventDetail() {
  const [, params] = useRoute("/events/:id");
  const identifier = params?.id ?? "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [commentData, setCommentData] = useState({ authorName: "", authorEmail: "", content: "" });

  const { data: event, isLoading } = useQuery<ApiEvent>({
    queryKey: [`/api/events/${identifier}`],
    enabled: Boolean(identifier),
  });

  const { data: events = [] } = useQuery<ApiEvent[]>({
    queryKey: ["/api/events"],
  });

  useEffect(() => {
    if (!event?.id) return;
    apiRequest("POST", `/api/events/${event.id}/view`).catch(() => undefined);
  }, [event?.id]);

  const relatedEvents = useMemo(
    () => events.filter((item) => item.id !== event?.id && item.category === event?.category).slice(0, 3),
    [events, event],
  );

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!event) return null;
      const response = await apiRequest("POST", `/api/events/${event.id}/like`, { reaction: "like" });
      return (await response.json()) as ApiEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${identifier}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!event) return;
      await apiRequest("POST", `/api/events/${event.id}/share`, { channel: "detail-page" });
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({ title: event.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    },
    onSuccess: () => {
      toast({ title: "Event link ready", description: "The event link is ready to share." });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${identifier}`] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!event) return null;
      const response = await apiRequest("POST", `/api/events/${event.id}/comments`, commentData);
      return (await response.json()) as ApiEventComment;
    },
    onSuccess: () => {
      setCommentData({ authorName: "", authorEmail: "", content: "" });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${identifier}`] });
      toast({ title: "Comment posted", description: "Your discussion comment is now visible." });
    },
    onError: (error) => {
      toast({
        title: "Comment failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ExpandingNav />
        <div className="container mx-auto max-w-6xl px-4 py-24">
          <div className="h-[440px] animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <ExpandingNav />
        <div className="container mx-auto max-w-3xl px-4 py-24 text-center">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h1 className="text-3xl font-bold text-mtendere-blue">Event not found</h1>
          <Button asChild className="mt-6 bg-mtendere-blue hover:bg-mtendere-blue/90">
            <Link href="/events">Back to events</Link>
          </Button>
        </div>
      </div>
    );
  }

  const agenda = event.agenda || [];
  const speakers = event.speakers || [];
  const sponsors = event.sponsors || [];
  const eventPartners = event.partners || [];
  const ticketTypes = event.ticketTypes || [];
  const attachments = event.attachments || [];
  const gallery = event.gallery || [];
  const faqs = event.faqs || [];
  const resources = event.resources || [];
  const comments = event.comments || [];
  const eventPath = `/events/${event.slug || event.id}`;
  const eventKeywords = generateKeywords({
    module: "event",
    title: event.title,
    category: event.category,
    location: event.location,
    tags: event.tags,
  });
  const eventFaqs = toSeoFaqs(event.faqs, [
    {
      question: `How do I register for ${event.title}?`,
      answer: "Use the registration button on this page to reserve your seat or submit your participation details.",
    },
    {
      question: `Where is ${event.title} hosted?`,
      answer: event.isVirtual ? "This event is available online." : `This event is hosted at ${event.venueName || event.location}.`,
    },
  ]);
  const detailStructuredData = [
    buildOrganizationSchema(),
    buildWebsiteSchema(),
    buildBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Events", url: "/events" },
      { name: event.title, url: eventPath },
    ]),
    buildEventSchema(event),
    buildFaqSchema(eventFaqs),
    buildRelatedItemListSchema(
      "Related events",
      relatedEvents.map((item) => ({
        name: item.title,
        url: `/events/${item.slug || item.id}`,
        description: item.summary || item.description,
        image: item.coverImage,
      })),
    ),
  ].filter(Boolean) as Record<string, unknown>[];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={String(event.seoMeta?.title || event.title)}
        description={seoDescription(String(event.seoMeta?.description || ""), event.summary || event.description)}
        image={event.coverImage || undefined}
        imageAlt={`${event.title} event`}
        canonical={canonicalUrl(eventPath)}
        type="article"
        keywords={eventKeywords}
        section={event.category}
        publishedTime={event.createdAt}
        modifiedTime={event.updatedAt || event.createdAt}
        structuredData={detailStructuredData}
      />
      <ExpandingNav />

      <section className="relative mt-16 overflow-hidden py-24 text-white">
        <div className="absolute inset-0">
          <GovernedImage
            module="event"
            src={event.coverImage}
            title={event.title}
            category={event.category}
            variant="hero"
            priority
            aspectRatio="auto"
            className="h-full"
            wrapperClassName="h-full rounded-none shadow-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/96 via-mtendere-blue/84 to-mtendere-green/80" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <Button asChild variant="outline" className="mb-8 border-white/30 bg-white/10 text-white hover:bg-white hover:text-mtendere-blue">
            <Link href="/events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Events
            </Link>
          </Button>
          <div className="hero-panel hero-safe-copy max-w-4xl rounded-3xl p-7 md:p-10">
            <div className="mb-5 flex flex-wrap gap-2">
              <EventStatusBadge event={event} />
              <Badge className="bg-white/12 text-white">{event.category}</Badge>
              <Badge className="bg-white/12 text-white">{event.isVirtual ? "Virtual" : "Physical"}</Badge>
              <Badge className="bg-white/12 text-white">{event.isPaid ? `${event.currency} ${event.priceAmount}` : "Free"}</Badge>
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">{event.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/85">{event.summary || event.description}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <EventRegistrationDialog event={event} />
              <SaveItemButton type="event" referenceId={event.id} className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-mtendere-blue" />
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-mtendere-blue" onClick={() => shareMutation.mutate()}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              {event.runtimeStatus === "live" && event.livestreamUrl && (
                <Button asChild className="bg-destructive font-bold text-white hover:bg-destructive/90">
                  <a href={event.livestreamUrl} target="_blank" rel="noopener noreferrer">
                    <MonitorPlay className="mr-2 h-4 w-4" />
                    Join live
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell bg-card py-8">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric icon={Calendar} label="Date" value={formatDate(event.startAt)} />
            <Metric icon={MapPin} label="Location" value={event.isVirtual ? "Online" : event.location} />
            <Metric icon={Users} label="Registered" value={String(event.registrationCount ?? 0)} />
            <Metric icon={Ticket} label="Seats left" value={event.remainingSeats === null ? "Open" : String(event.remainingSeats)} />
          </div>
        </div>
      </section>

      <main className="py-16">
        <div className="container mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-8">
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-2xl text-mtendere-blue">About this event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-8 text-foreground/80">{event.description}</p>
              </CardContent>
            </Card>

            <Timeline title="Agenda" items={agenda} empty="Agenda details will be published soon." />

            {ticketTypes.length > 0 && <TicketOptions tickets={ticketTypes} currency={event.currency || "MWK"} />}

            {speakers.length > 0 && (
              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl text-mtendere-blue">Speakers and hosts</CardTitle>
                  <CardDescription>People leading this event.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {speakers.map((speaker, index) => (
                    <div key={index} className="rounded-lg border border-border/60 p-4">
                      <p className="font-bold text-foreground">{String(speaker.name ?? "Speaker")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{String(speaker.role ?? speaker.title ?? "Host")}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {eventPartners.length > 0 && (
              <PartnerStrip partners={eventPartners} />
            )}

            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-mtendere-blue">Venue and access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoBlock icon={MapPin} label="Venue" value={event.venueName || event.location} />
                  <InfoBlock icon={Clock} label="Time" value={`${formatDate(event.startAt)} - ${formatTime(event.endAt)}`} />
                </div>
                {event.mapUrl ? (
                  <div className="overflow-hidden rounded-lg border border-border/60">
                    <iframe src={event.mapUrl} title={`${event.title} map`} className="h-72 w-full" loading="lazy" />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
                    Map details are available from the Mtendere team after registration.
                  </div>
                )}
              </CardContent>
            </Card>

            {gallery.length > 0 && (
              <GalleryGrid gallery={gallery} event={event} />
            )}

            {(resources.length > 0 || sponsors.length > 0 || faqs.length > 0) && (
              <div className="grid gap-6 lg:grid-cols-3">
                <ResourceCard title="Resources" icon={FileText} items={resources} empty="Resources will appear after the event." />
                <ResourceCard title="Sponsors" icon={ShieldCheck} items={sponsors} empty="Sponsor details coming soon." />
                <ResourceCard title="FAQs" icon={MessageSquare} items={faqs} empty="FAQs coming soon." />
              </div>
            )}

            {attachments.length > 0 && (
              <AttachmentList attachments={attachments} />
            )}

            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-mtendere-blue">Discussion</CardTitle>
                <CardDescription>Ask questions, share expectations, or leave post-event feedback.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={commentData.authorName}
                    onChange={(event) => setCommentData((prev) => ({ ...prev, authorName: event.target.value }))}
                    placeholder="Your name"
                  />
                  <Input
                    value={commentData.authorEmail}
                    onChange={(event) => setCommentData((prev) => ({ ...prev, authorEmail: event.target.value }))}
                    placeholder="Email"
                    type="email"
                  />
                </div>
                <Textarea
                  value={commentData.content}
                  onChange={(event) => setCommentData((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="Write a comment or question..."
                  rows={4}
                />
                <Button
                  onClick={() => commentMutation.mutate()}
                  disabled={!commentData.authorName || !commentData.content || commentMutation.isPending}
                  className="bg-mtendere-blue hover:bg-mtendere-blue/90"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Post comment
                </Button>
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No discussion yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="rounded-lg border border-border/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-foreground">{comment.authorName}</p>
                          <p className="text-xs text-muted-foreground">{comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ""}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="premium-card sticky top-24">
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">Event actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <EventRegistrationDialog event={event} trigger={<Button className="w-full bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">Register or book seat</Button>} />
                <Button className="w-full" variant="outline" onClick={() => likeMutation.mutate()}>
                  <Heart className="mr-2 h-4 w-4" />
                  Like event ({event.likeCount ?? 0})
                </Button>
                <Button className="w-full" variant="outline" onClick={() => shareMutation.mutate()}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share event
                </Button>
                <div className="rounded-lg bg-mtendere-gray p-4 text-sm text-foreground/75">
                  {event.requiresApproval
                    ? "Registrations are reviewed by the Mtendere admin team before confirmation."
                    : "Approved registrations receive a confirmation ticket immediately."}
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">Live indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <LiveLine label="Status" value={String(event.runtimeStatus ?? event.status)} active={event.runtimeStatus === "live"} />
                <LiveLine label="Views" value={String(event.viewCount ?? 0)} />
                <LiveLine label="Shares" value={String(event.shareCount ?? 0)} />
                <LiveLine label="Comments" value={String(event.commentCount ?? comments.length)} />
              </CardContent>
            </Card>

            {relatedEvents.length > 0 && (
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="text-xl text-mtendere-blue">Related events</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relatedEvents.map((item) => (
                    <Link key={item.id} href={`/events/${item.slug || item.id}`} className="block rounded-lg border border-border/60 p-4 hover:bg-muted/40">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatDate(item.startAt)}</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function EventStatusBadge({ event }: { event: ApiEvent }) {
  if (event.runtimeStatus === "live") return <Badge className="bg-destructive text-white">Happening now</Badge>;
  if (event.runtimeStatus === "past") return <Badge variant="secondary">Past event</Badge>;
  if (event.status === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge className="bg-mtendere-green text-white">Upcoming</Badge>;
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="premium-card">
      <CardContent className="p-5">
        <Icon className="mb-3 h-5 w-5 text-mtendere-orange" />
        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <Icon className="mb-3 h-5 w-5 text-mtendere-orange" />
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Timeline({ title, items, empty }: { title: string; items: Array<Record<string, unknown>>; empty: string }) {
  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="text-2xl text-mtendere-blue">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid gap-4 rounded-lg border border-border/60 p-4 md:grid-cols-[90px_minmax(0,1fr)]">
                <div className="font-black text-mtendere-orange">{String(item.time ?? index + 1)}</div>
                <div>
                  <p className="font-bold text-foreground">{String(item.title ?? "Agenda item")}</p>
                  {item.description ? <p className="mt-1 text-sm text-muted-foreground">{String(item.description)}</p> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TicketOptions({ tickets, currency }: { tickets: Array<Record<string, unknown>>; currency: string }) {
  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="text-2xl text-mtendere-blue">Tickets and participation options</CardTitle>
        <CardDescription>Select the best participation path during registration.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {tickets.map((ticket, index) => {
          const price = ticket.price ?? ticket.amount ?? ticket.priceAmount;
          return (
            <div key={String(ticket.name ?? ticket.id ?? index)} className="rounded-lg border border-border/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-bold text-foreground">{String(ticket.label ?? ticket.title ?? ticket.name ?? "Ticket")}</p>
                <Badge className="bg-mtendere-blue text-white">{price ? `${String(ticket.currency ?? currency)} ${price}` : "Free"}</Badge>
              </div>
              {ticket.description ? <p className="text-sm leading-6 text-muted-foreground">{String(ticket.description)}</p> : null}
              {ticket.capacity ? <p className="mt-2 text-xs font-semibold text-muted-foreground">Capacity: {String(ticket.capacity)}</p> : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PartnerStrip({ partners }: { partners: Array<Record<string, unknown>> }) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-mtendere-blue">Partners and collaborators</CardTitle>
        <CardDescription>Organizations supporting this event.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {partners.map((partner, index) => (
          <div key={String(partner.id ?? partner.name ?? index)} className="flex items-center gap-3 rounded-lg border border-border/60 p-4">
            {partner.logo || partner.logoUrl ? (
              <InstitutionLogo
                name={String(partner.name ?? partner.organization ?? "Partner")}
                logoUrl={String(partner.logo ?? partner.logoUrl)}
                compact
                className="h-12 w-12"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-mtendere-blue/10">
                <ShieldCheck className="h-5 w-5 text-mtendere-blue" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{String(partner.name ?? partner.organization ?? "Partner")}</p>
              <p className="truncate text-sm text-muted-foreground">{String(partner.role ?? partner.tier ?? partner.type ?? "Collaborator")}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function GalleryGrid({ gallery, event }: { gallery: Array<Record<string, unknown>>; event: ApiEvent }) {
  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="text-2xl text-mtendere-blue">Event gallery</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gallery.slice(0, 9).map((item, index) => (
          <GovernedImage
            key={String(item.id ?? item.src ?? item.url ?? index)}
            module="event"
            src={String(item.src ?? item.url ?? item.image ?? "")}
            title={String(item.alt ?? item.title ?? event.title)}
            category={event.category}
            variant="card"
            aspectRatio="4 / 3"
            index={index}
            className="h-full"
            wrapperClassName="rounded-lg shadow-none"
          />
        ))}
      </CardContent>
    </Card>
  );
}

function AttachmentList({ attachments }: { attachments: Array<Record<string, unknown>> }) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-mtendere-blue">Downloads and documents</CardTitle>
        <CardDescription>Brochures, agendas, certificates, and supporting PDFs.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {attachments.map((attachment, index) => {
          const title = String(attachment.title ?? attachment.name ?? `Attachment ${index + 1}`);
          const url = String(attachment.url ?? attachment.href ?? "");
          return (
            <a
              key={String(attachment.id ?? title)}
              href={url || undefined}
              target={url ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border/60 p-4 transition hover:bg-muted/40"
            >
              <FileText className="h-5 w-5 shrink-0 text-mtendere-orange" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{String(attachment.type ?? "PDF / document")}</p>
              </div>
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ResourceCard({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  items: Array<Record<string, unknown>>;
  empty: string;
}) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-mtendere-blue">
          <Icon className="h-5 w-5 text-mtendere-orange" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="rounded-lg border border-border/60 p-3">
              <p className="font-semibold text-foreground">{String(item.title ?? item.name ?? item.question ?? title)}</p>
              {item.answer || item.description || item.role ? (
                <p className="mt-1 text-sm text-muted-foreground">{String(item.answer ?? item.description ?? item.role)}</p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function LiveLine({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold capitalize ${active ? "text-destructive" : "text-foreground"}`}>
        {active && <Activity className="mr-1 inline h-3 w-3" />}
        {value}
      </span>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
