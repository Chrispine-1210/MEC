import { Link } from "wouter";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import TeamMemberCard from "@/components/team-member-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getTeamGroups } from "@/lib/team-display";
import { getGovernedBackgroundImage } from "@/lib/image-governance";
import type { ApiTeamMember } from "@/lib/api-types";
import { ArrowRight, BriefcaseBusiness, GraduationCap, ShieldCheck, Users } from "lucide-react";

export default function Team() {
  const { data: teamMembers = [], isLoading } = useQuery<ApiTeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const { all, board, leadership, operations } = getTeamGroups(teamMembers);
  const teamStats = [
    { label: "Board Members", value: board.length, icon: ShieldCheck },
    { label: "Leadership", value: leadership.length, icon: BriefcaseBusiness },
    { label: "Operations", value: operations.length, icon: Users },
    { label: "Team Members", value: all.length, icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      <section
        className="relative mt-16 overflow-hidden py-24 text-white"
        style={{
          backgroundImage: getGovernedBackgroundImage({
            module: "team",
            src: "team.jpg",
            title: "Mtendere Education Consult team",
            variant: "hero",
          }),
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/95 via-mtendere-blue/82 to-mtendere-green/84" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <Badge className="mb-5 bg-white/12 px-4 py-1 text-white">Our Team</Badge>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              The people guiding Mtendere Education Consult
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/86">
              Meet the board, leadership, and operations team supporting students, families, and partners through
              education decisions that matter.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
                <Link href="/contact">
                  Talk to the team
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-mtendere-blue"
              >
                <Link href="/about">About Mtendere</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card py-12">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {teamStats.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border border-border/60 shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-mtendere-blue/10">
                    <Icon className="h-5 w-5 text-mtendere-blue" />
                  </div>
                  <div className="text-3xl font-black text-mtendere-blue">{value}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-12 max-w-3xl">
            <Badge variant="outline" className="border-mtendere-blue/20 text-mtendere-blue">
              Board
            </Badge>
            <h2 className="mt-4 text-3xl font-bold text-mtendere-blue md:text-4xl">Board leadership and governance</h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              Our board brings governance, health, development, leadership, and management experience to the decisions
              that shape Mtendere's work.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {isLoading ? (
              [...Array(2)].map((_, index) => <div key={index} className="h-72 animate-pulse rounded-lg bg-muted" />)
            ) : board.length > 0 ? (
              board.map((member) => <TeamMemberCard key={member.id} member={member} featured />)
            ) : (
              <Card className="border border-dashed border-border/70 xl:col-span-2">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Board profiles will appear here after they are published in Admin.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      <section className="bg-mtendere-gray/60 py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-12 max-w-3xl">
            <Badge variant="outline" className="border-mtendere-green/20 text-mtendere-green">
              Leadership and operations
            </Badge>
            <h2 className="mt-4 text-3xl font-bold text-mtendere-blue md:text-4xl">The team students work with</h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              These team members coordinate consulting, marketing, admissions, administration, and finance so students
              receive organized and practical support.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[...leadership, ...operations].map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <Card className="border-0 bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white shadow-xl">
            <CardContent className="flex flex-col gap-5 p-8 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Work with Mtendere's team</h2>
                <p className="mt-2 max-w-2xl text-white/84">
                  Get guidance for scholarships, admissions, study abroad planning, career preparation, and the next
                  decision in your education journey.
                </p>
              </div>
              <Button asChild className="bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
                <Link href="/contact">Book a consultation</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
