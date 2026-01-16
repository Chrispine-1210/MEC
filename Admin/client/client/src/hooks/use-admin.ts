import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  dashboardApi, 
  usersApi, 
  scholarshipsApi, 
  jobsApi, 
  partnersApi, 
  blogApi, 
  teamApi, 
  applicationsApi, 
  aiChatApi,
  notificationsApi,
  auditLogsApi
} from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

// Dashboard hooks
export function useDashboardStats() {
  return useQuery({
    queryKey: ["/api/admin/dashboard/stats"],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.json();
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ["/api/admin/dashboard/recent-activity"],
    queryFn: async () => {
      const response = await fetch("/api/admin/dashboard/recent-activity");
      if (!response.ok) throw new Error("Failed to fetch recent activity");
      return response.json();
    },
  });
}

// Users hooks
export function useUsers(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["/api/admin/users", params],
    queryFn: async () => {
      const response = await usersApi.getUsers(params);
      return response.json();
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });
}

// Scholarships hooks
export function useScholarships(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ["/api/admin/scholarships", params],
    queryFn: async () => {
      const response = await scholarshipsApi.getScholarships(params);
      return response.json();
    },
  });
}

export function useCreateScholarship() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => scholarshipsApi.createScholarship(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scholarships"] });
      toast({
        title: "Success",
        description: "Scholarship created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create scholarship",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateScholarship() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => scholarshipsApi.updateScholarship(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scholarships"] });
      toast({
        title: "Success",
        description: "Scholarship updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update scholarship",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteScholarship() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => scholarshipsApi.deleteScholarship(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scholarships"] });
      toast({
        title: "Success",
        description: "Scholarship deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete scholarship",
        variant: "destructive",
      });
    },
  });
}

// Jobs hooks
export function useJobs(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ["/api/admin/jobs", params],
    queryFn: async () => {
      const response = await jobsApi.getJobs(params);
      return response.json();
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => jobsApi.createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      toast({
        title: "Success",
        description: "Job opportunity created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create job opportunity",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => jobsApi.updateJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      toast({
        title: "Success",
        description: "Job opportunity updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update job opportunity",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => jobsApi.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      toast({
        title: "Success",
        description: "Job opportunity deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete job opportunity",
        variant: "destructive",
      });
    },
  });
}

// Partners hooks
export function usePartners(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["/api/admin/partners", params],
    queryFn: async () => {
      const response = await partnersApi.getPartners(params);
      return response.json();
    },
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => partnersApi.createPartner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      toast({
        title: "Success",
        description: "Partner institution created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create partner institution",
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => partnersApi.updatePartner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      toast({
        title: "Success",
        description: "Partner institution updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update partner institution",
        variant: "destructive",
      });
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => partnersApi.deletePartner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      toast({
        title: "Success",
        description: "Partner institution deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete partner institution",
        variant: "destructive",
      });
    },
  });
}

// Blog hooks
export function useBlogPosts(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ["/api/admin/blog", params],
    queryFn: async () => {
      const response = await blogApi.getPosts(params);
      return response.json();
    },
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => blogApi.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      toast({
        title: "Success",
        description: "Blog post created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create blog post",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => blogApi.updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      toast({
        title: "Success",
        description: "Blog post updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update blog post",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => blogApi.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      toast({
        title: "Success",
        description: "Blog post deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete blog post",
        variant: "destructive",
      });
    },
  });
}

// Team hooks
export function useTeamMembers(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["/api/admin/team", params],
    queryFn: async () => {
      const response = await teamApi.getMembers(params);
      return response.json();
    },
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => teamApi.createMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({
        title: "Success",
        description: "Team member created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create team member",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => teamApi.updateMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({
        title: "Success",
        description: "Team member updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => teamApi.deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({
        title: "Success",
        description: "Team member deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team member",
        variant: "destructive",
      });
    },
  });
}

// Applications hooks
export function useApplications(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ["/api/admin/applications", params],
    queryFn: async () => {
      const response = await applicationsApi.getApplications(params);
      return response.json();
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => applicationsApi.updateApplication(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({
        title: "Success",
        description: "Application updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update application",
        variant: "destructive",
      });
    },
  });
}

// AI Chat hooks
export function useAiChatConversations(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["/api/admin/ai-chat/conversations", params],
    queryFn: async () => {
      const response = await aiChatApi.getConversations(params);
      return response.json();
    },
  });
}

// Notifications hooks
export function useNotifications(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["/api/admin/notifications", params],
    queryFn: async () => {
      const response = await notificationsApi.getNotifications(params);
      return response.json();
    },
  });
}

// Audit logs hooks
export function useAuditLogs(params?: { page?: number; limit?: number; userId?: string; entityType?: string }) {
  return useQuery({
    queryKey: ["/api/admin/audit-logs", params],
    queryFn: async () => {
      const response = await auditLogsApi.getLogs(params);
      return response.json();
    },
  });
}
