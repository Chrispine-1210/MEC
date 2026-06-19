import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest, authFetch, clearLocalAuthSession, refreshAuthSession } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BotDefenseSubmission } from "@/lib/bot-defense";

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  referralCode?: string | null;
}

export type ProfileUpdateInput = Partial<Pick<User, "firstName" | "lastName" | "username" | "phone" | "dateOfBirth" | "profilePicture">>;

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean, security?: BotDefenseSubmission) => Promise<boolean>;
  register: (userData: any, security?: BotDefenseSubmission) => Promise<boolean>;
  updateProfile: (updates: ProfileUpdateInput) => Promise<User>;
  uploadProfilePicture: (file: File) => Promise<User>;
  refreshProfile: () => Promise<User | null>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getAuthErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const readApiErrorMessage = async (response: Response, fallback: string) => {
  const text = await response.text();
  if (!text) return fallback;

  try {
    const payload = JSON.parse(text) as { message?: unknown; error?: unknown };
    for (const value of [payload.error, payload.message]) {
      if (typeof value === "string" && value.trim()) return value;
    }
  } catch {
    // Fall through to the raw response text.
  }

  return text || fallback;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await apiRequest("GET", "/api/user/profile");
      const userData = await response.json();
      setUser(userData);
      return userData as User;
    } catch (error) {
      const refreshed = await refreshAuthSession();
      if (refreshed) {
        try {
          const response = await apiRequest("GET", "/api/user/profile");
          const userData = await response.json();
          setUser(userData);
          return userData as User;
        } catch (retryError) {
          console.error("Failed to fetch user profile after refresh:", retryError);
        }
      } else {
        console.error("Failed to fetch user profile:", error);
      }
      clearLocalAuthSession();
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const login = async (
    email: string,
    password: string,
    rememberMe = true,
    security?: BotDefenseSubmission,
  ): Promise<boolean> => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        email,
        password,
        rememberMe,
        ...(security || {}),
      });
      const data = await response.json();
      
      localStorage.setItem("token", data.token);
      setUser(data.user);
      
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      toast({
        title: "Login failed",
        description: getAuthErrorMessage(error, "Please check your credentials and try again."),
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (userData: any, security?: BotDefenseSubmission): Promise<boolean> => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        ...userData,
        ...(security || {}),
      });
      const data = await response.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        setUser(data.user);
      }

      toast({
        title: data.requiresEmailVerification ? "Account created" : "Welcome to Mtendere!",
        description:
          data.message ||
          (data.requiresEmailVerification
            ? "You can use your account now. Please verify your email when the message arrives."
            : "Your account has been created successfully."),
      });
      
      return true;
    } catch (error) {
      console.error("Registration failed:", error);
      toast({
        title: "Registration failed",
        description: getAuthErrorMessage(error, "Please check your information and try again."),
        variant: "destructive",
      });
      return false;
    }
  };

  const updateProfile = async (updates: ProfileUpdateInput): Promise<User> => {
    const response = await apiRequest("PUT", "/api/user/profile", updates);
    const updatedUser = (await response.json()) as User;
    setUser(updatedUser);
    return updatedUser;
  };

  const uploadProfilePicture = async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append("profilePicture", file);

    const response = await authFetch("/api/user/profile-picture", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, "Profile image upload failed"));
    }

    const payload = (await response.json()) as { user?: User; profilePicture?: string };
    if (!payload.user) {
      throw new Error("Profile image upload did not return an updated user");
    }
    setUser(payload.user);
    return payload.user;
  };

  const refreshProfile = async () => fetchUserProfile();

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (error) {
      console.error("Logout request failed:", error);
    }
    clearLocalAuthSession();
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, updateProfile, uploadProfilePicture, refreshProfile, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
