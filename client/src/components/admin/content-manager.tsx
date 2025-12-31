import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Save,
  X,
  Eye,
  EyeOff
} from "lucide-react";

interface ContentManagerProps {
  contentType: string;
}

export default function ContentManager({ contentType }: ContentManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: [`/api/${contentType}`],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/${contentType}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Created Successfully",
        description: `${contentType.slice(0, -1)} has been created.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/${contentType}`] });
      setIsCreating(false);
      setFormData({});
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/${contentType}/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Updated Successfully",
        description: `${contentType.slice(0, -1)} has been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/${contentType}`] });
      setEditingItem(null);
      setFormData({});
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/${contentType}/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Deleted Successfully",
        description: `${contentType.slice(0, -1)} has been deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/${contentType}`] });
    },
    onError: () => {
      toast({
        title: "Deletion Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setIsCreating(true);
    setFormData(getDefaultFormData());
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getDefaultFormData = () => {
    switch (contentType) {
      case 'scholarships':
        return {
          title: '',
          description: '',
          institution: '',
          country: '',
          amount: 0,
          currency: 'USD',
          deadline: '',
          category: '',
          isActive: true,
        };
      case 'jobs':
        return {
          title: '',
          description: '',
          company: '',
          location: '',
          salary: 0,
          currency: 'USD',
          jobType: '',
          isRemote: false,
          isActive: true,
        };
      case 'blog-posts':
        return {
          title: '',
          content: '',
          excerpt: '',
          category: '',
          isPublished: false,
        };
      case 'testimonials':
        return {
          content: '',
          rating: 5,
          isApproved: false,
        };
      case 'partners':
        return {
          name: '',
          description: '',
          country: '',
          website: '',
          isActive: true,
        };
      case 'team-members':
        return {
          name: '',
          position: '',
          bio: '',
          email: '',
          isActive: true,
        };
      default:
        return {};
    }
  };

  const renderFormFields = () => {
    switch (contentType) {
      case 'scholarships':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Scholarship title"
                />
              </div>
              <div>
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  value={formData.institution || ''}
                  onChange={(e) => handleChange('institution', e.target.value)}
                  placeholder="Institution name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Scholarship description"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country || ''}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="Country"
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => handleChange('amount', parseInt(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline ? formData.deadline.split('T')[0] : ''}
                  onChange={(e) => handleChange('deadline', new Date(e.target.value).toISOString())}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category || ''}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="e.g., Undergraduate, Graduate"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="isActive"
                  checked={formData.isActive || false}
                  onCheckedChange={(checked) => handleChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
          </>
        );

      case 'jobs':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Job title"
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company || ''}
                  onChange={(e) => handleChange('company', e.target.value)}
                  placeholder="Company name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Job description"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Job location"
                />
              </div>
              <div>
                <Label htmlFor="salary">Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary || ''}
                  onChange={(e) => handleChange('salary', parseInt(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="jobType">Job Type</Label>
                <Input
                  id="jobType"
                  value={formData.jobType || ''}
                  onChange={(e) => handleChange('jobType', e.target.value)}
                  placeholder="e.g., Full-time, Part-time"
                />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRemote"
                  checked={formData.isRemote || false}
                  onCheckedChange={(checked) => handleChange('isRemote', checked)}
                />
                <Label htmlFor="isRemote">Remote Work</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive || false}
                  onCheckedChange={(checked) => handleChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
          </>
        );

      case 'blog-posts':
        return (
          <>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Blog post title"
              />
            </div>
            
            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt || ''}
                onChange={(e) => handleChange('excerpt', e.target.value)}
                placeholder="Brief excerpt"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content || ''}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Blog post content"
                rows={8}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category || ''}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="e.g., Education, Career"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="isPublished"
                  checked={formData.isPublished || false}
                  onCheckedChange={(checked) => handleChange('isPublished', checked)}
                />
                <Label htmlFor="isPublished">Published</Label>
              </div>
            </div>
          </>
        );

      default:
        return <p className="text-gray-500">Form fields for {contentType} not implemented yet.</p>;
    }
  };

  const renderItemCard = (item: any) => {
    return (
      <Card key={item.id} className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-1">{item.title || item.name}</CardTitle>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDelete(item.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {item.description && (
            <CardDescription className="line-clamp-2">
              {item.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {item.isActive !== undefined && (
                <Badge variant={item.isActive ? "default" : "secondary"}>
                  {item.isActive ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                  {item.isActive ? 'Active' : 'Inactive'}
                </Badge>
              )}
              {item.isPublished !== undefined && (
                <Badge variant={item.isPublished ? "default" : "secondary"}>
                  {item.isPublished ? 'Published' : 'Draft'}
                </Badge>
              )}
              {item.isApproved !== undefined && (
                <Badge variant={item.isApproved ? "default" : "secondary"}>
                  {item.isApproved ? 'Approved' : 'Pending'}
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {item.createdAt && new Date(item.createdAt).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const filteredItems = items?.filter((item: any) =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTitle = () => {
    return contentType.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-48 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-48 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-mtendere-blue">{getTitle()}</h1>
          <p className="text-gray-600">Manage {contentType} content</p>
        </div>
        <Button onClick={handleCreate} className="bg-mtendere-blue hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={`Search ${contentType}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingItem) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingItem ? 'Edit' : 'Create'} {getTitle().slice(0, -1)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderFormFields()}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-mtendere-green hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems?.map(renderItemCard)}
      </div>

      {(!filteredItems || filteredItems.length === 0) && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchQuery ? `No ${contentType} found matching "${searchQuery}"` : `No ${contentType} found`}
          </p>
        </div>
      )}
    </div>
  );
}
