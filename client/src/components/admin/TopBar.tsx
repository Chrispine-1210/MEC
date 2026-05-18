import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { type User } from "@shared/schema";
import { authFetch, apiRequest, queryClient } from "@/lib/queryClient";
import { canCreateContent, canManageUsers, canUseAiAssistant } from "@/lib/admin-rbac";
import { useToast } from "@/hooks/use-toast";
import { useAdminRealtime } from "@/hooks/use-admin-realtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Menu,
  Search,
  Bell,
  User as UserIcon,
  Settings,
  LogOut,
  Plus,
  MessageSquare,
  ChevronDown,
  GraduationCap,
  Briefcase,
  FileText,
  Building2,
  Users,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";

interface TopBarProps {
  onMenuClick: () => void;
}

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const [location, setLocation] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const { toast } = useToast();
  const { isConnected } = useAdminRealtime();
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifData, isLoading: notifLoading } = useQuery<{ notifications: AdminNotification[]; total: number }>({
    queryKey: ["/api/admin/notifications"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/notifications?limit=20");
      if (!res.ok) return { notifications: [], total: 0 };
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const notifications = notifData?.notifications ?? [];
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const role = user?.role ?? "viewer";
  const canCreate = canCreateContent(role);
  const canManage = canManageUsers(role);
  const canUseAi = canUseAiAssistant(role);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await authFetch(`/api/admin/notifications/${id}/read`, {
        method: "PUT",
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await authFetch("/api/admin/notifications/read-all", {
        method: "PUT",
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast({ title: "Search", description: `Searching for: ${searchQuery}` });
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/auth/logout");
      localStorage.removeItem("token");
      queryClient.setQueryData(["/api/user"], null);
      toast({ title: "Logged out", description: "See you next time!" });
      setLocation("/admin/auth");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout failed", description: error.message });
    }
  };

  const navigateCreate = (path: string) => {
    setLocation(`${path}?action=create`);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />;
      case "warning": return <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />;
      case "error": return <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />;
      default: return <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border/60 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Left side */}
        <div className="flex min-w-0 items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <form onSubmit={handleSearch} className="hidden sm:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users, content, applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-72 xl:w-80 bg-muted/60 border-border/70 focus:bg-background transition-colors"
              />
            </div>
          </form>
        </div>

        {/* Right side */}
        <div className="flex shrink-0 items-center space-x-1 sm:space-x-2">
          <Badge
            variant="outline"
            className={`hidden md:inline-flex border-0 ${
              isConnected ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}
          >
            <span
              className={`mr-2 h-1.5 w-1.5 rounded-full ${
                isConnected ? "bg-success animate-pulse" : "bg-warning"
              }`}
            />
            {isConnected ? "Live sync" : "Reconnecting"}
          </Badge>

          {canCreate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="hidden sm:flex bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create
                  <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">Quick Create</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigateCreate("/admin/scholarships")} className="cursor-pointer">
                  <GraduationCap className="h-4 w-4 mr-2 text-primary" />
                  New Scholarship
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateCreate("/admin/jobs")} className="cursor-pointer">
                  <Briefcase className="h-4 w-4 mr-2 text-success" />
                  New Job Posting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateCreate("/admin/blog")} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2 text-info" />
                  New Blog Post
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateCreate("/admin/partners")} className="cursor-pointer">
                  <Building2 className="h-4 w-4 mr-2 text-warning" />
                  New Partner
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigateCreate("/admin/team")} className="cursor-pointer">
                  <Users className="h-4 w-4 mr-2 text-accent" />
                  New Team Member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Notifications */}
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-96" align="end">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div>
                  <h4 className="font-semibold text-sm">Notifications</h4>
                  {unreadCount > 0 && (
                    <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary hover:text-primary/80 h-auto py-1"
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                  >
                    {markAllReadMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark all read"}
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-96">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors ${!notif.isRead ? "bg-primary/10" : ""}`}
                        onClick={() => !notif.isRead && markReadMutation.mutate(notif.id)}
                      >
                        <div className="flex items-start space-x-3">
                          {getNotifIcon(notif.type)}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-snug ${!notif.isRead ? "text-foreground" : "text-foreground/80"}`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                              {notif.message}
                            </p>
                            <p className="text-[11px] text-muted-foreground/70 mt-1">
                              {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : "recently"}
                            </p>
                          </div>
                          {!notif.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">No new notifications</p>
                  </div>
                )}
              </ScrollArea>
              {notifications.length > 0 && (
                <>
                  <Separator />
                  <div className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary w-full"
                      onClick={() => { setLocation("/admin/activity"); setNotifOpen(false); }}
                    >
                      View all activity
                    </Button>
                  </div>
                </>
              )}
            </PopoverContent>
          </Popover>

          {canUseAi && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/admin/ai-chat")}
              title="AI Chat Monitor"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          )}

          {/* Profile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2 pl-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={(user as any)?.profileImage || (user as any)?.profilePicture || ""} />
                  <AvatarFallback className="bg-primary text-white text-sm font-semibold uppercase">
                    {user?.firstName?.[0] || user?.username?.[0] || <UserIcon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-none">{user?.firstName || user?.username || "Admin"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user?.role || "admin"}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {canManage && (
                <DropdownMenuItem onClick={() => setLocation("/admin/users")} className="cursor-pointer">
                  <UserIcon className="h-4 w-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setLocation("/admin/settings")} className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile search */}
      <div className="sm:hidden px-4 pb-3">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full bg-muted/60"
            />
          </div>
        </form>
      </div>
    </header>
  );
}



