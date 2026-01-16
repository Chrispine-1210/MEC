import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";

const AVAILABLE_PERMISSIONS = [
  "view_dashboard",
  "manage_scholarships",
  "manage_jobs",
  "manage_partners",
  "manage_blog",
  "manage_team",
  "manage_users",
  "review_applications",
  "manage_roles",
  "view_analytics",
];

export default function RolesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<any>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/roles", page, search],
    queryFn: () => `/api/admin/roles?page=${page}&limit=10&search=${search}`,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/admin/roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Role created" });
    },
  });

  const form = useForm<any>({
    defaultValues: { name: "", description: "" },
  });

  const handleEdit = (role: any) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions || []);
    form.reset({ name: role.name, description: role.description });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: any) => {
    createMutation.mutate({ ...data, permissions: selectedPermissions });
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const columns = [
    { key: "name", header: "Role Name", sortable: true },
    { key: "description", header: "Description" },
    { key: "permissions", header: "Permissions", render: (perms: any) => (
      <div className="text-sm text-gray-600">{perms?.length || 0} permissions</div>
    )},
    { key: "actions", header: "Actions", render: (_: any, row: any) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}><Pencil className="h-4 w-4" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold flex items-center gap-2"><Shield className="h-8 w-8" />Roles & Permissions</h1><p className="text-gray-600">Manage admin roles and permissions</p></div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingRole(null); form.reset(); setSelectedPermissions([]); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Role</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingRole ? "Edit Role" : "Add Role"}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Role Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
                )} />
                <div>
                  <FormLabel className="mb-3 block">Permissions</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {AVAILABLE_PERMISSIONS.map(perm => (
                      <label key={perm} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={selectedPermissions.includes(perm)} onChange={() => togglePermission(perm)} className="h-4 w-4" />
                        <span className="text-sm">{perm.replace(/_/g, " ").toLowerCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingRole(null); form.reset(); setSelectedPermissions([]); }}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>Save</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={data?.roles || []} loading={isLoading} pagination={{ page, limit: 10, total: data?.total || 0, onPageChange: setPage, onLimitChange: () => {} }} onSearch={setSearch} />
    </div>
  );
}
