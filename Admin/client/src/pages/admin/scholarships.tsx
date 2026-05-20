import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch, queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScholarshipSchema } from "@shared/schema";
import { z } from "zod";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react";
import type { Scholarship } from "@shared/schema";
import { useCreateAction } from "@/hooks/use-create-action";
import { getInitialUrlSearchParam } from "@/hooks/use-url-search-param";
import MediaAssetPicker from "@/components/admin/MediaAssetPicker";
import { getMediaPreviewUrl } from "@/lib/media-assets";
import RichTextEditor from "@/components/admin/RichTextEditor";

const formSchema = insertScholarshipSchema;

export default function ScholarshipsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(() => getInitialUrlSearchParam());
  const [status, setStatus] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const { toast } = useToast();

  useCreateAction(() => { setEditingScholarship(null); setIsDialogOpen(true); });

  const { data, isLoading } = useQuery<{ data: Scholarship[], total: number }>({
    queryKey: ["/api/admin/scholarships", page, limit, search, status],
    queryFn: async () => {
      const response = await authFetch(`/api/admin/scholarships?page=${page}&limit=${limit}&search=${search}&status=${status}`);
      if (!response.ok) throw new Error("Failed to fetch scholarships");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      apiRequest("POST", "/api/admin/scholarships", {
        ...data,
        deadline: new Date(data.deadline).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scholarships"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Scholarship created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create scholarship", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<z.infer<typeof formSchema>> }) =>
      apiRequest("PUT", `/api/admin/scholarships/${id}`, {
        ...data,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scholarships"] });
      setIsDialogOpen(false);
      setEditingScholarship(null);
      form.reset();
      toast({ title: "Success", description: "Scholarship updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update scholarship", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/scholarships/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scholarships"] });
      toast({ title: "Success", description: "Scholarship deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete scholarship", variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      institution: "",
      description: "",
      eligibility: "",
      deadline: new Date().toISOString().split("T")[0] as any,
      category: "",
      amount: "",
      status: "draft",
      region: "Global",
      isPremium: false,
      paymentStatus: "unpaid",
      featuredImage: "",
    },
  });

  const handleEdit = (scholarship: Scholarship) => {
    setEditingScholarship(scholarship);
    form.reset({
      title: scholarship.title,
      institution: scholarship.institution,
      description: scholarship.description,
      eligibility: scholarship.eligibility || "",
      deadline: new Date(scholarship.deadline).toISOString().split("T")[0] as any,
      category: scholarship.category,
      amount: scholarship.amount || "",
      status: scholarship.status,
      region: scholarship.region || "Global",
      isPremium: scholarship.isPremium || false,
      paymentStatus: scholarship.paymentStatus || "unpaid",
      featuredImage: scholarship.featuredImage || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this scholarship?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingScholarship) {
      updateMutation.mutate({ id: editingScholarship.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      key: "title",
      header: "Scholarship",
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          {row.featuredImage ? (
            <img src={getMediaPreviewUrl(row.featuredImage)} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0 border" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-primary/15 to-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{row.institution}</p>
          </div>
        </div>
      )
    },
    { key: "category", header: "Category", render: (v: string) => <span className="text-xs text-muted-foreground capitalize">{v}</span> },
    {
      key: "deadline",
      header: "Deadline",
      render: (value: string) => {
        const date = new Date(value);
        const now = new Date();
        const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isUrgent = daysLeft <= 14;
        const isPast = daysLeft < 0;
        return (
          <div>
            <p className={`text-xs font-medium ${isPast ? "text-destructive" : isUrgent ? "text-warning" : "text-foreground/80"}`}>
              {date.toLocaleDateString()}
            </p>
            {!isPast && <p className={`text-xs ${isUrgent ? "text-warning" : "text-muted-foreground/70"}`}>{daysLeft}d left</p>}
            {isPast && <p className="text-xs text-destructive/70">Expired</p>}
          </div>
        );
      }
    },
    { key: "amount", header: "Amount", render: (v: string) => <span className="text-sm font-medium text-success">{v || "—"}</span> },
    {
      key: "status",
      header: "Status",
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${value === "published" ? "bg-success/15 text-success" : value === "draft" ? "bg-muted text-muted-foreground" : "bg-warning/15 text-warning"}`}>
          {value}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (_: unknown, row: Scholarship) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary" data-testid={`button-edit-${row.id}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive" data-testid={`button-delete-${row.id}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SEO 
        title="Scholarships Management" 
        description="Manage and publish scholarship opportunities for students in Malawi and beyond."
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="page-title">
            <GraduationCap className="h-8 w-8" />
            Scholarships Management
          </h1>
          <p className="text-muted-foreground">Manage scholarship opportunities</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingScholarship(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add" className="shadow-lg hover:shadow-primary/20 transition-all duration-300">
              <Plus className="h-4 w-4 mr-2" />
              Add Scholarship
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <DialogHeader>
              <DialogTitle>{editingScholarship ? "Edit Scholarship" : "Add Scholarship"}</DialogTitle>
              <DialogDescription>Manage scholarship listings and details</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 form-section">
                <FormField
                  control={form.control}
                  name="featuredImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured Image</FormLabel>
                      <MediaAssetPicker
                        moduleName="scholarships"
                        value={field.value}
                        onChange={field.onChange}
                        label="Scholarship Featured Image"
                        description="Required for public scholarship cards, detail heroes, applications, and related listings."
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="institution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-institution" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-category" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., $10,000" data-testid="input-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value instanceof Date ? field.value.toISOString().split("T")[0] : (field.value || "")} data-testid="input-deadline" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          <FormLabel>Premium Visibility</FormLabel>
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
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value}
                          onChange={field.onChange}
                          minHeight={420}
                          placeholder="Write the full scholarship overview, benefits, application notes, and program context..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eligibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eligibility</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value || ""}
                          onChange={field.onChange}
                          minHeight={300}
                          placeholder="Add eligibility rules, required documents, and selection criteria..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit" className="shadow-md">
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingScholarship ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={(data as any)?.data || []}
        loading={isLoading}
        searchable
        pagination={{
          page,
          limit,
          total: (data as any)?.total || 0,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
        searchPlaceholder="Search scholarships by title, institution, eligibility, category, or region..."
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />
    </div>
  );
}




