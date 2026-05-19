import { Award, GraduationCap } from "lucide-react";
import TeamMemberDialog from "@/components/team-member-dialog";
import TeamPortrait from "@/components/team-portrait";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DisplayTeamMember } from "@/lib/team-display";
import { cn } from "@/lib/utils";

type TeamMemberCardProps = {
  member: DisplayTeamMember;
  featured?: boolean;
  className?: string;
};

export default function TeamMemberCard({ member, featured = false, className }: TeamMemberCardProps) {
  if (featured) {
    return (
      <Card className={cn("overflow-hidden border border-border/60 shadow-sm", className)}>
        <CardContent className="grid gap-6 p-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-start">
          <TeamPortrait
            member={member}
            aspectRatio="4 / 5"
            className="w-full max-w-[180px]"
            wrapperClassName="rounded-lg shadow-none"
          />
          <div className="min-w-0 space-y-4">
            <div>
              <Badge variant="outline" className="mb-3 border-mtendere-blue/20 text-mtendere-blue">
                {member.group}
              </Badge>
              <CardTitle className="text-2xl leading-tight text-foreground">{member.name}</CardTitle>
              <CardDescription className="mt-1 font-semibold text-mtendere-orange">{member.position}</CardDescription>
            </div>

            {member.qualification && (
              <div className="flex items-start gap-2 text-sm leading-relaxed text-foreground/80">
                <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-mtendere-green" />
                <span>{member.qualification}</span>
              </div>
            )}

            <p className="text-sm leading-7 text-muted-foreground">{member.bio}</p>

            {member.focusAreas?.length ? (
              <div className="flex flex-wrap gap-2">
                {member.focusAreas.slice(0, 3).map((area) => (
                  <Badge key={area} variant="secondary" className="bg-mtendere-gray text-foreground/75">
                    {area}
                  </Badge>
                ))}
              </div>
            ) : null}

            <TeamMemberDialog
              member={member}
              trigger={
                <Button variant="outline" className="border-mtendere-blue/20 text-mtendere-blue hover:bg-mtendere-blue hover:text-white">
                  View profile
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("group overflow-hidden border border-border/60 shadow-sm transition-shadow hover:shadow-lg", className)}>
      <CardHeader className="pb-4">
        <div className="mb-5 overflow-hidden rounded-lg bg-mtendere-gray">
          <TeamPortrait
            member={member}
            aspectRatio="4 / 5"
            className="h-full"
            wrapperClassName="rounded-none shadow-none"
            imageClassName="group-hover:scale-105"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Badge variant="outline" className="border-mtendere-green/20 text-mtendere-green">
            {member.group}
          </Badge>
          <Award className="h-4 w-4 text-mtendere-orange" />
        </div>
        <CardTitle className="text-xl leading-tight text-foreground">{member.name}</CardTitle>
        <CardDescription className="font-semibold text-mtendere-orange">{member.position}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {member.qualification && (
          <div className="flex items-start gap-2 text-sm leading-relaxed text-foreground/80">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-mtendere-green" />
            <span>{member.qualification}</span>
          </div>
        )}
        <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
        <TeamMemberDialog
          member={member}
          trigger={
            <Button variant="outline" className="w-full border-mtendere-blue/20 text-mtendere-blue hover:bg-mtendere-blue hover:text-white">
              View profile
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
