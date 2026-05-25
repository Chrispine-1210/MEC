import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import type { ApiTestimonial } from "@/lib/api-types";
import { publicContentQueryOptions } from "@/lib/realtime-content";
import {
  TrendingUp, Compass, Target, Star, Users, Briefcase, CheckCircle2,
  Clock, ArrowRight, Award, Globe, Lightbulb, PhoneCall, BookOpen
} from "lucide-react";
import { getGovernedBackgroundImage } from "@/lib/image-governance";

const COUNSELING_SERVICES = [
  {
    icon: Compass,
    title: "Career Discovery",
    desc: "Not sure what career path is right for you? We use scientifically validated assessments to map your personality, skills, values, and interests to the careers where you'll thrive.",
    color: "text-mtendere-blue",
    bg: "bg-mtendere-blue/10",
  },
  {
    icon: Target,
    title: "Career Planning & Goal Setting",
    desc: "With a clear destination in mind, we build a structured, realistic career plan with short, medium, and long-term milestones — and hold you accountable to your goals.",
    color: "text-mtendere-green",
    bg: "bg-mtendere-green/10",
  },
  {
    icon: TrendingUp,
    title: "Industry Insights & Market Analysis",
    desc: "Stay ahead with up-to-date intelligence on growing industries, hiring trends, salary benchmarks, and in-demand skills in African and global job markets.",
    color: "text-mtendere-orange",
    bg: "bg-mtendere-orange/10",
  },
  {
    icon: Award,
    title: "Skills Gap Assessment",
    desc: "We identify the gap between your current capabilities and those required for your target role, then recommend specific training, certifications, or experience to close that gap.",
    color: "text-mtendere-blue",
    bg: "bg-mtendere-blue/10",
  },
  {
    icon: Users,
    title: "Mentorship Matching",
    desc: "Get connected with experienced mentors in your target industry from our network of 500+ professionals across Africa, Europe, North America, and beyond.",
    color: "text-mtendere-green",
    bg: "bg-mtendere-green/10",
  },
  {
    icon: Globe,
    title: "International Career Pathways",
    desc: "Specific guidance for Malawians seeking careers at international organizations like the UN, World Bank, African Development Bank, and multinational corporations.",
    color: "text-mtendere-orange",
    bg: "bg-mtendere-orange/10",
  },
];

const SESSIONS = [
  {
    name: "Discovery Session",
    duration: "60 minutes",
    price: "$39",
    desc: "First-time clients. Assess your current situation, explore options, and create an action plan.",
    features: ["Career interest mapping", "Strengths assessment", "Initial action plan", "Follow-up resource pack"],
  },
  {
    name: "Career Planning Package",
    duration: "4 Sessions",
    price: "$149",
    desc: "Comprehensive coaching over 4 sessions to build a complete career strategy.",
    popular: true,
    features: ["4 x 60-min sessions", "Personalized career roadmap", "Industry research report", "Network introduction (3 contacts)", "Accountability check-ins"],
  },
  {
    name: "Executive Coaching",
    duration: "8 Sessions",
    price: "$299",
    desc: "For professionals seeking senior roles or career pivots. Intensive, transformative coaching.",
    features: ["8 x 60-min sessions", "360-degree assessment", "Executive presence coaching", "Personal brand development", "Salary negotiation strategy", "Unlimited email support"],
  },
];

const FAQS = [
  { q: "Who can benefit from career counseling?", a: "Anyone! Whether you're a student choosing your first career, a professional seeking advancement, or someone looking to change fields, career counseling provides valuable clarity and strategy." },
  { q: "How many sessions do I need?", a: "This depends on your situation. We recommend at least 3-4 sessions for meaningful progress. Our packages are designed to provide the right level of support for different needs." },
  { q: "Is career counseling confidential?", a: "Absolutely. Everything discussed in our sessions is completely confidential. We create a safe, judgment-free space for honest self-exploration." },
  { q: "Do you specialize in any industries?", a: "Our counselors have expertise across education, finance, healthcare, development, technology, consulting, and the non-profit sector. We match you with a counselor who understands your target field." },
  { q: "Can sessions be done online?", a: "Yes! All our career counseling sessions can be done via video call, making our services accessible from anywhere in Malawi and beyond." },
];

