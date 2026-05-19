import type { ApiTeamMember } from "@/lib/api-types";
import { richTextToPlainText } from "@/lib/rich-text";

export type DisplayTeamMember = ApiTeamMember & {
  group: "Board" | "Leadership" | "Operations";
  qualification?: string;
  focusAreas?: string[];
};

export function toDisplayTeamMember(member: ApiTeamMember): DisplayTeamMember {
  return {
    ...member,
    group: getTeamGroup(member.position),
    qualification: extractQualification(member.bio),
    focusAreas: [],
  };
}

export function sortTeamMembers(members: ApiTeamMember[] = []) {
  return members
    .filter((member) => member.isActive !== false)
    .slice()
    .sort((left, right) => Number(left.order ?? 0) - Number(right.order ?? 0));
}

export function getTeamGroups(members: ApiTeamMember[] = []) {
  const displayMembers = sortTeamMembers(members).map(toDisplayTeamMember);
  return {
    all: displayMembers,
    board: displayMembers.filter((member) => member.group === "Board"),
    leadership: displayMembers.filter((member) => member.group === "Leadership"),
    operations: displayMembers.filter((member) => member.group === "Operations"),
  };
}

function getTeamGroup(position: string): DisplayTeamMember["group"] {
  const normalized = position.toLowerCase();
  if (normalized.includes("board")) return "Board";
  if (
    normalized.includes("lead") ||
    normalized.includes("chief") ||
    normalized.includes("consultant") ||
    normalized.includes("director")
  ) {
    return "Leadership";
  }
  return "Operations";
}

function extractQualification(bio?: string | null) {
  const plainBio = richTextToPlainText(bio);
  if (!plainBio) return undefined;
  const firstSentence = plainBio.split(". ")[0]?.trim();
  if (!firstSentence) return undefined;
  return /\b(ba|bsc|msc|phd|mb\s*chb|accounting|diploma|degree|university)\b/i.test(firstSentence)
    ? firstSentence.replace(/\.$/, "")
    : undefined;
}
