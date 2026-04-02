import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import {
  User, Layout, CheckSquare, Linkedin, Star, FileText, Clock,
  PhoneCall, Award, CheckCircle2, ArrowRight, Briefcase, BookOpen
} from "lucide-react";

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

const TESTIMONIALS = [
  {
    name: "Chipo Banda",
    role: "Marketing Manager, Blantyre",
    text: "After working with Mtendere to redesign my resume, I received 3 interview invitations within a week. The LinkedIn optimization alone doubled my profile views.",
    rating: 5,
    img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100",
  },
  {
    name: "Kondwani Phiri",
    role: "Software Engineer, Lilongwe",
    text: "I had been applying for months with no response. Within 2 weeks of using Mtendere's resume service, I had landed a job at TechMalawi Solutions. Absolutely worth it.",
    rating: 5,
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
  },
  {
    name: "Grace Nkosi",
    role: "Project Manager, Zomba",
    text: "The interview coaching session was invaluable. The team helped me articulate my experience clearly and confidently. I got the job on my first interview after the session.",
    rating: 5,
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=100",
  },
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
  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      {/* Hero */}
      <section
        className="relative pt-28 pb-24 text-white overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/93 via-mtendere-blue/85 to-mtendere-green/80" />
        <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 px-5 py-1.5 text-xs font-bold uppercase tracking-widest">
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
              <Button size="lg" className="bg-mtendere-orange hover:bg-orange-600 text-white font-bold px-10 py-6 text-lg rounded-xl shadow-2xl hover:scale-105 transition-transform">
                Get Started Today <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="#packages">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20 font-bold px-10 py-6 text-lg rounded-xl">
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
              <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                <div className="text-3xl font-extrabold text-mtendere-orange mb-1">{s.value}</div>
                <div className="text-sm font-semibold opacity-90">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-3 text-mtendere-blue border-mtendere-blue px-4 py-1 uppercase tracking-wider text-xs font-bold">
              What We Offer
            </Badge>
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Comprehensive Career Document Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything you need to present your best professional self to employers, universities, and scholarship committees
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Layout,
                color: "text-mtendere-blue",
                bg: "bg-blue-50",
                title: "Resume & CV Writing",
                desc: "ATS-optimized, professionally designed resumes tailored to your target role and industry.",
                bullets: ["ATS keyword optimization", "Industry-specific formatting", "Professional summaries", "Quantified achievements"],
              },
              {
                icon: Linkedin,
                color: "text-mtendere-green",
                bg: "bg-green-50",
                title: "LinkedIn Optimization",
                desc: "Transform your LinkedIn profile into a powerful personal brand that attracts recruiters.",
                bullets: ["Compelling headline writing", "About section storytelling", "Skills endorsement strategy", "Profile completeness audit"],
              },
              {
                icon: Briefcase,
                color: "text-mtendere-orange",
                bg: "bg-orange-50",
                title: "Interview Coaching",
                desc: "Prepare to confidently answer any interview question and negotiate the salary you deserve.",
                bullets: ["Mock interview sessions", "STAR method training", "Salary negotiation tactics", "Industry-specific prep"],
              },
              {
                icon: FileText,
                color: "text-mtendere-blue",
                bg: "bg-blue-50",
                title: "Cover Letters",
                desc: "Compelling, personalized cover letters that tell your story and make hiring managers want to meet you.",
                bullets: ["Tailored to each application", "Attention-grabbing openings", "Value proposition focus", "Professional tone"],
              },
              {
                icon: BookOpen,
                color: "text-mtendere-green",
                bg: "bg-green-50",
                title: "Personal Statements",
                desc: "Powerful statements for university admissions, graduate school, and scholarship applications.",
                bullets: ["University applications", "Graduate school SOPs", "Scholarship essays", "Fellowship applications"],
              },
              {
                icon: User,
                color: "text-mtendere-orange",
                bg: "bg-orange-50",
                title: "Personal Branding",
                desc: "Build a consistent, compelling personal brand across all your professional touchpoints.",
                bullets: ["Brand identity development", "Professional bio writing", "Online presence audit", "Thought leadership strategy"],
              },
            ].map((s) => (
              <Card key={s.title} className="h-full hover:shadow-xl transition-all duration-300 group border-none bg-gray-50">
                <CardHeader>
                  <div className={`w-14 h-14 ${s.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <s.icon className={`w-7 h-7 ${s.color}`} />
                  </div>
                  <CardTitle className="text-xl font-bold text-mtendere-blue">{s.title}</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed">{s.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-gray-600">
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
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">How It Works</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Our streamlined 5-step process ensures your career documents are ready quickly and professionally</p>
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
                <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-3 text-mtendere-blue border-mtendere-blue px-4 py-1 uppercase tracking-wider text-xs font-bold">
              Pricing
            </Badge>
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Choose Your Package</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Transparent pricing with no hidden fees. All packages come with expert career guidance.</p>
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
                  <CardDescription className="text-gray-600">{pkg.desc}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-8 flex-1">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-mtendere-green flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/contact">
                    <Button className="w-full bg-mtendere-blue hover:bg-blue-700 text-white font-bold py-3 rounded-xl">
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
      <section
        className="py-20 text-white relative overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-mtendere-dark/90 z-0" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold mb-4 drop-shadow-lg">What Our Clients Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-mtendere-orange text-mtendere-orange" />
                  ))}
                </div>
                <p className="text-gray-200 italic mb-6 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.img} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-mtendere-orange" />
                  <div>
                    <div className="font-bold text-white">{t.name}</div>
                    <div className="text-sm text-gray-300">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
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
                <AccordionContent className="text-gray-600 pb-5 leading-relaxed">
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
          backgroundImage: `url('https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=2000')`,
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
              <Button size="lg" className="bg-mtendere-orange hover:bg-orange-600 text-white font-bold px-10 py-6 text-lg rounded-xl shadow-2xl hover:scale-105 transition-transform">
                Book Free Consultation <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/scholarships">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20 font-bold px-10 py-6 text-lg rounded-xl">
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
