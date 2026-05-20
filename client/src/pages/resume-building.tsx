import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import type { ApiTestimonial } from "@/lib/api-types";
import { publicContentQueryOptions } from "@/lib/realtime-content";
import { Link } from "wouter";
import {
  User, Layout, CheckSquare, Linkedin, Star, FileText, Clock,
  PhoneCall, Award, CheckCircle2, ArrowRight, Briefcase, BookOpen
} from "lucide-react";
import { getGovernedBackgroundImage } from "@/lib/image-governance";

const PACKAGES = [
  {
    name: "Starter",
    price: "$49",
    desc: "Perfect for recent graduates entering the job market",
    color: "border-mtendere-blue",
    badge: null,
    features: [
      "Professional resume review and edit",
      "ATS-optimized formatting",
      "2 revisions included",
      "PDF & Word format delivery",
      "3-day turnaround time",
    ],
  },
  {
    name: "Professional",
    price: "$99",
    desc: "For mid-career professionals seeking better opportunities",
    color: "border-mtendere-green",
    badge: "Most Popular",
    features: [
      "Complete resume rewrite from scratch",
      "LinkedIn profile optimization",
      "Cover letter template (3 versions)",
      "ATS keyword research & integration",
      "Unlimited revisions for 14 days",
      "48-hour express turnaround",
    ],
  },
  {
    name: "Executive",
    price: "$199",
    desc: "For senior leaders and C-suite professionals",
    color: "border-mtendere-orange",
    badge: "Premium",
    features: [
      "Executive resume + biography",
      "LinkedIn premium makeover",
      "Custom cover letter writing",
      "Interview coaching session (60 min)",
      "Personal branding strategy",
      "Unlimited revisions for 30 days",
      "24-hour priority turnaround",
    ],
  },
];

const PROCESS = [
  { step: "01", title: "Consultation", desc: "Book a free 15-minute call to discuss your goals, experience, and target roles.", icon: PhoneCall },
  { step: "02", title: "Information Gathering", desc: "Complete our detailed career questionnaire to help us understand your full professional story.", icon: FileText },
  { step: "03", title: "Expert Writing", desc: "Our certified resume writers craft your documents using proven, industry-specific strategies.", icon: Award },
  { step: "04", title: "Review & Revisions", desc: "Review your documents and request changes until you're completely satisfied.", icon: CheckCircle2 },
  { step: "05", title: "Delivery", desc: "Receive your polished, job-ready documents in PDF and editable Word format.", icon: CheckSquare },
];

const FAQS = [
  {
    q: "How long does the resume writing process take?",
    a: "Our standard turnaround is 3-5 business days. Express packages are delivered within 24-48 hours. We'll confirm the exact timeline after your consultation.",
  },
  {
    q: "What if I don't like the result?",
    a: "Your satisfaction is our priority. All packages include revision rounds, and we'll keep working with you until you're completely happy with the result.",
  },
  {
    q: "Do you only help with resumes?",
    a: "We offer comprehensive career document services including resumes, CVs, cover letters, LinkedIn profiles, executive biographies, and personal statements for applications.",
  },
  {
    q: "Can you help if I'm changing career fields?",
    a: "Absolutely. Career changers are our specialty. We know how to reframe your existing skills to target new industries effectively.",
  },
  {
    q: "Do you write CVs for academic applications?",
    a: "Yes! We write CVs for academic positions, graduate school applications, and research roles, which require a different format and emphasis than professional resumes.",
  },
];

