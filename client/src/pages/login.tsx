import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Eye, EyeOff, GraduationCap, Globe, Award, ArrowRight } from "lucide-react";
import logoImg from "@assets/mtendere-logo.svg";
import { getGovernedBackgroundImage } from "@/lib/image-governance";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        setLocation("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 text-white overflow-hidden"
        style={{
          backgroundImage: getGovernedBackgroundImage({
            module: "misc",
            title: "Mtendere account access",
            category: "education",
            variant: "hero",
          }),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-mtendere-blue/90 to-mtendere-green/80" />
        
        <div className="relative z-10">
          <img
            src={logoImg}
            alt="Mtendere Education Consult"
            className="h-14 w-auto object-contain brightness-0 invert"
          />
        </div>

        <div className="relative z-10">
          <blockquote className="text-2xl font-bold leading-snug mb-6">
            "Education is the most powerful tool you can use to change the world."
          </blockquote>
          <p className="text-white/80 mb-10 text-sm">— Nelson Mandela</p>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: GraduationCap, value: "10,000+", label: "Students" },
              { icon: Globe, value: "50+", label: "Countries" },
              { icon: Award, value: "95%", label: "Success Rate" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card/15 backdrop-blur-sm rounded-xl p-4 text-center">
                <stat.icon className="w-5 h-5 mx-auto mb-2 text-mtendere-orange" />
                <div className="text-xl font-black">{stat.value}</div>
                <div className="text-xs text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col justify-center p-8 lg:p-16 bg-card">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <img src={logoImg} alt="Mtendere Education Consult" className="h-12 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-foreground mb-2">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to continue your educational journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-foreground/80">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="mt-1.5 h-12 border-border/60 focus-visible:ring-mtendere-blue"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground/80">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 pr-12 border-border/60 focus-visible:ring-mtendere-blue"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground/80"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-mtendere-blue hover:bg-mtendere-blue/90 text-white font-bold text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-mtendere-blue hover:text-mtendere-blue font-bold">
              Create one free
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-border/40 text-center">
            <Link href="/" className="text-sm text-muted-foreground/70 hover:text-mtendere-blue flex items-center justify-center gap-1">
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}




