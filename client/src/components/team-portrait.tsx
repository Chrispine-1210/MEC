import GovernedImage from "@/components/governed-image";
import { cn } from "@/lib/utils";
import type { ApiTeamMember } from "@/lib/api-types";
import type { GovernedImageVariant } from "@/lib/image-governance";

type TeamPortraitProps = {
  member: Pick<ApiTeamMember, "name" | "position" | "imageUrl">;
  className?: string;
  wrapperClassName?: string;
  imageClassName?: string;
  aspectRatio?: string;
  variant?: GovernedImageVariant;
  enableLightbox?: boolean;
};

export default function TeamPortrait({
  member,
  className,
  wrapperClassName,
  imageClassName,
  aspectRatio = "4 / 5",
  variant = "profile",
  enableLightbox = false,
}: TeamPortraitProps) {
  if (member.imageUrl) {
    return (
      <GovernedImage
        module="team"
        src={member.imageUrl}
        title={member.name}
        category={member.position}
        variant={variant}
        aspectRatio={aspectRatio}
        className={className}
        wrapperClassName={wrapperClassName}
        imageClassName={imageClassName}
        enableLightbox={enableLightbox}
      />
    );
  }

  return (
    <figure className={cn("relative", className)}>
      <div
        className={cn(
          "flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-mtendere-blue/15 via-card to-mtendere-green/15 text-mtendere-blue shadow-sm",
          wrapperClassName,
        )}
        style={{ aspectRatio }}
      >
        <span className="px-4 text-center text-2xl font-black tracking-normal">{getInitials(member.name)}</span>
      </div>
    </figure>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter((part) => !/^(mr|mrs|ms|dr)\.?$/i.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
