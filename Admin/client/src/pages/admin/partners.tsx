import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Plus, Building2, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";

const formSchema = insertPartnerInstitutionSchema;

export default function PartnersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerInstitution | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/partners", page, limit, search],
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
    onError: () => {
      toast({ title: "Error", description: "Failed to create partner", variant: "destructive" });
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
    onError: () => {
      toast({ title: "Error", description: "Failed to update partner", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/partners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      toast({ title: "Success", description: "Partner deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete partner", variant: "destructive" });
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
    { key: "name", header: "Name", sortable: true },
    { key: "partnershipType", header: "Type", sortable: true },
    { key: "address", header: "Location" },
    {
      key: "isActive",
      header: "Status",
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded text-xs ${value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
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
            <Building2 className="h-8 w-8" />
            Partners Management
          </h1>
          <p className="text-gray-600">Manage partner institutions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingPartner(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add">
              <Plus className="h-4 w-4 mr-2" />
              Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPartner ? "Edit Partner" : "Add Partner"}</DialogTitle>
              <DialogDescription>Fill in the details below to {editingPartner ? "update" : "create"} a partner</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <Textarea {...field} rows={3} data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    setEditingPartner(null);
                    form.reset();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
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
        data={data?.partners || []}
        loading={isLoading}
        pagination={{
          page,
          limit,
          total: data?.total || 0,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
        onSearch={setSearch}
      />
    </div>
  );
}

