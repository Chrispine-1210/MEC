import { apiFetch } from "./api-base";

// Legacy image upload wrapper. Images are stored in governed assets/imgs modules.
export const uploadApi = {
  async uploadFile(file: File): Promise<Response> {
    const formData = new FormData();
    formData.append("files", file);

    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return apiFetch("/api/admin/media/assets/misc", {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });
  },

  async uploadMultipleFiles(files: FileList): Promise<Response> {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return apiFetch("/api/admin/media/assets/misc", {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });
  }
};
