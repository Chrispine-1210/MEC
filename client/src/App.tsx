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
import Jobs from "@/pages/jobs";
import Partners from "@/pages/partners";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import AIChat from "@/components/ai-chat";
import BackToTop from "@/components/back-to-top";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/scholarships" component={Scholarships} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/partners" component={Partners} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
