import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import ApplicationDialog from "@/components/application-dialog";
import SaveItemButton from "@/components/save-item-button";
import GovernedImage from "@/components/governed-image";
import RichContent from "@/components/rich-content";
import { publicContentQueryOptions } from "@/lib/realtime-content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiScholarship } from "@/lib/api-types";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  FileCheck,
  GraduationCap,
  Globe,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react";

const formatCurrency = (amount: number | null | undefined, currency?: string | null) => {
  if (!amount) return "Full coverage";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "TBD";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getDaysLeft = (dateString?: string | null) => {
  if (!dateString) return null;
  const deadlineDate = new Date(dateString);
  const diffTime = deadlineDate.getTime() - Date.now();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function ScholarshipDetail() {
  const [, params] = useRoute("/scholarships/:id");
  const id = Number(params?.id ?? 0);

  const { data: scholarship, isLoading: scholarshipLoading } = useQuery<ApiScholarship>({
    queryKey: [`/api/scholarships/${id}`],
    enabled: Number.isFinite(id) && id > 0,
    ...publicContentQueryOptions,
  });

  const { data: scholarships, isLoading: listLoading } = useQuery<ApiScholarship[]>({
    queryKey: ["/api/scholarships"],
    ...publicContentQueryOptions,
  });

  const resolved = scholarship || scholarships?.find((item) => item.id === id);
  const related = (scholarships || [])
    .filter((item) => item.id !== id && item.category === resolved?.category)
    .slice(0, 3);

  if (scholarshipLoading && listLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ExpandingNav />
        <div className="container mx-auto px-4 py-16">
          <Skeleton className="mb-6 h-8 w-32" />
          <Skeleton className="mb-8 h-64 w-full rounded-2xl" />
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
          <h1 className="mb-4 text-2xl font-bold text-muted-foreground">Scholarship not found</h1>
          <Button asChild>
            <Link href="/scholarships">Back to Scholarships</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const daysLeft = getDaysLeft(resolved.deadline);
  const overviewContent =
    resolved.description ||
    [
      "This opportunity is designed for ambitious students who want stronger academic access, financial support, and a clear application path.",
      "Mtendere can help you assess eligibility, strengthen your narrative, and submit a more competitive application package before the deadline.",
    ].join("\n\n");
  const requirements =
    Array.isArray(resolved.requirements) && resolved.requirements.length > 0
      ? resolved.requirements
      : [
          "Academic transcripts or latest results",
          "Personal statement or statement of purpose",
          "Two references or recommendation letters",
          "Proof of language proficiency if required",
        ];
  const fundingLabel = formatCurrency(resolved.amount, resolved.currency);
  const heroStats = [
    { label: "Award", value: fundingLabel, icon: DollarSign },
    { label: "Destination", value: resolved.country, icon: Globe },
    { label: "Category", value: resolved.category, icon: Star },
    {
      label: "Deadline",
      value: daysLeft !== null && daysLeft > 0 ? `${daysLeft} days left` : formatDate(resolved.deadline),
      icon: Calendar,
    },
  ];
  const coverageHighlights = [
    {
      icon: DollarSign,
      title: "Funding support",
      description: `${fundingLabel} support for eligible students, with the exact package confirmed by the institution or sponsor.`,
    },
    {
      icon: GraduationCap,
      title: "Academic pathway",
      description: `A strong fit for students exploring ${resolved.category.toLowerCase()} opportunities and long-term academic growth.`,
    },
    {
      icon: Globe,
      title: "Global access",
      description: `Study in ${resolved.country} and position yourself for international exposure, networks, and future mobility.`,
    },
    {
      icon: ShieldCheck,
      title: "Application guidance",
      description: "Mtendere helps you review eligibility, organize documents, and refine the final submission package.",
    },
  ];
  const roadmapSteps = [
    {
      title: "Check fit and timing",
      description: "Review the scholarship category, location, and deadline so you only invest time in the right opportunity.",
      icon: Target,
    },
    {
      title: "Build a complete file",
      description: "Gather transcripts, references, and your motivation story early so nothing delays the final application.",
      icon: FileCheck,
    },
    {
      title: "Strengthen your narrative",
      description: "Show academic readiness, leadership, and the reason this program aligns with your future goals.",
      icon: Sparkles,
    },
    {
      title: "Submit and stay ready",
      description: "Apply before the deadline, monitor updates, and prepare for any next-step interview or document request.",
      icon: CheckCircle,
    },
  ];
  const advisorSupport = [
    "Shortlist best-fit scholarships based on your background and goals.",
    "Review essays, statements, and scholarship positioning before submission.",
    "Create a submission checklist so nothing important is missed.",
    "Prepare you for interviews, embassy questions, or follow-up documentation.",
  ];
  const finalChecklist = [
    "Confirm every document uses the correct names, dates, and formatting.",
    "Tailor your statement to the institution and scholarship objective.",
    "Submit at least a few days before the official deadline when possible.",
    "Keep copies of all submitted documents and note follow-up dates.",
  ];
  const fitSignals = [
    {
      title: "Best for",
      description: `Students looking for ${resolved.category.toLowerCase()} support with a clearer academic and funding pathway.`,
      icon: Star,
    },
    {
      title: "What to confirm early",
      description: "Eligibility, document expectations, and whether the funding level makes the full plan affordable.",
      icon: BookOpen,
    },
    {
      title: "Mtendere value",
      description: "We help you judge fit quickly, strengthen your narrative, and submit with fewer avoidable mistakes.",
      icon: ShieldCheck,
    },
  ];
  const nextStepPlan = [
    "Confirm fit against the scholarship category, destination, and deadline.",
    "Gather transcripts, references, and your statement before the final week.",
    "Get feedback on your application story so your submission reads stronger and clearer.",
  ];

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      <section className="relative mt-16 overflow-hidden py-20 text-white">
        <div className="absolute inset-0">
          <GovernedImage
            module="scholarship"
            src={resolved.imageUrl}
            title={resolved.title}
            category={resolved.category}
            variant="hero"
            priority
            aspectRatio="auto"
            className="h-full"
            wrapperClassName="h-full rounded-none shadow-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/95 via-mtendere-blue/88 to-mtendere-green/86" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <Button asChild variant="ghost" className="mb-6 -ml-3 text-white hover:bg-card/20">
            <Link href="/scholarships">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scholarships
            </Link>
          </Button>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:items-end">
            <div className="hero-panel hero-safe-copy max-w-4xl rounded-3xl p-7 md:p-10">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge className="bg-mtendere-orange text-white font-semibold">{resolved.category}</Badge>
                {daysLeft !== null && daysLeft <= 30 && daysLeft > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    <Clock className="mr-1 h-3 w-3" />
                    {daysLeft} days left
                  </Badge>
                )}
                <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
                  <GraduationCap className="mr-1 h-3 w-3" />
                  {resolved.institution}
                </Badge>
              </div>

              <h1 className="mb-6 text-3xl font-bold md:text-5xl">{resolved.title}</h1>
              <p className="max-w-3xl text-base leading-relaxed text-white/85 md:text-lg">
                Build a smarter application for this opportunity with clearer preparation, better document quality,
                and support from the Mtendere team when you need it most.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/85">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {resolved.country}
                </span>
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {fundingLabel}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Deadline {formatDate(resolved.deadline)}
                </span>
              </div>
            </div>

            <Card className="border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl text-white">Scholarship decision brief</CardTitle>
                <CardDescription className="text-white/75">
                  Use this page to judge fit quickly and move into the right preparation work.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fitSignals.map(({ title, description, icon: Icon }) => (
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

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {heroStats.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border-white/15 bg-white/10 text-white shadow-xl backdrop-blur-sm">
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="rounded-full bg-white/15 p-2">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">{label}</p>
                    <p className="mt-2 text-base font-semibold">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <section className="space-y-4">
              <Badge variant="outline" className="border-mtendere-blue/20 text-mtendere-blue">
                Scholarship Overview
              </Badge>
              <h2 className="text-2xl font-bold text-mtendere-blue md:text-3xl">
                What this opportunity could unlock for you
              </h2>
              <RichContent html={overviewContent} />
            </section>

            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-mtendere-blue">Coverage and fit</h2>
                  <p className="mt-2 text-muted-foreground">
                    A quick read on the value, academic angle, and support around this scholarship.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {coverageHighlights.map(({ icon: Icon, title, description }) => (
                  <Card key={title} className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mtendere-blue/10">
                        <Icon className="h-5 w-5 text-mtendere-blue" />
                      </div>
                      <CardTitle className="text-lg text-foreground">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                        {description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Eligibility and required documents</h2>
              <Card className="border-0 bg-mtendere-gray/60 shadow-sm">
                <CardContent className="space-y-4 p-6">
                  {requirements.map((req, idx) => (
                    <div key={`${req}-${idx}`} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 text-mtendere-green" />
                      <div>
                        <p className="font-medium text-foreground/90">{req}</p>
                        {idx === requirements.length - 1 && !Array.isArray(resolved.requirements) && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Use the official listing or advisor guidance to confirm program-specific requirements.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Application roadmap</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {roadmapSteps.map(({ title, description, icon: Icon }, index) => (
                  <Card key={title} className="border border-border/60">
                    <CardHeader className="pb-2">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mtendere-green/10">
                          <Icon className="h-5 w-5 text-mtendere-green" />
                        </div>
                        <Badge variant="outline" className="border-mtendere-green/30 text-mtendere-green">
                          Step {index + 1}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg text-foreground">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="leading-relaxed text-muted-foreground">
                        {description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">How Mtendere helps you compete strongly</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {advisorSupport.map((item) => (
                  <Card key={item} className="border border-border/60">
                    <CardContent className="flex items-start gap-3 p-5">
                      <Users className="mt-0.5 h-5 w-5 text-mtendere-blue" />
                      <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Before you submit</h2>
              <Card className="border border-border/60 bg-gradient-to-br from-mtendere-blue/5 via-card to-mtendere-green/5">
                <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                  {finalChecklist.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <FileCheck className="mt-0.5 h-5 w-5 text-mtendere-orange" />
                      <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-0 bg-card shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">Apply for this scholarship</CardTitle>
                <CardDescription>
                  Start your application, save this opportunity, and get support if you need a second pair of eyes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Institution</span>
                    <span className="text-right font-semibold text-foreground/80">{resolved.institution}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Award</span>
                    <span className="font-semibold text-mtendere-green">{fundingLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className="font-semibold text-foreground/80">{formatDate(resolved.deadline)}</span>
                  </div>
                </div>

                <ApplicationDialog
                  type="scholarship"
                  referenceId={id}
                  title={resolved.title}
                  trigger={
                    <Button className="w-full bg-mtendere-blue font-bold hover:bg-mtendere-blue/90">
                      Apply Now
                    </Button>
                  }
                />

                <SaveItemButton
                  type="scholarship"
                  referenceId={id}
                  className="w-full border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white"
                />

                <Button asChild variant="ghost" className="w-full text-muted-foreground">
                  <Link href="/contact">Talk to an advisor</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border/60">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Quick facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {heroStats.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-4 w-4 text-mtendere-blue" />
                      {label}
                    </span>
                    <span className="text-right font-semibold text-foreground/80">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-gradient-to-br from-mtendere-green/5 via-card to-mtendere-orange/10">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Best next moves</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nextStepPlan.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <BookOpen className="mt-0.5 h-4 w-4 text-mtendere-green" />
                    <p className="text-sm text-foreground/80">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {related.length > 0 && (
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Related scholarships</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {related.map((item) => (
                    <Link key={item.id} href={`/scholarships/${item.id}`}>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40">
                        <div>
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.institution}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
