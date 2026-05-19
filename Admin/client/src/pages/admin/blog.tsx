import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { authFetch, queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBlogPostSchema } from "@shared/schema";
import { z } from "zod";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BlogPost } from "@shared/schema";
import { useCreateAction } from "@/hooks/use-create-action";
import MediaAssetPicker from "@/components/admin/MediaAssetPicker";
import { getMediaPreviewUrl } from "@/lib/media-assets";
import RichTextEditor from "@/components/admin/RichTextEditor";

const formSchema = insertBlogPostSchema;

export default function BlogPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const { toast } = useToast();

  useCreateAction(() => { setEditingPost(null); setIsDialogOpen(true); });

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/blog", page, limit, search, status],
    queryFn: async () => {
      const response = await authFetch(`/api/admin/blog?page=${page}&limit=${limit}&search=${search}&status=${status}`);
      if (!response.ok) throw new Error("Failed to fetch blog posts");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      apiRequest("POST", "/api/admin/blog", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Blog post created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create blog post", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<z.infer<typeof formSchema>> }) =>
      apiRequest("PUT", `/api/admin/blog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      setIsDialogOpen(false);
      setEditingPost(null);
      form.reset();
      toast({ title: "Success", description: "Blog post updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update blog post", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/blog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      toast({ title: "Success", description: "Blog post deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete blog post", variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      excerpt: "",
      slug: "",
      category: "",
      status: "draft",
      featuredImage: "",
    },
  });

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    form.reset({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || "",
      slug: post.slug,
      category: post.category,
      status: post.status,
      featuredImage: post.featuredImage || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this blog post?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      key: "title",
      header: "Post",
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          {row.featuredImage ? (
            <img src={getMediaPreviewUrl(row.featuredImage)} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0 border" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-info/15 to-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-5 w-5 text-info" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground leading-tight line-clamp-1">{value}</p>
            <p className="text-xs text-muted-foreground">/{row.slug}</p>
          </div>
        </div>
      )
    },
    { key: "category", header: "Category", render: (v: string) => <Badge variant="outline" className="text-xs capitalize">{v}</Badge> },
    {
      key: "status",
      header: "Status",
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${value === "published" ? "bg-success/15 text-success" : value === "draft" ? "bg-muted text-muted-foreground" : "bg-warning/15 text-warning"}`}>
          {value}
        </span>
      )
    },
    { key: "createdAt", header: "Created", render: (v: string) => <span className="text-xs text-muted-foreground">{new Date(v).toLocaleDateString()}</span> },
    {
      key: "actions",
      header: "",
      render: (_: unknown, row: BlogPost) => (
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
      <SEO 
        title="Blog Management" 
        description="Manage and publish educational blog posts for the Mtendere community."
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><BookOpen className="h-8 w-8 text-primary" />Blog Management</h1>
          <p className="text-muted-foreground">Manage blog posts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingPost(null); form.reset(); }
        }}>
          <DialogTrigger asChild>
            <Button className="shadow-lg hover:shadow-primary/20 transition-all duration-300">
              <Plus className="h-4 w-4 mr-2" />Add Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <DialogHeader>
              <DialogTitle>{editingPost ? "Edit Post" : "Add Post"}</DialogTitle>
              <DialogDescription>Create engaging content for your audience</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 form-section">
                <FormField
                  control={form.control}
                  name="featuredImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured Image</FormLabel>
                      <MediaAssetPicker
                        moduleName="blogs"
                        value={field.value}
                        onChange={field.onChange}
                        label="Featured Blog Image"
                        description="Required for listing cards, detail hero, SEO previews, and inline rhythm fallbacks."
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} placeholder="Post Title" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} placeholder="post-slug" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="excerpt" render={({ field }) => (
                  <FormItem><FormLabel>Excerpt</FormLabel><FormControl><Textarea {...field} value={field.value || ""} placeholder="Brief summary" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        minHeight={520}
                        placeholder="Write the full article with headings, lists, links, images, and calls to action..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} placeholder="e.g., Education, News" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingPost(null); form.reset(); }}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="shadow-md">
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Post"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={data?.posts || []} loading={isLoading} pagination={{ page, limit, total: data?.total || 0, onPageChange: setPage, onLimitChange: setLimit }} onSearch={setSearch} />
    </div>
  );
}




