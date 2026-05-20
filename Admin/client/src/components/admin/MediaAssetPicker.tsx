import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Image as ImageIcon, Loader2, Search, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { authFetch, queryClient } from "@/lib/queryClient";
import {
  formatAssetSize,
  getMediaPreviewUrl,
  isGovernedMediaReference,
  mediaModuleLabels,
  normalizeMediaReference,
  type MediaAsset,
  type MediaAssetsResponse,
  type MediaModule,
} from "@/lib/media-assets";
import { cn } from "@/lib/utils";

type MediaAssetPickerProps = {
  moduleName: MediaModule;
  value?: string | null;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  aspect?: "video" | "square" | "portrait" | "logo";
};

const aspectClasses = {
  video: "aspect-video",
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  logo: "aspect-square",
};

export default function MediaAssetPicker({
  moduleName,
  value,
  onChange,
  label = "Media Asset",
  description = "Assign a governed asset from assets/imgs.",
  aspect = "video",
}: MediaAssetPickerProps) {
  const [search, setSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<MediaAssetsResponse>({
    queryKey: ["/api/admin/media/assets"],
    queryFn: async () => {
      const response = await authFetch("/api/admin/media/assets");
      if (!response.ok) throw new Error("Failed to load media assets");
      return response.json();
    },
  });

  const assets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.assets || [])
      .filter((asset) => asset.module === moduleName && asset.valid)
      .filter((asset) => !term || asset.reference.toLowerCase().includes(term))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [data?.assets, moduleName, search]);

  const normalizedValue = normalizeMediaReference(value);
  const selectedAsset = assets.find((asset) => asset.reference === normalizedValue);
  const hasGovernedValue = isGovernedMediaReference(value);
  const previewUrl = getMediaPreviewUrl(value);
  const fitClass = aspect === "logo" ? "object-contain bg-card p-3" : "object-cover";

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const response = await authFetch(`/api/admin/media/assets/${moduleName}`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Upload failed");
      }

      const uploaded = payload.files?.[0] as MediaAsset | undefined;
      if (uploaded?.reference) onChange(uploaded.reference);

      await queryClient.invalidateQueries({ queryKey: ["/api/admin/media/assets"] });
      toast({
        title: "Media uploaded",
        description: uploaded?.reference || "The governed asset is ready to use.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "The selected image could not be uploaded.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant={hasGovernedValue ? "default" : "secondary"} className={cn(hasGovernedValue && "bg-success/15 text-success")}>
          {hasGovernedValue ? <ShieldCheck className="mr-1 h-3 w-3" /> : <AlertTriangle className="mr-1 h-3 w-3" />}
          {hasGovernedValue ? "Governed" : "Fallback pending"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,320px)_1fr]">
        <div>
          <div className={cn("relative overflow-hidden rounded-lg border bg-card", aspectClasses[aspect])}>
            {previewUrl ? (
              <img src={previewUrl} alt={`${label} preview`} className={cn("h-full w-full", fitClass)} />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/10 to-accent/10 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs font-medium">Module default will apply</span>
              </div>
            )}
            {value && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute right-2 top-2 h-8 w-8 p-0"
                onClick={() => onChange("")}
                aria-label="Clear selected media"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="mt-2 min-h-9 rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
            {selectedAsset ? (
              <span>{selectedAsset.reference} - {formatAssetSize(selectedAsset.size)}</span>
            ) : hasGovernedValue ? (
              <span>{normalizedValue}</span>
            ) : value ? (
              <span className="text-warning">This value is not from assets/imgs and will be normalized on save.</span>
            ) : (
              <span>No asset selected.</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${mediaModuleLabels[moduleName] || moduleName} assets`}
                className="pl-9"
              />
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => handleUpload(event.target.files)}
            />
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload
            </Button>
          </div>

          <ScrollArea className="h-56 rounded-lg border bg-background p-3">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className={cn("animate-pulse rounded-md bg-muted", aspectClasses[aspect])} />
                ))}
              </div>
            ) : assets.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
                {assets.map((asset) => {
                  const selected = normalizedValue === asset.reference;
                  return (
                    <button
                      key={asset.reference}
                      type="button"
                      onClick={() => onChange(asset.reference)}
                      className={cn(
                        "group relative overflow-hidden rounded-md border bg-card text-left transition hover:border-primary",
                        selected ? "border-primary ring-2 ring-primary/20" : "border-border/70",
                      )}
                    >
                      <div className={cn("overflow-hidden", aspectClasses[aspect])}>
                        <img src={asset.previewUrl} alt={asset.reference} className={cn("h-full w-full transition group-hover:scale-105", fitClass)} />
                      </div>
                      <div className="p-2">
                        <p className="truncate text-[11px] font-medium text-foreground">{asset.reference.split("/").pop()}</p>
                        <p className="text-[10px] text-muted-foreground">{formatAssetSize(asset.size)}</p>
                      </div>
                      {selected && (
                        <span className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full min-h-32 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <ImageIcon className="mb-2 h-8 w-8" />
                No governed assets found for this module yet.
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
