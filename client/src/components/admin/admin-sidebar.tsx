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
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
  Home
} from "lucide-react";

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
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-mtendere-dark text-white transform transition-transform duration-300 z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-xl mb-1">
                Mtendere <span className="text-mtendere-orange">Admin</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <Badge variant="secondary" className={`text-xs ${isConnected ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'}`}>
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden text-white hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-mtendere-blue to-mtendere-green rounded-full flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-medium">{user?.firstName} {user?.lastName}</div>
              <div className="text-sm text-gray-400 capitalize">{user?.role}</div>
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
                    ? 'bg-mtendere-blue text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-white' : item.color}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <Button asChild variant="ghost" className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white">
            <Link href="/">
              <Home className="w-5 h-5 mr-3" />
              Back to Website
            </Link>
          </Button>
          
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>

        {/* Connection Status */}
        <div className="p-4 bg-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Real-time Status</span>
            <div className="flex items-center space-x-1">
              <Activity className={`w-3 h-3 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
