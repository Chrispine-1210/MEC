import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { Link } from "wouter";
import { 
  LayoutDashboard,
  GraduationCap,
  Briefcase,
  Users,
  FileText,
  Star,
  Building,
  UserCheck,
  BarChart3,
  LogOut,
  Menu,
  X,
  Activity,
  Home,
  Mail,
  CalendarDays
} from "lucide-react";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ activeView, onViewChange, isOpen, onToggle }: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      color: 'text-mtendere-blue',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      color: 'text-mtendere-green',
    },
    {
      id: 'events',
      label: 'Events',
      icon: CalendarDays,
      color: 'text-mtendere-blue',
    },
    {
      id: 'scholarships',
      label: 'Scholarships',
      icon: GraduationCap,
      color: 'text-mtendere-orange',
    },
    {
      id: 'jobs',
      label: 'Jobs',
      icon: Briefcase,
      color: 'text-mtendere-blue',
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      color: 'text-mtendere-green',
    },
    {
      id: 'blog-posts',
      label: 'Blog Posts',
      icon: FileText,
      color: 'text-mtendere-orange',
    },
    {
      id: 'testimonials',
      label: 'Testimonials',
      icon: Star,
      color: 'text-mtendere-blue',
    },
    {
      id: 'partners',
      label: 'Partners',
      icon: Building,
      color: 'text-mtendere-green',
    },
    {
      id: 'team-members',
      label: 'Team Members',
      icon: UserCheck,
      color: 'text-mtendere-orange',
    },
    {
      id: 'subscribers',
      label: 'Subscribers',
      icon: Mail,
      color: 'text-mtendere-blue',
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border/60 transform transition-transform duration-300 z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border/60">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} className="h-10 w-10 object-contain" />
                <div className="font-bold text-xl">
                  Mtendere <span className="text-mtendere-orange">Admin</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-mtendere-green' : 'bg-destructive/80'}`}></div>
                <Badge variant="secondary" className={`text-xs ${isConnected ? 'bg-mtendere-green/20 text-mtendere-green' : 'bg-destructive/20 text-destructive'}`}>
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent/60"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-sidebar-border/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-mtendere-blue to-mtendere-green rounded-full flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-medium">{user?.firstName} {user?.lastName}</div>
              <div className="text-sm text-sidebar-foreground/70 capitalize">{user?.role}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  if (window.innerWidth < 1024) onToggle();
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeView === item.id
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-white' : item.color}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-sidebar-border/60 space-y-2">
          <Button asChild variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
            <Link href="/">
              <Home className="w-5 h-5 mr-3" />
              Back to Website
            </Link>
          </Button>
          
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>

        {/* Connection Status */}
        <div className="p-4 bg-sidebar-accent/80 border-t border-sidebar-border/60">
          <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
            <span>Real-time Status</span>
            <div className="flex items-center space-x-1">
              <Activity className={`w-3 h-3 ${isConnected ? 'text-mtendere-green/80' : 'text-destructive/80'}`} />
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

