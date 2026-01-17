import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeamMemberSchema } from "@shared/schema";
import { z } from "zod";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import type { TeamMember } from "@shared/schema";

const formSchema = insertTeamMemberSchema;

export default function TeamPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/team", page, limit, search],
    queryFn: () => `/api/admin/team?page=${page}&limit=${limit}&search=${search}`,
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      apiRequest("POST", "/api/admin/team", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Team member added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add team member", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<z.infer<typeof formSchema>> }) =>
      apiRequest("PUT", `/api/admin/team/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      setIsDialogOpen(false);
      setEditingMember(null);
      form.reset();
      toast({ title: "Success", description: "Team member updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update team member", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/team/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({ title: "Success", description: "Team member deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete team member", variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      position: "",
      bio: "",
      email: "",
      department: "",
      isActive: true,
    },
  });

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    form.reset({
      name: member.name,
      position: member.position,
      bio: member.bio || "",
      email: member.email || "",
      department: member.department || "",
      isActive: member.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this team member?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    { key: "name", header: "Name", sortable: true },
    { key: "position", header: "Position" },
    { key: "department", header: "Department" },
    { key: "isActive", header: "Status", render: (value: boolean) => (
      <span className={`px-2 py-1 rounded text-xs ${value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
        {value ? "Active" : "Inactive"}
      </span>
    )},
    { key: "actions", header: "Actions", render: (_: unknown, row: TeamMember) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-8 w-8" />Team Management</h1><p className="text-gray-600">Manage team members</p></div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingMember(null); form.reset(); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Member</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingMember ? "Edit Member" : "Add Member"}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="position" render={({ field }) => (<FormItem><FormLabel>Position</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} value={field.value || ""} type="email" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="bio" render={({ field }) => (<FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea {...field} value={field.value || ""} rows={3} /></FormControl><FormMessage /></FormItem>)} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingMember(null); form.reset(); }}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={data?.members || []} loading={isLoading} pagination={{ page, limit, total: data?.total || 0, onPageChange: setPage, onLimitChange: setLimit }} onSearch={setSearch} />
    </div>
  );
}
