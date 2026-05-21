import { useMemo, useState, type ImgHTMLAttributes } from "react";
import { Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  type GovernedImageModule,
  type GovernedImageVariant,
  resolveGovernedImage,
} from "@/lib/image-governance";

type GovernedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  module: GovernedImageModule;
  src?: string | null;
  title?: string | null;
  alt?: string;
  category?: string | null;
  tags?: string[] | null;
  index?: number;
  variant?: GovernedImageVariant;
  aspectRatio?: string;
  fit?: "cover" | "contain";
  priority?: boolean;
  caption?: string | false;
  enableLightbox?: boolean;
  wrapperClassName?: string;
  imageClassName?: string;
};

export default function GovernedImage({
  module,
  src,
  title,
  alt,
  category,
  tags,
  index,
  variant = "card",
  aspectRatio = "16 / 9",
  fit = "cover",
  priority = false,
  caption = false,
  enableLightbox = false,
  wrapperClassName,
  imageClassName,
  className,
  onLoad,
  onError,
  ...imgProps
}: GovernedImageProps) {
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "failed">("loading");
  const [fallbackDepth, setFallbackDepth] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const resolved = useMemo(
    () => resolveGovernedImage({ module, src, title, category, tags, index, variant }),
    [module, src, title, category, tags, index, variant],
  );
  const globalFallback = useMemo(
    () => resolveGovernedImage({ module: "default", title: title || alt, variant: "fallback" }),
    [title, alt],
  );

  const activeImage = fallbackDepth === 0 ? resolved : globalFallback;
  const effectiveAlt = alt || activeImage.alt;
  const effectiveCaption = caption === false ? undefined : caption || activeImage.caption;
  const isHardFailed = loadState === "failed" && fallbackDepth > 0;

  const image = isHardFailed ? (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-mtendere-blue/12 via-card to-mtendere-green/12 text-center text-mtendere-blue">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
        <ImageIcon className="h-7 w-7" />
      </div>
      <span className="px-4 text-sm font-semibold">{getInitials(title || alt || module)}</span>
    </div>
  ) : (
    <img
      {...imgProps}
      src={activeImage.src}
      alt={effectiveAlt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn(
        "h-full w-full transition duration-700 ease-out",
        fit === "cover" ? "object-cover" : "object-contain",
        loadState === "loaded" ? "opacity-100" : "opacity-0",
        "group-hover:scale-[1.035]",
        imageClassName,
      )}
      onLoad={(event) => {
        setLoadState("loaded");
        onLoad?.(event);
      }}
      onError={(event) => {
        if (fallbackDepth === 0) {
          setFallbackDepth(1);
          setLoadState("loading");
        } else {
          setLoadState("failed");
        }

        console.warn("Governed image fallback applied", {
          module,
          requested: src,
          resolved: activeImage.key,
          fallbackLevel: activeImage.fallbackLevel,
        });
        onError?.(event);
      }}
    />
  );

  return (
    <figure className={cn("relative", className)}>
      <div
        className={cn(
          "group relative overflow-hidden bg-muted media-depth ring-1 ring-black/5",
          "after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-t after:from-black/12 after:via-black/0 after:to-white/5",
          wrapperClassName,
        )}
        style={{ aspectRatio }}
      >
        {loadState === "loading" && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-card to-muted" />
        )}
        {enableLightbox && !isHardFailed ? (
          <button
            type="button"
            className="block h-full w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-mtendere-blue focus:ring-offset-2"
            onClick={() => setLightboxOpen(true)}
            aria-label={`Open image preview for ${effectiveAlt}`}
          >
            {image}
          </button>
        ) : (
          image
        )}
      </div>
      {effectiveCaption && <figcaption className="mt-2 text-xs text-muted-foreground">{effectiveCaption}</figcaption>}

      {enableLightbox && !isHardFailed && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-5xl border-0 bg-black/90 p-3 text-white">
            <DialogTitle className="sr-only">{effectiveAlt}</DialogTitle>
            <DialogDescription className="sr-only">{effectiveCaption || "Image preview"}</DialogDescription>
            <div className="max-h-[82vh] overflow-hidden rounded-lg bg-black">
              <img src={activeImage.src} alt={effectiveAlt} className="max-h-[82vh] w-full object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </figure>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
