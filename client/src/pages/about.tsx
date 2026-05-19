import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import TeamMemberCard from "@/components/team-member-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getTeamGroups } from "@/lib/team-display";
import type { ApiTeamMember, ApiTestimonial } from "@/lib/api-types";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle,
  Compass,
  Globe,
  GraduationCap,
  Heart,
  MessageSquare,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

const stats = [
  { icon: Users, label: "Students Guided", value: "10,000+" },
  { icon: GraduationCap, label: "Scholarship Wins", value: "5,000+" },
  { icon: Globe, label: "Countries Reached", value: "50+" },
  { icon: TrendingUp, label: "Success Rate", value: "95%" },
];

const storyBlocks = [
  {
    title: "We started with a real student problem",
    description:
      "Students were finding opportunities, but they were still left with confusion around fit, timing, affordability, and what to do first.",
  },
  {
    title: "We expanded because the journey does not stay in one lane",
    description:
      "Scholarships lead into applications. Applications lead into visas. Study choices affect careers. Students needed connected support, not isolated advice.",
  },
  {
    title: "We now work as a guidance partner, not just an information source",
    description:
      "Our role is to help students move from uncertainty into a plan with clearer decisions, stronger materials, and visible next steps.",
  },
];

const timeline = [
  {
    phase: "01",
    title: "Clarify the confusion",
    description:
      "Mtendere began by helping students make sense of scholarships, applications, and opportunities that often felt difficult to interpret or compare.",
    icon: Compass,
  },
  {
    phase: "02",
    title: "Move from advice into support",
    description:
      "We learned quickly that information alone was not enough. Students needed strategy, accountability, and help turning options into action.",
    icon: MessageSquare,
  },
  {
    phase: "03",
    title: "Build a connected model",
    description:
      "Our work widened to include counseling, applications, study abroad planning, job support, and document preparation across one joined-up journey.",
    icon: ShieldCheck,
  },
  {
    phase: "04",
    title: "Keep improving the student journey",
    description:
      "Today we focus on making each next step clearer, faster, and more personal for students who want serious support behind their ambition.",
    icon: Sparkles,
  },
];

const serviceModel = [
  {
    title: "Discover",
    description: "We begin with goals, strengths, timing, budget, and the kind of future you are aiming to build.",
    icon: Compass,
    href: "/career-counseling",
    cta: "Career counseling",
    outcome: "You leave with better self-awareness and a clearer direction.",
  },
  {
    title: "Decide",
    description: "We narrow your options into a workable shortlist with clearer trade-offs and fewer dead ends.",
    icon: Target,
    href: "/study-abroad",
    cta: "Study abroad planning",
    outcome: "You leave with better-fit options and a stronger decision frame.",
  },
  {
    title: "Apply",
    description: "We help shape stronger applications, sharper documents, and a more reliable submission process.",
    icon: BookOpen,
    href: "/university-applications",
    cta: "University applications",
    outcome: "You leave with more confidence in the quality of your submission.",
  },
  {
    title: "Launch",
    description: "We stay useful as you move into scholarships, jobs, interviews, and the next phase of growth.",
    icon: Briefcase,
    href: "/resume-building",
    cta: "Resume building",
    outcome: "You leave with a clearer next chapter and support to keep moving.",
  },
];

const values = [
  {
    title: "Clarity over noise",
    description: "We simplify complex choices so students can make stronger decisions with less overwhelm.",
    icon: CheckCircle,
  },
  {
    title: "Guidance with empathy",
    description: "We care about the person behind the application, not just the paperwork in front of us.",
    icon: Heart,
  },
  {
    title: "Global thinking, personal support",
    description: "We help students think bigger while staying grounded in their real budgets, timelines, and goals.",
    icon: Globe,
  },
];

const servicePrinciples = [
  "Every conversation should end with a clearer next step.",
  "Students deserve strategy, not just information dumps.",
  "Good guidance compares options honestly instead of pushing one path.",
];

