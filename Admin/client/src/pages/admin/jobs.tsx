import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SEO } from "@/components/SEO";
import DataTable from "@/components/admin/DataTable";
import MediaAssetPicker from "@/components/admin/MediaAssetPicker";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCreateAction } from "@/hooks/use-create-action";
import { getInitialUrlSearchParam } from "@/hooks/use-url-search-param";
import { apiRequest, authFetch, queryClient } from "@/lib/queryClient";
import { getMediaPreviewUrl } from "@/lib/media-assets";
import {
  Archive,
  BarChart3,
  Briefcase,
  CalendarClock,
  Copy,
  Download,
  FileQuestion,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

const employmentTypes = ["Full-Time", "Part-Time", "Contract", "Internship", "Volunteer", "Graduate Program"];
const workModes = ["Onsite", "Hybrid", "Remote"];
const pipelineStages = ["Applied", "Under Review", "Shortlisted", "Interview", "Assessment", "Offer", "Hired", "Rejected"];

const formSchema = z.object({
  title: z.string().min(2, "Job title is required"),
  category: z.string().optional().default(""),
  department: z.string().optional().default(""),
  description: z.string().min(10, "Job overview is required"),
  company: z.string().min(2, "Company name is required"),
  companyLogo: z.string().optional().default(""),
  companyProfile: z.string().optional().default(""),
  companyOverview: z.string().optional().default(""),
  aboutTeam: z.string().optional().default(""),
  location: z.string().min(2, "Location is required"),
  employmentType: z.string().default("Full-Time"),
  workMode: z.string().default("Onsite"),
  salaryRange: z.string().optional().default(""),
  salaryMin: z.string().optional().default(""),
  salaryMax: z.string().optional().default(""),
  deadline: z.string().optional().default(""),
  numberOfPositions: z.string().optional().default("1"),
  experienceLevel: z.string().optional().default(""),
  educationRequirements: z.string().optional().default(""),
  requiredSkills: z.string().optional().default(""),
  preferredSkills: z.string().optional().default(""),
  responsibilities: z.string().optional().default(""),
  qualifications: z.string().optional().default(""),
  requirements: z.string().optional().default(""),
  benefits: z.string().optional().default(""),
  applicationInstructions: z.string().optional().default(""),
  contactEmail: z.string().optional().default(""),
  contactPhone: z.string().optional().default(""),
  applicationUrl: z.string().optional().default(""),
  featuredImage: z.string().optional().default(""),
  tags: z.string().optional().default(""),
  dynamicQuestionsText: z.string().optional().default(""),
  conditionalRulesText: z.string().optional().default(""),
  assessmentsText: z.string().optional().default(""),
  interviewTasksText: z.string().optional().default(""),
  attachmentsText: z.string().optional().default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  region: z.string().optional().default("Global"),
  isFeatured: z.boolean().optional().default(false),
  isPremium: z.boolean().optional().default(false),
  price: z.string().optional().default(""),
  paymentStatus: z.string().optional().default("unpaid"),
});

type JobFormValues = z.infer<typeof formSchema>;

type AdminJob = {
  id: string;
  title: string;
  category?: string;
  department?: string;
  description: string;
  company: string;
  companyLogo?: string;
  companyProfile?: string;
  companyOverview?: string;
  aboutTeam?: string;
  location: string;
  jobType?: string;
  employmentType?: string;
  workMode?: string;
  salaryRange?: string;
  salaryMin?: string;
  salaryMax?: string;
  deadline?: string | null;
  numberOfPositions?: string;
  experienceLevel?: string;
  educationRequirements?: string[] | string;
  requiredSkills?: string[] | string;
  preferredSkills?: string[] | string;
  responsibilities?: string[] | string;
  qualifications?: string[] | string;
  requirements?: string[] | string;
  benefits?: string[] | string;
  applicationInstructions?: string;
  contactInformation?: Record<string, unknown>;
  applicationUrl?: string;
  featuredImage?: string;
  tags?: string[] | string;
  dynamicQuestions?: Array<Record<string, unknown>>;
  conditionalRules?: Array<Record<string, unknown>>;
  assessments?: Array<Record<string, unknown>>;
  interviewTasks?: Array<Record<string, unknown>>;
  attachments?: Array<Record<string, unknown>>;
  status: "draft" | "published" | "archived" | string;
  region?: string;
  isFeatured?: boolean;
  isPremium?: boolean;
  price?: string;
  paymentStatus?: string;
};

const defaultValues: JobFormValues = {
  title: "",
  category: "",
  department: "",
  description: "",
  company: "",
  companyLogo: "",
  companyProfile: "",
  companyOverview: "",
  aboutTeam: "",
  location: "",
  employmentType: "Full-Time",
  workMode: "Onsite",
  salaryRange: "",
  salaryMin: "",
  salaryMax: "",
  deadline: "",
  numberOfPositions: "1",
  experienceLevel: "",
  educationRequirements: "",
  requiredSkills: "",
  preferredSkills: "",
  responsibilities: "",
  qualifications: "",
  requirements: "",
  benefits: "",
  applicationInstructions: "",
  contactEmail: "",
  contactPhone: "",
  applicationUrl: "",
  featuredImage: "",
  tags: "",
  dynamicQuestionsText: "",
  conditionalRulesText: "",
  assessmentsText: "",
  interviewTasksText: "",
  attachmentsText: "",
  status: "draft",
  region: "Global",
  isFeatured: false,
  isPremium: false,
  price: "",
  paymentStatus: "unpaid",
};

export default function JobsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(() => getInitialUrlSearchParam());
  const [status, setStatus] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<AdminJob | null>(null);
  const { toast } = useToast();

  const form = useForm<JobFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useCreateAction(() => {
    setEditingJob(null);
    form.reset(defaultValues);
    setIsDialogOpen(true);
  });

  const { data, isLoading } = useQuery<{ data: AdminJob[]; total: number }>({
    queryKey: ["/api/admin/jobs", page, limit, search, status],
    queryFn: async () => {
      const response = await authFetch(`/api/admin/jobs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}`);
      if (!response.ok) throw new Error("Failed to fetch jobs");
      return response.json();
    },
  });

  const { data: analytics } = useQuery<Record<string, any>>({
    queryKey: ["/api/admin/jobs/analytics"],
    queryFn: async () => {
      const response = await authFetch("/api/admin/jobs/analytics");
      if (!response.ok) throw new Error("Failed to fetch job analytics");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: JobFormValues) => apiRequest("POST", "/api/admin/jobs", buildPayload(values)),
    onSuccess: () => {
      invalidateJobs();
      setIsDialogOpen(false);
      form.reset(defaultValues);
      toast({ title: "Job created", description: "The listing and application workflow are ready." });
    },
    onError: (error: Error) => toast({ title: "Create failed", description: error.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: JobFormValues }) =>
      apiRequest("PUT", `/api/admin/jobs/${id}`, buildPayload(values)),
    onSuccess: () => {
      invalidateJobs();
      setIsDialogOpen(false);
      setEditingJob(null);
      form.reset(defaultValues);
      toast({ title: "Job updated", description: "Recruitment content has been saved." });
    },
    onError: (error: Error) => toast({ title: "Update failed", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/jobs/${id}`),
    onSuccess: () => {
      invalidateJobs();
      toast({ title: "Job deleted", description: "The listing was removed." });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/jobs/${id}/duplicate`),
    onSuccess: () => {
      invalidateJobs();
      toast({ title: "Job duplicated", description: "A draft copy is ready for editing." });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) =>
      apiRequest("PATCH", `/api/admin/jobs/${id}/status`, { status: nextStatus }),
    onSuccess: invalidateJobs,
  });

  const handleEdit = (job: AdminJob) => {
    setEditingJob(job);
    form.reset(toFormValues(job));
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this job?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (values: JobFormValues) => {
    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const downloadJobs = async () => {
    const response = await authFetch("/api/admin/jobs/export");
    if (!response.ok) {
      toast({ title: "Export failed", description: "Could not download job records.", variant: "destructive" });
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mtendere-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: "title",
      header: "Position",
      sortable: true,
      render: (value: string, row: AdminJob) => (
        <div className="flex items-center gap-3">
          {row.companyLogo || row.featuredImage ? (
            <img
              src={getMediaPreviewUrl(row.companyLogo || row.featuredImage || "")}
              alt=""
              className="h-10 w-10 flex-shrink-0 rounded-lg border object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium leading-tight text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{row.company}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (_: string, row: AdminJob) => (
        <div className="space-y-1">
          <Badge variant="outline">{row.category || "General"}</Badge>
          <p className="text-xs text-muted-foreground">{row.department || "No department"}</p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (_: string, row: AdminJob) => (
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{row.location || "Unspecified"}</p>
          <p>{row.workMode || "Onsite"}</p>
        </div>
      ),
    },
    {
      key: "employmentType",
      header: "Type",
      render: (_: string, row: AdminJob) => (
        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{row.employmentType || row.jobType || "Full-Time"}</span>
      ),
    },
    {
      key: "deadline",
      header: "Deadline",
      render: (value: string) => <span className="text-xs text-muted-foreground">{value ? new Date(value).toLocaleDateString() : "Open"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (value: string) => (
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusStyle(value)}`}>{value}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (_: unknown, row: AdminJob) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(row.id)} className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary" title="Duplicate job">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => statusMutation.mutate({ id: row.id, nextStatus: row.status === "published" ? "archived" : "published" })}
            className="h-8 w-8 p-0 hover:bg-warning/10 hover:text-warning"
            title={row.status === "published" ? "Archive job" : "Publish job"}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SEO title="Recruitment Management" description="Create jobs, dynamic application workflows, and recruitment analytics." />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
            <Briefcase className="h-8 w-8" />
            Jobs Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build public job pages, role-specific forms, assessments, and candidate pipelines.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={status || "all"} onValueChange={(value) => { setStatus(value === "all" ? "" : value); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadJobs}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingJob(null);
                form.reset(defaultValues);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingJob(null); form.reset(defaultValues); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingJob ? "Edit Job" : "Create Job"}</DialogTitle>
                <DialogDescription>
                  Author the listing, public detail page, role-specific application form, and recruitment workflow.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormSection title="Core Listing">
                    <FormField
                      control={form.control}
                      name="featuredImage"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Featured Image</FormLabel>
                          <MediaAssetPicker
                            moduleName="jobs"
                            value={field.value}
                            onChange={field.onChange}
                            label="Job hero image"
                            description="Used on listing cards, detail page hero, related jobs, and social sharing."
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <TextField name="title" label="Job Title" />
                    <TextField name="category" label="Job Category" placeholder="Technology, Marketing, Education" />
                    <TextField name="department" label="Department" placeholder="Scholarships, Admissions, Product" />
                    <TextField name="company" label="Company Name" />
                    <TextField name="companyLogo" label="Company Logo URL" />
                    <TextField name="location" label="Location" />
                    <SelectField name="employmentType" label="Employment Type" options={employmentTypes} />
                    <SelectField name="workMode" label="Work Mode" options={workModes} />
                    <TextField name="numberOfPositions" label="Number of Positions" />
                    <TextField name="experienceLevel" label="Experience Level" placeholder="Entry, Mid, Senior, Graduate" />
                    <TextField name="salaryRange" label="Salary Range" placeholder="MWK 1,200,000 - 1,800,000" />
                    <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
                      <TextField name="salaryMin" label="Salary Minimum" />
                      <TextField name="salaryMax" label="Salary Maximum" />
                      <TextField name="deadline" label="Application Deadline" type="date" />
                    </div>
                  </FormSection>

                  <FormSection title="Detail Page Content">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Overview</FormLabel>
                          <FormControl>
                            <RichTextEditor value={field.value} onChange={field.onChange} minHeight={280} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <TextareaField name="responsibilities" label="Responsibilities" placeholder="One responsibility per line" />
                    <TextareaField name="requirements" label="Requirements" placeholder="One requirement per line" />
                    <TextareaField name="qualifications" label="Qualifications" placeholder="One qualification per line" />
                    <TextareaField name="educationRequirements" label="Education Requirements" placeholder="One education requirement per line" />
                    <TextareaField name="requiredSkills" label="Required Skills" placeholder="One skill per line" />
                    <TextareaField name="preferredSkills" label="Preferred Skills" placeholder="One preferred skill per line" />
                    <TextareaField name="benefits" label="Benefits" placeholder="One benefit per line" />
                    <TextareaField name="companyProfile" label="Company Profile" />
                    <TextareaField name="companyOverview" label="Company Overview" />
                    <TextareaField name="aboutTeam" label="About Team" />
                    <TextareaField name="applicationInstructions" label="Application Instructions" />
                    <TextField name="applicationUrl" label="External Application URL" />
                    <TextField name="contactEmail" label="Recruitment Email" />
                    <TextField name="contactPhone" label="Recruitment Phone" />
                    <TextField name="tags" label="Tags" placeholder="Separate with commas or new lines" />
                  </FormSection>

                  <FormSection title="Form Builder and Assessments">
                    <TextareaField
                      name="dynamicQuestionsText"
                      label="Dynamic Questions"
                      placeholder={"Github Profile | url | required\nPortfolio | url\nProgramming Languages | textarea | required"}
                    />
                    <TextareaField
                      name="conditionalRulesText"
                      label="Conditional Logic"
                      placeholder={"IF Role = Developer SHOW Github Field\nIF Role = Designer SHOW Behance Field"}
                    />
                    <TextareaField
                      name="assessmentsText"
                      label="Assessments"
                      placeholder="Technical Assessment | Complete a short coding exercise"
                    />
                    <TextareaField
                      name="interviewTasksText"
                      label="Interview Tasks"
                      placeholder="Presentation Task | Prepare a 10-minute case presentation"
                    />
                    <TextareaField
                      name="attachmentsText"
                      label="Attachments/Documents"
                      placeholder="Role Brief | https://example.com/brief.pdf"
                    />
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                      <p className="text-sm font-medium text-foreground">Default Pipeline</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pipelineStages.map((stage) => (
                          <Badge key={stage} variant="outline">{stage}</Badge>
                        ))}
                      </div>
                    </div>
                  </FormSection>

                  <FormSection title="Publishing and Commercial Settings">
                    <SelectField name="status" label="Status" options={["draft", "published", "archived"]} />
                    <TextField name="region" label="Region" />
                    <CheckboxField name="isFeatured" label="Featured Job" description="Highlight this listing on the public jobs portal." />
                    <CheckboxField name="isPremium" label="Premium Listing" description="Track paid or promoted recruitment opportunities." />
                    {form.watch("isPremium") && (
                      <>
                        <TextField name="price" label="Listing Price" />
                        <SelectField name="paymentStatus" label="Payment Status" options={["unpaid", "paid", "refunded"]} />
                      </>
                    )}
                  </FormSection>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingJob ? "Update Job" : "Create Job"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Total Jobs" value={analytics?.totalJobs ?? data?.total ?? 0} icon={Briefcase} />
        <Metric title="Published" value={analytics?.publishedJobs ?? 0} icon={Sparkles} tone="success" />
        <Metric title="Applicants" value={analytics?.applications ?? 0} icon={Users} />
        <Metric title="Conversion" value={`${analytics?.conversionRate ?? 0}%`} icon={BarChart3} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          searchable
          pagination={{ page, limit, total: data?.total || 0, onPageChange: setPage, onLimitChange: setLimit }}
          searchPlaceholder="Search jobs by title, company, category, department, location, skills, or requirements..."
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />

        <Card>
          <CardContent className="space-y-5 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Recruitment Snapshot</p>
              <p className="mt-1 text-xs text-muted-foreground">Live analytics by status, stage, source, and geography.</p>
            </div>
            <MiniBreakdown title="Applications by Stage" data={analytics?.byStage} icon={CalendarClock} />
            <MiniBreakdown title="Jobs by Location" data={analytics?.byLocation} icon={MapPin} />
            <MiniBreakdown title="Source Tracking" data={analytics?.sourceTracking} icon={FileQuestion} />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  function invalidateJobs() {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs/analytics"] });
  }

  function TextField({
    name,
    label,
    placeholder,
    type = "text",
  }: {
    name: keyof JobFormValues;
    label: string;
    placeholder?: string;
    type?: string;
  }) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input {...field} type={type} value={String(field.value ?? "")} placeholder={placeholder} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  function TextareaField({ name, label, placeholder }: { name: keyof JobFormValues; label: string; placeholder?: string }) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Textarea {...field} value={String(field.value ?? "")} placeholder={placeholder} rows={5} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  function SelectField({ name, label, options }: { name: keyof JobFormValues; label: string; options: string[] }) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select onValueChange={field.onChange} value={String(field.value ?? "")}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  function CheckboxField({
    name,
    label,
    description,
  }: {
    name: "isFeatured" | "isPremium";
    label: string;
    description: string;
  }) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className="rounded-lg border border-border/60 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border/70 text-primary focus:ring-primary"
                checked={Boolean(field.value)}
                onChange={(event) => field.onChange(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
              </span>
            </label>
          </FormItem>
        )}
      />
    );
  }
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border/60 p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning"
        : "bg-primary/10 text-primary";

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniBreakdown({ title, data, icon: Icon }: { title: string; data?: Record<string, number>; icon: LucideIcon }) {
  const entries = Object.entries(data ?? {}).slice(0, 5);
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
      {entries.length ? (
        <div className="space-y-2">
          {entries.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 text-xs">
              <span className="truncate text-muted-foreground">{label}</span>
              <span className="font-semibold text-foreground">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No data yet.</p>
      )}
    </div>
  );
}

function buildPayload(values: JobFormValues) {
  return {
    ...values,
    jobType: values.employmentType,
    employmentType: values.employmentType,
    isRemote: values.workMode === "Remote",
    companyLogo: values.companyLogo || values.featuredImage,
    contactInformation: {
      email: values.contactEmail,
      phone: values.contactPhone,
    },
    dynamicQuestions: textToQuestions(values.dynamicQuestionsText),
    applicationForm: textToQuestions(values.dynamicQuestionsText),
    conditionalRules: textToRecords(values.conditionalRulesText, "rule"),
    assessments: textToRecords(values.assessmentsText, "assessment"),
    interviewTasks: textToRecords(values.interviewTasksText, "task"),
    attachments: textToAttachmentRecords(values.attachmentsText),
    pipelineStages: pipelineStages.map((stage) => ({ id: slugify(stage), label: stage })),
  };
}

function toFormValues(job: AdminJob): JobFormValues {
  const contact = job.contactInformation ?? {};
  return {
    ...defaultValues,
    title: job.title ?? "",
    category: job.category ?? "",
    department: job.department ?? "",
    description: job.description ?? "",
    company: job.company ?? "",
    companyLogo: job.companyLogo ?? "",
    companyProfile: job.companyProfile ?? "",
    companyOverview: job.companyOverview ?? "",
    aboutTeam: job.aboutTeam ?? "",
    location: job.location ?? "",
    employmentType: job.employmentType ?? job.jobType ?? "Full-Time",
    workMode: job.workMode ?? "Onsite",
    salaryRange: job.salaryRange ?? "",
    salaryMin: job.salaryMin ?? "",
    salaryMax: job.salaryMax ?? "",
    deadline: formatDateInput(job.deadline),
    numberOfPositions: job.numberOfPositions ?? "1",
    experienceLevel: job.experienceLevel ?? "",
    educationRequirements: listText(job.educationRequirements),
    requiredSkills: listText(job.requiredSkills),
    preferredSkills: listText(job.preferredSkills),
    responsibilities: listText(job.responsibilities),
    qualifications: listText(job.qualifications),
    requirements: listText(job.requirements),
    benefits: listText(job.benefits),
    applicationInstructions: job.applicationInstructions ?? "",
    contactEmail: typeof contact.email === "string" ? contact.email : "",
    contactPhone: typeof contact.phone === "string" ? contact.phone : "",
    applicationUrl: job.applicationUrl ?? "",
    featuredImage: job.featuredImage ?? "",
    tags: listText(job.tags),
    dynamicQuestionsText: questionRecordsToText(job.dynamicQuestions),
    conditionalRulesText: recordsToText(job.conditionalRules, "rule"),
    assessmentsText: recordsToText(job.assessments, "assessment"),
    interviewTasksText: recordsToText(job.interviewTasks, "task"),
    attachmentsText: attachmentRecordsToText(job.attachments),
    status: ["draft", "published", "archived"].includes(job.status) ? (job.status as JobFormValues["status"]) : "draft",
    region: job.region ?? "Global",
    isFeatured: Boolean(job.isFeatured),
    isPremium: Boolean(job.isPremium),
    price: job.price ?? "",
    paymentStatus: job.paymentStatus ?? "unpaid",
  };
}

function listText(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item)).join("\n");
  return typeof value === "string" ? value : "";
}

function splitLines(value?: string) {
  return (value ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function textToQuestions(value?: string) {
  return splitLines(value).map((line, index) => {
    const [label = line, type = "text", required = ""] = line.split("|").map((part) => part.trim());
    return {
      id: `${slugify(label)}-${index + 1}`,
      label,
      name: slugify(label),
      type: type || "text",
      required: /required|yes|true/i.test(required),
    };
  });
}

function textToRecords(value: string | undefined, key: string) {
  return splitLines(value).map((line, index) => {
    const [title = line, instructions = ""] = line.split("|").map((part) => part.trim());
    return {
      id: `${slugify(title)}-${index + 1}`,
      title,
      [key]: line,
      instructions,
    };
  });
}

function textToAttachmentRecords(value?: string) {
  return splitLines(value).map((line, index) => {
    const [name = line, url = ""] = line.split("|").map((part) => part.trim());
    return { id: `${slugify(name)}-${index + 1}`, name, url };
  });
}

function questionRecordsToText(records?: Array<Record<string, unknown>>) {
  return (records ?? [])
    .map((record) => [record.label, record.type, record.required ? "required" : ""].filter(Boolean).join(" | "))
    .join("\n");
}

function recordsToText(records: Array<Record<string, unknown>> | undefined, key: string) {
  return (records ?? [])
    .map((record) => [record.title ?? record.label ?? record[key], record.instructions].filter(Boolean).join(" | "))
    .join("\n");
}

function attachmentRecordsToText(records?: Array<Record<string, unknown>>) {
  return (records ?? [])
    .map((record) => [record.name ?? record.title, record.url ?? record.href].filter(Boolean).join(" | "))
    .join("\n");
}

function formatDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function getStatusStyle(value: string) {
  if (value === "published") return "bg-success/15 text-success";
  if (value === "archived") return "bg-warning/15 text-warning";
  return "bg-muted text-muted-foreground";
}
