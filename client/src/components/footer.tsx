import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import NewsletterSignup from "@/components/newsletter-signup";
import { socialLinks } from "@/lib/social-links";
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
  CalendarDays,
} from "lucide-react";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card text-foreground shadow-[0_-24px_80px_-70px_rgba(15,23,42,0.7)]">
      {/* Newsletter Strip */}
      <div className="relative overflow-hidden bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.2),transparent_30%),linear-gradient(135deg,rgba(0,0,0,0.18),transparent_45%)]" />
        <div className="container relative z-10 mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold mb-1">Stay Updated with Opportunities</h3>
              <p className="text-white/80 text-sm">Get the latest scholarships, jobs, and tips delivered to your inbox.</p>
            </div>
            <NewsletterSignup source="footer" compact inverse className="md:w-auto" />
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
                src={BRAND_LOGO_SRC}
                alt={BRAND_NAME}
                className="h-14 w-auto object-contain"
              />
            </div>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              A registered educational consulting company based in Lilongwe, Malawi. We connect ambitious students with world-class universities, scholarships, and career opportunities across 50+ countries.
            </p>
            <div className="mb-6 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-mtendere-orange mt-0.5 shrink-0" />
                <span>Lilongwe, Malawi</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-mtendere-orange shrink-0" />
                <a href="tel:+265999360325" className="hover:text-mtendere-blue transition-colors">+265 999 360 325</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-mtendere-orange shrink-0" />
                <a href="mailto:mtendereeducation@gmail.com" className="hover:text-mtendere-blue transition-colors">mtendereeducation@gmail.com</a>
              </div>
              <div className="flex items-start gap-3">
                <MessageCircle className="w-4 h-4 text-mtendere-orange mt-0.5 shrink-0" />
                <span>Monday - Friday: 8:00 AM - 5:00 PM<br />Saturday: 9:00 AM - 1:00 PM</span>
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
                { href: "/team", label: "Our Team" },
                { href: "/partners", label: "Our Partners" },
                { href: "/partnership-opportunities", label: "Partner With Us" },
                { href: "/events", label: "Events" },
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
                { href: "/events", label: "Events", icon: CalendarDays },
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
              { href: socialLinks.x, icon: Twitter, label: "X" },
              { href: socialLinks.instagram, icon: Instagram, label: "Instagram" },
              { href: socialLinks.facebook, icon: Facebook, label: "Facebook" },
              { href: socialLinks.linkedin, icon: Linkedin, label: "LinkedIn" },
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


