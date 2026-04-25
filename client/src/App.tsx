import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/hooks/use-websocket";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Scholarships from "@/pages/scholarships";
import ScholarshipDetail from "@/pages/scholarship-detail";
import Jobs from "@/pages/jobs";
import JobDetail from "@/pages/job-detail";
import Partners from "@/pages/partners";
import PartnerDetail from "@/pages/partner-detail";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import AIChat from "@/components/ai-chat";
import BackToTop from "@/components/back-to-top";
import Blog from "@/pages/blog";
import BlogDetail from "@/pages/blog-detail";
import StudyAbroad from "@/pages/study-abroad";
import UniversityApplications from "@/pages/university-applications";
import CareerCounseling from "@/pages/career-counseling";
import ResumeBuilding from "@/pages/resume-building";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/scholarships/:id" component={ScholarshipDetail} />
      <Route path="/scholarships" component={Scholarships} />
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/partners/:id" component={PartnerDetail} />
      <Route path="/partners" component={Partners} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:id" component={BlogDetail} />
      <Route path="/study-abroad" component={StudyAbroad} />
      <Route path="/university-applications" component={UniversityApplications} />
      <Route path="/career-counseling" component={CareerCounseling} />
      <Route path="/resume-building" component={ResumeBuilding} />
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
        <AuthProvider>
          <WebSocketProvider>
            <Toaster />
            <Router />
            <AIChat />
            <BackToTop />
          </WebSocketProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
