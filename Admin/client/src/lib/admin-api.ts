import { apiRequest } from "./queryClient";

// Dashboard API
export const dashboardApi = {
  getStats: () => apiRequest("GET", "/api/admin/dashboard/stats"),
};

// Users API
export const usersApi = {
  getUsers: (params?: { page?: number; limit?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params && params.page) searchParams.set("page", params.page.toString());
    if (params && params.limit) searchParams.set("limit", params.limit.toString());
    if (params && params.search) searchParams.set("search", params.search);
    
    return apiRequest("GET", `/api/admin/users?${searchParams.toString()}`);
  },
  getUser: (id: string) => apiRequest("GET", `/api/admin/users/${id}`),
  updateUser: (id: string, data: any) => apiRequest("PUT", `/api/admin/users/${id}`, data),
  deleteUser: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
};

// Scholarships API
export const scholarshipsApi = {
  getScholarships: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params && params.page) searchParams.set("page", params.page.toString());
    if (params && params.limit) searchParams.set("limit", params.limit.toString());
    if (params && params.search) searchParams.set("search", params.search);
    if (params && params.status) searchParams.set("status", params.status);
    
    return apiRequest("GET", `/api/admin/scholarships?${searchParams.toString()}`);
  },
  createScholarship: (data: any) => apiRequest("POST", "/api/admin/scholarships", data),
  updateScholarship: (id: string, data: any) => apiRequest("PUT", `/api/admin/scholarships/${id}`, data),
  deleteScholarship: (id: string) => apiRequest("DELETE", `/api/admin/scholarships/${id}`),
};

// Jobs API
export const jobsApi = {
  getJobs: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params && params.page) searchParams.set("page", params.page.toString());
    if (params && params.limit) searchParams.set("limit", params.limit.toString());
    if (params && params.search) searchParams.set("search", params.search);
    if (params && params.status) searchParams.set("status", params.status);
    
    return apiRequest("GET", `/api/admin/jobs?${searchParams.toString()}`);
  },
  createJob: (data: any) => apiRequest("POST", "/api/admin/jobs", data),
  updateJob: (id: string, data: any) => apiRequest("PUT", `/api/admin/jobs/${id}`, data),
  deleteJob: (id: string) => apiRequest("DELETE", `/api/admin/jobs/${id}`),
};

// Partners API
export const partnersApi = {
  getPartners: (params?: { page?: number; limit?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params && params.page) searchParams.set("page", params.page.toString());
    if (params && params.limit) searchParams.set("limit", params.limit.toString());
    if (params && params.search) searchParams.set("search", params.search);
    
    return apiRequest("GET", `/api/admin/partners?${searchParams.toString()}`);
  },
  createPartner: (data: any) => apiRequest("POST", "/api/admin/partners", data),
  updatePartner: (id: string, data: any) => apiRequest("PUT", `/api/admin/partners/${id}`, data),
  deletePartner: (id: string) => apiRequest("DELETE", `/api/admin/partners/${id}`),
};

// Blog API
export const blogApi = {
  getPosts: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params && params.page) searchParams.set("page", params.page.toString());
    if (params && params.limit) searchParams.set("limit", params.limit.toString());
    if (params && params.search) searchParams.set("search", params.search);
    if (params && params.status) searchParams.set("status", params.status);
    
    return apiRequest("GET", `/api/admin/blog?${searchParams.toString()}`);
  },
  createPost: (data: any) => apiRequest("POST", "/api/admin/blog", data),
  updatePost: (id: string, data: any) => apiRequest("PUT", `/api/admin/blog/${id}`, data),
  deletePost: (id: string) => apiRequest("DELETE", `/api/admin/blog/${id}`),
};

// Team API
export const teamApi = {
  getMembers: (params?: { page?: number; limit?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params && params.page) searchParams.set("page", params.page.toString());
    if (params && params.limit) searchParams.set("limit", params.limit.toString());
    if (params && params.search) searchParams.set("search", params.search);
    
    return apiRequest("GET", `/api/admin/team?${searchParams.toString()}`);
  },
  createMember: (data: any) => apiRequest("POST", "/api/admin/team", data),
  updateMember: (id: string, data: any) => apiRequest("PUT", `/api/admin/team/${id}`, data),
  deleteMember: (id: string) => apiRequest("DELETE", `/api/admin/team/${id}`),
};

// Applications API
export const applicationsApi = {
  getApplications: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params && params.page) searchParams.set("page", params.page.toString());
    if (params && params.limit) searchParams.set("limit", params.limit.toString());
    if (params && params.search) searchParams.set("search", params.search);
    if (params && params.status) searchParams.set("status", params.status);
    
    return apiRequest("GET", `/api/admin/applications?${searchParams.toString()}`);
  },
  updateApplication: (id: string, data: any) => apiRequest("PUT", `/api/admin/applications/${id}`, data),
  deleteApplication: (id: string) => apiRequest("DELETE", `/api/admin/applications/${id}`),
};

// AI Chat API
export const aiChatApi = {
  getConversations: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params && params.page) searchParams.set("page", params.page.toString());
    if (params && params.limit) searchParams.set("limit", params.limit.toString());
    
    return apiRequest("GET", `/api/admin/ai/conversations?${searchParams.toString()}`);
  },
  sendMessage: (data: { message: string; conversationId?: string }) => 
    apiRequest("POST", "/api/admin/ai/chat", data),
};

// Notifications API
export const notificationsApi = {
  getNotifications: (params?: { page?: number; limit?: number; unread?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params && params.page) searchParams.set("page", params.page.toString());
    if (params && params.limit) searchParams.set("limit", params.limit.toString());
    if (params && params.unread) searchParams.set("unread", params.unread.toString());
    
    return apiRequest("GET", `/api/admin/notifications?${searchParams.toString()}`);
  },
  markAsRead: (id: string) => apiRequest("PUT", `/api/admin/notifications/${id}/read`),
  markAllAsRead: () => apiRequest("PUT", "/api/admin/notifications/read-all"),
};

// Audit Logs API
export const auditLogsApi = {
  getLogs: (params?: { page?: number; limit?: number; action?: string; userId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params && params.page) searchParams.set("page", params.page.toString());
    if (params && params.limit) searchParams.set("limit", params.limit.toString());
    if (params && params.action) searchParams.set("action", params.action);
    if (params && params.userId) searchParams.set("userId", params.userId);
    
    return apiRequest("GET", `/api/admin/audit-logs?${searchParams.toString()}`);
  },
};

// Upload API
export const uploadApi = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    
    return fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  },
};