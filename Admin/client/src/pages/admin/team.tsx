import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch, queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeamMemberSchema } from "@shared/schema";
import { z } from "zod";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import type { TeamMember } from "@shared/schema";
import { useCreateAction } from "@/hooks/use-create-action";
import MediaAssetPicker from "@/components/admin/MediaAssetPicker";
import { getMediaPreviewUrl } from "@/lib/media-assets";
import RichTextEditor from "@/components/admin/RichTextEditor";

const formSchema = insertTeamMemberSchema;

export default function TeamPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const { toast } = useToast();

  useCreateAction(() => { setEditingMember(null); setIsDialogOpen(true); });

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/team", page, limit, search],
    queryFn: async () => {
      const response = await authFetch(`/api/admin/team?page=${page}&limit=${limit}&search=${search}`);
      if (!response.ok) throw new Error("Failed to fetch team members");
      return response.json();
    },
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
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/team/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({ title: "Success", description: "Team member deleted" });
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
      profileImage: "",
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
      profileImage: member.profileImage || "",
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
    {
      key: "name",
      header: "Team Member",
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          {row.profileImage ? (
            <img src={getMediaPreviewUrl(row.profileImage)} alt="" className="w-10 h-10 object-cover rounded-full flex-shrink-0 border-2 border-white shadow-sm" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-chart-4 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm">
              {value?.[0]?.toUpperCase() || "T"}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{row.email || ""}</p>
          </div>
        </div>
      )
    },
    { key: "position", header: "Position", render: (v: string) => <span className="text-sm text-foreground/80">{v}</span> },
    { key: "department", header: "Department", render: (v: string) => <span className="text-xs text-muted-foreground">{v || "—"}</span> },
    {
      key: "isActive",
      header: "Status",
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${value ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
          {value ? "Active" : "Inactive"}
        </span>
      )
    },
    {
      key: "actions",
      header: "",
      render: (_: unknown, row: TeamMember) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <SEO 
        title="Team Management" 
        description="Manage the professionals behind the Mtendere Education Platform."
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-8 w-8 text-primary" />Team Management</h1><p className="text-muted-foreground">Manage team members</p></div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingMember(null); form.reset(); } }}>
          <DialogTrigger asChild><Button className="shadow-lg hover:shadow-primary/20 transition-all duration-300"><Plus className="h-4 w-4 mr-2" />Add Member</Button></DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <DialogHeader><DialogTitle>{editingMember ? "Edit Member" : "Add Member"}</DialogTitle><DialogDescription>Manage team member profiles</DialogDescription></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 form-section">
                <FormField
                  control={form.control}
                  name="profileImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Photo</FormLabel>
                      <MediaAssetPicker
                        moduleName="teams"
                        value={field.value}
                        onChange={field.onChange}
                        label="Team Profile Photo"
                        description="Required visual identity for team cards, profile dialogs, and admin tables."
                        aspect="portrait"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} placeholder="Full Name" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="position" render={({ field }) => (<FormItem><FormLabel>Position</FormLabel><FormControl><Input {...field} placeholder="e.g. Director" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} value={field.value || ""} placeholder="e.g. Education" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} value={field.value || ""} type="email" placeholder="email@domain.com" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value || ""}
                        onChange={field.onChange}
                        minHeight={300}
                        placeholder="Write a professional biography, qualifications, board role, and focus areas..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingMember(null); form.reset(); }}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="shadow-md">
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Member"}
                  </Button>
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




