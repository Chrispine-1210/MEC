import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, BookOpen, GraduationCap, Search, ArrowLeft } from "lucide-react";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-mtendere-blue/5 via-background to-mtendere-green/10 p-6 text-center">
      <div className="premium-card w-full max-w-lg rounded-3xl p-7 md:p-10">
        <div className="mb-8">
          <Link href="/">
            <img
              src={BRAND_LOGO_SRC}
              alt={BRAND_NAME}
              className="h-12 w-auto object-contain mx-auto"
            />
          </Link>
        </div>

        <div className="text-8xl font-black text-mtendere-blue/20 mb-4 leading-none">404</div>
        
        <h1 className="text-2xl md:text-3xl font-black text-foreground mb-3">
          Page not found
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Button asChild className="bg-mtendere-blue hover:bg-mtendere-blue/90 text-white font-bold">
            <Link href="/">
              <Home className="mr-2 w-4 h-4" />
              Go to Homepage
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white font-bold">
            <Link href="/scholarships">
              <GraduationCap className="mr-2 w-4 h-4" />
              Browse Scholarships
            </Link>
          </Button>
        </div>

        <div className="border-t border-border/60 pt-8">
          <p className="text-sm text-muted-foreground/70 mb-4">You might be looking for:</p>
          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
            {[
              { href: "/study-abroad", label: "Study Abroad", icon: BookOpen },
              { href: "/jobs", label: "Job Portal", icon: Search },
              { href: "/blog", label: "Blog & News", icon: BookOpen },
              { href: "/contact", label: "Contact Us", icon: ArrowLeft },
            ].map((link) => (
              <Link key={link.href} href={link.href}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-mtendere-blue transition-colors py-2 px-3 rounded-lg hover:bg-mtendere-blue/5">
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


