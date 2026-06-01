import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Copy, Image as ImageIcon, Loader2, RefreshCw, ShieldCheck, Upload } from "lucide-react";
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
  const [kindFilter, setKindFilter] = useState<"all" | "image" | "logo" | "hero" | "background">("all");
  const [search, setSearch] = useState("");
  const [replaceFrom, setReplaceFrom] = useState("");
  const [replaceTo, setReplaceTo] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
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
      .filter((asset) => kindFilter === "all" || asset.kind === kindFilter)
      .filter((asset) => !term || asset.reference.toLowerCase().includes(term))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [assetsQuery.data?.assets, kindFilter, moduleName, search]);

  const totals = useMemo(() => {
    const assets = assetsQuery.data?.assets || [];
    return {
      all: assets.length,
      valid: assets.filter((asset) => asset.valid).length,
      invalid: assets.filter((asset) => !asset.valid).length,
      selectedModule: assets.filter((asset) => asset.module === moduleName).length,
      logos: assets.filter((asset) => asset.kind === "logo").length,
      qualityWarnings: auditQuery.data?.qualityFindings?.filter((finding) => finding.severity === "warning").length || 0,
    };
  }, [assetsQuery.data?.assets, auditQuery.data?.qualityFindings, moduleName]);

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

  const handleReplaceReferences = async () => {
    if (!replaceFrom.trim() || !replaceTo.trim()) {
      toast({ title: "Select references", description: "Provide both source and replacement media references.", variant: "destructive" });
      return;
    }

    setIsReplacing(true);
    try {
      const response = await authFetch("/api/admin/media/replace-references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: replaceFrom.trim(), to: replaceTo.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Replacement failed");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/media/assets"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/media/audit"] }),
      ]);

      toast({
        title: "References replaced",
        description: `${payload.replacedCount || 0} content reference${payload.replacedCount === 1 ? "" : "s"} updated.`,
      });
      setReplaceFrom("");
      setReplaceTo("");
    } catch (error) {
      toast({
        title: "Replacement failed",
        description: error instanceof Error ? error.message : "Media references could not be replaced.",
        variant: "destructive",
      });
    } finally {
      setIsReplacing(false);
    }
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
        <Metric title="Logo Assets" value={totals.logos} tone="success" />
        <Metric title="Quality Warnings" value={totals.qualityWarnings + totals.invalid + (auditQuery.data?.invalidCount || 0)} tone={totals.qualityWarnings || totals.invalid || auditQuery.data?.invalidCount ? "warning" : "success"} />
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
              <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as typeof kindFilter)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All asset types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="logo">Logos</SelectItem>
                  <SelectItem value="hero">Hero banners</SelectItem>
                  <SelectItem value="background">Backgrounds</SelectItem>
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
                  <div className={`aspect-video ${asset.kind === "logo" ? "asset-logo-tile p-5" : "bg-muted"}`}>
                    <img src={asset.previewUrl} alt={asset.reference} className={`h-full w-full ${asset.kind === "logo" ? "object-contain" : "object-cover"}`} />
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{asset.reference.split("/").pop()}</p>
                      <Badge variant="outline" className={asset.valid ? "text-success" : "text-warning"}>
                        {asset.valid ? "valid" : "invalid"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">{asset.kind || "image"}</Badge>
                      {(asset.qualityFlags || []).slice(0, 2).map((flag) => (
                        <Badge key={flag} variant="outline" className="text-[10px] text-warning">
                          {flag.replace(/-/g, " ")}
                        </Badge>
                      ))}
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
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Bulk Replace References
          </CardTitle>
          <CardDescription>
            Replace a repeated or placeholder asset across blogs, jobs, scholarships, partners, team members, testimonials, and events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input
              value={replaceFrom}
              onChange={(event) => setReplaceFrom(event.target.value)}
              placeholder="Reference to replace, e.g. partners/partners-default.jpg"
            />
            <Input
              value={replaceTo}
              onChange={(event) => setReplaceTo(event.target.value)}
              placeholder="Replacement governed reference"
            />
            <Button type="button" onClick={handleReplaceReferences} disabled={isReplacing}>
              {isReplacing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
              Replace
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: copy references from the asset cards above. Replacement refuses invalid or external destination assets.
          </p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Duplicate Asset Findings</CardTitle>
            <CardDescription>
              Exact file duplicates increase bundle weight and encourage repeated visuals across the public site.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditQuery.data?.duplicateGroups?.length ? (
              <div className="space-y-3">
                {auditQuery.data.duplicateGroups.slice(0, 5).map((group) => (
                  <div key={group.hash} className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-warning">{group.references.length} copies</Badge>
                      <span className="text-xs text-muted-foreground">{formatAssetSize(group.totalBytes)}</span>
                    </div>
                    <div className="space-y-1">
                      {group.references.slice(0, 4).map((reference) => (
                        <p key={reference} className="truncate text-xs text-muted-foreground">{reference}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
                No exact duplicate files detected in the governed library.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Findings</CardTitle>
            <CardDescription>
              Prioritized signals for placeholders, oversized sources, and assets that should be converted to WebP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditQuery.data?.qualityFindings?.length ? (
              <div className="space-y-3">
                {auditQuery.data.qualityFindings.slice(0, 8).map((finding) => (
                  <div key={`${finding.reference}-${finding.issue}`} className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{finding.reference}</p>
                      <Badge variant="outline" className={finding.severity === "warning" ? "text-warning" : "text-muted-foreground"}>
                        {finding.issue}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{finding.recommendation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
                No quality warnings detected.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
