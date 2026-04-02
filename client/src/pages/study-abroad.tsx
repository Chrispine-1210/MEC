import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Globe, MapPin, CheckCircle2, Plane, BookOpen, Shield, ArrowRight,
  Clock, Star, Users, Award, FileText, PhoneCall
} from "lucide-react";

const DESTINATIONS = [
  {
    flag: "🇬🇧",
    country: "United Kingdom",
    highlights: "Oxford, Cambridge, LSE, Imperial College",
    desc: "World-class research universities with strong scholarship programs for African students, including Chevening and Commonwealth scholarships.",
    img: "https://images.unsplash.com/photo-1486299267070-83823f5448dd?auto=format&fit=crop&q=80&w=800",
  },
  {
    flag: "🇩🇪",
    country: "Germany",
    highlights: "TU Munich, Heidelberg, RWTH Aachen",
    desc: "Tuition-free education at world-class technical universities with DAAD scholarships available for African students across all disciplines.",
    img: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=800",
  },
  {
    flag: "🇨🇦",
    country: "Canada",
    highlights: "University of Toronto, McGill, UBC",
    desc: "Multicultural, safe, and welcoming environment with strong post-graduation work permit opportunities and immigration pathways.",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800",
  },
  {
    flag: "🇺🇸",
    country: "United States",
    highlights: "Harvard, MIT, Stanford, Yale",
    desc: "Home to 8 of the world's top 10 universities with full scholarships available through programs like Fulbright and Mastercard Foundation.",
    img: "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&q=80&w=800",
  },
  {
    flag: "🇦🇺",
    country: "Australia",
    highlights: "Melbourne, Sydney, ANU, Monash",
    desc: "High quality of life, stunning natural environment, and strong academic institutions with generous Endeavour Scholarships for African students.",
    img: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&q=80&w=800",
  },
  {
    flag: "🇿🇦",
    country: "South Africa",
    highlights: "UCT, Stellenbosch, Witwatersrand",
    desc: "Africa's top-ranked universities within the continent. Affordable tuition and cost of living with excellent academic standards.",
    img: "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&q=80&w=800",
  },
];

const PROCESS = [
  { step: "01", icon: PhoneCall, title: "Free Consultation", desc: "Book a free 30-min session to discuss your academic profile, goals, and budget for study abroad." },
  { step: "02", icon: BookOpen, title: "School Selection", desc: "Our experts shortlist the best universities that match your academic results, interests, and scholarship eligibility." },
  { step: "03", icon: FileText, title: "Application Preparation", desc: "We guide you through every document: transcripts, SOP, recommendation letters, and application forms." },
  { step: "04", icon: Shield, title: "Visa Support", desc: "Comprehensive visa application support including mock visa interviews and documentation review." },
  { step: "05", icon: Plane, title: "Pre-Departure", desc: "Orientation on culture, accommodation, banking, healthcare, and everything you need before you fly." },
  { step: "06", icon: CheckCircle2, title: "Arrival Support", desc: "Our in-country network helps you settle in with airport pickup coordination and orientation support." },
];

const FAQS = [
  { q: "When should I start the study abroad process?", a: "Ideally, start 12-18 months before your intended start date. Applications for many programs open 8-12 months in advance, and scholarships often close even earlier." },
  { q: "How much does it cost to study abroad?", a: "Costs vary significantly by country. Germany is nearly free, the UK averages £15,000-25,000/year, and North America ranges from $20,000-60,000/year. We help you identify fully-funded opportunities to minimize your costs." },
  { q: "Do I need IELTS or TOEFL?", a: "Most English-speaking countries require an English proficiency test. We help you prepare and advise on which test is best for your target universities." },
  { q: "Can I work while studying abroad?", a: "Most countries allow international students to work part-time (usually 20 hours/week during term). We brief you on the rules for your specific destination country." },
  { q: "What if my visa is rejected?", a: "Our 94% visa approval rate reflects our thorough preparation. If a rejection occurs, we analyze the reason and guide you through a stronger reapplication." },
];

