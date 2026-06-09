import { useEffect, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/hooks/use-websocket";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Referrals from "@/pages/referrals";
import Admin from "@/pages/admin";
import Scholarships from "@/pages/scholarships";
import ScholarshipDetail from "@/pages/scholarship-detail";
import Jobs from "@/pages/jobs";
import JobDetail from "@/pages/job-detail";
import Partners from "@/pages/partners";
import PartnerDetail from "@/pages/partner-detail";
import PartnershipOpportunities from "@/pages/partnership-opportunities";
import Events from "@/pages/events";
import EventDetail from "@/pages/event-detail";
import About from "@/pages/about";
import Team from "@/pages/team";
import TeamDetail from "@/pages/team-detail";
import Contact from "@/pages/contact";
import AIChat from "@/components/ai-chat";
import BackToTop from "@/components/back-to-top";
import RouteSEO from "@/components/RouteSEO";
import Blog from "@/pages/blog";
import BlogDetail from "@/pages/blog-detail";
import StudyAbroad from "@/pages/study-abroad";
import UniversityApplications from "@/pages/university-applications";
import CareerCounseling from "@/pages/career-counseling";
import ResumeBuilding from "@/pages/resume-building";
import {
  CompliancePage,
  PrivacyCenter,
  PrivacyPolicy,
  SecurityPage,
  TermsOfService,
  TransparencyCenter,
} from "@/pages/trust-legal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/referrals" component={Referrals} />
      <Route path="/admin" component={Admin} />
      <Route path="/scholarships/:id" component={ScholarshipDetail} />
      <Route path="/scholarships" component={Scholarships} />
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/partners/:id" component={PartnerDetail} />
      <Route path="/partners" component={Partners} />
      <Route path="/partnership-opportunities" component={PartnershipOpportunities} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/events" component={Events} />
      <Route path="/about" component={About} />
      <Route path="/team/:id" component={TeamDetail} />
      <Route path="/team" component={Team} />
      <Route path="/contact" component={Contact} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:id" component={BlogDetail} />
      <Route path="/study-abroad" component={StudyAbroad} />
      <Route path="/university-applications" component={UniversityApplications} />
      <Route path="/career-counseling" component={CareerCounseling} />
      <Route path="/resume-building" component={ResumeBuilding} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/security" component={SecurityPage} />
      <Route path="/privacy-center" component={PrivacyCenter} />
      <Route path="/transparency" component={TransparencyCenter} />
      <Route path="/compliance" component={CompliancePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ScrollRestoration() {
  const [location] = useLocation();
  const previousLocationRef = useRef<string | null>(null);
  const isPopNavigationRef = useRef(false);
  const scrollPositionsRef = useRef(new Map<string, { x: number; y: number }>());

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      isPopNavigationRef.current = true;
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const previousLocation = previousLocationRef.current;
    if (previousLocation) {
      scrollPositionsRef.current.set(previousLocation, {
        x: window.scrollX,
        y: window.scrollY,
      });
    }

    const savedPosition = scrollPositionsRef.current.get(location);
    window.requestAnimationFrame(() => {
      if (isPopNavigationRef.current && savedPosition) {
        window.scrollTo(savedPosition.x, savedPosition.y);
      } else {
        window.scrollTo({ left: 0, top: 0, behavior: "auto" });
      }
      isPopNavigationRef.current = false;
    });

    previousLocationRef.current = location;
  }, [location]);

  return null;
}

function App() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";

    const addVerificationMeta = (name: string, content?: string) => {
      if (!content) return;
      let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    addVerificationMeta("google-site-verification", import.meta.env.VITE_GOOGLE_SITE_VERIFICATION);
    addVerificationMeta("msvalidate.01", import.meta.env.VITE_BING_SITE_VERIFICATION);
    addVerificationMeta("yandex-verification", import.meta.env.VITE_YANDEX_SITE_VERIFICATION);
    addVerificationMeta("baidu-site-verification", import.meta.env.VITE_BAIDU_SITE_VERIFICATION);

    const ga4Id = import.meta.env.VITE_GA4_MEASUREMENT_ID;
    if (ga4Id && !document.querySelector(`script[data-mtendere-ga4="${ga4Id}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
      script.dataset.mtendereGa4 = ga4Id;
      document.head.appendChild(script);

      const win = window as typeof window & {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
      };
      win.dataLayer = win.dataLayer || [];
      win.gtag = (...args: unknown[]) => {
        win.dataLayer?.push(args);
      };
      win.gtag("js", new Date());
      win.gtag("config", ga4Id);
    }
  }, []);

  const shouldEnableAnalytics = import.meta.env.MODE === "production";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WebSocketProvider>
            <Toaster />
            <RouteSEO />
            <ScrollRestoration />
            <Router />
            <AIChat />
            <BackToTop />
            {shouldEnableAnalytics && <VercelAnalytics />}
          </WebSocketProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
