import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertApplicationSchema } from "@shared/schema";
import { z } from "zod";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, CheckCircle, XCircle, FileText } from "lucide-react";
import type { Application } from "@shared/schema";

const formSchema = insertApplicationSchema;

export default function ApplicationsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ applications: Application[], total: number }>({
    queryKey: ["/api/admin/applications", page, limit, search, status],
    queryFn: () => `/api/admin/applications?page=${page}&limit=${limit}&search=${search}&status=${status}`,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/admin/applications/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      setIsDialogOpen(false);
      setEditingApp(null);
      form.reset();
      toast({ title: "Success", description: "Application updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update application", variant: "destructive" });
    },
  });

  const form = useForm<any>({
    defaultValues: {
      status: "pending",
      reviewNotes: "",
    },
  });

  const handleReview = (app: Application) => {
    setEditingApp(app);
    form.reset({
      status: app.status,
      reviewNotes: app.reviewNotes || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: any) => {
    if (editingApp) {
      updateMutation.mutate({ id: editingApp.id, data });
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    waitlisted: "bg-blue-100 text-blue-800",
  };

  const columns = [
    { key: "id", header: "App ID", render: (value: string) => value.substring(0, 8) },
    { key: "status", header: "Status", render: (value: string) => (
      <span className={`px-2 py-1 rounded text-xs ${statusColors[value] || "bg-gray-100 text-gray-800"}`}>
        {value}
      </span>
    )},
    { key: "createdAt", header: "Date", render: (value: Date) => new Date(value).toLocaleDateString() },
    { key: "actions", header: "Actions", render: (_: unknown, row: Application) => (
      <Button variant="ghost" size="sm" onClick={() => handleReview(row)}><Pencil className="h-4 w-4" /></Button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-8 w-8" />Applications Review</h1><p className="text-gray-600">Review and manage applications</p></div>
      </div>
      <div className="flex gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="waitlisted">Waitlisted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {editingApp && (
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingApp(null); form.reset(); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Review Application</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="waitlisted">Waitlisted</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reviewNotes" render={({ field }) => (
                  <FormItem><FormLabel>Review Notes</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingApp(null); form.reset(); }}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>Save Review</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      <DataTable columns={columns} data={data?.applications || []} loading={isLoading} pagination={{ page, limit, total: data?.total || 0, onPageChange: setPage, onLimitChange: setLimit }} onSearch={setSearch} />
    </div>
  );
}
