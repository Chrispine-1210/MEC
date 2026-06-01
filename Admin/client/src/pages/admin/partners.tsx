import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch, queryClient, apiRequest } from "@/lib/queryClient";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PartnerInstitution } from "@shared/schema";
import {
  Banknote,
  Bell,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  Globe2,
  Handshake,
  Landmark,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { z } from "zod";
import { useCreateAction } from "@/hooks/use-create-action";
import { getInitialUrlSearchParam } from "@/hooks/use-url-search-param";
import MediaAssetPicker from "@/components/admin/MediaAssetPicker";
import { getMediaPreviewUrl } from "@/lib/media-assets";
import RichTextEditor from "@/components/admin/RichTextEditor";

type PartnerRecord = PartnerInstitution & {
  logoUrl?: string | null;
  coverImage?: string | null;
  contactName?: string | null;
  industryCategory?: string | null;
  partnershipLevel?: string | null;
  sponsorshipTier?: string | null;
  status?: string | null;
  country?: string | null;
  socialLinks?: unknown;
  documents?: OperationalRecord[];
  agreements?: OperationalRecord[];
  notes?: string | null;
  internalComments?: string | null;
  linkedEvents?: unknown;
  linkedSponsorships?: unknown;
  linkedOpportunities?: unknown;
  partnershipHistory?: unknown;
  activities?: OperationalRecord[];
  reminders?: OperationalRecord[];
  financialRecords?: OperationalRecord[];
  performanceMetrics?: Record<string, unknown>;
};

type OperationalRecord = {
  id?: string;
  type?: string;
  subject?: string;
  title?: string;
  notes?: string;
  outcome?: string;
  owner?: string;
  amount?: number;
  currency?: string;
  status?: string;
  url?: string;
  accessLevel?: string;
  version?: number;
  dueAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  recordedAt?: string;
};

type PartnerAnalytics = {
  totalPartners: number;
  activePartners: number;
  featuredPartners: number;
  premiumPartners: number;
  totalContribution: number;
  byTier: Record<string, number>;
  renewalAlerts: Array<{ partnerId: string; partnerName: string; document: OperationalRecord }>;
};

type PartnerCrmResponse = {
  partner: PartnerRecord;
  crm: {
    activities?: OperationalRecord[];
    reminders?: OperationalRecord[];
    documents?: OperationalRecord[];
    agreements?: OperationalRecord[];
    financialRecords?: OperationalRecord[];
    performanceMetrics?: Record<string, unknown>;
  };
};

const partnerFormSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required"),
  description: z.string().trim().min(8, "Description is required"),
  partnershipType: z.string().trim().min(2, "Partner type is required"),
  logo: z.string().optional().default(""),
  coverImage: z.string().optional().default(""),
  website: z.string().optional().default(""),
  contactName: z.string().optional().default(""),
  contactEmail: z.string().email("Enter a valid email").optional().or(z.literal("")).default(""),
  contactPhone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  country: z.string().optional().default("Global"),
  region: z.string().optional().default("Global"),
  industryCategory: z.string().optional().default(""),
  partnershipLevel: z.string().optional().default("Strategic"),
  sponsorshipTier: z.string().optional().default("None"),
  status: z.string().optional().default("active"),
  videoUrl: z.string().optional().default(""),
  videoTitle: z.string().optional().default(""),
  videoDescription: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  internalComments: z.string().optional().default(""),
  socialLinksText: z.string().optional().default(""),
  documentsText: z.string().optional().default(""),
  agreementsText: z.string().optional().default(""),
  linkedEventsText: z.string().optional().default(""),
  linkedSponsorshipsText: z.string().optional().default(""),
  linkedOpportunitiesText: z.string().optional().default(""),
  partnershipHistoryText: z.string().optional().default(""),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  isPremium: z.boolean().optional().default(false),
  paymentStatus: z.string().optional().default("unpaid"),
});

type PartnerFormValues = z.infer<typeof partnerFormSchema>;

