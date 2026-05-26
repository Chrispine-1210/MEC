import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { type User } from "@shared/schema";
import NotFound from "@/pages/not-found";
import AdminLayout from "@/components/admin/AdminLayout";
import Dashboard from "@/pages/admin/dashboard";
import Ecosystem from "@/pages/admin/ecosystem";
import Scholarships from "@/pages/admin/scholarships";
import Jobs from "@/pages/admin/jobs";
import Events from "@/pages/admin/events";
import Partners from "@/pages/admin/partners";
import Blog from "@/pages/admin/blog";
import Team from "@/pages/admin/team";
import Users from "@/pages/admin/users";
import Roles from "@/pages/admin/roles";
import Applications from "@/pages/admin/applications";
import Analytics from "@/pages/admin/analytics";
import Activity from "@/pages/admin/activity";
import AiChat from "@/pages/admin/ai-chat";
import Messages from "@/pages/admin/messages";
import Settings from "@/pages/admin/settings";
import Media from "@/pages/admin/media";
import AuthPage from "@/pages/auth";
import { AdminRealtimeProvider } from "@/hooks/use-admin-realtime";
import { canAccessAdminPath, isAdminPortalRole, normalizeAdminPath } from "@/lib/admin-rbac";
import { APP_NAME, BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";

function AdminLoadingSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="w-64 bg-card border-r border-border/60 flex-shrink-0 hidden lg:flex flex-col p-4 space-y-4">
        <div className="flex items-center space-x-3 mb-6 px-2 pt-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 px-3 py-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
        <div className="mt-auto">
          <div className="flex items-center space-x-3 px-3 py-3 border-t border-border/40 mt-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar skeleton */}
        <div className="bg-card border-b border-border/60 px-6 py-4 flex items-center justify-between">
          <Skeleton className="h-9 w-80 rounded-lg" />
          <div className="flex items-center space-x-3">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>

        {/* Page content skeleton */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Page title */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div className="bg-card rounded-xl border border-border/60">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
            <div className="divide-y divide-border/40">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminRouter() {
  const [location, setLocation] = useLocation();
  const hasToken = typeof window !== "undefined" && Boolean(localStorage.getItem("token"));
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/user"],
    retry: false,
    enabled: hasToken,
  });

  useEffect(() => {
    if (!hasToken) {
      setLocation("/admin/auth");
      return;
    }

    if (!isLoading && !user) {
      localStorage.removeItem("token");
      setLocation("/admin/auth");
    }
  }, [hasToken, isLoading, setLocation, user]);

  if (!hasToken) return null;
  if (isLoading) return <AdminLoadingSkeleton />;
  if (!user) return null;
  const hasAdminPortalRole = isAdminPortalRole(user.role);
  if (!hasAdminPortalRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-border/60 bg-card p-8 text-center shadow-lg">
          <h1 className="text-2xl font-semibold text-foreground">Admin access is not available for this account</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This account is authenticated, but it does not have an admin portal role. Sign in with a Viewer, Writer, or Super Admin account.
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              localStorage.removeItem("token");
              queryClient.removeQueries({ queryKey: ["/api/user"] });
              setLocation("/admin/auth");
            }}
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  const normalizedLocation = normalizeAdminPath(location);
  const canAccessCurrentPath = canAccessAdminPath(user.role, normalizedLocation);
  if (!canAccessCurrentPath) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-border/60 bg-card p-8 text-center shadow-lg">
          <h1 className="text-2xl font-semibold text-foreground">Permission required</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your <span className="font-medium text-foreground">{user.role}</span> role cannot access <span className="font-medium text-foreground">{normalizedLocation}</span>.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button onClick={() => setLocation("/admin")}>Go to Dashboard</Button>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem("token");
                queryClient.removeQueries({ queryKey: ["/api/user"] });
                setLocation("/auth");
              }}
            >
              Switch Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={Dashboard} />
        <Route path="/admin/dashboard" component={Dashboard} />
        <Route path="/admin/ecosystem" component={Ecosystem} />
        <Route path="/admin/scholarships" component={Scholarships} />
        <Route path="/admin/jobs" component={Jobs} />
        <Route path="/admin/events" component={Events} />
        <Route path="/admin/partners" component={Partners} />
        <Route path="/admin/blog" component={Blog} />
        <Route path="/admin/team" component={Team} />
        <Route path="/admin/users" component={Users} />
        <Route path="/admin/roles" component={Roles} />
        <Route path="/admin/applications" component={Applications} />
        <Route path="/admin/analytics" component={Analytics} />
        <Route path="/admin/activity" component={Activity} />
        <Route path="/admin/messages" component={Messages} />
        <Route path="/admin/media" component={Media} />
        <Route path="/admin/ai-chat" component={AiChat} />
        <Route path="/admin/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/auth" component={AuthPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={() => (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 flex items-center justify-center">
          <div className="text-center max-w-md p-8">
            <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} className="mx-auto mb-6 h-20 w-20 object-contain" />
            <h1 className="text-4xl font-bold text-foreground mb-4">{APP_NAME}</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Your comprehensive educational consulting platform for scholarships, job opportunities, and academic partnerships.
            </p>
            <a 
              href="/admin" 
              className="inline-flex items-center bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Access Admin Panel
            </a>
          </div>
        </div>
      )} />
      
      <Route path="/admin/:path*" component={AdminRouter} />
      <Route path="/admin" component={AdminRouter} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminRealtimeProvider>
          <Toaster />
          <Router />
        </AdminRealtimeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;


