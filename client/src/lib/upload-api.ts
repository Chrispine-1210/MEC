import { apiFetch } from "./api-base";

// Upload API functionality
export const uploadApi = {
  async uploadFile(file: File): Promise<Response> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return apiFetch("/api/admin/upload", {
      method: 'POST',
      headers,
      body: formData,
      credentials: "include",
    });
  },

  async uploadMultipleFiles(files: FileList): Promise<Response> {
    const formData = new FormData();
    Array.from(files).forEach((file, index) => {
      formData.append(`files`, file);
    });

    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return apiFetch("/api/admin/upload/multiple", {
      method: 'POST',
      headers,
      body: formData,
      credentials: "include",
    });
  }
};
