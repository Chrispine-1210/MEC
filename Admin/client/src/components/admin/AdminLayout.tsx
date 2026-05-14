import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-muted/30 text-foreground">
      {/* Sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex w-72 flex-col shadow-2xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 py-4 sm:py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