export default function About() {
  const { data: testimonials } = useQuery<ApiTestimonial[]>({
    queryKey: ["/api/testimonials"],
  });

  const { data: teamMembers = [] } = useQuery<ApiTeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const sortedTeamMembers = getTeamGroups(teamMembers).all;
  const featuredTeamMembers = sortedTeamMembers.slice(0, 2);
  const remainingTeamMembers = sortedTeamMembers.slice(2);

  const approvedTestimonials = (testimonials || []).filter((item) => item.isApproved !== false);
  const featuredTestimonial = approvedTestimonials[0];
  const supportingTestimonials = approvedTestimonials.slice(1, 4);

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      <section className="relative mt-16 overflow-hidden py-24 text-white">
        <div className="absolute inset-0">
          <GovernedImage
            module="misc"
            title="Mtendere team and students"
            category="education"
            variant="hero"
            priority
            aspectRatio="auto"
            className="h-full"
            wrapperClassName="h-full rounded-none shadow-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/95 via-mtendere-blue/88 to-mtendere-green/82" />
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-mtendere-orange/20 blur-3xl" />

        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:items-center">
            <div className="max-w-4xl">
              <Badge className="mb-4 bg-white/10 px-4 py-1 text-white">About Mtendere</Badge>
              <h1 className="text-4xl font-bold leading-tight md:text-6xl">
                A clearer, more human path from ambition to opportunity
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/85 md:text-lg">
                Mtendere exists to help students move from uncertainty into informed action. We connect educational
                opportunities, practical planning, and personal guidance so the journey feels less fragmented and more
                achievable.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
                  <Link href="/contact">
                    Start your journey
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-mtendere-blue"
                >
                  <Link href="/team">Meet the team</Link>
                </Button>
              </div>
            </div>

            <Card className="border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl text-white">What students should expect from us</CardTitle>
                <CardDescription className="text-white/75">
                  We support the full path, not just one narrow moment in the process.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  "A calmer decision process with clearer trade-offs and fewer dead ends.",
                  "Better-structured applications, essays, and supporting documents.",
                  "Practical support for scholarships, study choices, jobs, and interviews.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/12 p-4 backdrop-blur-sm">
                    <CheckCircle className="mt-0.5 h-5 w-5 text-mtendere-orange" />
                    <p className="text-sm leading-relaxed text-white/85">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-card py-14">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <Card key={label} className="border border-border/60 text-center shadow-sm">
                <CardContent className="p-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-mtendere-blue/10">
                    <Icon className="h-6 w-6 text-mtendere-blue" />
                  </div>
                  <div className="text-3xl font-bold text-mtendere-blue">{value}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <Badge variant="outline" className="border-mtendere-blue/20 text-mtendere-blue">
                Our story
              </Badge>
              <h2 className="mt-4 text-3xl font-bold text-mtendere-blue md:text-4xl">
                We built Mtendere to make hard decisions feel navigable
              </h2>
              <div className="mt-6 grid gap-5">
                {storyBlocks.map((block) => (
                  <Card key={block.title} className="border border-border/60 shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-mtendere-blue">{block.title}</h3>
                      <p className="mt-3 text-base leading-8 text-muted-foreground">{block.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="border border-border/60 bg-gradient-to-br from-mtendere-blue/5 via-card to-mtendere-green/10 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">What good support should feel like</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {servicePrinciples.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Star className="mt-0.5 h-4 w-4 text-mtendere-orange" />
                    <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-mtendere-gray/60 py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="border-mtendere-green/20 text-mtendere-green">
              Timeline
            </Badge>
            <h2 className="mt-4 text-3xl font-bold text-mtendere-blue md:text-4xl">How the Mtendere story has evolved</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              A simple view of how our work grew from solving a small student problem into a broader support model.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {timeline.map(({ phase, title, description, icon: Icon }) => (
              <Card key={title} className="border border-border/60 shadow-sm">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mtendere-green/10">
                      <Icon className="h-5 w-5 text-mtendere-green" />
                    </div>
                    <Badge variant="outline" className="border-mtendere-green/30 text-mtendere-green">
                      {phase}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-foreground">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed text-muted-foreground">{description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="border-mtendere-blue/20 text-mtendere-blue">
              Service model
            </Badge>
            <h2 className="mt-4 text-3xl font-bold text-mtendere-blue md:text-4xl">How we work with students in practice</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Our model is designed to help students move from uncertainty into a sequence of practical decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
            {serviceModel.map(({ title, description, icon: Icon, href, cta, outcome }) => (
                <Card key={title} className="border border-border/60 shadow-sm">
                  <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-mtendere-blue/10">
                      <Icon className="h-5 w-5 text-mtendere-blue" />
                  </div>
                  <CardTitle className="text-xl text-foreground">{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="leading-relaxed text-muted-foreground">{description}</CardDescription>
                  <div className="rounded-2xl bg-mtendere-gray p-3">
                    <p className="text-sm font-medium text-foreground/80">{outcome}</p>
                  </div>
                  <Button asChild variant="ghost" className="-ml-4 text-mtendere-blue hover:text-mtendere-green">
                    <Link href={href}>
                      {cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div>
              <Badge variant="outline" className="border-mtendere-orange/20 text-mtendere-orange">
                What makes us different
              </Badge>
              <h2 className="mt-4 text-3xl font-bold text-mtendere-blue md:text-4xl">Support that stays practical and personal</h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                We care about making progress visible. That means honest guidance, clearer trade-offs, and a stronger
                sense of what the next step actually is.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {values.map(({ title, description, icon: Icon }) => (
                <Card key={title} className="border border-border/60 shadow-sm">
                  <CardHeader>
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mtendere-orange/10">
                      <Icon className="h-5 w-5 text-mtendere-orange" />
                    </div>
                    <CardTitle className="text-xl text-foreground">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed text-muted-foreground">{description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <Card className="border-0 bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white shadow-xl">
            <CardContent className="flex flex-col gap-5 p-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold">Need clarity on where to start?</h2>
                <p className="mt-2 text-white/85">
                  We can help you choose the right starting point, whether that is scholarships, study abroad,
                  university applications, or career planning.
                </p>
              </div>
              <Button asChild className="bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
                <Link href="/contact">
                  Book a consultation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="team" className="py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline" className="border-mtendere-blue/20 text-mtendere-blue">
                Team
              </Badge>
              <h2 className="mt-4 text-3xl font-bold text-mtendere-blue md:text-4xl">The people behind the guidance</h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Our team combines educational guidance, application support, and student-centered care to help you move
                with more confidence.
              </p>
            </div>
            <Button asChild variant="outline" className="border-mtendere-blue/20 text-mtendere-blue hover:bg-mtendere-blue hover:text-white">
              <Link href="/team">View full team</Link>
            </Button>
          </div>

          {sortedTeamMembers.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {featuredTeamMembers.map((member) => (
                  <TeamMemberCard key={member.id} member={member} featured />
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {remainingTeamMembers.map((member) => (
                  <TeamMemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          ) : (
            <Card className="border border-dashed border-border/70">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Team profiles will appear here after they are published in Admin.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="bg-mtendere-gray/60 py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="border-mtendere-green/20 text-mtendere-green">
              Testimonials
            </Badge>
            <h2 className="mt-4 text-3xl font-bold text-mtendere-blue md:text-4xl">How students describe the experience</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              The strongest proof of our work is how students feel after the process becomes clearer and more manageable.
            </p>
          </div>

          {featuredTestimonial ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <Card className="border border-border/60 shadow-sm">
                <CardContent className="p-8">
                  <Badge variant="outline" className="mb-4 border-mtendere-blue/20 text-mtendere-blue">
                    Featured story
                  </Badge>
                  <Quote className="mb-5 h-10 w-10 text-mtendere-blue/30" />
                  <p className="text-lg leading-8 text-foreground/85">"{featuredTestimonial.content}"</p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-mtendere-blue to-mtendere-green text-white">
                      <GovernedImage
                        module="testimonial"
                        src={featuredTestimonial.imageUrl}
                        title={featuredTestimonial.authorName || "Featured testimonial"}
                        variant="profile"
                        aspectRatio="auto"
                        className="h-full w-full"
                        wrapperClassName="h-full rounded-full shadow-none"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-mtendere-blue">
                        {featuredTestimonial.authorName || "Mtendere Student"}
                      </p>
                      {featuredTestimonial.credential && (
                        <p className="text-sm text-muted-foreground">{featuredTestimonial.credential}</p>
                      )}
                      <div className="mt-1 flex items-center gap-1">
                        {[...Array(5)].map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${
                              index < featuredTestimonial.rating
                                ? "fill-mtendere-orange text-mtendere-orange"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="border border-border/60 bg-gradient-to-br from-mtendere-blue/5 via-card to-mtendere-green/10 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mtendere-blue/70">What students often say</p>
                    <p className="mt-3 text-sm leading-7 text-foreground/80">
                      The process feels clearer, less lonely, and more manageable once they have a plan and someone to
                      help them keep moving.
                    </p>
                  </CardContent>
                </Card>
                {supportingTestimonials.map((testimonial) => (
                  <Card key={testimonial.id} className="border border-border/60 shadow-sm">
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-center gap-1">
                        {[...Array(5)].map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${
                              index < testimonial.rating
                                ? "fill-mtendere-orange text-mtendere-orange"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm leading-7 text-foreground/80">"{testimonial.content}"</p>
                      <div className="mt-4 border-t border-border/60 pt-3">
                        <p className="font-semibold text-mtendere-blue">
                          {testimonial.authorName || "Mtendere Student"}
                        </p>
                        {testimonial.credential && (
                          <p className="text-xs text-muted-foreground">{testimonial.credential}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="border border-dashed border-border/60">
              <CardContent className="py-12 text-center">
                <Quote className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">Student testimonials will be available soon.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden py-24 text-white">
        <div className="absolute inset-0">
          <GovernedImage
            module="misc"
            title="Students taking the next step"
            category="education"
            variant="hero"
            aspectRatio="auto"
            className="h-full"
            wrapperClassName="h-full rounded-none shadow-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/92 to-mtendere-green/90" />
        <div className="container relative z-10 mx-auto max-w-5xl px-4 text-center">
          <h2 className="text-4xl font-bold md:text-5xl">Ready to build your next chapter with us?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/85">
            Whether you are exploring scholarships, university applications, or career planning, Mtendere can help you
            turn the next decision into a more confident one.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
              <Link href="/register">Create your account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-mtendere-blue"
            >
              <Link href="/contact">Book a consultation</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
