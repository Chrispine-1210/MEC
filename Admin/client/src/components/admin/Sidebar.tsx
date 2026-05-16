import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { authFetch } from "@/lib/queryClient";
import { canAccessAdminPath } from "@/lib/admin-rbac";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Briefcase,
  Building2,
  FileText,
  UserCheck,
  BarChart3,
  Shield,
  Settings,
  X,
  BookOpen,
  ClipboardList,
  Bot,
  Flame,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [location] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/admin/dashboard/stats"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/dashboard/stats");
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const isActive = (href: string) => {
    if (href === "/admin") return location === "/admin" || location === "/admin/dashboard";
    return location.startsWith(href);
  };

  const canAccess = (item: any) => {
    if (!user) return false;
    return canAccessAdminPath(user.role, item.href);
  };

  const navigationItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard, description: "Overview and stats" },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3, description: "Performance metrics" },
    { name: "Activity", href: "/admin/activity", icon: Flame, description: "Track your progress", badge: "New" },
  ];

  const contentManagement = [
    { name: "Scholarships", href: "/admin/scholarships", icon: GraduationCap, description: "Manage scholarships", count: stats?.totalScholarships },
    { name: "Job Opportunities", href: "/admin/jobs", icon: Briefcase, description: "Manage job postings", count: stats?.totalJobs },
    { name: "Partners", href: "/admin/partners", icon: Building2, description: "Educational partners", count: stats?.totalPartners },
    { name: "Blog Posts", href: "/admin/blog", icon: FileText, description: "Content management", count: stats?.publishedPosts },
    { name: "Team Members", href: "/admin/team", icon: UserCheck, description: "Team profiles" },
  ];

  const userManagement = [
    { name: "Users", href: "/admin/users", icon: Users, description: "User management", count: stats?.totalUsers },
    { name: "Applications", href: "/admin/applications", icon: ClipboardList, description: "User applications", count: stats?.pendingApplications, countVariant: "warning" },
    { name: "Roles & Permissions", href: "/admin/roles", icon: Shield, description: "Access control" },
  ];

  const aiFeatures = [
    { name: "AI Chat Assistant", href: "/admin/ai-chat", icon: Bot, description: "AI conversations", badge: "Beta" },
  ];

  const systemSettings = [
    { name: "Settings", href: "/admin/settings", icon: Settings, description: "System configuration" },
  ];

  const NavItem = ({ item }: { item: any }) => {
    const active = isActive(item.href);
    return (
      <Link href={item.href}>
        <button
          className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
            active
              ? "bg-primary/10 text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <div className={`flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>
            <item.icon className="h-4 w-4" />
          </div>
          <span className="ml-3 flex-1 text-left truncate">{item.name}</span>
          {item.badge && (
            <Badge variant="secondary" className={`ml-1 text-xs px-1.5 py-0 ${item.badge === "New" ? "bg-success/15 text-success" : "bg-info/15 text-info"}`}>
              {item.badge}
            </Badge>
          )}
          {typeof item.count === "number" && item.count > 0 && (
            <Badge variant={item.countVariant === "warning" ? "destructive" : "secondary"} className={`ml-1 text-xs px-1.5 py-0 ${item.countVariant === "warning" ? "bg-warning/15 text-warning border-0" : "bg-muted text-muted-foreground"}`}>
              {item.count}
            </Badge>
          )}
          {active && <ChevronRight className="h-3 w-3 ml-1 text-primary/70" />}
        </button>
      </Link>
    );
  };

  const NavSection = ({ title, items }: { title: string; items: any[] }) => {
    const filtered = items.filter(canAccess);
    if (filtered.length === 0) return null;
    return (
      <div>
        <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{title}</p>
        <nav className="space-y-0.5">
          {filtered.map((item) => <NavItem key={item.name} item={item} />)}
        </nav>
      </div>
    );
  };

  const roleColors: Record<string, string> = {
    super_admin: "bg-info/15 text-info",
    admin: "bg-primary/15 text-primary",
    editor: "bg-success/15 text-success",
    viewer: "bg-muted text-muted-foreground",
  };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col border-r border-border/60 shadow-sm bg-card admin-sidebar">
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-chart-4 rounded-xl flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-none">Mtendere</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">Education Admin</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden h-7 w-7 p-0 hover:bg-muted">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4 scrollbar-thin">
          <div className="space-y-5">
            <NavSection title="Overview" items={navigationItems} />
            <Separator className="mx-2" />
            <NavSection title="Content" items={contentManagement} />
            <Separator className="mx-2" />
            <NavSection title="People" items={userManagement} />
            <Separator className="mx-2" />
            <NavSection title="Intelligence" items={aiFeatures} />
            <Separator className="mx-2" />
            <NavSection title="System" items={systemSettings} />
          </div>
        </ScrollArea>

        {/* Footer / User */}
        <div className="border-t border-border/60 p-3">
          {stats?.pendingApplications > 0 && (
            <div className="mb-3 p-2.5 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-xs font-medium text-warning flex items-center gap-1.5">
                <ClipboardList className="h-3 w-3" />
                {stats.pendingApplications} application{stats.pendingApplications !== 1 ? "s" : ""} need review
              </p>
            </div>
          )}
          <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={(user as any)?.profileImage || (user as any)?.profilePicture || ""} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-chart-4 text-white text-xs font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0] || user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username || "Admin User"}
              </p>
              <Badge className={`text-[10px] px-1.5 py-0 h-4 border-0 ${roleColors[user?.role || "viewer"] || roleColors.viewer}`}>
                {user?.role?.replace("_", " ") || "viewer"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
