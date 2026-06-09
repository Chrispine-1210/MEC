import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";
import type { ElementType, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  Eye,
  FileCheck2,
  FileText,
  KeyRound,
  Lock,
  Mail,
  Scale,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Link } from "wouter";

const reviewedAt = "June 8, 2026";
const contactEmail = "mtendereeducation@gmail.com";
const contactPhone = "+265 999 360 325";

type PageShellProps = {
  title: string;
  description: string;
  eyebrow: string;
  children: ReactNode;
};

function PageShell({ title, description, eyebrow, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <SEO title={title} description={description} url={`/${slugFromTitle(title)}`} />
      <ExpandingNav />
      <main>
        <section className="border-b border-border/60 bg-mtendere-blue text-white">
          <div className="container mx-auto px-4 py-16 md:py-20">
            <Badge className="mb-5 border-white/20 bg-white/12 text-white hover:bg-white/12">{eyebrow}</Badge>
            <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/82 md:text-lg">{description}</p>
            <p className="mt-5 text-sm font-medium text-white/70">Last reviewed: {reviewedAt}</p>
          </div>
        </section>
        {children}
      </main>
      <Footer />
    </div>
  );
}

function slugFromTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ContentBand({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <section className={muted ? "bg-muted/30" : "bg-background"}>
      <div className="container mx-auto px-4 py-12 md:py-16">{children}</div>
    </section>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8 max-w-3xl">
      <h2 className="text-2xl font-black text-foreground md:text-3xl">{title}</h2>
      {description && <p className="mt-3 leading-7 text-muted-foreground">{description}</p>}
    </div>
  );
}

function InfoGrid({ items }: { items: Array<{ title: string; text: string; icon: ElementType }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article key={item.title} className="rounded-lg border border-border/60 bg-card p-5">
          <item.icon className="mb-4 h-6 w-6 text-mtendere-blue" />
          <h3 className="font-bold text-foreground">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
        </article>
      ))}
    </div>
  );
}

function ContactStrip() {
  return (
    <ContentBand muted>
      <div className="flex flex-col gap-5 rounded-lg border border-border/60 bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Questions, requests, or escalation</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Contact {BRAND_NAME} for privacy requests, security concerns, complaints, or account support.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="bg-mtendere-blue text-white hover:bg-mtendere-blue/90">
            <a href={`mailto:${contactEmail}`}>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`tel:${contactPhone.replace(/\s/g, "")}`}>{contactPhone}</a>
          </Button>
        </div>
      </div>
    </ContentBand>
  );
}

