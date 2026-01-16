import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScholarshipSchema } from "@shared/schema";
import { z } from "zod";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react";
import type { Scholarship } from "@shared/schema";

const formSchema = insertScholarshipSchema.extend({
  deadline: z.string().min(1, "Deadline is required"),
});

export default function ScholarshipsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/scholarships", page, limit, search, status],
    queryFn: () => `/api/admin/scholarships?page=${page}&limit=${limit}&search=${search}&status=${status}`,
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
      description: "",
      eligibility: "",
      amount: "",
      deadline: "",
      category: "",
      institution: "",
      status: "draft",
    },
  });

  const handleEdit = (scholarship: Scholarship) => {
    setEditingScholarship(scholarship);
    form.reset({
      title: scholarship.title,
      description: scholarship.description,
      eligibility: scholarship.eligibility,
      amount: scholarship.amount || "",
      deadline: scholarship.deadline ? new Date(scholarship.deadline).toISOString().split("T")[0] : "",
      category: scholarship.category,
      institution: scholarship.institution,
      status: scholarship.status,
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
    { key: "title", header: "Title", sortable: true },
    { key: "institution", header: "Institution", sortable: true },
    { key: "category", header: "Category", sortable: true },
    { key: "amount", header: "Amount" },
    {
      key: "deadline",
      header: "Deadline",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: "status",
      header: "Status",
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs ${value === "published" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
          {value}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_: unknown, row: Scholarship) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} data-testid={`button-edit-${row.id}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} data-testid={`button-delete-${row.id}`}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2" data-testid="page-title">
            <GraduationCap className="h-8 w-8" />
            Scholarships Management
          </h1>
          <p className="text-gray-600">Manage scholarship opportunities</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingScholarship(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add">
              <Plus className="h-4 w-4 mr-2" />
              Add Scholarship
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingScholarship ? "Edit Scholarship" : "Add Scholarship"}</DialogTitle>
              <DialogDescription>Fill in the details below to {editingScholarship ? "update" : "create"} a scholarship</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                        <Input type="date" {...field} data-testid="input-deadline" />
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
                        <Textarea {...field} rows={3} data-testid="input-description" />
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
                        <Textarea {...field} rows={3} data-testid="input-eligibility" />
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
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
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
        onSearch={setSearch}
      />
    </div>
  );
}
