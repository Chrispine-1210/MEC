import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Briefcase,
  Building2,
  FileText,
  UserCheck,
  MessageSquare,
  BarChart3,
  Shield,
  Settings,
  X,
  BookOpen,
  ClipboardList,
  Bot,
  Flame,
} from "lucide-react";

interface SidebarProps {
  onClose?: () => void;
}

const navigationItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Overview and stats"
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "Performance metrics"
  },
  {
    name: "Activity & Achievements",
    href: "/admin/activity",
    icon: Flame,
    description: "Track your progress",
    badge: "New"
  }
];

const contentManagement = [
  {
    name: "Scholarships",
    href: "/admin/scholarships",
    icon: GraduationCap,
    description: "Manage scholarships",
    badge: "12 new"
  },
  {
    name: "Job Opportunities",
    href: "/admin/jobs",
    icon: Briefcase,
    description: "Manage job postings",
    badge: "5 pending"
  },
  {
    name: "Partners",
    href: "/admin/partners",
    icon: Building2,
    description: "Educational partners"
  },
  {
    name: "Blog Posts",
    href: "/admin/blog",
    icon: FileText,
    description: "Content management"
  },
  {
    name: "Team Members",
    href: "/admin/team",
    icon: UserCheck,
    description: "Team profiles"
  }
];

const userManagement = [
  {
    name: "Users",
    href: "/admin/users",
    icon: Users,
    description: "User management"
  },
  {
    name: "Applications",
    href: "/admin/applications",
    icon: ClipboardList,
    description: "User applications",
    badge: "23 new"
  },
  {
    name: "Roles & Permissions",
    href: "/admin/roles",
    icon: Shield,
    description: "Access control"
  }
];

const aiFeatures = [
  {
    name: "AI Chat Assistant",
    href: "/admin/ai-chat",
    icon: Bot,
    description: "AI conversations",
    badge: "Beta"
  }
];

const systemSettings = [
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "System configuration"
  }
];

export default function Sidebar({ onClose }: SidebarProps) {
  const [location] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location === "/admin" || location === "/admin/dashboard";
    }
    return location.startsWith(href);
  };

  const canAccess = (item: any) => {
    if (!user) return false;
    const role = user.role;
    
    if (role === 'admin' || role === 'super_admin') return true;
    
    const editorRoutes = [
      "/admin", 
      "/admin/dashboard",
      "/admin/scholarships",
      "/admin/jobs",
      "/admin/partners",
      "/admin/blog",
      "/admin/team",
      "/admin/applications",
      "/admin/ai-chat"
    ];
    
    if (role === 'editor') {
      return editorRoutes.includes(item.href);
    }
    
    if (role === 'viewer') {
      const viewerRoutes = [
        "/admin",
        "/admin/dashboard",
        "/admin/scholarships",
        "/admin/jobs",
        "/admin/partners",
        "/admin/blog",
        "/admin/team",
        "/admin/applications"
      ];
      return viewerRoutes.includes(item.href);
    }
    
    return false;
  };

  const NavSection = ({ title, items }: { title: string; items: any[] }) => {
    const filteredItems = items.filter(canAccess);
    if (filteredItems.length === 0) return null;

    return (
      <div>
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {title}
        </h3>
        <nav className="space-y-1">
          {filteredItems.map((item) => (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={`w-full justify-start px-3 py-2 text-sm font-medium ${
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="mr-3 h-4 w-4" />
                <span className="flex-1 text-left">{item.name}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Logo and close button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Mtendere Education
            </h1>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
            data-testid="close-sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          <NavSection title="Main" items={navigationItems} />
          <Separator />
          <NavSection title="Content Management" items={contentManagement} />
          <Separator />
          <NavSection title="User Management" items={userManagement} />
          <Separator />
          <NavSection title="AI Features" items={aiFeatures} />
          <Separator />
          <NavSection title="System" items={systemSettings} />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              Admin User
            </p>
            <p className="text-xs text-gray-500 truncate">
              admin@mtendere.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}