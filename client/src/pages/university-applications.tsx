import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BookOpen, FileText, Send, CheckCircle2, Clock, ArrowRight, Star,
  Search, Edit3, Award, Calendar, PhoneCall, Globe, Lightbulb
} from "lucide-react";
import { getGovernedBackgroundImage } from "@/lib/image-governance";

const TOP_UNIVERSITIES = [
  { name: "University of Oxford", country: "🇬🇧 UK", ranking: "#1", field: "All Programs", img: "partners/partners-default.jpg" },
  { name: "ETH Zurich", country: "🇨🇭 Switzerland", ranking: "#7", field: "Engineering & Science", img: "partners/partners-2.jpg" },
  { name: "University of Toronto", country: "🇨🇦 Canada", ranking: "#34", field: "Medicine & Business", img: "partners/our-partners.jpg" },
  { name: "University of Cape Town", country: "🇿🇦 South Africa", ranking: "#1 Africa", field: "Law & Social Sciences", img: "partners/partners-default.jpg" },
  { name: "National University Singapore", country: "🇸🇬 Singapore", ranking: "#8", field: "Business & Technology", img: "programs/students-campus.jpg" },
  { name: "Technical University Munich", country: "🇩🇪 Germany", ranking: "#50", field: "Engineering", img: "scholarships/students.jpg" },
];

const SERVICES = [
  {
    icon: Search,
    title: "University Research & Shortlisting",
    desc: "We analyze your academic profile, budget, program interest, and career goals to create a personalized shortlist of universities with the best fit and success probability.",
    color: "text-mtendere-blue",
    bg: "bg-mtendere-blue/10",
  },
  {
    icon: Edit3,
    title: "Statement of Purpose Writing",
    desc: "Our expert writers craft compelling, authentic Statements of Purpose that clearly communicate your academic journey, research interests, and professional ambitions.",
    color: "text-mtendere-green",
    bg: "bg-mtendere-green/10",
  },
  {
    icon: FileText,
    title: "Application Document Review",
    desc: "Comprehensive review of every document in your application: transcripts, test scores, recommendation letters, CV, and supporting essays.",
    color: "text-mtendere-orange",
    bg: "bg-mtendere-orange/10",
  },
  {
    icon: Award,
    title: "Scholarship Integration",
    desc: "We identify scholarship opportunities at your target universities and help you craft scholarship-specific essays and financial aid applications.",
    color: "text-mtendere-blue",
    bg: "bg-mtendere-blue/10",
  },
  {
    icon: Calendar,
    title: "Deadline & Timeline Management",
    desc: "Never miss a deadline. We create a comprehensive application calendar and send reminders to keep you on track throughout the application season.",
    color: "text-mtendere-green",
    bg: "bg-mtendere-green/10",
  },
  {
    icon: Star,
    title: "Interview Preparation",
    desc: "Many top universities require admissions interviews. We run mock interviews, teach you to anticipate questions, and help you present your best self.",
    color: "text-mtendere-orange",
    bg: "bg-mtendere-orange/10",
  },
];

const STATS = [
  { value: "98%", label: "Application Completion Rate" },
  { value: "87%", label: "Acceptance Rate" },
  { value: "200+", label: "Universities Processed" },
  { value: "5K+", label: "Successful Applications" },
];

const PROCESS = [
  { step: "1", title: "Initial Assessment", desc: "We evaluate your academic records, test scores, extracurriculars, and goals to understand your profile completely." },
  { step: "2", title: "University Matching", desc: "Based on your profile, we create a balanced list of reach, match, and safety schools to maximize your chances." },
  { step: "3", title: "Document Gathering", desc: "We provide detailed checklists and guide you through gathering all required documents." },
  { step: "4", title: "Application Writing", desc: "We craft or heavily review all written components, from personal statements to supplemental essays." },
  { step: "5", title: "Submission & Follow-up", desc: "We submit applications and track status, responding promptly to any requests for additional information." },
  { step: "6", title: "Offer Decision Support", desc: "When offers arrive, we help you compare packages, negotiate scholarships, and make the best choice for your future." },
];

const FAQS = [
  { q: "How many universities should I apply to?", a: "We typically recommend applying to 5-8 universities: 2 reach schools, 3 match schools, and 2 safety schools. This gives you a strong chance of at least several offers to choose from." },
  { q: "What GPA/test scores do I need?", a: "Requirements vary by university. We work with students across a wide range of academic profiles and focus on finding universities where you'll be competitive, not just prestigious-sounding schools." },
  { q: "Do I need GRE/GMAT for graduate school?", a: "Many programs have made these tests optional since COVID-19. We advise case-by-case based on your target programs." },
  { q: "How far in advance should I start?", a: "We recommend starting 12-18 months before your intended enrollment date for undergraduate programs, and 8-12 months for graduate programs." },
  { q: "Do you help with scholarship applications too?", a: "Yes! We integrate scholarship applications into the university application process seamlessly. Many merit scholarships require separate essays which we help write." },
];