export default function ResumeBuilding() {
  const { data: testimonials = [] } = useQuery<ApiTestimonial[]>({
    queryKey: ["/api/testimonials"],
    initialData: [],
    ...publicContentQueryOptions,
  });
  const approvedTestimonials = testimonials.filter((item) => item?.isApproved !== false).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      {/* Hero */}
      <section
        className="relative pt-28 pb-24 text-white overflow-hidden"
        style={{
          backgroundImage: getGovernedBackgroundImage({
            module: "job",
            title: "Resume building",
            category: "career",
            variant: "hero",
          }),
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/93 via-mtendere-blue/85 to-mtendere-green/80" />
        <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
          <Badge className="mb-6 bg-card/20 text-white border-white/30 px-5 py-1.5 text-xs font-bold uppercase tracking-widest">
            Professional Resume Services
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight drop-shadow-2xl">
            Land Your Dream Job<br />
            <span className="text-mtendere-orange drop-shadow-lg">With a Winning Resume</span>
          </h1>
          <p className="text-xl md:text-2xl opacity-95 mb-10 drop-shadow font-semibold max-w-2xl mx-auto leading-relaxed">
            Expert resume writers and career coaches who know what employers are looking for in Africa and globally
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-mtendere-orange hover:bg-mtendere-orange/90 text-white font-bold px-10 py-6 text-lg rounded-xl shadow-2xl hover:scale-105 transition-transform">
                Get Started Today <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="#packages">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-card/20 font-bold px-10 py-6 text-lg rounded-xl">
                View Packages
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto">
            {[
              { value: "94%", label: "Interview Success Rate" },
              { value: "500+", label: "Resumes Written" },
              { value: "48h", label: "Average Turnaround" },
            ].map((s) => (
              <div key={s.label} className="bg-card/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                <div className="text-3xl font-extrabold text-mtendere-orange mb-1">{s.value}</div>
                <div className="text-sm font-semibold opacity-90">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-3 text-mtendere-blue border-mtendere-blue px-4 py-1 uppercase tracking-wider text-xs font-bold">
              What We Offer
            </Badge>
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Comprehensive Career Document Services</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to present your best professional self to employers, universities, and scholarship committees
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Layout,
                color: "text-mtendere-blue",
                bg: "bg-mtendere-blue/10",
                title: "Resume & CV Writing",
                desc: "ATS-optimized, professionally designed resumes tailored to your target role and industry.",
                bullets: ["ATS keyword optimization", "Industry-specific formatting", "Professional summaries", "Quantified achievements"],
              },
              {
                icon: Linkedin,
                color: "text-mtendere-green",
                bg: "bg-mtendere-green/10",
                title: "LinkedIn Optimization",
                desc: "Transform your LinkedIn profile into a powerful personal brand that attracts recruiters.",
                bullets: ["Compelling headline writing", "About section storytelling", "Skills endorsement strategy", "Profile completeness audit"],
              },
              {
                icon: Briefcase,
                color: "text-mtendere-orange",
                bg: "bg-mtendere-orange/10",
                title: "Interview Coaching",
                desc: "Prepare to confidently answer any interview question and negotiate the salary you deserve.",
                bullets: ["Mock interview sessions", "STAR method training", "Salary negotiation tactics", "Industry-specific prep"],
              },
              {
                icon: FileText,
                color: "text-mtendere-blue",
                bg: "bg-mtendere-blue/10",
                title: "Cover Letters",
                desc: "Compelling, personalized cover letters that tell your story and make hiring managers want to meet you.",
                bullets: ["Tailored to each application", "Attention-grabbing openings", "Value proposition focus", "Professional tone"],
              },
              {
                icon: BookOpen,
                color: "text-mtendere-green",
                bg: "bg-mtendere-green/10",
                title: "Personal Statements",
                desc: "Powerful statements for university admissions, graduate school, and scholarship applications.",
                bullets: ["University applications", "Graduate school SOPs", "Scholarship essays", "Fellowship applications"],
              },
              {
                icon: User,
                color: "text-mtendere-orange",
                bg: "bg-mtendere-orange/10",
                title: "Personal Branding",
                desc: "Build a consistent, compelling personal brand across all your professional touchpoints.",
                bullets: ["Brand identity development", "Professional bio writing", "Online presence audit", "Thought leadership strategy"],
              },
            ].map((s) => (
              <Card key={s.title} className="h-full hover:shadow-xl transition-all duration-300 group border-none bg-muted/40">
                <CardHeader>
                  <div className={`w-14 h-14 ${s.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <s.icon className={`w-7 h-7 ${s.color}`} />
                  </div>
                  <CardTitle className="text-xl font-bold text-mtendere-blue">{s.title}</CardTitle>
                  <CardDescription className="text-muted-foreground leading-relaxed">{s.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-mtendere-green flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Our streamlined 5-step process ensures your career documents are ready quickly and professionally</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {PROCESS.map((p, i) => (
              <div key={p.step} className="text-center relative">
                {i < PROCESS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-mtendere-blue to-mtendere-green opacity-30" />
                )}
                <div className="w-16 h-16 bg-gradient-to-br from-mtendere-blue to-mtendere-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <p.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-2xl font-black text-mtendere-orange mb-1">{p.step}</div>
                <h3 className="text-lg font-bold text-mtendere-blue mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-3 text-mtendere-blue border-mtendere-blue px-4 py-1 uppercase tracking-wider text-xs font-bold">
              Pricing
            </Badge>
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Choose Your Package</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Transparent pricing with no hidden fees. All packages come with expert career guidance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PACKAGES.map((pkg) => (
              <Card key={pkg.name} className={`relative flex flex-col border-t-4 ${pkg.color} hover:shadow-2xl transition-all duration-300 ${pkg.badge === "Most Popular" ? "scale-105 shadow-xl" : ""}`}>
                {pkg.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className={`px-4 py-1 text-sm font-bold ${pkg.badge === "Most Popular" ? "bg-mtendere-green" : "bg-mtendere-orange"}`}>
                      {pkg.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-2xl font-extrabold text-mtendere-blue">{pkg.name}</CardTitle>
                  <div className="text-5xl font-extrabold text-mtendere-orange my-3">{pkg.price}</div>
                  <CardDescription className="text-muted-foreground">{pkg.desc}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-8 flex-1">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                        <CheckCircle2 className="w-4 h-4 text-mtendere-green flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/contact">
                    <Button className="w-full bg-mtendere-blue hover:bg-mtendere-blue/90 text-white font-bold py-3 rounded-xl">
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-mtendere-gray py-20">
        <div className="absolute left-12 top-10 h-48 w-48 rounded-full bg-mtendere-orange/10 blur-3xl" />
        <div className="absolute right-12 top-16 h-56 w-56 rounded-full bg-mtendere-blue/10 blur-3xl" />
        <div className="container relative mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="mb-4 text-4xl font-extrabold text-mtendere-blue">What Our Clients Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {approvedTestimonials.length > 0 ? (
              approvedTestimonials.map((testimonial) => {
                const rating = Math.max(1, Math.min(5, testimonial.rating || 5));
                const name = testimonial.authorName || "Mtendere Student";

                return (
                  <div key={testimonial.id} className="rounded-2xl border border-border/70 bg-card p-8 shadow-lg">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < rating
                              ? "fill-mtendere-orange text-mtendere-orange"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mb-6 italic leading-relaxed text-muted-foreground">"{testimonial.content}"</p>
                    <div className="flex items-center gap-3">
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
                        <div className="text-sm text-mtendere-blue/80">
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
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-6 shadow-sm">
                <AccordionTrigger className="text-left font-bold text-mtendere-blue hover:text-mtendere-green py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 text-white text-center relative overflow-hidden"
        style={{
          backgroundImage: getGovernedBackgroundImage({
            module: "job",
            title: "Career transformation",
            category: "career",
            variant: "hero",
          }),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/93 to-mtendere-green/85 z-0" />
        <div className="container relative z-10 mx-auto px-4 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-lg">Ready to Transform Your Career?</h2>
          <p className="text-xl opacity-95 mb-8 drop-shadow font-semibold">
            Book a free 15-minute consultation today and take the first step toward your dream job.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-mtendere-orange hover:bg-mtendere-orange/90 text-white font-bold px-10 py-6 text-lg rounded-xl shadow-2xl hover:scale-105 transition-transform">
                Book Free Consultation <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/scholarships">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-card/20 font-bold px-10 py-6 text-lg rounded-xl">
                Explore Scholarships
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}




