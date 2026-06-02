import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import RichContent from "@/components/rich-content";
import TeamPortrait from "@/components/team-portrait";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiTeamMember } from "@/lib/api-types";
import { publicContentQueryOptions } from "@/lib/realtime-content";
import { getTeamGroups, getTeamMemberSlug, toDisplayTeamMember } from "@/lib/team-display";
import { richTextToPlainText } from "@/lib/rich-text";
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  Download,
  ExternalLink,
  GraduationCap,
  Linkedin,
  Mail,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  Twitter,
  Users,
} from "lucide-react";

export default function TeamDetail() {
  const [, params] = useRoute("/team/:id");
  const identifier = params?.id ?? "";

  const { data: member, isLoading: memberLoading } = useQuery<ApiTeamMember>({
    queryKey: [`/api/team-members/${identifier}`],
    enabled: Boolean(identifier),
    ...publicContentQueryOptions,
  });

  const { data: members = [], isLoading: listLoading } = useQuery<ApiTeamMember[]>({
    queryKey: ["/api/team-members"],
    ...publicContentQueryOptions,
  });

  const resolved = useMemo(() => {
    if (member) return toDisplayTeamMember(member);
    const fallback = members.find((item) => String(item.id) === identifier || getTeamMemberSlug(item) === identifier);
    return fallback ? toDisplayTeamMember(fallback) : undefined;
  }, [identifier, member, members]);

  const related = useMemo(() => {
    const groups = getTeamGroups(members);
    if (!resolved) return [];
    return groups.all
      .filter((item) => item.id !== resolved.id)
      .filter((item) => item.group === resolved.group || item.department === resolved.department)
      .slice(0, 3);
  }, [members, resolved]);

  if (memberLoading && listLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ExpandingNav />
        <main className="container mx-auto max-w-6xl px-4 py-24">
          <Skeleton className="mb-6 h-10 w-40" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="min-h-screen bg-background">
        <ExpandingNav />
        <main className="container mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">Team profile not found</h1>
          <Button asChild className="mt-6 bg-mtendere-blue hover:bg-mtendere-blue/90">
            <Link href="/team">Back to Team</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const summary =
    richTextToPlainText(resolved.biography || resolved.bio) ||
    `${resolved.name} supports Mtendere Education Consult through ${resolved.position}.`;
  const contactPhone = getContactValue(resolved.contactInfo, "phone");
  const contactEmail = getContactValue(resolved.contactInfo, "email") || resolved.email || "";
  const linkedIn = resolved.socialLinks?.linkedin || resolved.linkedin || "";
  const twitter = resolved.socialLinks?.twitter || resolved.twitter || "";
  const expertise = resolved.skills?.length ? resolved.skills : resolved.focusAreas ?? [];
  const profileStructuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: resolved.name,
    jobTitle: resolved.title || resolved.position,
    worksFor: {
      "@type": "Organization",
      name: "Mtendere Education Consult",
    },
    email: contactEmail || undefined,
    telephone: contactPhone || undefined,
    image: resolved.imageUrl || undefined,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    sameAs: [linkedIn, twitter].filter(Boolean),
  };
  const details = [
    { label: "Role", value: resolved.title || resolved.position, icon: BriefcaseBusiness },
    { label: "Department", value: resolved.department || resolved.group, icon: Users },
    { label: "Leadership", value: resolved.leadershipLevel || resolved.group, icon: ShieldCheck },
  ];

  const shareProfile = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: resolved.name, text: summary, url });
      return;
    }
    await navigator.clipboard?.writeText(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${resolved.name} - ${resolved.position}`}
        description={summary}
        image={resolved.imageUrl || undefined}
        type="profile"
        structuredData={profileStructuredData}
      />
      <ExpandingNav />

      <main className="pt-16">
        <section className="section-shell border-b bg-card py-12">
          <div className="container mx-auto max-w-6xl px-4">
            <Button asChild variant="ghost" className="mb-6 -ml-3 text-mtendere-blue">
              <Link href="/team">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Team
              </Link>
            </Button>

            <div className="grid gap-8 lg:grid-cols-[310px_minmax(0,1fr)] lg:items-center">
              <TeamPortrait
                member={resolved}
                aspectRatio="4 / 5"
                variant="profile"
                wrapperClassName="rounded-lg shadow-none"
                enableLightbox
              />
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge className="bg-mtendere-blue text-white">{resolved.group}</Badge>
                  {resolved.department && <Badge variant="outline">{resolved.department}</Badge>}
                </div>
                <h1 className="text-4xl font-bold leading-tight text-mtendere-blue md:text-6xl">{resolved.name}</h1>
                <p className="mt-3 text-xl font-semibold text-mtendere-orange">{resolved.title || resolved.position}</p>
                <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground">{summary}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  {contactEmail && (
                    <Button asChild className="bg-mtendere-blue hover:bg-mtendere-blue/90">
                      <a href={`mailto:${contactEmail}`}>
                        <Mail className="mr-2 h-4 w-4" />
                        Email
                      </a>
                    </Button>
                  )}
                  {resolved.cvUrl && (
                    <Button asChild variant="outline">
                      <a href={resolved.cvUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        CV
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" onClick={shareProfile}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell py-12">
          <div className="container mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-8">
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-2xl text-mtendere-blue">Biography</CardTitle>
                  <CardDescription>Professional background, focus, and contribution to Mtendere.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RichContent
                    html={resolved.biography || resolved.bio}
                    fallback="A full biography for this team member will be published soon."
                  />
                </CardContent>
              </Card>

              {expertise.length > 0 && (
                <Card className="border border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl text-mtendere-blue">
                      <Sparkles className="h-5 w-5" />
                      Expertise
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {expertise.map((item) => (
                      <Badge key={item} variant="outline" className="border-mtendere-blue/20 text-mtendere-blue">
                        {item}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <ProfileList
                  icon={GraduationCap}
                  title="Education and credentials"
                  items={[resolved.qualification, ...(resolved.certifications ?? [])].filter(Boolean) as string[]}
                  fallback="Academic credentials and certifications will be added by the administrator."
                />
                <ProfileList
                  icon={Award}
                  title="Experience and achievements"
                  items={resolved.achievements ?? []}
                  fallback="Key achievements will be added as the profile is expanded."
                />
              </div>
            </div>

            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-xl text-mtendere-blue">Profile Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {details.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                      <Icon className="mt-0.5 h-4 w-4 text-mtendere-green" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contactEmail && <ContactLink href={`mailto:${contactEmail}`} label={contactEmail} icon={Mail} />}
                  {contactPhone && <ContactLink href={`tel:${contactPhone}`} label={contactPhone} icon={Phone} />}
                  {linkedIn && <ContactLink href={linkedIn} label="LinkedIn profile" icon={Linkedin} external />}
                  {twitter && <ContactLink href={twitter} label="Twitter / X profile" icon={Twitter} external />}
                  {!contactEmail && !contactPhone && !linkedIn && !twitter && (
                    <p className="text-sm text-muted-foreground">Contact details are available through Mtendere Education Consult.</p>
                  )}
                </CardContent>
              </Card>

              {related.length > 0 && (
                <Card className="border border-border/60">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">Related Profiles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {related.map((item) => (
                      <Link key={item.id} href={`/team/${getTeamMemberSlug(item)}`}>
                        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40">
                          <div>
                            <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.name}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{item.position}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ProfileList({
  icon: Icon,
  title,
  items,
  fallback,
}: {
  icon: typeof GraduationCap;
  title: string;
  items: string[];
  fallback: string;
}) {
  return (
    <Card className="border border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl text-mtendere-blue">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-foreground/80">
                <Sparkles className="mt-1 h-4 w-4 shrink-0 text-mtendere-orange" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">{fallback}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ContactLink({
  href,
  label,
  icon: Icon,
  external = false,
}: {
  href: string;
  label: string;
  icon: typeof Mail;
  external?: boolean;
}) {
  return (
    <Button asChild variant="outline" className="w-full justify-start border-mtendere-blue/20 text-mtendere-blue">
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
        <Icon className="mr-2 h-4 w-4" />
        <span className="truncate">{label}</span>
      </a>
    </Button>
  );
}

function getContactValue(contactInfo: ApiTeamMember["contactInfo"], key: string) {
  const value = contactInfo?.[key];
  return typeof value === "string" ? value : "";
}
