import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<AuthActionResult>;
  logout: () => void;
  isLoading: boolean;
}

type AuthFieldErrors = Partial<Record<"email" | "username" | "password" | "firstName" | "lastName", string>>;

type AuthActionResult =
  | { success: true }
  | { success: false; message: string; fields?: AuthFieldErrors };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorDetails = (error: unknown, fallback: string): { message: string; fields?: AuthFieldErrors } => {
    const payload =
      typeof error === "object" && error !== null && "payload" in error
        ? (error as { payload?: unknown }).payload
        : undefined;

    if (typeof payload === "object" && payload !== null) {
      const message =
        "message" in payload && typeof (payload as { message?: unknown }).message === "string"
          ? (payload as { message: string }).message
          : fallback;
      const fields =
        "fields" in payload && typeof (payload as { fields?: unknown }).fields === "object"
          ? ((payload as { fields?: AuthFieldErrors }).fields ?? undefined)
          : undefined;
      return { message, fields };
    }

    if (error instanceof Error) {
      const message = error.message.replace(/^\d+:\s*/, "").trim();
      try {
        const parsed = JSON.parse(message);
        return {
          message: parsed.message || parsed.error || fallback,
          fields: parsed.fields,
        };
      } catch {
        return { message: message || fallback };
      }
    }
    return { message: fallback };
  };

  const login = async (identifier: string, password: string): Promise<boolean> => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", { identifier, password });
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
      const details = getErrorDetails(error, "Please check your credentials and try again.");
      toast({
        title: "Login failed",
        description: details.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (userData: any): Promise<AuthActionResult> => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", userData);
      const data = await response.json();
      
      localStorage.setItem("token", data.token);
      setUser(data.user);
      
      toast({
        title: "Welcome to Mtendere!",
        description: "Your account has been created successfully.",
      });
      
      return { success: true };
    } catch (error) {
      console.error("Registration failed:", error);
      const details = getErrorDetails(error, "Please check your information and try again.");
      toast({
        title: "Registration failed",
        description: details.message,
        variant: "destructive",
      });
      return { success: false, ...details };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
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
