import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Copy, Image as ImageIcon, Loader2, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { authFetch, queryClient } from "@/lib/queryClient";
import {
  formatAssetSize,
  mediaModuleLabels,
  mediaModules,
  type MediaAsset,
  type MediaAssetsResponse,
  type MediaAuditResponse,
  type MediaModule,
} from "@/lib/media-assets";

export default function MediaGovernancePage() {
  const [moduleName, setModuleName] = useState<MediaModule>("blogs");
  const [search, setSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const assetsQuery = useQuery<MediaAssetsResponse>({
    queryKey: ["/api/admin/media/assets"],
    queryFn: async () => {
      const response = await authFetch("/api/admin/media/assets");
      if (!response.ok) throw new Error("Failed to load media assets");
      return response.json();
    },
  });

  const auditQuery = useQuery<MediaAuditResponse>({
    queryKey: ["/api/admin/media/audit"],
    queryFn: async () => {
      const response = await authFetch("/api/admin/media/audit");
      if (!response.ok) throw new Error("Failed to run media audit");
      return response.json();
    },
  });

  const moduleAssets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (assetsQuery.data?.assets || [])
      .filter((asset) => asset.module === moduleName)
      .filter((asset) => !term || asset.reference.toLowerCase().includes(term))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [assetsQuery.data?.assets, moduleName, search]);

  const totals = useMemo(() => {
    const assets = assetsQuery.data?.assets || [];
    return {
      all: assets.length,
      valid: assets.filter((asset) => asset.valid).length,
      invalid: assets.filter((asset) => !asset.valid).length,
      selectedModule: assets.filter((asset) => asset.module === moduleName).length,
    };
  }, [assetsQuery.data?.assets, moduleName]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      const response = await authFetch(`/api/admin/media/assets/${moduleName}`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(payload.message || "Upload failed");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/media/assets"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/media/audit"] }),
      ]);

      toast({
        title: "Media uploaded",
        description: `${payload.files?.length || 0} governed asset${payload.files?.length === 1 ? "" : "s"} added to ${mediaModuleLabels[moduleName]}.`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "The selected files could not be uploaded.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const copyReference = async (asset: MediaAsset) => {
    await navigator.clipboard?.writeText(asset.reference);
    toast({ title: "Reference copied", description: asset.reference });
  };

  return (
    <div className="space-y-6">
      <SEO title="Media Governance" description="Validate and manage deterministic platform images." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
            <ImageIcon className="h-8 w-8 text-primary" />
            Media Governance
          </h1>
          <p className="text-muted-foreground">Upload, audit, and assign approved assets from assets/imgs.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              assetsQuery.refetch();
              auditQuery.refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => handleUpload(event.target.files)}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload to {mediaModuleLabels[moduleName]}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Governed Assets" value={totals.all} />
        <Metric title="Valid Files" value={totals.valid} tone="success" />
        <Metric title="Invalid Files" value={totals.invalid} tone={totals.invalid ? "warning" : "success"} />
        <Metric title="Missing References" value={auditQuery.data?.invalidCount || 0} tone={auditQuery.data?.invalidCount ? "warning" : "success"} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Asset Library
              </CardTitle>
              <CardDescription>{totals.selectedModule} asset(s) in the selected module.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={moduleName} onValueChange={(value) => setModuleName(value as MediaModule)}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  {mediaModules.map((moduleItem) => (
                    <SelectItem key={moduleItem} value={moduleItem}>
                      {mediaModuleLabels[moduleItem]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assets" className="sm:w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {assetsQuery.isLoading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading media assets
            </div>
          ) : moduleAssets.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {moduleAssets.map((asset) => (
                <div key={asset.reference} className="overflow-hidden rounded-lg border bg-card">
                  <div className="aspect-video bg-muted">
                    <img src={asset.previewUrl} alt={asset.reference} className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{asset.reference.split("/").pop()}</p>
                      <Badge variant="outline" className={asset.valid ? "text-success" : "text-warning"}>
                        {asset.valid ? "valid" : "invalid"}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{asset.reference}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatAssetSize(asset.size)}</span>
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => copyReference(asset)}>
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed text-center text-muted-foreground">
              <ImageIcon className="mb-2 h-8 w-8" />
              No assets found for this module.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {auditQuery.data?.invalidCount ? <AlertTriangle className="h-5 w-5 text-warning" /> : <CheckCircle2 className="h-5 w-5 text-success" />}
            Missing Image Report
          </CardTitle>
          <CardDescription>
            {auditQuery.data?.checked || 0} content references checked across blogs, jobs, scholarships, partners, teams, and testimonials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditQuery.isLoading ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Running audit
            </div>
          ) : auditQuery.data?.invalidReferences.length ? (
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[1fr_120px_120px] gap-3 border-b bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Content</span>
                <span>Field</span>
                <span>Reason</span>
              </div>
              {auditQuery.data.invalidReferences.map((reference) => (
                <div key={`${reference.module}-${reference.id}-${reference.field}`} className="grid grid-cols-[1fr_120px_120px] gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{reference.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{reference.module} #{reference.id}</p>
                  </div>
                  <span className="text-muted-foreground">{reference.field}</span>
                  <Badge variant="outline" className="w-fit text-warning">{reference.reason}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
              Every audited content reference resolves to a valid governed asset.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value, tone = "neutral" }: { title: string; value: number; tone?: "neutral" | "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
