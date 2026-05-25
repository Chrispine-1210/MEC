import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, Building2, CalendarDays, Globe2, Handshake, Landmark, Mail, ShieldCheck, Sparkles, Target, Users, type LucideIcon } from "lucide-react";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { publicContentQueryOptions } from "@/lib/realtime-content";
import type { ApiPartner } from "@/lib/api-types";

const opportunityTracks = [
  {
    title: "Event Sponsorship",
    description: "Sponsor conferences, workshops, career clinics, scholarship briefings, and public education campaigns.",
    icon: CalendarDays,
  },
  {
    title: "Academic Pathways",
    description: "Build student recruitment, exchange, placement, scholarship, and university application pipelines.",
    icon: Landmark,
  },
  {
    title: "Technology Enablement",
    description: "Collaborate on platforms, AI readiness, digital credentials, media systems, and operational tooling.",
    icon: Sparkles,
  },
  {
    title: "Community Impact",
    description: "Co-deliver NGO, government, youth, and social impact programs with measurable outcomes.",
    icon: Users,
  },
];

export default function PartnershipOpportunities() {
  const { data: partners = [] } = useQuery<ApiPartner[]>({
    queryKey: ["/api/partners"],
    ...publicContentQueryOptions,
  });

  const activePartners = partners.filter((partner) => partner.isActive !== false);
  const tiers = useMemo(() => {
    const counts = activePartners.reduce<Record<string, number>>((acc, partner) => {
      const tier = partner.sponsorshipTier || partner.partnershipLevel || partner.partnershipType || "Partner";
      acc[tier] = (acc[tier] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((left, right) => right[1] - left[1]).slice(0, 6);
  }, [activePartners]);

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      <section className="relative mt-16 overflow-hidden py-24 text-white">
        <div className="absolute inset-0">
          <GovernedImage
            module="partner"
            title="Partnership opportunities"
            category="collaboration"
            variant="hero"
            priority
            aspectRatio="auto"
            className="h-full"
            wrapperClassName="h-full rounded-none shadow-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/95 via-mtendere-blue/85 to-mtendere-green/85" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <div className="max-w-4xl">
            <Badge className="mb-5 bg-white/15 text-white">Partner With Mtendere</Badge>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">Build measurable education, workforce, and event impact together</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/85">
              Collaborate through sponsorships, institutional partnerships, media programs, technology enablement, and public-facing events managed by the Mtendere operational platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
                <Link href="/contact">
                  Start a Partnership
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-mtendere-blue">
                <Link href="/partners">View Partner Network</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="py-16">
        <div className="container mx-auto max-w-6xl space-y-14 px-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Active partners" value={activePartners.length} icon={Building2} />
            <Metric label="Featured partners" value={activePartners.filter((partner) => partner.isFeatured).length} icon={ShieldCheck} />
            <Metric label="Countries / regions" value={new Set(activePartners.map((partner) => partner.region || partner.country).filter(Boolean)).size} icon={Globe2} />
            <Metric label="Opportunity tracks" value={opportunityTracks.length} icon={Target} />
          </div>

          <section>
            <div className="mb-8 max-w-2xl">
              <h2 className="text-3xl font-bold text-mtendere-blue">Collaboration Tracks</h2>
              <p className="mt-2 text-muted-foreground">Designed for sponsors, universities, NGOs, companies, media partners, and government institutions.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {opportunityTracks.map(({ title, description, icon: Icon }) => (
                <Card key={title} className="premium-card">
                  <CardHeader>
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-mtendere-blue/10">
                      <Icon className="h-5 w-5 text-mtendere-blue" />
                    </div>
                    <CardTitle className="text-xl text-foreground">{title}</CardTitle>
                    <CardDescription className="leading-6">{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-mtendere-blue">
                  <Handshake className="h-6 w-6 text-mtendere-orange" />
                  Partnership Lifecycle
                </CardTitle>
                <CardDescription>Every opportunity is governed through profile management, agreement tracking, events, communications, reporting, and renewal workflows.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {["Discovery and qualification", "Proposal and sponsorship design", "Agreement and document governance", "Event and campaign activation", "Performance reporting", "Renewal and growth planning"].map((step, index) => (
                  <div key={step} className="rounded-lg border border-border/60 p-4">
                    <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-mtendere-green text-sm font-bold text-white">{index + 1}</div>
                    <p className="font-semibold text-foreground">{step}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">Current Network Mix</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tiers.length ? tiers.map(([tier, count]) => (
                  <div key={tier} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                    <span className="text-sm font-medium text-foreground">{tier}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">Network tiers will appear as partner profiles are published.</p>
                )}
                <Button asChild className="mt-2 w-full bg-mtendere-blue hover:bg-mtendere-blue/90">
                  <a href="mailto:partnerships@mtendere.com">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Partnerships Team
                  </a>
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <Card className="premium-card">
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
