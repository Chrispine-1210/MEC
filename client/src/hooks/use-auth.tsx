import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest, clearLocalAuthSession, refreshAuthSession } from "@/lib/queryClient";
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
  referralCode?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getAuthErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

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
      const refreshed = await refreshAuthSession();
      if (refreshed) {
        try {
          const response = await apiRequest("GET", "/api/user/profile");
          const userData = await response.json();
          setUser(userData);
          return;
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
  };

  const login = async (email: string, password: string, rememberMe = true): Promise<boolean> => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", { email, password, rememberMe });
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

  const register = async (userData: any): Promise<boolean> => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", userData);
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