const defaultPartnerValues = (): PartnerFormValues => ({
  name: "",
  description: "",
  partnershipType: "Strategic Partner",
  logo: "",
  coverImage: "",
  website: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  country: "Global",
  region: "Global",
  industryCategory: "Education",
  partnershipLevel: "Strategic",
  sponsorshipTier: "None",
  status: "active",
  videoUrl: "",
  videoTitle: "",
  videoDescription: "",
  notes: "",
  internalComments: "",
  socialLinksText: "{\n  \"linkedin\": \"\",\n  \"facebook\": \"\",\n  \"x\": \"\"\n}",
  documentsText: "[]",
  agreementsText: "[]",
  linkedEventsText: "[]",
  linkedSponsorshipsText: "[]",
  linkedOpportunitiesText: "[]",
  partnershipHistoryText: "[]",
  isFeatured: false,
  isActive: true,
  isPremium: false,
  paymentStatus: "unpaid",
});

export default function PartnersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(() => getInitialUrlSearchParam());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerRecord | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState({ type: "meeting", subject: "", notes: "", dueAt: "", owner: "Admin" });
  const [documentForm, setDocumentForm] = useState({ title: "", type: "agreement", url: "", version: "1", accessLevel: "admin", expiresAt: "" });
  const [financialForm, setFinancialForm] = useState({ type: "contribution", amount: "", currency: "MWK", status: "pledged", notes: "" });
  const { toast } = useToast();

  useCreateAction(() => {
    setEditingPartner(null);
    form.reset(defaultPartnerValues());
    setIsDialogOpen(true);
  });

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: defaultPartnerValues(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/partners", page, limit, search],
    queryFn: async () => {
      const response = await authFetch(`/api/admin/partners?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
      if (!response.ok) throw new Error("Failed to fetch partners");
      return response.json();
    },
  });

  const analyticsQuery = useQuery<PartnerAnalytics>({
    queryKey: ["/api/admin/partners/analytics/summary"],
    queryFn: async () => {
      const response = await authFetch("/api/admin/partners/analytics/summary");
      if (!response.ok) throw new Error("Failed to fetch partner analytics");
      return response.json();
    },
  });

  const partners = useMemo<PartnerRecord[]>(() => ((data as any)?.partners || []) as PartnerRecord[], [data]);

  useEffect(() => {
    if (!selectedPartnerId && partners.length > 0) {
      setSelectedPartnerId(String(partners[0].id));
    }
  }, [partners, selectedPartnerId]);

  const crmQuery = useQuery<PartnerCrmResponse>({
    queryKey: ["/api/admin/partners", selectedPartnerId, "crm"],
    enabled: Boolean(selectedPartnerId),
    queryFn: async () => {
      const response = await authFetch(`/api/admin/partners/${selectedPartnerId}/crm`);
      if (!response.ok) throw new Error("Failed to fetch partner CRM workspace");
      return response.json();
    },
  });

  const selectedPartner = crmQuery.data?.partner ?? partners.find((partner) => String(partner.id) === selectedPartnerId) ?? partners[0] ?? null;
  const crm = crmQuery.data?.crm;

  const refreshPartners = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/partners/analytics/summary"] });
    if (selectedPartnerId) {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners", selectedPartnerId, "crm"] });
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiRequest("POST", "/api/admin/partners", payload),
    onSuccess: async (response) => {
      const partner = await response.json().catch(() => null);
      refreshPartners();
      setSelectedPartnerId(partner?.id ? String(partner.id) : selectedPartnerId);
      setIsDialogOpen(false);
      form.reset(defaultPartnerValues());
      toast({ title: "Partner created", description: "The stakeholder profile is now available in the CRM workspace." });
    },
    onError: (error) => showMutationError(error, toast, "Partner creation failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiRequest("PUT", `/api/admin/partners/${id}`, payload),
    onSuccess: () => {
      refreshPartners();
      setIsDialogOpen(false);
      setEditingPartner(null);
      form.reset(defaultPartnerValues());
      toast({ title: "Partner updated", description: "The profile, public showcase data, and CRM metadata were synchronized." });
    },
    onError: (error) => showMutationError(error, toast, "Partner update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/partners/${id}`),
    onSuccess: () => {
      refreshPartners();
      setSelectedPartnerId(null);
      toast({ title: "Partner archived", description: "The partner has been removed from active management." });
    },
    onError: (error) => showMutationError(error, toast, "Partner delete failed"),
  });

  const activityMutation = useMutation({
    mutationFn: () => {
      if (!selectedPartnerId) throw new Error("Select a partner first");
      return apiRequest("POST", `/api/admin/partners/${selectedPartnerId}/activities`, {
        ...activityForm,
        dueAt: activityForm.dueAt || null,
      });
    },
    onSuccess: () => {
      refreshPartners();
      setActivityForm({ type: "meeting", subject: "", notes: "", dueAt: "", owner: "Admin" });
      toast({ title: "Activity logged", description: "The partner timeline and reminder queue were updated." });
    },
    onError: (error) => showMutationError(error, toast, "Activity logging failed"),
  });

  const documentMutation = useMutation({
    mutationFn: () => {
      if (!selectedPartnerId) throw new Error("Select a partner first");
      return apiRequest("POST", `/api/admin/partners/${selectedPartnerId}/documents`, {
        ...documentForm,
        version: Number.parseInt(documentForm.version || "1", 10),
        expiresAt: documentForm.expiresAt || null,
      });
    },
    onSuccess: () => {
      refreshPartners();
      setDocumentForm({ title: "", type: "agreement", url: "", version: "1", accessLevel: "admin", expiresAt: "" });
      toast({ title: "Document registered", description: "Access metadata, versioning, and renewal tracking are now recorded." });
    },
    onError: (error) => showMutationError(error, toast, "Document registration failed"),
  });

  const financialMutation = useMutation({
    mutationFn: () => {
      if (!selectedPartnerId) throw new Error("Select a partner first");
      return apiRequest("POST", `/api/admin/partners/${selectedPartnerId}/financial-records`, {
        ...financialForm,
        amount: Number.parseInt(financialForm.amount || "0", 10),
      });
    },
    onSuccess: () => {
      refreshPartners();
      setFinancialForm({ type: "contribution", amount: "", currency: "MWK", status: "pledged", notes: "" });
      toast({ title: "Contribution tracked", description: "Partner financial performance metrics were recalculated." });
    },
    onError: (error) => showMutationError(error, toast, "Contribution tracking failed"),
  });

  const handleEdit = (partner: PartnerRecord) => {
    setEditingPartner(partner);
    form.reset(partnerToFormValues(partner));
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this partner profile and remove it from active public/admin listings?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (values: PartnerFormValues) => {
    try {
      const payload = buildPartnerPayload(values);
      if (editingPartner) {
        updateMutation.mutate({ id: String(editingPartner.id), payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch (error) {
      showMutationError(error, toast, "Profile validation failed");
    }
  };

  const analytics = analyticsQuery.data;
  const totalContribution = Number(analytics?.totalContribution ?? crm?.performanceMetrics?.totalContribution ?? 0);
  const activities = crm?.activities ?? selectedPartner?.activities ?? [];
  const reminders = crm?.reminders ?? selectedPartner?.reminders ?? [];
  const documents = crm?.documents ?? selectedPartner?.documents ?? [];
  const agreements = crm?.agreements ?? selectedPartner?.agreements ?? [];
  const financialRecords = crm?.financialRecords ?? selectedPartner?.financialRecords ?? [];

  const columns = [
    {
      key: "name",
      header: "Partner",
      sortable: true,
      render: (value: string, row: PartnerRecord) => (
        <div className="flex items-center gap-3">
          {row.logo || row.logoUrl ? (
            <img src={getMediaPreviewUrl(row.logo || row.logoUrl)} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg border bg-card object-contain p-0.5" />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-primary/10">
              <Building2 className="h-5 w-5 text-accent" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight text-foreground">{value}</p>
            <p className="truncate text-xs text-muted-foreground">{row.industryCategory || row.partnershipType || "Partner"}</p>
          </div>
        </div>
      ),
    },
    { key: "partnershipLevel", header: "Level", render: (value: string, row: PartnerRecord) => <Badge variant="outline">{value || row.partnershipType || "Partner"}</Badge> },
    { key: "sponsorshipTier", header: "Tier", render: (value: string) => <span className="text-xs text-muted-foreground">{value || "None"}</span> },
    { key: "region", header: "Region", render: (value: string, row: PartnerRecord) => <span className="text-xs text-muted-foreground">{value || row.country || "Global"}</span> },
    {
      key: "contactEmail",
      header: "Contact",
      render: (value: string, row: PartnerRecord) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>{row.contactName || "Relationship owner pending"}</p>
          <p className="truncate max-w-40">{value || row.contactPhone || "No contact configured"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value: string, row: PartnerRecord) => (
        <Badge className={statusClass(value || (row.isActive ? "active" : "inactive"))}>
          {String(value || (row.isActive ? "active" : "inactive")).replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_: unknown, row: PartnerRecord) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedPartnerId(String(row.id))} data-testid={`button-select-${row.id}`}>
            <ClipboardList className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} data-testid={`button-edit-${row.id}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(String(row.id))} data-testid={`button-delete-${row.id}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SEO title="Partners CRM" description="Enterprise stakeholder, sponsorship, and partner relationship management." />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge className="mb-3 bg-primary/10 text-primary hover:bg-primary/10">
            <Handshake className="mr-1 h-3.5 w-3.5" />
            Partners & Stakeholders CRM
          </Badge>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground" data-testid="page-title">
            <Building2 className="h-8 w-8 text-primary" />
            Partners Management
          </h1>
          <p className="text-muted-foreground">Manage organizations, sponsors, agreements, reminders, communication, and contribution records.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingPartner(null);
            form.reset(defaultPartnerValues());
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add" className="shadow-lg hover:shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto animate-scaleIn">
            <DialogHeader>
              <DialogTitle>{editingPartner ? "Edit Partner Profile" : "Create Partner Profile"}</DialogTitle>
              <DialogDescription>Configure public showcase data, internal relationship intelligence, documents, and sponsorship metadata.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="profile" className="space-y-4">
                  <TabsList className="grid h-auto w-full grid-cols-2 lg:grid-cols-4">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="relationship">Relationship</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="visibility">Visibility</TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <FormField control={form.control} name="logo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Partner Logo</FormLabel>
                          <MediaAssetPicker moduleName="logos" value={field.value} onChange={field.onChange} label="Partner Logo" description="Identity mark used on partner cards, sponsorship blocks, and event pages." aspect="logo" />
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="coverImage" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cover Image</FormLabel>
                          <MediaAssetPicker moduleName="partners" value={field.value} onChange={field.onChange} label="Partner Cover" description="Wide image for partner detail pages and executive previews." aspect="video" />
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <TextField control={form.control} name="name" label="Organization Name" />
                      <TextField control={form.control} name="partnershipType" label="Partner Type" placeholder="Strategic Partner, Sponsor, University, NGO" />
                      <TextField control={form.control} name="industryCategory" label="Industry / Category" placeholder="Education, Technology, Government" />
                      <TextField control={form.control} name="website" label="Website" placeholder="https://example.org" />
                    </div>

                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <RichTextEditor value={field.value} onChange={field.onChange} minHeight={320} placeholder="Describe the organization, partnership purpose, sponsorship scope, and collaboration model..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </TabsContent>

                  <TabsContent value="relationship" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <TextField control={form.control} name="contactName" label="Primary Contact" />
                      <TextField control={form.control} name="contactEmail" label="Contact Email" type="email" />
                      <TextField control={form.control} name="contactPhone" label="Contact Phone" />
                      <TextField control={form.control} name="country" label="Country" />
                      <TextField control={form.control} name="region" label="Region" />
                      <TextField control={form.control} name="address" label="Address" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <SelectField control={form.control} name="partnershipLevel" label="Partnership Level" options={["Strategic", "Implementation", "Academic", "Media", "Technology", "Community"]} />
                      <SelectField control={form.control} name="sponsorshipTier" label="Sponsorship Tier" options={["None", "Bronze", "Silver", "Gold", "Platinum", "Title Sponsor"]} />
                      <SelectField control={form.control} name="status" label="Status" options={["active", "prospect", "renewal_due", "paused", "inactive"]} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <TextAreaField control={form.control} name="notes" label="Relationship Notes" rows={5} />
                      <TextAreaField control={form.control} name="internalComments" label="Internal Comments" rows={5} />
                      <JsonField control={form.control} name="socialLinksText" label="Social Links JSON" />
                      <JsonField control={form.control} name="partnershipHistoryText" label="Partnership History JSON" />
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <JsonField control={form.control} name="documentsText" label="Documents JSON" />
                      <JsonField control={form.control} name="agreementsText" label="Agreements JSON" />
                      <JsonField control={form.control} name="linkedEventsText" label="Linked Events JSON" />
                      <JsonField control={form.control} name="linkedSponsorshipsText" label="Linked Sponsorships JSON" />
                      <JsonField control={form.control} name="linkedOpportunitiesText" label="Linked Opportunities JSON" />
                    </div>
                  </TabsContent>

                  <TabsContent value="visibility" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <TextField control={form.control} name="videoUrl" label="Official Video URL" placeholder="https://www.youtube.com/watch?v=..." />
                      <TextField control={form.control} name="videoTitle" label="Video Title" />
                      <SelectField control={form.control} name="paymentStatus" label="Payment Status" options={["unpaid", "paid", "waived"]} />
                    </div>
                    <TextAreaField control={form.control} name="videoDescription" label="Video Description" rows={3} />

                    <div className="grid gap-3 md:grid-cols-3">
                      <CheckboxField control={form.control} name="isFeatured" label="Feature publicly" description="Show in partner showcase and public page highlights." />
                      <CheckboxField control={form.control} name="isPremium" label="Premium listing" description="Mark for sponsored or elevated placement." />
                      <CheckboxField control={form.control} name="isActive" label="Active profile" description="Available to public surfaces and admin workflows." />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    setEditingPartner(null);
                    form.reset(defaultPartnerValues());
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Partner"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Kpi title="Total Partners" value={analytics?.totalPartners ?? (data as any)?.total ?? 0} icon={<Building2 className="h-5 w-5" />} />
        <Kpi title="Active" value={analytics?.activePartners ?? 0} icon={<ShieldCheck className="h-5 w-5" />} tone="success" />
        <Kpi title="Featured" value={analytics?.featuredPartners ?? 0} icon={<Globe2 className="h-5 w-5" />} tone="info" />
        <Kpi title="Premium" value={analytics?.premiumPartners ?? 0} icon={<Target className="h-5 w-5" />} tone="warning" />
        <Kpi title="Tracked Value" value={formatCurrency(totalContribution)} icon={<Banknote className="h-5 w-5" />} tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <DataTable
          columns={columns}
          data={partners}
          loading={isLoading}
          searchable
          selectable
          pagination={{
            page,
            limit,
            total: (data as any)?.total || 0,
            onPageChange: setPage,
            onLimitChange: setLimit,
          }}
          searchPlaceholder="Search partners by name, country, category, website, contact, or sponsorship tier..."
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          onRowClick={(row) => setSelectedPartnerId(String(row.id))}
        />

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Relationship Workspace
            </CardTitle>
            <CardDescription>{selectedPartner ? selectedPartner.name : "Select a partner to manage CRM records."}</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedPartner ? (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid h-auto w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="docs">Docs</TabsTrigger>
                  <TabsTrigger value="finance">Finance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <PartnerSummary partner={selectedPartner} reminders={reminders} agreements={agreements} />
                  <TierBreakdown byTier={analytics?.byTier ?? {}} />
                  {analytics?.renewalAlerts?.length ? (
                    <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning">
                        <Bell className="h-4 w-4" />
                        Renewal alerts
                      </p>
                      <div className="space-y-2">
                        {analytics.renewalAlerts.slice(0, 4).map((alert, index) => (
                          <p key={`${alert.partnerId}-${index}`} className="text-xs text-muted-foreground">
                            {alert.partnerName}: {alert.document.title || "Agreement"} expires {formatDate(alert.document.expiresAt)}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                    <Input value={activityForm.subject} onChange={(event) => setActivityForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Subject or meeting title" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={activityForm.type} onChange={(event) => setActivityForm((current) => ({ ...current, type: event.target.value }))} placeholder="Type" />
                      <Input value={activityForm.dueAt} onChange={(event) => setActivityForm((current) => ({ ...current, dueAt: event.target.value }))} type="datetime-local" />
                    </div>
                    <Textarea value={activityForm.notes} onChange={(event) => setActivityForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes, outcome, follow-up requirements" rows={3} />
                    <Button className="w-full" onClick={() => activityMutation.mutate()} disabled={!activityForm.subject || activityMutation.isPending}>
                      Log Activity
                    </Button>
                  </div>
                  <Timeline items={activities} empty="No communication, meetings, or follow-ups logged yet." />
                </TabsContent>

                <TabsContent value="docs" className="space-y-4">
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                    <Input value={documentForm.title} onChange={(event) => setDocumentForm((current) => ({ ...current, title: event.target.value }))} placeholder="Document title" />
                    <Input value={documentForm.url} onChange={(event) => setDocumentForm((current) => ({ ...current, url: event.target.value }))} placeholder="Document URL or managed file reference" />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={documentForm.type} onValueChange={(value) => setDocumentForm((current) => ({ ...current, type: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agreement">Agreement</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="brochure">Brochure</SelectItem>
                          <SelectItem value="certificate">Certificate</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={documentForm.expiresAt} onChange={(event) => setDocumentForm((current) => ({ ...current, expiresAt: event.target.value }))} type="date" />
                    </div>
                    <Button className="w-full" onClick={() => documentMutation.mutate()} disabled={!documentForm.title || !documentForm.url || documentMutation.isPending}>
                      Register Document
                    </Button>
                  </div>
                  <DocumentList title="Agreements" items={agreements} />
                  <DocumentList title="Documents" items={documents} />
                </TabsContent>

                <TabsContent value="finance" className="space-y-4">
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={financialForm.amount} onChange={(event) => setFinancialForm((current) => ({ ...current, amount: event.target.value }))} type="number" placeholder="Amount" />
                      <Input value={financialForm.currency} onChange={(event) => setFinancialForm((current) => ({ ...current, currency: event.target.value }))} placeholder="Currency" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={financialForm.type} onChange={(event) => setFinancialForm((current) => ({ ...current, type: event.target.value }))} placeholder="Type" />
                      <Select value={financialForm.status} onValueChange={(value) => setFinancialForm((current) => ({ ...current, status: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pledged">Pledged</SelectItem>
                          <SelectItem value="invoiced">Invoiced</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea value={financialForm.notes} onChange={(event) => setFinancialForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Contribution notes" rows={3} />
                    <Button className="w-full" onClick={() => financialMutation.mutate()} disabled={!financialForm.amount || financialMutation.isPending}>
                      Track Contribution
                    </Button>
                  </div>
                  <ContributionList items={financialRecords} />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select a partner profile to view CRM activity, documents, renewals, and contribution history.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TextField({ control, name, label, type = "text", placeholder }: any) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input {...field} value={field.value || ""} type={type} placeholder={placeholder} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}

function TextAreaField({ control, name, label, rows = 4 }: any) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Textarea {...field} value={field.value || ""} rows={rows} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}

function JsonField({ control, name, label }: any) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Textarea {...field} value={field.value || ""} rows={7} className="font-mono text-xs" spellCheck={false} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}

function SelectField({ control, name, label, options }: any) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select value={field.value || options[0]} onValueChange={field.onChange}>
          <FormControl>
            <SelectTrigger><SelectValue /></SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )} />
  );
}

function CheckboxField({ control, name, label, description }: any) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem className="flex min-h-28 flex-row items-start gap-3 rounded-lg border p-4">
        <FormControl>
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border/70 text-primary focus:ring-primary"
            checked={Boolean(field.value)}
            onChange={(event) => field.onChange(event.target.checked)}
          />
        </FormControl>
        <div className="space-y-1">
          <FormLabel>{label}</FormLabel>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </FormItem>
    )} />
  );
}

function Kpi({ title, value, icon, tone = "primary" }: { title: string; value: number | string; icon: React.ReactNode; tone?: "primary" | "success" | "warning" | "info" }) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  }[tone];

  return (
    <Card>
      <CardContent className="p-5">
        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>{icon}</div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

function PartnerSummary({ partner, reminders, agreements }: { partner: PartnerRecord; reminders: OperationalRecord[]; agreements: OperationalRecord[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg border p-3">
        {partner.logo || partner.logoUrl ? (
          <img src={getMediaPreviewUrl(partner.logo || partner.logoUrl)} alt="" className="h-12 w-12 rounded-lg border bg-card object-contain p-1" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{partner.name}</p>
          <p className="truncate text-xs text-muted-foreground">{partner.partnershipLevel || partner.partnershipType} - {partner.sponsorshipTier || "No tier"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniInfo icon={<Mail className="h-4 w-4" />} label="Email" value={partner.contactEmail || "Pending"} />
        <MiniInfo icon={<Phone className="h-4 w-4" />} label="Phone" value={partner.contactPhone || "Pending"} />
        <MiniInfo icon={<Landmark className="h-4 w-4" />} label="Country" value={partner.country || partner.region || "Global"} />
        <MiniInfo icon={<CalendarClock className="h-4 w-4" />} label="Reminders" value={String(reminders.length)} />
      </div>

      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Agreement coverage</p>
        <p className="text-2xl font-bold text-foreground">{agreements.length}</p>
        <p className="text-xs text-muted-foreground">Tracked contracts, MOUs, sponsorship agreements, and renewals</p>
      </div>
    </div>
  );
}

function MiniInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-2 text-primary">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function TierBreakdown({ byTier }: { byTier: Record<string, number> }) {
  const entries = Object.entries(byTier).sort((left, right) => right[1] - left[1]).slice(0, 5);
  if (!entries.length) return null;
  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <div className="rounded-lg border p-3">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Users className="h-4 w-4 text-primary" />
        Tier distribution
      </p>
      <div className="space-y-2">
        {entries.map(([tier, value]) => (
          <div key={tier}>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{tier}</span>
              <span>{value}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(8, Math.round((value / max) * 100))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Timeline({ items, empty }: { items: OperationalRecord[]; empty: string }) {
  if (!items.length) return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</div>;

  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item, index) => (
        <div key={item.id || index} className="rounded-lg border p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{item.subject || item.title || item.type || "Activity"}</p>
            <Badge variant="outline">{item.type || "note"}</Badge>
          </div>
          {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
          <p className="mt-2 text-[11px] text-muted-foreground">{formatDate(item.dueAt || item.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

function DocumentList({ title, items }: { title: string; items: OperationalRecord[] }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileText className="h-4 w-4 text-primary" />
        {title}
      </p>
      {items.length ? (
        <div className="space-y-2">
          {items.slice(0, 5).map((item, index) => (
            <div key={item.id || index} className="rounded-md bg-muted/30 p-2">
              <p className="truncate text-sm font-medium">{item.title || item.type || "Document"}</p>
              <p className="text-xs text-muted-foreground">v{item.version || 1} - {item.accessLevel || "admin"} - expires {formatDate(item.expiresAt)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No {title.toLowerCase()} registered yet.</p>
      )}
    </div>
  );
}

function ContributionList({ items }: { items: OperationalRecord[] }) {
  if (!items.length) return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No sponsorship or contribution records yet.</div>;

  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item, index) => (
        <div key={item.id || index} className="rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">{formatCurrency(Number(item.amount || 0), item.currency || "MWK")}</p>
            <Badge variant="outline">{item.status || "tracked"}</Badge>
          </div>
          <p className="text-xs capitalize text-muted-foreground">{item.type || "contribution"}</p>
          {item.notes && <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function partnerToFormValues(partner: PartnerRecord): PartnerFormValues {
  return {
    ...defaultPartnerValues(),
    name: partner.name ?? "",
    description: partner.description ?? "",
    partnershipType: partner.partnershipType ?? "Strategic Partner",
    logo: partner.logo ?? partner.logoUrl ?? "",
    coverImage: partner.coverImage ?? "",
    website: partner.website ?? "",
    contactName: partner.contactName ?? "",
    contactEmail: partner.contactEmail ?? "",
    contactPhone: partner.contactPhone ?? "",
    address: partner.address ?? "",
    country: partner.country ?? "Global",
    region: partner.region ?? "Global",
    industryCategory: partner.industryCategory ?? "",
    partnershipLevel: partner.partnershipLevel ?? "Strategic",
    sponsorshipTier: partner.sponsorshipTier ?? "None",
    status: partner.status ?? (partner.isActive ? "active" : "inactive"),
    videoUrl: partner.videoUrl ?? "",
    videoTitle: partner.videoTitle ?? "",
    videoDescription: partner.videoDescription ?? "",
    notes: partner.notes ?? "",
    internalComments: partner.internalComments ?? "",
    socialLinksText: stringifyJson(partner.socialLinks, "{}"),
    documentsText: stringifyJson(partner.documents, "[]"),
    agreementsText: stringifyJson(partner.agreements, "[]"),
    linkedEventsText: stringifyJson(partner.linkedEvents, "[]"),
    linkedSponsorshipsText: stringifyJson(partner.linkedSponsorships, "[]"),
    linkedOpportunitiesText: stringifyJson(partner.linkedOpportunities, "[]"),
    partnershipHistoryText: stringifyJson(partner.partnershipHistory, "[]"),
    isFeatured: Boolean(partner.isFeatured),
    isActive: partner.isActive !== false,
    isPremium: Boolean(partner.isPremium),
    paymentStatus: partner.paymentStatus ?? "unpaid",
  };
}

function buildPartnerPayload(values: PartnerFormValues) {
  return {
    name: values.name,
    description: values.description,
    partnershipType: values.partnershipType,
    logo: values.logo || "",
    coverImage: values.coverImage || "",
    website: values.website || "",
    contactName: values.contactName || "",
    contactEmail: values.contactEmail || "",
    contactPhone: values.contactPhone || "",
    address: values.address || "",
    country: values.country || values.region || "Global",
    region: values.region || values.country || "Global",
    industryCategory: values.industryCategory || values.partnershipType,
    partnershipLevel: values.partnershipLevel || "",
    sponsorshipTier: values.sponsorshipTier || "",
    status: values.status || (values.isActive ? "active" : "inactive"),
    socialLinks: parseJsonField(values.socialLinksText, "Social links", {}),
    documents: parseJsonField(values.documentsText, "Documents", []),
    agreements: parseJsonField(values.agreementsText, "Agreements", []),
    notes: values.notes || "",
    internalComments: values.internalComments || "",
    linkedEvents: parseJsonField(values.linkedEventsText, "Linked events", []),
    linkedSponsorships: parseJsonField(values.linkedSponsorshipsText, "Linked sponsorships", []),
    linkedOpportunities: parseJsonField(values.linkedOpportunitiesText, "Linked opportunities", []),
    partnershipHistory: parseJsonField(values.partnershipHistoryText, "Partnership history", []),
    videoUrl: values.videoUrl || "",
    videoTitle: values.videoTitle || "",
    videoDescription: values.videoDescription || "",
    isFeatured: values.isFeatured,
    isPremium: values.isPremium,
    paymentStatus: values.paymentStatus || "unpaid",
    isActive: values.isActive && values.status !== "inactive",
  };
}

function parseJsonField<T>(value: string | undefined, label: string, fallback: T): T {
  const trimmed = (value || "").trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function stringifyJson(value: unknown, fallback: string) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "active") return "bg-success/15 text-success";
  if (normalized === "renewal_due") return "bg-warning/15 text-warning";
  if (normalized === "prospect") return "bg-info/15 text-info";
  if (normalized === "inactive") return "bg-muted text-muted-foreground";
  return "bg-primary/10 text-primary";
}

function formatCurrency(value: number, currency = "MWK") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "not set";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function showMutationError(error: unknown, toast: ReturnType<typeof useToast>["toast"], title: string) {
  toast({
    title,
    description: error instanceof Error ? error.message : "Please review the submitted details.",
    variant: "destructive",
  });
}
