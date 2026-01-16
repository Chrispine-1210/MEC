import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import type { User } from "@shared/schema";

const formSchema = insertUserSchema;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/users", page, limit, search],
    queryFn: () => `/api/admin/users?page=${page}&limit=${limit}&search=${search}`,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({ title: "Success", description: "User updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    },
  });

  const form = useForm<any>({
    defaultValues: {
      username: "",
      email: "",
      role: "user",
      isActive: true,
    },
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this user?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: any) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    }
  };

  const columns = [
    { key: "username", header: "Username", sortable: true },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    { key: "isActive", header: "Status", render: (value: boolean) => (
      <span className={`px-2 py-1 rounded text-xs ${value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
        {value ? "Active" : "Inactive"}
      </span>
    )},
    { key: "actions", header: "Actions", render: (_: unknown, row: User) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-8 w-8" />Users Management</h1><p className="text-gray-600">Manage user accounts</p></div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingUser(null); form.reset(); } }}>
          <DialogTrigger asChild>{editingUser && <Button><Plus className="h-4 w-4 mr-2" />Edit User</Button>}</DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="username" render={({ field }) => (<FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingUser(null); form.reset(); }}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={data?.users || []} loading={isLoading} pagination={{ page, limit, total: data?.total || 0, onPageChange: setPage, onLimitChange: setLimit }} onSearch={setSearch} />
    </div>
  );
}