export function PrivacyPolicy() {
  return (
    <PageShell
      title="Privacy Policy"
      eyebrow="Privacy"
      description={`${BRAND_NAME} explains what personal information we collect, why we use it, how long we keep it, and how people can exercise privacy rights.`}
    >
      <ContentBand>
        <SectionHeading title="What We Collect" description="We collect only what is needed to provide education guidance, account services, applications, events, communications, and platform security." />
        <InfoGrid
          items={[
            { icon: UserCheck, title: "Account information", text: "Name, email, phone, username, password hash, profile details, verification status, and role." },
            { icon: FileText, title: "Application information", text: "Education history, career details, uploaded CVs or documents, answers, references, and application status." },
            { icon: Mail, title: "Communications", text: "Messages, subscriptions, email delivery events, support tickets, preferences, and consent records." },
            { icon: Eye, title: "Usage and device data", text: "Basic analytics, IP address, browser details, security events, pages visited, and interaction timestamps." },
            { icon: Database, title: "Payment and referral records", text: "Payment session identifiers, referral activity, payout requests, and related transaction metadata where applicable." },
            { icon: ShieldCheck, title: "Security records", text: "Login attempts, MFA status, token events, audit logs, and abuse-prevention signals." },
          ]}
        />
      </ContentBand>

      <ContentBand muted>
        <SectionHeading title="How We Use Information" />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            "Create and protect user accounts.",
            "Process applications, event registrations, messages, and support requests.",
            "Send verification, password reset, status, subscription, and service emails.",
            "Personalize education guidance and improve student support workflows.",
            "Detect abuse, secure the platform, maintain audit trails, and troubleshoot errors.",
            "Measure service quality, reliability, content performance, and conversion outcomes.",
          ].map((item) => (
            <div key={item} className="flex gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-mtendere-green" />
              <p className="leading-7 text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>
      </ContentBand>

      <ContentBand>
        <SectionHeading title="Retention, Sharing, and Rights" />
        <div className="grid gap-6 lg:grid-cols-3">
          <article>
            <h3 className="font-bold text-foreground">Retention</h3>
            <p className="mt-2 leading-7 text-muted-foreground">
              We keep account and application records while the account or service relationship is active, then retain limited records where needed for audit, legal, dispute, security, or operational reasons.
            </p>
          </article>
          <article>
            <h3 className="font-bold text-foreground">Sharing</h3>
            <p className="mt-2 leading-7 text-muted-foreground">
              We share data only with trusted service providers, education partners when requested or necessary for an application, payment processors, legal authorities when required, and internal authorized staff.
            </p>
          </article>
          <article>
            <h3 className="font-bold text-foreground">Your rights</h3>
            <p className="mt-2 leading-7 text-muted-foreground">
              You may request access, correction, deletion, restriction, portability, objection, consent withdrawal, or complaint review, subject to identity checks and applicable law.
            </p>
          </article>
        </div>
      </ContentBand>
      <ContactStrip />
    </PageShell>
  );
}

export function TermsOfService() {
  return (
    <PageShell
      title="Terms of Service"
      eyebrow="Terms"
      description={`${BRAND_NAME} provides education guidance, opportunity discovery, applications support, event workflows, referrals, and related digital services subject to these terms.`}
    >
      <ContentBand>
        <SectionHeading title="Using the Platform" />
        <InfoGrid
          items={[
            { icon: UserCheck, title: "Accounts", text: "You are responsible for accurate information, account security, password confidentiality, and activity under your account." },
            { icon: FileCheck2, title: "Applications", text: "You must submit truthful documents and information. Admission, visa, scholarship, job, and payment outcomes are not guaranteed." },
            { icon: Scale, title: "Acceptable use", text: "Do not misuse the platform, upload harmful files, impersonate others, attack systems, scrape data, or violate laws or third-party rights." },
            { icon: FileText, title: "Content", text: "Mtendere materials, platform design, trademarks, and original content remain protected. User submissions remain yours, with permission for us to process them for requested services." },
            { icon: Clock, title: "Service changes", text: "Features may change, pause, or be discontinued. We aim to communicate material service changes clearly where practical." },
            { icon: AlertTriangle, title: "Limitations", text: "The platform is provided with reasonable care, but we cannot promise uninterrupted access, third-party availability, or outcomes controlled by external institutions." },
          ]}
        />
      </ContentBand>
      <ContentBand muted>
        <SectionHeading title="Termination, Disputes, and Governing Law" />
        <div className="grid gap-6 md:grid-cols-3">
          <p className="leading-7 text-muted-foreground">We may suspend or terminate access for fraud, security risk, unlawful activity, harmful behavior, or material breach of these terms.</p>
          <p className="leading-7 text-muted-foreground">Please contact us first so we can investigate and resolve complaints fairly. Unresolved disputes may be handled through applicable courts or lawful dispute processes.</p>
          <p className="leading-7 text-muted-foreground">These terms are intended to align with the laws of Malawi where Mtendere operates, subject to any mandatory consumer or privacy rights that may also apply.</p>
        </div>
      </ContentBand>
      <ContactStrip />
    </PageShell>
  );
}

export function SecurityPage() {
  return (
    <PageShell
      title="Security"
      eyebrow="Security"
      description="How Mtendere protects accounts, applications, uploaded documents, communications, and administrative workflows."
    >
      <ContentBand>
        <SectionHeading title="Security Commitments" />
        <InfoGrid
          items={[
            { icon: Lock, title: "Protected authentication", text: "Password hashing, token expiry, refresh-token rotation, MFA support for sensitive roles, and login lockout controls." },
            { icon: ShieldCheck, title: "Application safeguards", text: "Security headers, CORS controls, rate limiting, audit logging, noindex protections for private routes, and structured validation." },
            { icon: FileCheck2, title: "Upload controls", text: "Allowed file types, size limits, sanitized filenames, static serving restrictions, and content-signature checks." },
            { icon: KeyRound, title: "Access control", text: "Role-based admin access, permission checks, protected super-admin operations, and session invalidation support." },
            { icon: Database, title: "Data protection", text: "Database-backed records, runtime migrations, restricted operational logs, and controlled admin views for sensitive records." },
            { icon: AlertTriangle, title: "Incident handling", text: "Operational runbooks, security audit events, request identifiers, and escalation channels for privacy or security reports." },
          ]}
        />
      </ContentBand>
      <ContactStrip />
    </PageShell>
  );
}

export function PrivacyCenter() {
  return (
    <PageShell
      title="Privacy Center"
      eyebrow="Privacy Center"
      description="A single place for privacy choices, consent, data requests, cookies, analytics, and contact channels."
    >
      <ContentBand>
        <SectionHeading title="Your Choices" />
        <InfoGrid
          items={[
            { icon: Mail, title: "Email preferences", text: "Use unsubscribe links or contact us to update subscription categories and marketing consent." },
            { icon: Eye, title: "Access and correction", text: "Ask for a copy of your account or application data, or request corrections to inaccurate information." },
            { icon: Database, title: "Deletion and retention", text: "Request deletion where legally and operationally possible. Some records may be retained for security, audit, legal, or dispute reasons." },
            { icon: Lock, title: "Cookies and analytics", text: "We use essential platform storage and limited analytics to operate, secure, and improve the service." },
            { icon: UserCheck, title: "Consent", text: "Consent is requested for contact forms, subscriptions, account onboarding, and optional communications where appropriate." },
            { icon: Scale, title: "Complaints", text: "You may ask for review of a privacy decision or escalate through appropriate regulatory channels where law provides that right." },
          ]}
        />
      </ContentBand>
      <ContactStrip />
    </PageShell>
  );
}

export function TransparencyCenter() {
  return (
    <PageShell
      title="Transparency Center"
      eyebrow="Transparency"
      description="Plain-language commitments about platform reliability, data handling, student communications, and institutional trust."
    >
      <ContentBand>
        <SectionHeading title="What We Make Visible" />
        <InfoGrid
          items={[
            { icon: FileText, title: "Clear policies", text: "Privacy, terms, security, and compliance information are published for students, parents, partners, and institutions." },
            { icon: Clock, title: "Operational accountability", text: "Requests are logged with status and timing signals so support and admin teams can follow up responsibly." },
            { icon: ShieldCheck, title: "Security posture", text: "The platform uses layered technical safeguards and records security-relevant events for investigation." },
            { icon: Database, title: "Data handling", text: "Sensitive application and account records are processed for stated service purposes and governed by access controls." },
            { icon: Mail, title: "Communication standards", text: "Transactional and service emails are separated from optional subscriptions, with preference and unsubscribe support." },
            { icon: AlertTriangle, title: "Incident disclosure", text: "Material privacy or security incidents should be assessed, contained, documented, and communicated through appropriate channels." },
          ]}
        />
      </ContentBand>
      <ContentBand muted>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground">Need a formal response?</h2>
            <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">Students, parents, partners, and institutions can use the contact page for complaints, verification questions, partnership due diligence, or data protection requests.</p>
          </div>
          <Button asChild className="bg-mtendere-orange text-white hover:bg-mtendere-orange/90">
            <Link href="/contact">
              Contact Mtendere
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </ContentBand>
    </PageShell>
  );
}

export function CompliancePage() {
  return (
    <PageShell
      title="Compliance"
      eyebrow="Compliance"
      description="How Mtendere aligns platform operations with privacy, cybersecurity, consumer trust, and responsible education-service practices."
    >
      <ContentBand>
        <SectionHeading title="Compliance Framework" />
        <InfoGrid
          items={[
            { icon: Scale, title: "Malawi data protection alignment", text: "Policy language recognizes data subject rights, consent, retention, safeguards, breach response, and accountability expectations under Malawi privacy law." },
            { icon: ShieldCheck, title: "Cybersecurity alignment", text: "Controls support lawful electronic transactions, access control, evidence preservation, and abuse prevention." },
            { icon: FileCheck2, title: "Records and auditability", text: "Operational records support applications, communications, admin actions, subscriptions, and security investigations." },
            { icon: UserCheck, title: "Responsible student support", text: "Service terms clarify that external admissions, visa, scholarship, employment, and payment outcomes cannot be guaranteed." },
            { icon: Mail, title: "Communications governance", text: "Email verification, preference handling, unsubscribe flows, delivery diagnostics, and contact acknowledgements are part of the communication architecture." },
            { icon: AlertTriangle, title: "Risk management", text: "Open items from audits should be tracked by severity, owner, target date, verification evidence, and release readiness." },
          ]}
        />
      </ContentBand>
      <ContentBand muted>
        <SectionHeading title="Reference Points" description="These pages are operational drafts and should be reviewed by qualified counsel before being treated as final legal notices." />
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>Reference sources consulted: Malawi Data Protection Act, 2024; Malawi Data Protection Authority guidance downloads; Electronic Transactions and Cyber Security Act, 2016.</p>
          <p>Recommended next step: appoint a privacy owner, maintain a processing register, publish retention schedules, document incident response, and review cross-border data sharing with counsel.</p>
        </div>
      </ContentBand>
      <ContactStrip />
    </PageShell>
  );
}
