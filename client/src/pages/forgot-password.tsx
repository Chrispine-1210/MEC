import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { buildBotDefenseSubmission } from "@/lib/bot-defense";
import { getRecaptchaToken } from "@/lib/recaptcha";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [website, setWebsite] = useState("");
  const [company, setCompany] = useState("");
  const [homepage, setHomepage] = useState("");
  const { toast } = useToast();
  const markFormStarted = () => setFormStartedAt((current) => current ?? Date.now());

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const recaptchaToken = await getRecaptchaToken("password_reset_request");
      const security = await buildBotDefenseSubmission({
        flow: "password_reset_request",
        startedAt: formStartedAt,
        website,
        company,
        homepage,
        recaptchaToken,
      });
      const response = await apiRequest("POST", "/api/auth/forgot-password", {
        email: email.trim().toLowerCase(),
        ...security,
      });
      const payload = await response.json();
      toast({
        title: "Check your email",
        description: payload.message,
      });
      setEmail("");
    } catch (error) {
      toast({
        title: "Reset request failed",
        description: error instanceof Error ? error.message : "Please try again.",
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
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>Enter your account email and we will send a secure reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="hidden" aria-hidden="true">
              <Input tabIndex={-1} autoComplete="off" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} />
              <Input tabIndex={-1} autoComplete="off" name="company" value={company} onChange={(event) => setCompany(event.target.value)} />
              <Input tabIndex={-1} autoComplete="off" name="homepage" value={homepage} onChange={(event) => setHomepage(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  markFormStarted();
                  setEmail(event.target.value);
                }}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="h-11 w-full bg-mtendere-blue font-bold text-white hover:bg-mtendere-blue/90" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Reset Link
                </>
              )}
            </Button>
          </form>
          <Link href="/login" className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-mtendere-blue">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
