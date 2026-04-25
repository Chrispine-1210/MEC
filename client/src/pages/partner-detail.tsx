import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiPartner } from "@/lib/api-types";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Compass,
  ExternalLink,
  Globe,
  GraduationCap,
  LineChart,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=1600";

const formatStudentCount = (count?: number | null) => {
  if (!count) return "Flexible cohort sizes";
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K+ students`;
  }
  return `${count} students`;
};

const getCampusScale = (count?: number | null) => {
  if (!count) return "Student community details available on request";
  if (count >= 25000) return "Large campus network";
  if (count >= 10000) return "Balanced mid-to-large campus";
  return "Smaller support-led study environment";
};

const getBestFit = (count?: number | null) => {
  if (!count) {
    return "Students who want advisor help comparing learning environment, support, and affordability before deciding.";
  }
  if (count >= 25000) {
    return "Students looking for broad campus life, more program variety, and large peer networks.";
  }
  if (count >= 10000) {
    return "Students who want a mix of scale, structure, and accessible support.";
  }
  return "Students who may value closer cohorts, contained campus life, and a more intimate learning setting.";
};

const getDecisionFocus = (partner: ApiPartner) => [
  `Compare ${partner.name} against at least one other option before committing to the brand alone.`,
  "Check fee structure, scholarship routes, and document requirements as early as possible.",
  "Use one planning conversation to line up destination, budget, academic fit, and application timing.",
];

export default function PartnerDetail() {
  const [, params] = useRoute("/partners/:id");
  const id = Number(params?.id ?? 0);

  const { data: partner, isLoading: partnerLoading } = useQuery<ApiPartner>({
    queryKey: [`/api/partners/${id}`],
    enabled: Number.isFinite(id) && id > 0,
  });

  const { data: partners, isLoading: listLoading } = useQuery<ApiPartner[]>({
    queryKey: ["/api/partners"],
  });

  const resolved = partner || partners?.find((item) => item.id === id);
  const related = (partners || []).filter((item) => item.id !== id).slice(0, 3);

  if (partnerLoading && listLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ExpandingNav />
        <div className="container mx-auto px-4 py-16">
          <Skeleton className="mb-6 h-8 w-32" />
          <Skeleton className="mb-8 h-72 w-full rounded-3xl" />
          <Skeleton className="mb-4 h-10 w-3/4" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="min-h-screen bg-background">
        <ExpandingNav />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-4 text-2xl font-bold text-muted-foreground">Partner not found</h1>
          <Button asChild>
            <Link href="/partners">Back to Partners</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const heroStats = [
    { label: "Country", value: resolved.country || "Global access", icon: MapPin },
    { label: "Student body", value: formatStudentCount(resolved.studentCount), icon: Users },
    { label: "Campus signal", value: getCampusScale(resolved.studentCount), icon: Compass },
    { label: "Recognition", value: resolved.ranking || "Advisor review available", icon: Star },
  ];

  const decisionFrames = [
    {
      icon: Target,
      title: "Who it may fit best",
      description: getBestFit(resolved.studentCount),
    },
    {
      icon: LineChart,
      title: "What to compare carefully",
      description:
        "Look beyond prestige and ask how the institution performs on affordability, program fit, support, and student experience.",
    },
    {
      icon: ShieldCheck,
      title: "How Mtendere helps",
      description:
        "We turn broad interest into a shortlist, document plan, and application strategy so this choice becomes practical.",
    },
  ];

  const partnershipHighlights = [
    {
      icon: GraduationCap,
      title: "Academic planning",
      description:
        "Use this page to think in terms of program fit, not just institution name. Strong applications usually start with better-fit shortlists.",
    },
    {
      icon: Globe,
      title: "Destination context",
      description: `${
        resolved.country || "This destination"
      } should be evaluated alongside living costs, support systems, and long-term mobility options.`,
    },
    {
      icon: Sparkles,
      title: "Readiness support",
      description:
        "Once this partner looks promising, Mtendere can help refine essays, organize documents, and shape a stronger application story.",
    },
    {
      icon: BookOpen,
      title: "Decision clarity",
      description:
        "We help you compare institutions side by side so your next step is informed, realistic, and easier to act on.",
    },
  ];

  const comparisonAxes = [
    "Program fit and how closely it matches your academic direction",
    "Tuition, living costs, and any scholarship or discount routes",
    "Campus scale, student support, and the kind of environment you work best in",
    "Application timelines, competitiveness, and document complexity",
  ];

  const pathwayCards = [
    "Undergraduate applications where students need structure, destination matching, and timeline support",
    "Postgraduate or specialization pathways that need clearer positioning and statement quality",
    "Study-abroad planning for students comparing multiple countries and institutions at once",
    "Funding-sensitive applications where affordability needs to be weighed early, not at the end",
  ];

  const advisoryJourney = [
    {
      title: "Clarify the fit",
      description: "We look at your goals, academic direction, and budget to see whether this partner deserves a place on your shortlist.",
      icon: Compass,
    },
    {
      title: "Compare with alternatives",
      description: "We put this institution beside similar options so you can see trade-offs, not just headlines.",
      icon: LineChart,
    },
    {
      title: "Prepare the application",
      description: "We help with document flow, story quality, and next-step planning so the process feels less fragmented.",
      icon: CheckCircle,
    },
    {
      title: "Move forward confidently",
      description: "From submission to scholarship conversations and visa prep, we keep the next move visible.",
      icon: ArrowRight,
    },
  ];

  const sidebarActions = [
    { label: "Talk to an advisor", href: "/contact" },
    { label: "Compare study abroad options", href: "/study-abroad" },
    { label: "Plan your university application", href: "/university-applications" },
    { label: "Browse scholarships", href: "/scholarships" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      <section
        className="relative mt-16 overflow-hidden py-20 text-white"
        style={{
          backgroundImage: `url(${resolved.logoUrl || FALLBACK_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/95 via-mtendere-blue/88 to-mtendere-green/84" />
        <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-mtendere-orange/20 blur-3xl" />

        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <Button asChild variant="ghost" className="mb-6 -ml-3 text-white hover:bg-card/20">
            <Link href="/partners">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Partners
            </Link>
          </Button>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_380px] lg:items-end">
            <div className="max-w-4xl">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge className="bg-mtendere-orange font-semibold text-white">Partner Institution</Badge>
                <Badge variant="outline" className="border-white/35 bg-white/10 text-white">
                  <Globe className="mr-1 h-3 w-3" />
                  {resolved.country || "International pathway"}
                </Badge>
                {resolved.ranking && (
                  <Badge variant="outline" className="border-white/35 bg-white/10 text-white">
                    <Star className="mr-1 h-3 w-3 fill-white" />
                    {resolved.ranking}
                  </Badge>
                )}
              </div>

              <h1 className="mb-5 text-4xl font-bold md:text-6xl">{resolved.name}</h1>
              <p className="max-w-3xl text-base leading-relaxed text-white/85 md:text-lg">
                {resolved.description ||
                  "Use this page to understand how this institution fits into your wider education plan, what to compare carefully, and how Mtendere can help you move from interest to action."}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {heroStats.slice(0, 3).map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
                  <Link href="/contact">Book a consultation</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-mtendere-blue"
                >
                  <Link href="/study-abroad">Compare destinations</Link>
                </Button>
                {resolved.website && (
                  <Button asChild variant="ghost" className="text-white hover:bg-card/20 hover:text-white">
                    <a href={resolved.website} target="_blank" rel="noopener noreferrer">
                      Visit official website
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <Card className="border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl text-white">Institution brief</CardTitle>
                <CardDescription className="text-white/75">
                  A stronger partner page should help you decide whether to explore, compare, or act next.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {decisionFrames.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="rounded-2xl border border-white/15 bg-white/12 p-4 backdrop-blur-sm">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/80">{description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {heroStats.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border-white/15 bg-white/10 text-white shadow-xl backdrop-blur-sm">
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="rounded-full bg-white/15 p-2">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/65">{label}</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-10">
            <section className="grid gap-5 md:grid-cols-3">
              {decisionFrames.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mtendere-blue/10">
                      <Icon className="h-5 w-5 text-mtendere-blue" />
                    </div>
                    <CardTitle className="text-lg text-foreground">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed text-muted-foreground">{description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section>
              <Badge variant="outline" className="border-mtendere-blue/20 text-mtendere-blue">
                Why this partner matters
              </Badge>
              <h2 className="mt-4 text-2xl font-bold text-mtendere-blue md:text-3xl">
                Use this institution as a decision point, not just a destination name
              </h2>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-muted-foreground">
                <p>
                  The strongest partner pages help students understand academic fit, cost, timing, and support before
                  they spend money or energy on a full application. That is the lens we use here.
                </p>
                <p>
                  {resolved.name} may be a compelling option, but the right next step is usually to compare it against
                  alternatives, confirm the pathway, and understand what kind of application effort it will take.
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">What this partnership can help unlock</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {partnershipHighlights.map(({ icon: Icon, title, description }) => (
                  <Card key={title} className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mtendere-green/10">
                        <Icon className="h-5 w-5 text-mtendere-green" />
                      </div>
                      <CardTitle className="text-lg text-foreground">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="leading-relaxed text-muted-foreground">{description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-mtendere-blue">A smarter evaluation checklist</h2>
                  <p className="mt-2 text-muted-foreground">
                    Four questions that make partner research far more useful.
                  </p>
                </div>
              </div>
              <Card className="border border-border/60 bg-gradient-to-br from-mtendere-blue/5 via-card to-mtendere-green/5">
                <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                  {comparisonAxes.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 text-mtendere-green" />
                      <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Pathways students usually explore here</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {pathwayCards.map((item) => (
                  <Card key={item} className="border border-border/60">
                    <CardContent className="flex items-start gap-3 p-5">
                      <GraduationCap className="mt-0.5 h-5 w-5 text-mtendere-orange" />
                      <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">What Mtendere can do with you next</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {advisoryJourney.map(({ title, description, icon: Icon }, index) => (
                  <Card key={title} className="border border-border/60">
                    <CardHeader className="pb-2">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mtendere-blue/10">
                          <Icon className="h-5 w-5 text-mtendere-blue" />
                        </div>
                        <Badge variant="outline" className="border-mtendere-blue/30 text-mtendere-blue">
                          Step {index + 1}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg text-foreground">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="leading-relaxed text-muted-foreground">{description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-gradient-to-r from-mtendere-blue to-mtendere-green p-8 text-white">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <h2 className="text-2xl font-bold">Ready to turn partner research into a real shortlist?</h2>
                  <p className="mt-2 text-white/85">
                    We can help you compare institutions, map application timing, and decide what to pursue first.
                  </p>
                </div>
                <Button asChild className="bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
                  <Link href="/contact">
                    Talk to an advisor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </section>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-0 bg-card shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">Partner snapshot</CardTitle>
                <CardDescription>Quick context to help you judge whether this option deserves deeper effort.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Location</span>
                    <span className="text-right font-semibold text-foreground/80">
                      {resolved.country || "International"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Student community</span>
                    <span className="text-right font-semibold text-foreground/80">
                      {formatStudentCount(resolved.studentCount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Campus signal</span>
                    <span className="text-right font-semibold text-foreground/80">
                      {getCampusScale(resolved.studentCount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Recognition</span>
                    <span className="text-right font-semibold text-foreground/80">
                      {resolved.ranking || "Ask for advisor context"}
                    </span>
                  </div>
                </div>

                {sidebarActions.map((action) => (
                  <Button
                    key={action.label}
                    asChild
                    variant={action.href === "/contact" ? "default" : "outline"}
                    className={
                      action.href === "/contact"
                        ? "w-full bg-mtendere-blue font-bold hover:bg-mtendere-blue/90"
                        : "w-full border-mtendere-blue/20 text-mtendere-blue hover:bg-mtendere-blue hover:text-white"
                    }
                  >
                    <Link href={action.href}>{action.label}</Link>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-gradient-to-br from-mtendere-orange/10 via-card to-mtendere-green/10">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Best next moves</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {getDecisionFocus(resolved).map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 text-mtendere-orange" />
                    <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Questions worth asking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Does the program mix, support model, and campus scale fit how I learn best?",
                  "What funding options or affordability trade-offs should I understand before applying?",
                  "If I shortlist this partner, what documents and deadlines need to be mapped first?",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                    <Target className="mt-0.5 h-4 w-4 text-mtendere-blue" />
                    <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {related.length > 0 && (
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Compare with other partners</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {related.map((item) => (
                    <Link key={item.id} href={`/partners/${item.id}`}>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40">
                        <div>
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.country || "International"}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border border-border/60 bg-mtendere-blue text-white">
              <CardHeader>
                <CardTitle className="text-lg text-white">Need a second opinion before you choose?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-white/85">
                  We can help you weigh this institution against your other options and build a clearer application plan.
                </p>
                <Button asChild className="w-full bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
                  <Link href="/contact">
                    Book a planning session
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
