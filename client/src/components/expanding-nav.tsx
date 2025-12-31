import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Menu, 
  X, 
  GraduationCap, 
  Briefcase, 
  Users, 
  Globe,
  BookOpen,
  TrendingUp,
  Award,
  Building,
  ChevronDown,
  User,
  Settings,
  LogOut
} from "lucide-react";

export default function ExpandingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const closeMenu = () => {
    setIsOpen(false);
    setActiveDropdown(null);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  const navItems = [
    {
      label: "Home",
      href: "/",
      active: location === "/",
    },
    {
      label: "Services",
      href: "#",
      dropdown: "services",
      megaMenu: {
        sections: [
          {
            title: "Education",
            icon: GraduationCap,
            items: [
              { label: "Scholarships", href: "/scholarships", icon: Award },
              { label: "Study Abroad", href: "/about", icon: Globe },
              { label: "University Applications", href: "/about", icon: BookOpen },
            ]
          },
          {
            title: "Career",
            icon: Briefcase,
            items: [
              { label: "Job Portal", href: "/jobs", icon: Briefcase },
              { label: "Career Counseling", href: "/about", icon: TrendingUp },
              { label: "Resume Building", href: "/about", icon: User },
            ]
          }
        ]
      }
    },
    {
      label: "Partners",
      href: "/partners",
      active: location === "/partners",
    },
    {
      label: "About",
      href: "/about",
      active: location === "/about",
    },
    {
      label: "Contact",
      href: "/contact",
      active: location === "/contact",
    },
  ];

  return (
    <nav 
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" onClick={closeMenu}>
            <div className="font-bold text-2xl">
              <span className="text-mtendere-blue">Mtendere</span>{" "}
              <span className="text-mtendere-green">Education</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <div key={item.label} className="relative group">
                {item.dropdown ? (
                  <div>
                    <button
                      className="flex items-center space-x-1 text-mtendere-dark hover:text-mtendere-blue px-3 py-2 text-sm font-medium transition-colors"
                      onClick={() => toggleDropdown(item.dropdown!)}
                    >
                      <span>{item.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                        activeDropdown === item.dropdown ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    {/* Mega Menu */}
                    {activeDropdown === item.dropdown && item.megaMenu && (
                      <div className="absolute left-0 mt-2 w-96 bg-white rounded-lg shadow-xl border animate-scale-in">
                        <div className="p-6 grid grid-cols-2 gap-6">
                          {item.megaMenu.sections.map((section) => (
                            <div key={section.title}>
                              <div className="flex items-center space-x-2 mb-3">
                                <section.icon className="w-5 h-5 text-mtendere-blue" />
                                <h4 className="font-semibold text-mtendere-blue">
                                  {section.title}
                                </h4>
                              </div>
                              {section.items.map((subItem) => (
                                <Link
                                  key={subItem.label}
                                  href={subItem.href}
                                  onClick={closeMenu}
                                  className="flex items-center space-x-2 py-2 text-sm text-gray-600 hover:text-mtendere-blue transition-colors"
                                >
                                  <subItem.icon className="w-4 h-4" />
                                  <span>{subItem.label}</span>
                                </Link>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      item.active
                        ? 'text-mtendere-blue border-b-2 border-mtendere-blue'
                        : 'text-mtendere-dark hover:text-mtendere-blue'
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* User Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <div className="relative group">
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2"
                  onClick={() => toggleDropdown('user')}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mtendere-blue to-mtendere-green flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">{user.firstName}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                
                {activeDropdown === 'user' && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border animate-scale-in">
                    <div className="p-2">
                      <Link
                        href="/dashboard"
                        onClick={closeMenu}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <User className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                      {(user.role === 'admin' || user.role === 'super_admin') && (
                        <Link
                          href="/admin"
                          onClick={closeMenu}
                          className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button asChild variant="outline" className="border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="bg-mtendere-green hover:bg-green-700">
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="text-mtendere-dark hover:text-mtendere-blue"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden animate-slide-in">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t">
              {navItems.map((item) => (
                <div key={item.label}>
                  {item.dropdown ? (
                    <div>
                      <button
                        className="flex items-center justify-between w-full px-3 py-2 text-base font-medium text-mtendere-dark hover:text-mtendere-blue"
                        onClick={() => toggleDropdown(item.dropdown!)}
                      >
                        <span>{item.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                          activeDropdown === item.dropdown ? 'rotate-180' : ''
                        }`} />
                      </button>
                      
                      {activeDropdown === item.dropdown && item.megaMenu && (
                        <div className="pl-4 space-y-2 animate-fade-in">
                          {item.megaMenu.sections.map((section) => (
                            <div key={section.title}>
                              <div className="flex items-center space-x-2 py-2 text-sm font-semibold text-mtendere-blue">
                                <section.icon className="w-4 h-4" />
                                <span>{section.title}</span>
                              </div>
                              {section.items.map((subItem) => (
                                <Link
                                  key={subItem.label}
                                  href={subItem.href}
                                  onClick={closeMenu}
                                  className="flex items-center space-x-2 pl-6 py-2 text-sm text-gray-600 hover:text-mtendere-blue"
                                >
                                  <subItem.icon className="w-3 h-3" />
                                  <span>{subItem.label}</span>
                                </Link>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      className={`block px-3 py-2 text-base font-medium transition-colors ${
                        item.active
                          ? 'text-mtendere-blue bg-blue-50'
                          : 'text-mtendere-dark hover:text-mtendere-blue hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}

              {/* Mobile User Actions */}
              <div className="pt-4 border-t">
                {user ? (
                  <div className="space-y-1">
                    <div className="flex items-center px-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mtendere-blue to-mtendere-green flex items-center justify-center mr-3">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={closeMenu}
                      className="block px-3 py-2 text-base font-medium text-mtendere-dark hover:text-mtendere-blue"
                    >
                      Dashboard
                    </Link>
                    {(user.role === 'admin' || user.role === 'super_admin') && (
                      <Link
                        href="/admin"
                        onClick={closeMenu}
                        className="block px-3 py-2 text-base font-medium text-mtendere-dark hover:text-mtendere-blue"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-mtendere-dark hover:text-mtendere-blue"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className="block px-3 py-2 text-base font-medium text-mtendere-blue"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={closeMenu}
                      className="block px-3 py-2 text-base font-medium bg-mtendere-green text-white rounded-md mx-3"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
