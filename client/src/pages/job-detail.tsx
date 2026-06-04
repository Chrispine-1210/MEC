import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import ApplicationDialog from "@/components/application-dialog";
import SaveItemButton from "@/components/save-item-button";
import GovernedImage from "@/components/governed-image";
import RichContent from "@/components/rich-content";
import { SEO } from "@/components/SEO";
import { publicContentQueryOptions } from "@/lib/realtime-content";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildJobPostingSchema,
  buildOrganizationSchema,
  buildRelatedItemListSchema,
  buildWebsiteSchema,
  canonicalUrl,
  generateKeywords,
  seoDescription,
} from "@/lib/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiJob } from "@/lib/api-types";
import {
  ArrowLeft,
  Briefcase,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  LineChart,
  Mail,
  MapPin,
  Printer,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wifi,
  Wrench,
} from "lucide-react";

const formatCurrency = (amount: number | null | undefined, currency?: string | null) => {
  if (!amount) return "Competitive";
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

export default function JobDetail() {
  const [, params] = useRoute("/jobs/:id");
  const identifier = params?.id ?? "";

  const { data: job, isLoading: jobLoading } = useQuery<ApiJob>({
    queryKey: [`/api/jobs/${identifier}`],
    enabled: Boolean(identifier),
    ...publicContentQueryOptions,
  });

  const { data: jobs, isLoading: listLoading } = useQuery<ApiJob[]>({
    queryKey: ["/api/jobs"],
    ...publicContentQueryOptions,
  });

  const numericId = Number(identifier);
  const resolved =
    job ||
    jobs?.find((item) =>
      Number.isFinite(numericId) && numericId > 0
        ? item.id === numericId
        : item.slug === identifier,
    );
  const related = (jobs || [])
    .filter((item) => item.id !== resolved?.id && (item.category || item.jobType) === (resolved?.category || resolved?.jobType))
    .slice(0, 3);

  if (jobLoading && listLoading) {
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
          <h1 className="mb-4 text-2xl font-bold text-muted-foreground">Job not found</h1>
          <Button asChild>
            <Link href="/jobs">Back to Jobs</Link>
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
      "This role offers a focused opportunity to build experience, contribute value early, and grow with an employer that is actively hiring.",
      "Use the details below to understand employer expectations, prepare the right materials, and approach the process with more confidence.",
    ].join("\n\n");
  const requirements =
    Array.isArray(resolved.requirements) && resolved.requirements.length > 0
      ? resolved.requirements
      : [
          "Strong communication and collaboration",
          "Problem-solving mindset and ability to learn quickly",
          "Relevant academic, internship, or project experience",
          "Reliability, organization, and attention to detail",
        ];
  const benefits =
    Array.isArray(resolved.benefits) && resolved.benefits.length > 0
      ? resolved.benefits
      : ["Career development support", "Mentorship from senior team members", "Flexible work options"];
  const responsibilities =
    Array.isArray(resolved.responsibilities) && resolved.responsibilities.length > 0
      ? resolved.responsibilities
      : [
          "Deliver assigned work with reliability, ownership, and clear communication.",
          "Collaborate with managers and team members to meet agreed outcomes.",
          "Share progress, risks, and ideas that improve team performance.",
        ];
  const qualifications =
    Array.isArray(resolved.qualifications) && resolved.qualifications.length > 0
      ? resolved.qualifications
      : Array.isArray(resolved.educationRequirements) && resolved.educationRequirements.length > 0
        ? resolved.educationRequirements
        : ["Relevant education, training, or experience for this role."];
  const skills =
    Array.isArray(resolved.requiredSkills) && resolved.requiredSkills.length > 0
      ? resolved.requiredSkills
      : Array.isArray(resolved.skills) && resolved.skills.length > 0
        ? resolved.skills
        : requirements.slice(0, 5);
  const compensationLabel = formatCurrency(resolved.salary, resolved.currency);
  const workMode = resolved.workMode || (resolved.isRemote ? "Remote-friendly" : "On-site or hybrid");
  const heroStats = [
    { label: "Company", value: resolved.company, icon: Building },
    { label: "Compensation", value: resolved.salaryRange || compensationLabel, icon: DollarSign },
    { label: "Work mode", value: workMode, icon: resolved.isRemote ? Wifi : Briefcase },
    {
      label: "Deadline",
      value: daysLeft !== null && daysLeft > 0 ? `${daysLeft} days left` : formatDate(resolved.deadline),
      icon: Calendar,
    },
  ];
  const quickFacts = [
    ...heroStats,
    { label: "Job type", value: resolved.employmentType || resolved.jobType, icon: Briefcase },
    { label: "Experience", value: resolved.experienceLevel || "Open to qualified candidates", icon: Target },
    { label: "Education", value: qualifications[0] || "Relevant qualification", icon: ShieldCheck },
    { label: "Positions", value: resolved.numberOfPositions || "1", icon: Users },
  ];
  const roleHighlights = [
    {
      icon: Briefcase,
      title: "Role focus",
      description: `This ${resolved.jobType.toLowerCase()} role is built for candidates ready to contribute in a structured and accountable way.`,
    },
    {
      icon: MapPin,
      title: "Location and access",
      description: `${resolved.location} is the listed work location, with ${
        resolved.isRemote ? "remote flexibility included." : "the employer expecting a stronger on-site presence."
      }`,
    },
    {
      icon: DollarSign,
      title: "Compensation signal",
      description: `${compensationLabel} gives you a starting point for assessing fit, value, and negotiation expectations.`,
    },
    {
      icon: ShieldCheck,
      title: "Application support",
      description: "Mtendere can help refine your CV, strengthen your positioning, and prepare you for interviews.",
    },
  ];
  const successPlan = [
    {
      title: "Understand the employer's need",
      description: "Read beyond the title and identify the outcomes the company likely wants from this hire.",
      icon: Target,
    },
    {
      title: "Tailor your application",
      description: "Match your resume, cover letter, and examples to the strongest requirements in the listing.",
      icon: Sparkles,
    },
    {
      title: "Prepare for screening",
      description: "Be ready to explain your experience, motivation, and why you fit this company and role.",
      icon: Users,
    },
    {
      title: "Interview with evidence",
      description: "Use clear examples, measurable results, and a confident story about how you solve problems.",
      icon: CheckCircle,
    },
  ];
  const firstNinetyDays = [
    "Understand goals, workflows, and expectations quickly.",
    "Build trust with managers, peers, and key collaborators.",
    "Deliver early wins on visible tasks or projects.",
    "Identify where your strengths can create extra value for the team.",
  ];
  const hiringProcess = [
    {
      title: "Application review",
      description: "Your CV and supporting materials are screened for relevance and readiness.",
      icon: Briefcase,
    },
    {
      title: "Shortlisting and screening",
      description: "Selected candidates move to a call or first-stage review with the employer.",
      icon: ShieldCheck,
    },
    {
      title: "Interview rounds",
      description: "Expect a structured discussion on fit, capability, and examples from past work.",
      icon: Users,
    },
    {
      title: "Offer and onboarding",
      description: "Successful candidates finalize details and prepare for a smooth start.",
      icon: Wrench,
    },
  ];
  const fitSignals = [
    {
      title: "Best for",
      description: `Candidates ready for a ${resolved.jobType.toLowerCase()} role with clearer expectations, stronger preparation, and practical support.`,
      icon: Target,
    },
    {
      title: "What to validate fast",
      description: "Check role fit, work mode, salary expectations, and the evidence you can actually bring into the process.",
      icon: LineChart,
    },
    {
      title: "Mtendere support",
      description: "We help sharpen your CV, positioning, and interview story so you apply with more intention.",
      icon: ShieldCheck,
    },
  ];
  const nextStepPlan = [
    "Study the requirements and tailor your resume to the strongest signals in the role.",
    "Prepare short evidence-based examples before any screening call starts.",
    "Use one advisor session if you need help tightening your CV or interview positioning.",
  ];
  const jobKeywords = generateKeywords({
    module: "job",
    title: resolved.title,
    category: resolved.category || resolved.jobType,
    location: resolved.location,
    company: resolved.company,
    tags: resolved.tags,
  });
  const detailStructuredData = [
    buildOrganizationSchema(),
    buildWebsiteSchema(),
    buildBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Jobs", url: "/jobs" },
      { name: resolved.title, url: `/jobs/${resolved.slug || resolved.id}` },
    ]),
    buildJobPostingSchema(resolved),
    buildFaqSchema([
      {
        question: `How do I apply for ${resolved.title}?`,
        answer:
          resolved.applicationInstructions ||
          "Use the Apply Now button on this page and submit your resume, cover letter, and role-specific answers through Mtendere.",
      },
      {
        question: `What skills are required for ${resolved.title}?`,
        answer: skills.join(", ") || "The required skills are listed in the role requirements and quick facts on this page.",
      },
    ]),
    buildRelatedItemListSchema(
      "Related jobs",
      related.map((item) => ({
        name: `${item.title} at ${item.company}`,
        url: `/jobs/${item.slug || item.id}`,
        description: item.description,
        image: item.imageUrl,
      })),
    ),
  ].filter(Boolean) as Record<string, unknown>[];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={resolved.title}
        description={seoDescription(
          String(resolved.seoMeta?.description || ""),
          `${resolved.title} at ${resolved.company}. ${resolved.location}. ${overviewContent}`,
        )}
        image={resolved.imageUrl || undefined}
        imageAlt={`${resolved.title} at ${resolved.company}`}
        canonical={canonicalUrl(`/jobs/${resolved.slug || resolved.id}`)}
        type="article"
        keywords={jobKeywords}
        section={resolved.category || resolved.jobType}
        publishedTime={resolved.createdAt}
        modifiedTime={resolved.updatedAt || resolved.createdAt}
        structuredData={detailStructuredData}
      />
      <ExpandingNav />

      <section className="relative mt-16 overflow-hidden py-20 text-white">
        <div className="absolute inset-0">
          <GovernedImage
            module="job"
            src={resolved.imageUrl}
            title={resolved.title}
            category={resolved.jobType}
            variant="hero"
            priority
            aspectRatio="auto"
            className="h-full"
            wrapperClassName="h-full rounded-none shadow-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-green/95 via-mtendere-green/88 to-mtendere-blue/86" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <Button asChild variant="ghost" className="mb-6 -ml-3 text-white hover:bg-card/20">
            <Link href="/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Jobs
            </Link>
          </Button>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:items-end">
            <div className="hero-panel hero-safe-copy max-w-4xl rounded-3xl p-7 md:p-10">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge className="bg-mtendere-green text-white font-semibold">{resolved.employmentType || resolved.jobType}</Badge>
                {resolved.category && <Badge className="bg-white/12 text-white">{resolved.category}</Badge>}
                {resolved.isRemote && (
                  <Badge className="bg-mtendere-blue text-white">
                    <Wifi className="mr-1 h-3 w-3" />
                    Remote-friendly
                  </Badge>
                )}
                {daysLeft !== null && daysLeft <= 14 && daysLeft > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    <Clock className="mr-1 h-3 w-3" />
                    {daysLeft} days left
                  </Badge>
                )}
              </div>

              <h1 className="mb-6 text-3xl font-bold md:text-5xl">{resolved.title}</h1>
              {resolved.companyLogo && (
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-white/25 bg-white/90 p-2">
                  <GovernedImage
                    module="job"
                    src={resolved.companyLogo}
                    title={`${resolved.company} logo`}
                    variant="logo"
                    aspectRatio="1 / 1"
                    className="h-full w-full"
                    wrapperClassName="h-full rounded-none shadow-none"
                  />
                </div>
              )}
              <p className="max-w-3xl text-base leading-relaxed text-white/85 md:text-lg">
                Use this page to understand the role clearly, tailor your application intentionally, and move into the
                hiring process with stronger preparation.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/85">
                <span className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {resolved.company}{resolved.department ? ` - ${resolved.department}` : ""}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {resolved.location}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Deadline {formatDate(resolved.deadline)}
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <ApplicationDialog
                  type="job"
                  referenceId={resolved.id}
                  title={resolved.title}
                  job={resolved}
                  trigger={
                    <Button className="bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
                      Apply Now
                    </Button>
                  }
                />
                <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-mtendere-blue" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>

            <Card className="border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl text-white">Role decision brief</CardTitle>
                <CardDescription className="text-white/75">
                  A stronger job page should tell you quickly whether to apply, prepare more, or ask for help.
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
              <Badge variant="outline" className="border-mtendere-green/20 text-mtendere-green">
                Role Overview
              </Badge>
              <h2 className="text-2xl font-bold text-mtendere-blue md:text-3xl">
                What to understand before you apply
              </h2>
              <RichContent html={overviewContent} />
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Role highlights</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {roleHighlights.map(({ icon: Icon, title, description }) => (
                  <Card key={title} className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mtendere-green/10">
                        <Icon className="h-5 w-5 text-mtendere-green" />
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
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Responsibilities</h2>
              <Card className="border-0 bg-mtendere-gray/60 shadow-sm">
                <CardContent className="space-y-4 p-6">
                  {responsibilities.map((item, idx) => (
                    <div key={`${item}-${idx}`} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 text-mtendere-green" />
                      <p className="font-medium text-foreground/90">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Requirements</h2>
              <Card className="border-0 bg-mtendere-gray/60 shadow-sm">
                <CardContent className="space-y-4 p-6">
                  {requirements.map((req, idx) => (
                    <div key={`${req}-${idx}`} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 text-mtendere-green" />
                      <p className="font-medium text-foreground/90">{req}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Qualifications and skills</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="border border-border/60">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">Qualifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {qualifications.map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-mtendere-blue" />
                        <p className="text-sm text-foreground/80">{item}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border border-border/60">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">Skills</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {skills.map((item) => (
                      <Badge key={item} variant="outline" className="border-mtendere-green/30 text-mtendere-green">
                        {item}
                      </Badge>
                    ))}
                    {(resolved.preferredSkills || []).map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Application game plan</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {successPlan.map(({ title, description, icon: Icon }, index) => (
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
                      <CardDescription className="leading-relaxed text-muted-foreground">
                        {description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Benefits and candidate support</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {benefits.map((benefit) => (
                  <Card key={benefit} className="border border-border/60">
                    <CardContent className="flex items-start gap-3 p-5">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-mtendere-green" />
                      <p className="text-sm leading-relaxed text-foreground/80">{benefit}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Company information</h2>
              <Card className="border border-border/60">
                <CardContent className="space-y-5 p-6">
                  <RichContent html={resolved.companyOverview || resolved.companyProfile || `Learn more about ${resolved.company} during the application process.`} />
                  {resolved.aboutTeam && (
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                      <h3 className="mb-2 font-semibold text-foreground">About the team</h3>
                      <RichContent html={resolved.aboutTeam} compact />
                    </div>
                  )}
                  {resolved.applicationInstructions && (
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                      <h3 className="mb-2 font-semibold text-foreground">Application instructions</h3>
                      <RichContent html={resolved.applicationInstructions} compact />
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {Array.isArray(resolved.attachments) && resolved.attachments.length > 0 && (
              <section>
                <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Attachments and documents</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {resolved.attachments.map((attachment, index) => {
                    const label = String(attachment.title ?? attachment.name ?? `Document ${index + 1}`);
                    const url = String(attachment.url ?? attachment.href ?? "");
                    return (
                      <a
                        key={`${label}-${index}`}
                        href={url || undefined}
                        target={url ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg border border-border/60 p-4 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="font-semibold text-foreground">{label}</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">What success could look like in the first 90 days</h2>
              <Card className="border border-border/60 bg-gradient-to-br from-mtendere-green/5 via-card to-mtendere-blue/5">
                <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                  {firstNinetyDays.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <Target className="mt-0.5 h-5 w-5 text-mtendere-orange" />
                      <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-mtendere-blue">Hiring process</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {hiringProcess.map(({ title, description, icon: Icon }) => (
                  <Card key={title} className="border border-border/60">
                    <CardHeader className="pb-2">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mtendere-green/10">
                        <Icon className="h-5 w-5 text-mtendere-green" />
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
          </div>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-0 bg-card shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">Apply for this role</CardTitle>
                <CardDescription>
                  Track the role, submit your application, and get help improving your job documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Company</span>
                    <span className="text-right font-semibold text-foreground/80">{resolved.company}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Compensation</span>
                    <span className="font-semibold text-mtendere-green">{compensationLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-semibold text-foreground/80">{resolved.location}</span>
                  </div>
                </div>

                <ApplicationDialog
                  type="job"
                  referenceId={resolved.id}
                  title={resolved.title}
                  job={resolved}
                  customFields={[
                    { name: "availability", label: "Earliest availability", required: true },
                    { name: "fitSummary", label: "Why are you a strong fit for this role?", type: "textarea", required: true },
                  ]}
                  trigger={
                    <Button className="w-full bg-mtendere-green font-bold hover:bg-mtendere-green/90">
                      Apply Now
                    </Button>
                  }
                />

                <SaveItemButton
                  type="job"
                  referenceId={resolved.id}
                  className="w-full border-mtendere-green text-mtendere-green hover:bg-mtendere-green hover:text-white"
                />

                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="icon" aria-label="Print job" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Email job"
                    onClick={() => {
                      window.location.href = `mailto:?subject=${encodeURIComponent(resolved.title)}&body=${encodeURIComponent(window.location.href)}`;
                    }}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Share job"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: resolved.title, url: window.location.href });
                      } else {
                        navigator.clipboard?.writeText(window.location.href);
                      }
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

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
                {quickFacts.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-4 w-4 text-mtendere-green" />
                      {label}
                    </span>
                    <span className="text-right font-semibold text-foreground/80">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-gradient-to-br from-mtendere-blue/5 via-card to-mtendere-green/10">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">How to stand out</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nextStepPlan.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 text-mtendere-blue" />
                    <p className="text-sm text-foreground/80">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {related.length > 0 && (
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Related roles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {related.map((item) => (
                    <Link key={item.id} href={`/jobs/${item.slug || item.id}`}>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40">
                        <div>
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.company}</p>
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