export default function UniversityApplications() {
  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      {/* Hero */}
      <section
        className="relative pt-28 pb-28 text-white overflow-hidden"
        style={{
          backgroundImage: getGovernedBackgroundImage({
            module: "program",
            title: "University applications",
            category: "education",
            variant: "hero",
          }),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-green/93 to-mtendere-blue/85" />
        <div className="container hero-panel hero-safe-copy relative z-10 mx-auto max-w-4xl rounded-3xl px-4 py-8 text-center md:p-10">
          <Badge className="mb-6 bg-card/20 text-white border-white/30 px-5 py-1.5 text-xs font-bold uppercase tracking-widest">
            Admissions Excellence
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight drop-shadow-2xl">
            Get Into Your<br />
            <span className="text-mtendere-orange">Dream University</span>
          </h1>
          <p className="text-xl md:text-2xl opacity-95 mb-10 drop-shadow font-semibold max-w-2xl mx-auto leading-relaxed">
            Expert-led university application support with an 87% acceptance rate across 200+ global institutions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-mtendere-orange hover:bg-mtendere-orange/90 text-white font-bold px-10 py-6 text-lg rounded-xl shadow-2xl hover:scale-105 transition-transform">
                Start Application <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/scholarships">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-card/20 font-bold px-10 py-6 text-lg rounded-xl">
                View Scholarships
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/20 bg-card/15 p-4 text-center shadow-lg backdrop-blur-sm">
                <div className="text-3xl font-extrabold text-mtendere-orange mb-1">{s.value}</div>
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
            <Badge variant="outline" className="mb-3 text-mtendere-green border-mtendere-green px-4 py-1 uppercase tracking-wider text-xs font-bold">
              Our Services
            </Badge>
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">End-to-End Application Support</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From the first step to the final acceptance letter, we handle every aspect of your university application</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((s) => (
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

      {/* Universities We Work With */}
      <section className="section-shell bg-muted/40 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Universities We've Helped You Enter</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">A sample of institutions where our students have been admitted</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOP_UNIVERSITIES.map((u) => (
              <Card key={u.name} className="premium-card group overflow-hidden border-none transition-all duration-500">
                <div className="relative h-40 overflow-hidden">
                  <GovernedImage
                    module="partner"
                    src={u.img}
                    title={u.name}
                    category={u.field}
                    variant="card"
                    aspectRatio="auto"
                    className="h-full"
                    wrapperClassName="h-full rounded-none shadow-none"
                    imageClassName="group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <Badge className="absolute top-3 right-3 bg-mtendere-orange text-white text-xs font-bold">{u.ranking}</Badge>
                </div>
                <CardContent className="pt-4">
                  <h3 className="font-bold text-mtendere-blue text-lg">{u.name}</h3>
                  <p className="text-sm text-muted-foreground">{u.country}</p>
                  <p className="text-xs text-mtendere-green font-semibold mt-1">{u.field}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/partners">
              <Button variant="outline" className="border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white font-bold px-8 py-3">
                View All 200+ Partner Universities <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section-shell bg-card py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Our Application Process</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">A structured, proven approach that maximizes your acceptance chances</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PROCESS.map((p) => (
              <div key={p.step} className="premium-card flex gap-4 rounded-2xl bg-muted/40 p-6 transition-all">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-mtendere-blue to-mtendere-green rounded-full flex items-center justify-center text-white font-black text-sm shadow">
                  {p.step}
                </div>
                <div>
                  <h3 className="font-bold text-mtendere-blue mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-shell bg-muted/40 py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Common Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-6 shadow-sm bg-card">
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
            module: "program",
            title: "Application consultation",
            category: "education",
            variant: "hero",
          }),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-green/92 to-mtendere-blue/88 z-0" />
        <div className="container hero-panel relative z-10 mx-auto max-w-2xl rounded-3xl px-4 py-8 md:p-10">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-lg">Ready to Apply?</h2>
          <p className="text-xl opacity-95 mb-8 font-semibold drop-shadow">Book your free consultation and let's map your path to your dream university.</p>
          <Link href="/contact">
            <Button size="lg" className="bg-mtendere-orange hover:bg-mtendere-orange/90 text-white font-bold px-12 py-6 text-lg rounded-xl shadow-2xl hover:scale-105 transition-transform">
              Book Free Consultation <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}




