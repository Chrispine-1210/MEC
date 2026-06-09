import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Eye, EyeOff, GraduationCap, Globe, Award, ArrowRight, ArrowLeft } from "lucide-react";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { getGovernedBackgroundImage } from "@/lib/image-governance";

export default function Login() {
  const [, setLocation] = useLocation();
  const notice = new URLSearchParams(window.location.search);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await login(email, password, rememberMe);
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
    <div className="flex min-h-screen">
      <div
        className="relative hidden overflow-hidden p-12 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between"
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
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-mtendere-blue/85 to-mtendere-green/80" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />

        <div className="relative z-10">
          <img
            src={BRAND_LOGO_SRC}
            alt={BRAND_NAME}
            className="h-14 w-auto object-contain brightness-0 invert"
          />
        </div>

        <div className="hero-panel relative z-10 rounded-3xl p-8">
          <blockquote className="mb-6 text-2xl font-bold leading-snug">
            "Education is the most powerful tool you can use to change the world."
          </blockquote>
          <p className="mb-10 text-sm text-white/80">- Nelson Mandela</p>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: GraduationCap, value: "10,000+", label: "Students" },
              { icon: Globe, value: "50+", label: "Countries" },
              { icon: Award, value: "95%", label: "Success Rate" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/15 bg-card/15 p-4 text-center shadow-lg shadow-black/10 backdrop-blur-sm"
              >
                <stat.icon className="mx-auto mb-2 h-5 w-5 text-mtendere-orange" />
                <div className="text-xl font-black">{stat.value}</div>
                <div className="text-xs text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-background p-6 md:p-8 lg:p-16">
        <div className="premium-card mx-auto w-full max-w-md rounded-3xl p-6 md:p-8">
          <div className="mb-8 lg:hidden">
            <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} className="h-12 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-black text-foreground">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to continue your educational journey</p>
            {(notice.get("verified") || notice.get("registered") || notice.get("reset")) && (
              <p className="mt-3 rounded-lg border border-mtendere-green/25 bg-mtendere-green/10 p-3 text-sm text-mtendere-green">
                {notice.get("reset")
                  ? "Your password has been reset. Sign in with your new password."
                  : notice.get("verified")
                    ? "Your email has been verified. You can sign in now."
                    : "Account created. You can sign in now; please verify your email when the message arrives."}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-foreground/80">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="mt-1.5 h-12 border-border/60 focus-visible:ring-mtendere-blue"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground/80">
                  Password
                </Label>
                <Link href="/forgot-password" className="text-xs font-semibold text-mtendere-blue hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 border-border/60 pr-12 focus-visible:ring-mtendere-blue"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground/80"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isLoading}
                aria-label="Remember this device"
              />
              <span>Remember this device</span>
            </label>

            <Button
              type="submit"
              className="h-12 w-full bg-mtendere-blue text-base font-bold text-white hover:bg-mtendere-blue/90"
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
            <Link href="/register" className="font-bold text-mtendere-blue hover:text-mtendere-blue">
              Create one free
            </Link>
          </p>

          <div className="mt-8 border-t border-border/40 pt-6 text-center">
            <Link
              href="/"
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground/70 transition-colors hover:text-mtendere-blue"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
