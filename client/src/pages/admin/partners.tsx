import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch, queryClient, apiRequest } from "@/lib/queryClient";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPartnerInstitutionSchema, type PartnerInstitution, type InsertPartnerInstitution } from "@shared/schema";
import { Plus, Building2, Pencil, Trash2, Upload } from "lucide-react";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Editor } from "@tinymce/tinymce-react";
import { useCreateAction } from "@/hooks/use-create-action";

const formSchema = insertPartnerInstitutionSchema;

export default function PartnersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerInstitution | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useCreateAction(() => { setEditingPartner(null); setIsDialogOpen(true); });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await authFetch("/api/admin/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      form.setValue("logo", data.url);
      toast({ title: "Success", description: "Logo uploaded successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload logo", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/partners", page, limit, search],
    queryFn: async () => {
      const response = await authFetch(`/api/admin/partners?page=${page}&limit=${limit}&search=${search}`);
      if (!response.ok) throw new Error("Failed to fetch partners");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      apiRequest("POST", "/api/admin/partners", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Partner created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<z.infer<typeof formSchema>> }) =>
      apiRequest("PUT", `/api/admin/partners/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      setIsDialogOpen(false);
      setEditingPartner(null);
      form.reset();
      toast({ title: "Success", description: "Partner updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/partners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      toast({ title: "Success", description: "Partner deleted successfully" });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      partnershipType: "",
      logo: "",
      website: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      isActive: true,
      region: "Global",
      isPremium: false,
      paymentStatus: "unpaid",
    },
  });

  const handleEdit = (partner: PartnerInstitution) => {
    setEditingPartner(partner);
    form.reset({
      name: partner.name,
      description: partner.description,
      partnershipType: partner.partnershipType,
      logo: partner.logo || "",
      website: partner.website || "",
      contactEmail: partner.contactEmail || "",
      contactPhone: partner.contactPhone || "",
      address: partner.address || "",
      isActive: partner.isActive,
      region: partner.region || "Global",
      isPremium: partner.isPremium || false,
      paymentStatus: partner.paymentStatus || "unpaid",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this partner?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Partner",
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          {row.logo ? (
            <img src={row.logo} alt="" className="w-10 h-10 object-contain rounded-lg flex-shrink-0 border bg-card p-0.5" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-accent" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">{value}</p>
            {row.website && <a href={row.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block max-w-36">{row.website}</a>}
          </div>
        </div>
      )
    },
    { key: "partnershipType", header: "Type", render: (v: string) => <span className="text-xs capitalize bg-accent/15 text-accent px-2 py-0.5 rounded">{v}</span> },
    { key: "region", header: "Region", render: (v: string) => <span className="text-xs text-muted-foreground">{v || "-"}</span> },
    {
      key: "isPremium",
      header: "Listing",
      render: (value: boolean) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${value ? "bg-info/15 text-info" : "bg-muted text-muted-foreground"}`}>
          {value ? "Premium" : "Standard"}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${value ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
          {value ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_: unknown, row: PartnerInstitution) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} data-testid={`button-edit-${row.id}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} data-testid={`button-delete-${row.id}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SEO 
        title="Partners Management" 
        description="Manage educational and corporate partners of Mtendere Platform."
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="page-title">
            <Building2 className="h-8 w-8 text-primary" />
            Partners Management
          </h1>
          <p className="text-muted-foreground">Manage partner institutions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingPartner(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add" className="shadow-lg hover:shadow-primary/20 transition-all duration-300">
              <Plus className="h-4 w-4 mr-2" />
              Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <DialogHeader>
              <DialogTitle>{editingPartner ? "Edit Partner" : "Add Partner"}</DialogTitle>
              <DialogDescription>Manage partner organization details and visibility</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 form-section">
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partner Logo</FormLabel>
                      <div className="flex flex-col gap-4">
                        {field.value && (
                          <div className="relative w-32 h-32 rounded-lg overflow-hidden border bg-card p-2 flex items-center justify-center">
                            <img src={field.value} alt="Preview" className="max-w-full max-h-full object-contain" />
                            <Button type="button" variant="destructive" size="sm" className="absolute top-1 right-1" onClick={() => field.onChange("")}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <Input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="partner-logo-upload" disabled={isUploading} />
                          <Button type="button" variant="outline" className="w-full h-24 border-dashed" onClick={() => (document.getElementById("partner-logo-upload") as HTMLInputElement)?.click()} disabled={isUploading}>
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-6 w-6 text-muted-foreground/70" />
                              <span className="text-sm text-muted-foreground">{isUploading ? "Uploading..." : "Click to upload logo"}</span>
                            </div>
                          </Button>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Editor
                          apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                          init={{
                            height: 350,
                            menubar: true,
                            plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'preview', 'wordcount'],
                            toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | bullist numlist | removeformat',
                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                          }}
                          value={field.value}
                          onEditorChange={(content: string) => field.onChange(content)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="partnershipType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Partnership Type</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Academic, Corporate" data-testid="input-partnership-type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} type="url" data-testid="input-website" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} type="email" data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ""} 
                            placeholder="Regional Scaling" 
                            data-testid="input-region" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isPremium"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border/70 text-primary focus:ring-primary"
                            checked={field.value || false}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Paid Placement</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                {form.watch("isPremium") && (
                  <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "unpaid"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unpaid">Unpaid</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    setEditingPartner(null);
                    form.reset();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || isUploading} data-testid="button-submit" className="shadow-md">
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={(data as any)?.partners || []}
        loading={isLoading}
        searchable
        pagination={{
          page,
          limit,
          total: (data as any)?.total || 0,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
        onSearch={setSearch}
      />
    </div>
  );
}