export default function CareerCounseling() {
  const { data: testimonials = [] } = useQuery<ApiTestimonial[]>({
    queryKey: ["/api/testimonials"],
    initialData: [],
    ...publicContentQueryOptions,
  });
  const successStories = testimonials.filter((item) => item?.isApproved !== false).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      {/* Hero */}
      <section
        className="relative pt-28 pb-28 text-white overflow-hidden"
        style={{
          backgroundImage: getGovernedBackgroundImage({
            module: "job",
            title: "Career counseling",
            category: "career",
            variant: "hero",
          }),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-orange/90 to-mtendere-blue/88" />
        <div className="container hero-panel hero-safe-copy relative z-10 mx-auto max-w-4xl rounded-3xl px-4 py-8 text-center md:p-10">
          <Badge className="mb-6 bg-card/20 text-white border-white/30 px-5 py-1.5 text-xs font-bold uppercase tracking-widest">
            Career Strategy
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight drop-shadow-2xl">
            Discover Your<br />
            <span className="text-white drop-shadow-xl">Career Path</span>
          </h1>
          <p className="text-xl md:text-2xl opacity-95 mb-10 drop-shadow font-semibold max-w-2xl mx-auto leading-relaxed">
            Personalized career guidance that transforms confusion into clarity and goals into achievements
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-card text-mtendere-blue hover:bg-muted font-bold px-10 py-6 text-lg rounded-xl shadow-2xl hover:scale-105 transition-transform">
                Book a Session <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="#sessions">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-card/20 font-bold px-10 py-6 text-lg rounded-xl">
                View Packages
              </Button>
            </a>
          </div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { value: "500+", label: "Clients Guided" },
              { value: "85%", label: "Career Goal Achieved" },
              { value: "50+", label: "Industries Covered" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/20 bg-card/15 p-4 text-center shadow-lg backdrop-blur-sm">
                <div className="text-3xl font-extrabold text-white mb-1">{s.value}</div>
                <div className="text-xs font-semibold opacity-90">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-shell bg-card py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-3 text-mtendere-orange border-mtendere-orange px-4 py-1 uppercase tracking-wider text-xs font-bold">
              What We Offer
            </Badge>
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Career Counseling Services</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Comprehensive support at every stage of your career journey — from first exploration to senior leadership</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {COUNSELING_SERVICES.map((s) => (
              <Card key={s.title} className="premium-card group border-none bg-muted/40 transition-all">
                <CardHeader>
                  <div className={`w-14 h-14 ${s.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <s.icon className={`w-7 h-7 ${s.color}`} />
                  </div>
                  <CardTitle className="text-xl font-bold text-mtendere-blue">{s.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sessions/Packages */}
      <section id="sessions" className="section-shell bg-muted/40 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Session Packages</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Choose the level of support that fits your needs and goals</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {SESSIONS.map((s) => (
              <Card key={s.name} className={`premium-card flex flex-col transition-all ${s.popular ? "scale-105 border-2 border-mtendere-green shadow-2xl" : ""}`}>
                {s.popular && (
                  <div className="text-center -mt-4">
                    <Badge className="bg-mtendere-green text-white font-bold px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-6">
                  <CardTitle className="text-2xl font-extrabold text-mtendere-blue">{s.name}</CardTitle>
                  <div className="flex items-center justify-center gap-2 my-2">
                    <Clock className="w-4 h-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">{s.duration}</span>
                  </div>
                  <div className="text-5xl font-extrabold text-mtendere-orange my-3">{s.price}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-8 flex-1">
                    {s.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                        <CheckCircle2 className="w-4 h-4 text-mtendere-green flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/contact">
                    <Button className={`w-full font-bold py-3 ${s.popular ? "bg-mtendere-green hover:bg-mtendere-green/90" : "bg-mtendere-blue hover:bg-mtendere-blue/90"} text-white`}>
                      Book This Package
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="section-shell relative overflow-hidden bg-gradient-to-br from-white via-white to-mtendere-gray py-20">
        <div className="absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-mtendere-blue/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-48 w-48 rounded-full bg-mtendere-orange/10 blur-3xl" />
        <div className="container relative mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="mb-4 text-4xl font-extrabold text-mtendere-blue">Success Stories</h2>
            <p className="mx-auto max-w-xl text-muted-foreground">Real people, real transformations.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {successStories.length > 0 ? (
              successStories.map((testimonial) => {
                const rating = Math.max(1, Math.min(5, testimonial.rating || 5));
                const name = testimonial.authorName || "Mtendere Student";

                return (
                  <div key={testimonial.id} className="premium-card rounded-2xl bg-card p-8">
                    <div className="flex items-center gap-1 mb-5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rating
                              ? "fill-mtendere-orange text-mtendere-orange"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mb-6 text-sm italic leading-relaxed text-muted-foreground">"{testimonial.content}"</p>
                    <div className="flex items-center gap-3 border-t border-border/60 pt-4">
                      <GovernedImage
                        module="testimonial"
                        src={testimonial.imageUrl}
                        title={name}
                        variant="profile"
                        aspectRatio="auto"
                        className="h-12 w-12"
                        wrapperClassName="h-full rounded-full border-2 border-mtendere-orange shadow-none"
                      />
                      <div>
                        <div className="font-bold text-foreground">{name}</div>
                        <div className="text-xs text-mtendere-orange font-semibold">
                          {testimonial.credential || "Mtendere Graduate"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <Card className="md:col-span-3 border border-dashed border-border/70">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Approved testimonials will appear here after they are published in Admin.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-shell bg-card py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-6 shadow-sm">
                <AccordionTrigger className="text-left font-bold text-mtendere-blue hover:text-mtendere-green py-5">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section
        className="cta-depth relative overflow-hidden py-24 text-center text-white"
        style={{
          backgroundImage: getGovernedBackgroundImage({
            module: "job",
            title: "Career planning",
            category: "career",
            variant: "hero",
          }),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-orange/92 to-mtendere-blue/88 z-0" />
        <div className="container hero-panel relative z-10 mx-auto max-w-2xl rounded-3xl px-4 py-8 md:p-10">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-lg">Take Control of Your Career</h2>
          <p className="text-xl opacity-95 mb-8 font-semibold drop-shadow">Don't leave your career to chance. Book a counseling session today and start building the career you deserve.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-card text-mtendere-blue hover:bg-muted font-bold px-10 py-6 text-lg rounded-xl shadow-2xl hover:scale-105 transition-transform">
                Book Free Discovery Call <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-card/20 font-bold px-10 py-6 text-lg rounded-xl">
                Browse Job Opportunities
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}




