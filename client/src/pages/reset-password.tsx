import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { buildBotDefenseSubmission } from "@/lib/bot-defense";
import { getRecaptchaToken } from "@/lib/recaptcha";

const passwordRules = [
  (value: string) => value.length >= 12,
  (value: string) => /[a-z]/.test(value),
  (value: string) => /[A-Z]/.test(value),
  (value: string) => /[0-9]/.test(value),
  (value: string) => /[^A-Za-z0-9]/.test(value),
];

const getPasswordError = (password: string) => {
  if (password.length < 12) return "Password must be at least 12 characters";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must include a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol";
  return "";
};

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [website, setWebsite] = useState("");
  const [company, setCompany] = useState("");
  const [homepage, setHomepage] = useState("");
  const { toast } = useToast();
  const strength = passwordRules.filter((rule) => rule(password)).length * 20;
  const markFormStarted = () => setFormStartedAt((current) => current ?? Date.now());

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const passwordError = getPasswordError(password);
    if (passwordError) {
      toast({ title: "Password is not strong enough", description: passwordError, variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Confirm your new password.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken("password_reset_complete");
      const security = await buildBotDefenseSubmission({
        flow: "password_reset_complete",
        startedAt: formStartedAt,
        website,
        company,
        homepage,
        recaptchaToken,
      });
      await apiRequest("POST", "/api/auth/reset-password", { token, password, ...security });
      toast({ title: "Password reset", description: "Sign in with your new password." });
      setLocation("/login?reset=1");
    } catch (error) {
      toast({
        title: "Password reset failed",
        description: error instanceof Error ? error.message : "Please request a new reset link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-mtendere-blue via-mtendere-blue to-mtendere-green p-4">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.30),rgba(0,0,0,0.05)_45%,rgba(0,0,0,0.34))]" />
      <Card className="premium-card relative z-10 w-full max-w-md rounded-3xl border-white/20 bg-card/95 backdrop-blur-xl">
        <CardHeader className="text-center">
          <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} className="mx-auto mb-4 h-16 w-auto object-contain" />
          <CardTitle className="text-2xl">Create New Password</CardTitle>
          <CardDescription>Use a strong password that you have not used before.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="hidden" aria-hidden="true">
              <Input tabIndex={-1} autoComplete="off" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} />
              <Input tabIndex={-1} autoComplete="off" name="company" value={company} onChange={(event) => setCompany(event.target.value)} />
              <Input tabIndex={-1} autoComplete="off" name="homepage" value={homepage} onChange={(event) => setHomepage(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    markFormStarted();
                    setPassword(event.target.value);
                  }}
                  required
                  disabled={isLoading || !token}
                  className="pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-mtendere-green transition-all" style={{ width: `${strength}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  markFormStarted();
                  setConfirmPassword(event.target.value);
                }}
                required
                disabled={isLoading || !token}
              />
            </div>
            <Button type="submit" className="h-11 w-full bg-mtendere-green font-bold text-white hover:bg-mtendere-green/90" disabled={isLoading || !token}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
          {!token && <p className="mt-4 text-center text-sm text-destructive">This reset link is missing a token.</p>}
          <Link href="/forgot-password" className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-mtendere-blue">
            <ArrowLeft className="h-4 w-4" />
            Request another link
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
