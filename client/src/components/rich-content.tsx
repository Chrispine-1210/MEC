import { sanitizeRichHtml } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

type RichContentProps = {
  html?: string | null;
  fallback?: string;
  className?: string;
  invert?: boolean;
  compact?: boolean;
};

export default function RichContent({
  html,
  fallback,
  className,
  invert = false,
  compact = false,
}: RichContentProps) {
  const content = sanitizeRichHtml(html || fallback || "");
  if (!content) return null;

  return (
    <div
      className={cn(
        "max-w-none break-words",
        compact ? "text-sm leading-7" : "text-base leading-8 md:text-lg",
        invert ? "text-white/86" : "text-foreground/80",
        "[&_a]:font-semibold [&_a]:text-mtendere-blue [&_a]:underline [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-mtendere-orange/60 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_figure]:my-6 [&_figcaption]:mt-2 [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground [&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-mtendere-blue [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-mtendere-blue [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-mtendere-blue [&_h4]:mb-2 [&_h4]:mt-5 [&_h4]:text-lg [&_h4]:font-semibold [&_img]:max-w-full [&_img]:rounded-xl [&_li]:ml-5 [&_li]:pl-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_p]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4 [&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-3 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-3 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2",
        invert &&
          "[&_a]:text-white [&_blockquote]:border-white/50 [&_code]:bg-white/15 [&_figcaption]:text-white/70 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_pre]:bg-white/10 [&_td]:border-white/20 [&_th]:border-white/20 [&_th]:bg-white/10",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
