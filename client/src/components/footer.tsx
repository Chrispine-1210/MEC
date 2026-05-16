import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  GraduationCap,
  Briefcase,
  Globe,
  BookOpen,
  Users,
  MessageCircle,
  ArrowRight,
  FileText,
} from "lucide-react";
import logoImg from "@assets/mtendere-logo.svg";

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card text-foreground">
      {/* Newsletter Strip */}
      <div className="bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold mb-1">Stay Updated with Opportunities</h3>
              <p className="text-white/80 text-sm">Get the latest scholarships, jobs, and tips delivered to your inbox.</p>
            </div>
            <div className="flex w-full md:w-auto gap-2 max-w-md">
              <Input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 border-white/30 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-white"
              />
              <Button className="bg-mtendere-orange hover:bg-mtendere-orange/90 text-white font-bold shrink-0">
                Subscribe
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="mb-5">
              <img
                src={logoImg}
                alt="Mtendere Education Consult"
                className="h-14 w-auto object-contain"
              />
            </div>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              A registered educational consulting company based in Lilongwe, Malawi. We connect ambitious students with world-class universities, scholarships, and career opportunities across 50+ countries.
            </p>
            <div className="mb-6 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-mtendere-orange mt-0.5 shrink-0" />
                <span>Off Mandala Road, Area 3, Behind NBS Bank, Lilongwe, Malawi</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-mtendere-orange shrink-0" />
                <a href="tel:+265998882786" className="hover:text-mtendere-blue transition-colors">+265 998 882 786</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-mtendere-orange shrink-0" />
                <a href="mailto:mtendereeducationconsult@gmail.com" className="hover:text-mtendere-blue transition-colors">mtendereeducationconsult@gmail.com</a>
              </div>
            </div>
            <Button asChild className="bg-mtendere-orange hover:bg-mtendere-orange/90 text-white font-bold text-sm">
              <Link href="/contact">
                <MessageCircle className="w-4 h-4 mr-2" />
                Book Free Consultation
              </Link>
            </Button>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-mtendere-blue">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                { href: "/about", label: "About Us" },
                { href: "/about#team", label: "Our Team" },
                { href: "/partners", label: "Our Partners" },
                { href: "/blog", label: "Blog & News" },
                { href: "/contact", label: "Contact Us" },
                { href: "/register", label: "Create Account" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="group flex items-center gap-2 transition-colors hover:text-mtendere-orange">
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-mtendere-blue">Services</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                { href: "/scholarships", label: "Scholarships", icon: GraduationCap },
                { href: "/jobs", label: "Job Portal", icon: Briefcase },
                { href: "/study-abroad", label: "Study Abroad", icon: Globe },
                { href: "/university-applications", label: "University Applications", icon: BookOpen },
                { href: "/career-counseling", label: "Career Counseling", icon: Users },
                { href: "/resume-building", label: "Resume Building", icon: FileText },
              ].map((service) => (
                <li key={service.href}>
                  <Link href={service.href} className="group flex items-center gap-2 transition-colors hover:text-mtendere-orange">
                    <service.icon className="w-3.5 h-3.5 text-mtendere-blue group-hover:text-mtendere-orange transition-colors" />
                    {service.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-mtendere-blue">Our Impact</h4>
            <div className="space-y-4">
              {[
                { value: "10,000+", label: "Students Helped" },
                { value: "200+", label: "Partner Universities" },
                { value: "50+", label: "Countries Reached" },
                { value: "5,000+", label: "Scholarships Secured" },
                { value: "95%", label: "Success Rate" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-mtendere-orange font-black text-xl">{stat.value}</div>
                  <div className="text-muted-foreground text-xs">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Mtendere Education Consult. Registered in Malawi. All rights reserved.
          </p>

          <div className="flex items-center gap-3">
            {[
              { href: "https://facebook.com", icon: Facebook, label: "Facebook" },
              { href: "https://twitter.com", icon: Twitter, label: "Twitter" },
              { href: "https://instagram.com", icon: Instagram, label: "Instagram" },
              { href: "https://www.linkedin.com/in/mtendere-education-consult-478133298/", icon: Linkedin, label: "LinkedIn" },
            ].map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-mtendere-blue hover:text-white"
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}


