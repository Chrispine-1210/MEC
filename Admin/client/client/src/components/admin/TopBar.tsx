import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const [location, setLocation] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications] = useState([
    {
      id: 1,
      title: "New scholarship application",
      message: "John Doe applied for MIT Scholarship",
      time: "2 minutes ago",
      unread: true,
    },
    {
      id: 2,
      title: "Job posting approved",
      message: "Software Engineer at TechCorp has been published",
      time: "1 hour ago",
      unread: true,
    },
    {
      id: 3,
      title: "Partner verification complete",
      message: "Harvard University has been verified",
      time: "3 hours ago",
      unread: false,
    },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/auth/logout");
      localStorage.removeItem("token");
      queryClient.setQueryData(["/api/user"], null);
      toast({ title: "Logged out", description: "See you next time!" });
      setLocation("/auth");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout failed", description: error.message });
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onMenuClick}
            data-testid="mobile-menu-button"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden sm:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users, content, applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-80"
                data-testid="search-input"
              />
            </div>
          </form>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Quick actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="quick-actions">
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="create-scholarship">
                <Plus className="h-4 w-4 mr-2" />
                New Scholarship
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="create-job">
                <Plus className="h-4 w-4 mr-2" />
                New Job Posting
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="create-blog-post">
                <Plus className="h-4 w-4 mr-2" />
                New Blog Post
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="create-partner">
                <Plus className="h-4 w-4 mr-2" />
                New Partner
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="relative" data-testid="notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between p-4 border-b">
                <h4 className="font-semibold text-sm">Notifications</h4>
                <Button variant="ghost" size="sm" className="text-xs">
                  Mark all as read
                </Button>
              </div>
              <ScrollArea className="max-h-80">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                        notification.unread ? "bg-blue-50" : ""
                      }`}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.time}
                          </p>
                        </div>
                        {notification.unread && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No new notifications</p>
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* AI Chat */}
          <Button variant="ghost" size="sm" data-testid="ai-chat-button">
            <MessageSquare className="h-5 w-5" />
          </Button>

          {/* Profile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2" data-testid="profile-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImage || ""} />
                  <AvatarFallback className="bg-blue-600 text-white uppercase">
                    {user?.username?.[0] || <UserIcon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">{user?.username || "Admin User"}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="profile-settings">
                <UserIcon className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="system-settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={handleLogout} data-testid="logout">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile search */}
      <div className="sm:hidden px-4 pb-4">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
              data-testid="mobile-search-input"
            />
          </div>
        </form>
      </div>
    </header>
  );
}