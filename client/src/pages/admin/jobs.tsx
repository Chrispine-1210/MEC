import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch, queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobOpportunitySchema } from "@shared/schema";
import { z } from "zod";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Briefcase, Upload } from "lucide-react";
import type { JobOpportunity } from "@shared/schema";
import { Editor } from "@tinymce/tinymce-react";
import { useCreateAction } from "@/hooks/use-create-action";

const formSchema = insertJobOpportunitySchema;

export default function JobsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobOpportunity | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useCreateAction(() => { setEditingJob(null); setIsDialogOpen(true); });

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
      form.setValue("featuredImage", data.url);
      toast({ title: "Success", description: "Image uploaded successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const { data, isLoading } = useQuery<{ data: JobOpportunity[], total: number }>({
    queryKey: ["/api/admin/jobs", page, limit, search, status],
    queryFn: async () => {
      const response = await authFetch(`/api/admin/jobs?page=${page}&limit=${limit}&search=${search}&status=${status}`);
      if (!response.ok) throw new Error("Failed to fetch jobs");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      apiRequest("POST", "/api/admin/jobs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Job created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<z.infer<typeof formSchema>> }) =>
      apiRequest("PUT", `/api/admin/jobs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      setIsDialogOpen(false);
      setEditingJob(null);
      form.reset();
      toast({ title: "Success", description: "Job updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/jobs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      toast({ title: "Success", description: "Job deleted successfully" });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      company: "",
      location: "",
      jobType: "full-time",
      salaryRange: "",
      benefits: "",
      applicationUrl: "",
      status: "draft",
      region: "Global",
      isPremium: false,
      price: "",
      paymentStatus: "unpaid",
      featuredImage: "",
    },
  });

  const handleEdit = (job: JobOpportunity) => {
    setEditingJob(job);
    form.reset({
      title: job.title,
      description: job.description,
      company: job.company,
      location: job.location,
      jobType: job.jobType,
      salaryRange: job.salaryRange || "",
      benefits: job.benefits || "",
      applicationUrl: job.applicationUrl || "",
      status: job.status,
      region: job.region || "Global",
      isPremium: job.isPremium || false,
      price: job.price || "",
      paymentStatus: job.paymentStatus || "unpaid",
      featuredImage: job.featuredImage || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this job?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      key: "title",
      header: "Position",
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          {row.featuredImage ? (
            <img src={row.featuredImage} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0 border" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-warning/20 to-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-5 w-5 text-warning" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{row.company}</p>
          </div>
        </div>
      )
    },
    { key: "location", header: "Location", render: (v: string) => <span className="text-xs text-muted-foreground">{v || "—"}</span> },
    { key: "jobType", header: "Type", render: (v: string) => <span className="text-xs capitalize bg-primary/10 text-primary px-2 py-0.5 rounded">{v || "—"}</span> },
    { key: "salaryRange", header: "Salary", render: (v: string) => <span className="text-sm font-medium text-success">{v || "—"}</span> },
    {
      key: "isPremium",
      header: "Listing",
      render: (value: boolean) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${value ? "bg-info/15 text-info" : "bg-muted text-muted-foreground"}`}>
          {value ? "✦ Premium" : "Standard"}
        </span>
      ),
    },
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
      render: (_: unknown, row: JobOpportunity) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary" data-testid={`button-edit-${row.id}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive" data-testid={`button-delete-${row.id}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SEO 
        title="Jobs Management" 
        description="Manage job listings and recruitment opportunities on the Mtendere Platform."
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="page-title">
            <Briefcase className="h-8 w-8" />
            Jobs Management
          </h1>
          <div className="flex gap-4 mt-1">
            <p className="text-sm text-muted-foreground">Total: <span className="font-semibold">{(data as any)?.total || 0}</span></p>
            <p className="text-sm text-warning font-medium">Pending: 5</p>
            <p className="text-sm text-info font-medium">Premium: {((data as any)?.data || []).filter((j: any) => j.isPremium).length}</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingJob(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add" className="shadow-lg hover:shadow-primary/20 transition-all duration-300">
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <DialogHeader>
              <DialogTitle>{editingJob ? "Edit Job" : "Add Job"}</DialogTitle>
              <DialogDescription>Manage job listing details</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 form-section">
                <FormField
                  control={form.control}
                  name="featuredImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Logo / Featured Image</FormLabel>
                      <div className="flex flex-col gap-4">
                        {field.value && (
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                            <img src={field.value} alt="Preview" className="w-full h-full object-cover" />
                            <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => field.onChange("")}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <Input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="job-image-upload" disabled={isUploading} />
                          <Button type="button" variant="outline" className="w-full h-24 border-dashed" onClick={() => (document.getElementById("job-image-upload") as HTMLInputElement)?.click()} disabled={isUploading}>
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-6 w-6 text-muted-foreground/70" />
                              <span className="text-sm text-muted-foreground">{isUploading ? "Uploading..." : "Click to upload image"}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="jobType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-jobType">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="internship">Internship</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salaryRange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary Range</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., $50k-$70k" data-testid="input-salaryRange" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                            height: 400,
                            menubar: true,
                            plugins: [
                              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                              'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                            ],
                            toolbar: 'undo redo | blocks | ' +
                              'bold italic forecolor | alignleft aligncenter ' +
                              'alignright alignjustify | bullist numlist outdent indent | ' +
                              'removeformat | help',
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
                <FormField
                  control={form.control}
                  name="benefits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Benefits</FormLabel>
                      <FormControl>
                        <Editor
                          apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                          init={{
                            height: 250,
                            menubar: false,
                            plugins: ['lists', 'link'],
                            toolbar: 'undo redo | bold italic | bullist numlist',
                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                          }}
                          value={field.value || ""}
                          onEditorChange={(content: string) => field.onChange(content)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applicationUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application URL</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="url" data-testid="input-applicationUrl" />
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
                        <FormLabel>Region (Scaling)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="e.g., East Africa, SADC" 
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
                          <FormLabel>Premium Listing</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                {form.watch("isPremium") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-primary/10 rounded-lg">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Listing Price</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ""} 
                              placeholder="e.g., $50" 
                              data-testid="input-price" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "unpaid"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unpaid">Unpaid</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
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
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || isUploading} data-testid="button-submit">
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingJob ? "Update" : "Create"}
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
        onSearch={setSearch}
      />
    </div>
  );
}




