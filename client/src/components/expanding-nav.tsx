import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import GlobalSearch from "@/components/global-search";
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
  CalendarDays,
  User,
  Settings,
  LogOut
} from "lucide-react";

import logoImg from "@assets/mtendere-logo.svg";

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
              { label: "Study Abroad", href: "/study-abroad", icon: Globe },
              { label: "University Applications", href: "/university-applications", icon: BookOpen },
              { label: "Events", href: "/events", icon: CalendarDays },
            ]
          },
          {
            title: "Career",
            icon: Briefcase,
            items: [
              { label: "Job Portal", href: "/jobs", icon: Briefcase },
              { label: "Career Counseling", href: "/career-counseling", icon: TrendingUp },
              { label: "Resume Building", href: "/resume-building", icon: User },
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
      label: "Events",
      href: "/events",
      active: location === "/events" || location.startsWith("/events/"),
    },
    {
      label: "Blog",
      href: "/blog",
      active: location === "/blog",
    },
    {
      label: "Team",
      href: "/team",
      active: location === "/team",
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
        isScrolled
          ? 'border-b border-border/70 bg-background/95 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.55)] backdrop-blur-xl'
          : 'border-b border-white/60 bg-background/82 shadow-[0_12px_35px_-34px_rgba(15,23,42,0.45)] backdrop-blur-xl'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" onClick={closeMenu}>
            <div className="flex items-center group">
              <img
                src={logoImg}
                alt="Mtendere Education Consult"
                className="h-12 w-auto object-contain transform group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <div key={item.label} className="relative group">
                {item.dropdown ? (
                  <div>
                    <button
                      className="flex items-center space-x-1 text-foreground hover:text-mtendere-blue px-3 py-2 text-sm font-medium transition-colors"
                      onClick={() => toggleDropdown(item.dropdown!)}
                    >
                      <span>{item.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                        activeDropdown === item.dropdown ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    {/* Mega Menu */}
                    {activeDropdown === item.dropdown && item.megaMenu && (
                      <div className="absolute left-0 mt-2 w-96 overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.72)] backdrop-blur-xl animate-scale-in">
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
                                  className="flex items-center space-x-2 py-2 text-sm text-muted-foreground hover:text-mtendere-blue transition-colors"
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
                        : 'text-foreground hover:text-mtendere-blue'
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </div>

          <GlobalSearch className="hidden w-56 2xl:w-72 xl:block" />

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
                  <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.72)] backdrop-blur-xl animate-scale-in">
                    <div className="p-2">
                      <Link
                        href="/dashboard"
                        onClick={closeMenu}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-foreground/80 hover:bg-muted/60"
                      >
                        <User className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                      {(user.role === 'admin' || user.role === 'super_admin') && (
                        <Link
                          href="/admin"
                          onClick={closeMenu}
                          className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-foreground/80 hover:bg-muted/60"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-foreground/80 hover:bg-muted/60 w-full text-left"
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
                <Button asChild className="bg-mtendere-green hover:bg-mtendere-green/90">
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
              className="text-foreground hover:text-mtendere-blue"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden animate-slide-in">
            <div className="mt-2 space-y-1 rounded-b-2xl border border-border/70 bg-card/95 px-2 pb-4 pt-3 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.7)] backdrop-blur-xl">
              <div className="px-1 pb-2">
                <GlobalSearch onNavigate={closeMenu} placeholder="Search scholarships, jobs, blogs..." />
              </div>
              {navItems.map((item) => (
                <div key={item.label}>
                  {item.dropdown ? (
                    <div>
                      <button
                        className="flex items-center justify-between w-full px-3 py-2 text-base font-medium text-foreground hover:text-mtendere-blue"
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
                                  className="flex items-center space-x-2 pl-6 py-2 text-sm text-muted-foreground hover:text-mtendere-blue"
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
                          ? 'text-mtendere-blue bg-mtendere-blue/10'
                          : 'text-foreground hover:text-mtendere-blue hover:bg-muted/60'
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
                      className="block px-3 py-2 text-base font-medium text-foreground hover:text-mtendere-blue"
                    >
                      Dashboard
                    </Link>
                    {(user.role === 'admin' || user.role === 'super_admin') && (
                      <Link
                        href="/admin"
                        onClick={closeMenu}
                        className="block px-3 py-2 text-base font-medium text-foreground hover:text-mtendere-blue"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-foreground hover:text-mtendere-blue"
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


