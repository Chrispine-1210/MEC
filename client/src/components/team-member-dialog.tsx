import { ReactNode } from "react";
import { GraduationCap, Linkedin, Mail, Twitter } from "lucide-react";
import TeamPortrait from "@/components/team-portrait";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ApiTeamMember } from "@/lib/api-types";

type DialogTeamMember = ApiTeamMember & {
  qualification?: string;
  group?: string;
  focusAreas?: string[];
};

type TeamMemberDialogProps = {
  member: DialogTeamMember;
  trigger: ReactNode;
};

export default function TeamMemberDialog({ member, trigger }: TeamMemberDialogProps) {
  const focusAreas = member.focusAreas ?? [];

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="mb-5 grid gap-5 sm:grid-cols-[170px_minmax(0,1fr)]">
            <TeamPortrait
              member={member}
              aspectRatio="4 / 5"
              wrapperClassName="rounded-xl"
              enableLightbox
            />
            <div>
              <DialogTitle className="text-2xl text-mtendere-blue">{member.name}</DialogTitle>
              <DialogDescription className="mt-1 text-mtendere-orange">{member.position}</DialogDescription>
              {member.qualification && (
                <div className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-foreground/80">
                  <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-mtendere-green" />
                  <span>{member.qualification}</span>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {member.group && (
                  <Badge variant="outline" className="border-mtendere-orange/25 text-mtendere-orange">
                    {member.group}
                  </Badge>
                )}
                {focusAreas.slice(0, 3).map((area) => (
                  <Badge key={area} variant="outline" className="border-mtendere-blue/20 text-mtendere-blue">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm leading-7 text-foreground/80">
            {member.bio || "Profile details for this team member will be shared soon."}
          </p>

          {focusAreas.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {focusAreas.slice(0, 3).map((item) => (
                <div key={item} className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm font-medium text-foreground/80">
                  {item}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {member.email && (
              <Button asChild variant="outline">
                <a href={`mailto:${member.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </a>
              </Button>
            )}
            {member.linkedin && (
              <Button asChild variant="outline">
                <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </a>
              </Button>
            )}
            {member.twitter && (
              <Button asChild variant="outline">
                <a href={member.twitter} target="_blank" rel="noopener noreferrer">
                  <Twitter className="mr-2 h-4 w-4" />
                  Twitter
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