export default function StudyAbroad() {
  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      {/* Hero */}
      <section
        className="relative pt-28 pb-28 text-white overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/93 to-mtendere-green/82" />
        <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 px-5 py-1.5 text-xs font-bold uppercase tracking-widest">
            Global Education
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight drop-shadow-2xl">
            Study Abroad<br />
            <span className="text-mtendere-orange">Without Limits</span>
          </h1>
          <p className="text-xl md:text-2xl opacity-95 mb-10 drop-shadow font-semibold max-w-2xl mx-auto leading-relaxed">
            Expert guidance from university selection to arrival — your complete companion for international education
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-mtendere-orange hover:bg-orange-600 text-white font-bold px-10 py-6 text-lg rounded-xl shadow-2xl hover:scale-105 transition-transform">
                Start Your Journey <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/scholarships">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20 font-bold px-10 py-6 text-lg rounded-xl">
                View Scholarships
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto">
            {[
              { value: "50+", label: "Countries" },
              { value: "200+", label: "Universities" },
              { value: "94%", label: "Visa Approval" },
            ].map((s) => (
              <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                <div className="text-3xl font-extrabold text-mtendere-orange mb-1">{s.value}</div>
                <div className="text-sm font-semibold opacity-90">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Study Abroad */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Why Study Abroad?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">An international education does far more than teach — it transforms your perspective, builds your network, and accelerates your career</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Award, title: "World-Class Education", desc: "Access universities ranked in the global top 100 with cutting-edge research and teaching.", color: "text-mtendere-blue", bg: "bg-blue-50" },
              { icon: Globe, title: "Global Network", desc: "Build relationships with peers and mentors from 100+ countries that last a lifetime.", color: "text-mtendere-green", bg: "bg-green-50" },
              { icon: Star, title: "Career Advantage", desc: "International graduates earn 40% more on average and are promoted faster in their careers.", color: "text-mtendere-orange", bg: "bg-orange-50" },
              { icon: Users, title: "Cultural Growth", desc: "Immerse yourself in new cultures, languages, and worldviews that shape you as a global citizen.", color: "text-mtendere-blue", bg: "bg-blue-50" },
            ].map((w) => (
              <Card key={w.title} className="text-center hover:shadow-xl transition-all group border-none bg-gray-50">
                <CardContent className="pt-8">
                  <div className={`w-16 h-16 ${w.bg} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <w.icon className={`w-8 h-8 ${w.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-mtendere-blue mb-2">{w.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{w.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Study Destinations */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-3 text-mtendere-blue border-mtendere-blue px-4 py-1 uppercase tracking-wider text-xs font-bold">
              Top Destinations
            </Badge>
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Where Will You Study?</h2>
            <p className="text-gray-600 max-w-xl mx-auto">We support applications to universities across 50+ countries. Here are our most popular destinations for Malawian students.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {DESTINATIONS.map((d) => (
              <Card key={d.country} className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-none">
                <div className="relative h-48 overflow-hidden">
                  <img src={d.img} alt={d.country} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="text-3xl mr-2">{d.flag}</span>
                    <span className="text-white font-extrabold text-xl drop-shadow-lg">{d.country}</span>
                  </div>
                </div>
                <CardContent className="pt-5">
                  <p className="text-xs font-bold text-mtendere-orange uppercase tracking-wider mb-2">{d.highlights}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{d.desc}</p>
                  <Link href="/contact">
                    <Button className="w-full mt-4 bg-mtendere-blue hover:bg-blue-700 text-white font-bold">
                      Apply for {d.country} <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Our 6-Step Process</h2>
            <p className="text-gray-600 max-w-xl mx-auto">From first conversation to arrival in your new country — we're with you every step of the way</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PROCESS.map((p) => (
              <div key={p.step} className="flex gap-4 p-6 bg-gray-50 rounded-2xl hover:shadow-lg transition-all group">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-mtendere-blue to-mtendere-green rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                    <p.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-black text-mtendere-orange uppercase tracking-widest mb-1">Step {p.step}</div>
                  <h3 className="text-lg font-bold text-mtendere-blue mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-mtendere-blue mb-4">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-6 shadow-sm bg-white">
                <AccordionTrigger className="text-left font-bold text-mtendere-blue hover:text-mtendere-green py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-5 leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-24 text-white text-center relative overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/92 to-mtendere-green/88 z-0" />
        <div className="container relative z-10 mx-auto px-4 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-lg">Your Global Future Starts Here</h2>
          <p className="text-xl opacity-95 mb-8 font-semibold drop-shadow">
            Book a free consultation with our study abroad specialists today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-mtendere-orange hover:bg-orange-600 text-white font-bold px-10 py-6 text-lg rounded-xl shadow-2xl hover:scale-105 transition-transform">
                Book Free Consultation <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/scholarships">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20 font-bold px-10 py-6 text-lg rounded-xl">
                Browse Scholarships
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
