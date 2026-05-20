import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  Calendar,
  Clock,
  Filter,
  Heart,
  MapPin,
  Monitor,
  Search,
  Share2,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import EventRegistrationDialog from "@/components/event-registration-dialog";
import SaveItemButton from "@/components/save-item-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiEvent } from "@/lib/api-types";

type EventFilters = {
  search: string;
  category: string;
  status: string;
  format: string;
  price: string;
  date: string;
};

const emptyFilters: EventFilters = {
  search: "",
  category: "all",
  status: "all",
  format: "all",
  price: "all",
  date: "all",
};

export default function Events() {
  const [filters, setFilters] = useState<EventFilters>(emptyFilters);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: events = [], isLoading } = useQuery<ApiEvent[]>({
    queryKey: ["/api/events"],
  });

  const categories = useMemo(
    () => Array.from(new Set(events.map((event) => event.category).filter(Boolean))).sort(),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => {
      const search = filters.search.toLowerCase();
      const startsAt = new Date(event.startAt).getTime();
      const matchesSearch =
        !search ||
        event.title.toLowerCase().includes(search) ||
        event.description.toLowerCase().includes(search) ||
        event.location.toLowerCase().includes(search) ||
        event.category.toLowerCase().includes(search);
      const matchesCategory = filters.category === "all" || event.category === filters.category;
      const matchesStatus =
        filters.status === "all" ||
        event.runtimeStatus === filters.status ||
        (filters.status === "featured" && event.isFeatured) ||
        (filters.status === "recommended" && event.isRecommended) ||
        (filters.status === "trending" && event.isTrending);
      const matchesFormat =
        filters.format === "all" ||
        (filters.format === "virtual" && event.isVirtual) ||
        (filters.format === "physical" && !event.isVirtual);
      const matchesPrice =
        filters.price === "all" ||
        (filters.price === "free" && !event.isPaid) ||
        (filters.price === "paid" && event.isPaid);
      const matchesDate =
        filters.date === "all" ||
        (filters.date === "today" && new Date(event.startAt).toDateString() === new Date().toDateString()) ||
        (filters.date === "week" && startsAt <= now + 7 * 24 * 60 * 60 * 1000) ||
        (filters.date === "month" && startsAt <= now + 30 * 24 * 60 * 60 * 1000);

      return matchesSearch && matchesCategory && matchesStatus && matchesFormat && matchesPrice && matchesDate;
    });
  }, [events, filters]);

  const featuredEvents = filteredEvents.filter((event) => event.isFeatured).slice(0, 2);
  const liveEvents = filteredEvents.filter((event) => event.runtimeStatus === "live");
  const upcomingEvents = filteredEvents.filter((event) => event.runtimeStatus === "upcoming");
  const pastEvents = filteredEvents.filter((event) => event.runtimeStatus === "past");
  const recommendedEvents = filteredEvents.filter((event) => event.isRecommended).slice(0, 3);
  const trendingEvents = filteredEvents.filter((event) => event.isTrending).slice(0, 3);

  const shareMutation = useMutation({
    mutationFn: async (event: ApiEvent) => {
      await apiRequest("POST", `/api/events/${event.id}/share`, { channel: "copy-link" });
      const url = `${window.location.origin}/events/${event.slug || event.id}`;
      if (navigator.share) {
        await navigator.share({ title: event.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      return event;
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event link ready", description: `${event.title} can now be shared.` });
    },
    onError: () => {
      toast({ title: "Share failed", description: "Please try again.", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      <section className="relative mt-16 overflow-hidden py-20 text-white">
        <div className="absolute inset-0">
          <GovernedImage
            module="event"
            title="Mtendere events"
            category="events"
            variant="hero"
            priority
            aspectRatio="auto"
            className="h-full"
            wrapperClassName="h-full rounded-none shadow-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/95 via-mtendere-blue/86 to-mtendere-green/84" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <Badge className="mb-5 bg-white/12 px-4 py-1 text-white">Events</Badge>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Learn, connect, and move your next decision forward
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
              Browse Mtendere workshops, briefings, clinics, and partner engagements. Register, save, share, and follow
              updates from one place.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-card py-6">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_150px_150px_150px_150px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Search by event, topic, location..."
                className="pl-10"
              />
            </div>
            <FilterSelect value={filters.status} onValueChange={(status) => setFilters((prev) => ({ ...prev, status }))} placeholder="Status">
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="live">Happening now</SelectItem>
              <SelectItem value="past">Past</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
            </FilterSelect>
            <FilterSelect value={filters.category} onValueChange={(category) => setFilters((prev) => ({ ...prev, category }))} placeholder="Category">
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={filters.format} onValueChange={(format) => setFilters((prev) => ({ ...prev, format }))} placeholder="Format">
              <SelectItem value="all">Any format</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
            </FilterSelect>
            <FilterSelect value={filters.price} onValueChange={(price) => setFilters((prev) => ({ ...prev, price }))} placeholder="Price">
              <SelectItem value="all">Free or paid</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </FilterSelect>
            <FilterSelect value={filters.date} onValueChange={(date) => setFilters((prev) => ({ ...prev, date }))} placeholder="Date">
              <SelectItem value="all">Any date</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </FilterSelect>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Metric label="Events" value={events.length} icon={Calendar} />
            <Metric label="Happening now" value={liveEvents.length} icon={Activity} />
            <Metric label="Upcoming" value={upcomingEvents.length} icon={Clock} />
            <Metric label="Registrations" value={events.reduce((sum, event) => sum + (event.registrationCount ?? 0), 0)} icon={Ticket} />
          </div>
        </div>
      </section>

      <main className="pb-20">
        <div className="container mx-auto max-w-6xl px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="h-96 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <Card className="border border-dashed border-border/60">
              <CardContent className="py-14 text-center">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                <h2 className="text-xl font-bold text-mtendere-blue">No events match those filters</h2>
                <p className="mt-2 text-muted-foreground">Try clearing filters or checking back soon for new events.</p>
                <Button variant="outline" className="mt-5" onClick={() => setFilters(emptyFilters)}>
                  Reset filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-16">
              {featuredEvents.length > 0 && (
                <EventGroup
                  title="Featured Events"
                  description="High-priority sessions selected by the Mtendere team."
                  events={featuredEvents}
                  featured
                  onShare={(event) => shareMutation.mutate(event)}
                />
              )}

              {liveEvents.length > 0 && (
                <EventGroup
                  title="Happening Now"
                  description="Live sessions and active engagements you can join or follow."
                  events={liveEvents}
                  onShare={(event) => shareMutation.mutate(event)}
                />
              )}

              <EventGroup
                title="Upcoming Events"
                description="Register early, save your seat, and receive updates."
                events={upcomingEvents.length > 0 ? upcomingEvents : filteredEvents.filter((event) => event.runtimeStatus !== "past")}
                onShare={(event) => shareMutation.mutate(event)}
              />

              {(recommendedEvents.length > 0 || trendingEvents.length > 0) && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <CompactRail title="Recommended" icon={Sparkles} events={recommendedEvents} />
                  <CompactRail title="Trending" icon={TrendingUp} events={trendingEvents} />
                </div>
              )}

              {pastEvents.length > 0 && (
                <EventGroup
                  title="Past Events"
                  description="Review completed events, galleries, resources, and feedback."
                  events={pastEvents}
                  onShare={(event) => shareMutation.mutate(event)}
                />
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  children: ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <Filter className="mr-2 h-4 w-4" />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-mtendere-blue/10">
          <Icon className="h-5 w-5 text-mtendere-blue" />
        </div>
        <div className="text-3xl font-black text-mtendere-blue">{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function EventGroup({
  title,
  description,
  events,
  featured = false,
  onShare,
}: {
  title: string;
  description: string;
  events: ApiEvent[];
  featured?: boolean;
  onShare: (event: ApiEvent) => void;
}) {
  if (events.length === 0) return null;
  return (
    <section>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-mtendere-blue">{title}</h2>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className={featured ? "grid grid-cols-1 gap-6 lg:grid-cols-2" : "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} featured={featured} onShare={() => onShare(event)} />
        ))}
      </div>
    </section>
  );
}

function EventCard({ event, featured = false, onShare }: { event: ApiEvent; featured?: boolean; onShare: () => void }) {
  const href = `/events/${event.slug || event.id}`;
  return (
    <Card className="group overflow-hidden border border-border/60 shadow-sm transition-shadow hover:shadow-lg">
      <div className={featured ? "grid md:grid-cols-[45%_minmax(0,1fr)]" : ""}>
        <Link href={href}>
          <div className="relative h-64 overflow-hidden bg-mtendere-gray">
            <GovernedImage
              module="event"
              src={event.coverImage}
              title={event.title}
              category={event.category}
              variant="card"
              aspectRatio="auto"
              className="h-full"
              wrapperClassName="h-full rounded-none shadow-none"
              imageClassName="group-hover:scale-105"
            />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <EventStatusBadge event={event} />
              {event.isTrending && <Badge className="bg-mtendere-orange text-white">Trending</Badge>}
            </div>
          </div>
        </Link>

        <div>
          <CardHeader>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-mtendere-blue/20 text-mtendere-blue">
                {event.category}
              </Badge>
              <Badge variant="outline" className="border-mtendere-green/20 text-mtendere-green">
                {event.isVirtual ? "Virtual" : "Physical"}
              </Badge>
              <Badge variant="outline" className="border-mtendere-orange/20 text-mtendere-orange">
                {event.isPaid ? `${event.currency} ${event.priceAmount}` : "Free"}
              </Badge>
            </div>
            <CardTitle className="line-clamp-2 text-2xl leading-tight text-foreground">
              <Link href={href} className="hover:text-mtendere-blue">
                {event.title}
              </Link>
            </CardTitle>
            <CardDescription className="line-clamp-3 leading-relaxed">{event.summary || event.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 text-sm text-muted-foreground">
              <InfoLine icon={Calendar} text={formatDate(event.startAt)} />
              <InfoLine icon={MapPin} text={event.isVirtual ? "Online event" : event.location} />
              <InfoLine icon={Users} text={`${event.registrationCount ?? 0} registered${event.remainingSeats === null ? "" : `, ${event.remainingSeats} seats left`}`} />
            </div>

            <Countdown event={event} />

            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-mtendere-blue hover:bg-mtendere-blue/90">
                <Link href={href}>View details</Link>
              </Button>
              <EventRegistrationDialog
                event={event}
                trigger={
                  <Button variant="outline" className="border-mtendere-orange/30 text-mtendere-orange hover:bg-mtendere-orange hover:text-white">
                    <Ticket className="mr-2 h-4 w-4" />
                    Register
                  </Button>
                }
              />
              <SaveItemButton type="event" referenceId={event.id} className="px-3" />
              <Button variant="outline" size="icon" onClick={onShare} aria-label={`Share ${event.title}`}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

function CompactRail({ title, icon: Icon, events }: { title: string; icon: LucideIcon; events: ApiEvent[] }) {
  if (events.length === 0) return null;
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-mtendere-blue">
          <Icon className="h-5 w-5 text-mtendere-orange" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((event) => (
          <Link key={event.id} href={`/events/${event.slug || event.id}`} className="block rounded-lg border border-border/60 p-4 transition-colors hover:bg-muted/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{event.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(event.startAt)}</p>
              </div>
              <Heart className="h-4 w-4 text-mtendere-orange" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function EventStatusBadge({ event }: { event: ApiEvent }) {
  if (event.runtimeStatus === "live") return <Badge className="bg-destructive text-white">Happening now</Badge>;
  if (event.runtimeStatus === "past") return <Badge variant="secondary">Past event</Badge>;
  if (event.isFeatured) return <Badge className="bg-mtendere-blue text-white">Featured</Badge>;
  return <Badge className="bg-mtendere-green text-white">Upcoming</Badge>;
}

function Countdown({ event }: { event: ApiEvent }) {
  const start = new Date(event.startAt).getTime();
  const diff = start - Date.now();
  if (event.runtimeStatus === "live") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm font-semibold text-destructive">
        <Activity className="h-4 w-4" />
        Live engagement active
      </div>
    );
  }
  if (diff <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm font-semibold text-muted-foreground">
        <Clock className="h-4 w-4" />
        Event completed
      </div>
    );
  }
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff / (60 * 60 * 1000)) % 24);
  return (
    <div className="flex items-center gap-2 rounded-lg bg-mtendere-orange/10 p-3 text-sm font-semibold text-mtendere-orange">
      <Clock className="h-4 w-4" />
      Starts in {days}d {hours}h
    </div>
  );
}

function InfoLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-mtendere-blue" />
      <span>{text}</span>
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
