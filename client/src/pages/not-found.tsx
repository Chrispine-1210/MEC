import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, BookOpen, GraduationCap, Search, ArrowLeft } from "lucide-react";
import logoImg from "@assets/mtendere-logo.svg";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-mtendere-blue/5 to-mtendere-green/5 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-lg w-full">
        <div className="mb-8">
          <Link href="/">
            <img
              src={logoImg}
              alt="Mtendere Education Consult"
              className="h-12 w-auto object-contain mx-auto"
            />
          </Link>
        </div>

        <div className="text-8xl font-black text-mtendere-blue/20 mb-4 leading-none">404</div>
        
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">
          Page not found
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Button asChild className="bg-mtendere-blue hover:bg-blue-700 text-white font-bold">
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

        <div className="border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-400 mb-4">You might be looking for:</p>
          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
            {[
              { href: "/study-abroad", label: "Study Abroad", icon: BookOpen },
              { href: "/jobs", label: "Job Portal", icon: Search },
              { href: "/blog", label: "Blog & News", icon: BookOpen },
              { href: "/contact", label: "Contact Us", icon: ArrowLeft },
            ].map((link) => (
              <Link key={link.href} href={link.href}>
                <div className="flex items-center gap-2 text-sm text-gray-600 hover:text-mtendere-blue transition-colors py-2 px-3 rounded-lg hover:bg-mtendere-blue/5">
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
