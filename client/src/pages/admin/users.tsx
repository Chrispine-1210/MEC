import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch, queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, UserPlus, ShieldCheck } from "lucide-react";
import type { User } from "@shared/schema";

const createSchema = insertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const roleColors: Record<string, string> = {
  super_admin: "bg-info/15 text-info",
  admin: "bg-primary/10 text-primary",
  editor: "bg-success/15 text-success",
  viewer: "bg-muted text-muted-foreground",
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ users: User[], total: number }>({
    queryKey: ["/api/admin/users", page, limit, search],
    queryFn: async () => {
      const response = await authFetch(`/api/admin/users?page=${page}&limit=${limit}&search=${search}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      closeDialog();
      toast({ title: "User created", description: "New user account has been created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create user", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      closeDialog();
      toast({ title: "User updated", description: "User details have been saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PUT", `/api/admin/users/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Status updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({ title: "User deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    },
  });

  const form = useForm<any>({
    resolver: zodResolver(editingUser ? insertUserSchema.partial() : createSchema),
    defaultValues: { username: "", email: "", password: "", firstName: "", lastName: "", role: "viewer", region: "" },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    form.reset({ username: "", email: "", password: "", firstName: "", lastName: "", role: "viewer", region: "" });
  };

  const handleCreate = () => {
    setEditingUser(null);
    form.reset({ username: "", email: "", password: "", firstName: "", lastName: "", role: "viewer", region: "" });
    setIsDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({ username: user.username, email: user.email, role: user.role, firstName: user.firstName || "", lastName: user.lastName || "", region: user.region || "" });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (formData: any) => {
    if (editingUser) {
      const { password, ...rest } = formData;
      updateMutation.mutate({ id: editingUser.id, data: rest });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns = [
    {
      key: "username",
      header: "User",
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={row.profileImage || ""} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs font-bold">
              {(row.firstName?.[0] || value?.[0] || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{row.firstName ? `${row.firstName} ${row.lastName || ""}`.trim() : value}</p>
            <p className="text-xs text-muted-foreground">@{value}</p>
          </div>
        </div>
      )
    },
    { key: "email", header: "Email", render: (v: string) => <span className="text-sm text-muted-foreground">{v}</span> },
    {
      key: "role",
      header: "Role",
      render: (v: string) => (
        <Badge className={`text-xs border-0 ${roleColors[v] || roleColors.viewer}`}>
          <ShieldCheck className="h-3 w-3 mr-1" />
          {v?.replace("_", " ")}
        </Badge>
      )
    },
    {
      key: "isActive",
      header: "Status",
      render: (value: boolean, row: any) => (
        <Switch
          checked={value}
          onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: row.id, isActive: checked })}
          aria-label="Toggle active status"
        />
      )
    },
    {
      key: "lastLogin",
      header: "Last Login",
      render: (v: string) => v ? <span className="text-xs text-muted-foreground">{new Date(v).toLocaleDateString()}</span> : <span className="text-xs text-muted-foreground/70">Never</span>
    },
    {
      key: "actions",
      header: "Actions",
      render: (_: any, row: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <SEO title="Users Management" description="Manage admin users and their access." />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Users Management
          </h1>
          <p className="text-muted-foreground mt-1">
            {data?.total ?? 0} user{(data?.total ?? 0) !== 1 ? "s" : ""} registered on the platform
          </p>
        </div>
        <Button onClick={handleCreate} className="shadow-sm hover:shadow-md transition-all">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.users || []}
        loading={isLoading}
        pagination={{ page, limit, total: data?.total || 0, onPageChange: setPage, onLimitChange: setLimit }}
        onSearch={setSearch}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingUser ? <Pencil className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              {editingUser ? "Edit User" : "Create New User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user information and role assignment." : "Create a new admin account with specific access level."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input placeholder="First name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input placeholder="Last name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username *</FormLabel>
                  <FormControl><Input placeholder="e.g. johndoe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {!editingUser && (
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl><Input type="password" placeholder="Min. 8 characters" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="region" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl><Input placeholder="e.g. East Africa" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}




