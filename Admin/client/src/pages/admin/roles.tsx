import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch, queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Shield, Lock } from "lucide-react";

const AVAILABLE_PERMISSIONS = [
  { id: "view_dashboard", label: "View Dashboard", category: "General" },
  { id: "manage_scholarships", label: "Manage Scholarships", category: "Content" },
  { id: "manage_jobs", label: "Manage Jobs", category: "Content" },
  { id: "manage_partners", label: "Manage Partners", category: "Content" },
  { id: "manage_blog", label: "Manage Blog", category: "Content" },
  { id: "manage_team", label: "Manage Team", category: "Content" },
  { id: "manage_media", label: "Manage Media", category: "Content" },
  { id: "manage_users", label: "Manage Users", category: "Administration" },
  { id: "review_applications", label: "Review Applications", category: "Administration" },
  { id: "manage_roles", label: "Manage Roles", category: "Administration" },
  { id: "view_analytics", label: "View Analytics", category: "Reports" },
  { id: "manage_settings", label: "Manage Settings", category: "Administration" },
];

const PERMISSION_CATEGORIES = ["General", "Content", "Administration", "Reports"];
const CORE_ROLE_IDS = new Set(["viewer", "editor", "admin", "super_admin"]);

export default function RolesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<any>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/roles", page, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await authFetch(`/api/admin/roles${suffix}`);
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      closeDialog();
      toast({ title: "Success", description: "Role created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create role", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/admin/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      closeDialog();
      toast({ title: "Success", description: "Role updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update role", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      toast({ title: "Success", description: "Role deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete role", variant: "destructive" });
    },
  });

  const form = useForm<any>({
    defaultValues: { name: "", description: "" },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRole(null);
    setSelectedPermissions([]);
    form.reset({ name: "", description: "" });
  };

  const handleEdit = (role: any) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions || []);
    form.reset({ name: role.name, description: role.description || "" });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (CORE_ROLE_IDS.has(id)) {
      toast({ title: "System role protected", description: "Core admin roles cannot be deleted.", variant: "destructive" });
      return;
    }

    if (confirm("Are you sure you want to delete this role? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: any) => {
    const payload = { ...data, permissions: selectedPermissions };
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const toggleCategory = (category: string) => {
    const categoryPerms = AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
    const allSelected = categoryPerms.every(p => selectedPermissions.includes(p));
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !categoryPerms.includes(p)));
    } else {
      setSelectedPermissions(prev => {
        const toAdd = categoryPerms.filter(p => !prev.includes(p));
        return [...prev, ...toAdd];
      });
    }
  };

  const columns = [
    {
      key: "name",
      header: "Role Name",
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-medium">{value}</span>
          {(row.isSystem || CORE_ROLE_IDS.has(row.id)) && (
            <Badge variant="outline" className="text-[10px]">System</Badge>
          )}
        </div>
      )
    },
    { key: "description", header: "Description" },
    {
      key: "permissions",
      header: "Permissions",
      render: (perms: string[]) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary">{perms?.length || 0} permissions</Badge>
        </div>
      )
    },
    {
      key: "actions",
      header: "Actions",
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} title="Edit role">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id)}
            title={(row.isSystem || CORE_ROLE_IDS.has(row.id)) ? "System role cannot be deleted" : "Delete role"}
            disabled={row.isSystem || CORE_ROLE_IDS.has(row.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <SEO
        title="Roles & Permissions"
        description="Configure granular access control and administrative roles."
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground">Manage admin roles and their access permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="shadow-lg hover:shadow-primary/20 transition-all duration-300">
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {editingRole ? "Edit Role" : "Create New Role"}
              </DialogTitle>
              <DialogDescription>
                {editingRole ? "Update role name, description and permissions" : "Define a new role with specific access permissions"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Content Editor, Reviewer"
                        readOnly={Boolean(editingRole && CORE_ROLE_IDS.has(editingRole.id))}
                        className={editingRole && CORE_ROLE_IDS.has(editingRole.id) ? "bg-muted/60" : undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Describe what this role can do and its responsibilities..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div>
                  <FormLabel className="mb-3 block text-sm font-medium">
                    Permissions ({selectedPermissions.length} selected)
                  </FormLabel>
                  <div className="space-y-4">
                    {PERMISSION_CATEGORIES.map(category => {
                      const categoryPerms = AVAILABLE_PERMISSIONS.filter(p => p.category === category);
                      const allSelected = categoryPerms.every(p => selectedPermissions.includes(p.id));
                      const someSelected = categoryPerms.some(p => selectedPermissions.includes(p.id));
                      return (
                        <div key={category} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-foreground/80">{category}</h4>
                            <button type="button" onClick={() => toggleCategory(category)} className={`text-xs px-2 py-1 rounded transition-colors ${allSelected ? "bg-primary/10 text-primary" : someSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {allSelected ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {categoryPerms.map(perm => (
                              <label key={perm.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-all hover:bg-card ${selectedPermissions.includes(perm.id) ? "bg-primary/10 border-primary/30" : "bg-muted/40 border-transparent"}`}>
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                                  className="h-4 w-4 rounded accent-primary"
                                />
                                <span className="text-sm">{perm.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={data?.roles || []}
        loading={isLoading}
        pagination={{ page, limit: 10, total: data?.total || 0, onPageChange: setPage, onLimitChange: () => {} }}
        onSearch={setSearch}
      />
    </div>
  );
}





