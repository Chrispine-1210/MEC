import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Info } from "lucide-react";
import { type User } from "@shared/schema";
import { ADMIN_APP_NAME, BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";

type MfaSetupPayload = {
  message: string;
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  account: string;
  issuer: string;
  type: "totp";
  digits: number;
  period: number;
};

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password must be 128 characters or fewer")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number")
    .regex(/[^A-Za-z0-9]/, "Password must include a symbol"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["viewer", "writer"]).default("viewer"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;
type RegistrationConflictPayload = {
  message?: string;
  fields?: Partial<Record<keyof RegisterFormValues, string>>;
};

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingMfaChallengeToken, setPendingMfaChallengeToken] = useState<string | null>(null);
  const [pendingMfaSetup, setPendingMfaSetup] = useState<MfaSetupPayload | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [pendingCredentials, setPendingCredentials] = useState<{ username: string; password: string } | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", firstName: "", lastName: "", role: "viewer" as const },
  });

  async function finalizeSession(token: string, user: User) {
    localStorage.setItem("token", token);
    queryClient.setQueryData(["/api/user"], user);
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });

    try {
      const statusRes = await apiRequest("GET", "/auth/mfa/status");
      const status = await statusRes.json();
      if (status.mfaRequiredForRole && !status.mfaEnabled) {
        const setupRes = await apiRequest("POST", "/auth/mfa/setup", {});
        const setupData = (await setupRes.json()) as MfaSetupPayload;
        setPendingMfaSetup(setupData);
        setSecretCopied(false);
        toast({
          title: "Admin MFA setup required",
          description: "You chose an admin role. Use the setup panel to continue.",
        });
        return;
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "MFA status check failed",
        description: error.message,
      });
      return;
    }

    toast({ title: "Welcome back!", description: `Logged in as ${user.username}` });
    setLocation("/admin");
  }

  async function onLogin(data: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      setPendingCredentials({ username: data.username, password: data.password });
      const res = await apiRequest("POST", "/auth/login", data);
      const body = await res.json();

      if (body.mfaRequired && body.challengeToken) {
        setPendingMfaChallengeToken(body.challengeToken);
        setMfaCode("");
        toast({
          title: "MFA verification required",
          description: "Enter your 6-digit authenticator code to continue.",
        });
        return;
      }

      await finalizeSession(body.token, body.user);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function onVerifyMfaChallenge() {
    if (!pendingMfaChallengeToken || !mfaCode.trim()) return;
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/auth/mfa/verify", {
        challengeToken: pendingMfaChallengeToken,
        code: mfaCode.trim(),
      });
      const body = await res.json();
      setPendingMfaChallengeToken(null);
      setMfaCode("");
      await finalizeSession(body.token, body.user);
    } catch (error: any) {
      toast({ variant: "destructive", title: "MFA verification failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function onEnableMfaSetup() {
    if (!pendingMfaSetup || !mfaCode.trim() || !pendingCredentials) return;
    setIsLoading(true);
    try {
      await apiRequest("POST", "/auth/mfa/enable", { code: mfaCode.trim() });
      const loginRes = await apiRequest("POST", "/auth/login", {
        username: pendingCredentials.username,
        password: pendingCredentials.password,
        mfaCode: mfaCode.trim(),
      });
      const loginBody = await loginRes.json();
      setPendingMfaSetup(null);
      setMfaCode("");
      setSecretCopied(false);
      await finalizeSession(loginBody.token, loginBody.user);
    } catch (error: any) {
      toast({ variant: "destructive", title: "MFA setup failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function onRegister(data: RegisterFormValues) {
    setIsLoading(true);
    try {
      setPendingCredentials({ username: data.username, password: data.password });
      const res = await apiRequest("POST", "/auth/register", data);
      const { token, user } = await res.json();
      await finalizeSession(token, user);
    } catch (error: any) {
      const payload = error?.payload as RegistrationConflictPayload | undefined;
      if (payload?.fields) {
        Object.entries(payload.fields).forEach(([field, message]) => {
          if (message) {
            registerForm.setError(field as keyof RegisterFormValues, { message });
          }
        });
      }
      toast({ variant: "destructive", title: "Registration failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function copyMfaSecret() {
    if (!pendingMfaSetup) return;
    try {
      await navigator.clipboard.writeText(pendingMfaSetup.secret);
      setSecretCopied(true);
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Select and copy the setup secret manually.",
      });
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-primary/5 via-background to-accent/10">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary to-chart-4 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg">
              <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} className="h-10 w-10 object-contain" />
            </div>
            <span className="text-white text-xl font-bold">{BRAND_NAME}</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Admin Management Platform
          </h1>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Manage scholarships, job opportunities, partners, blog content, and team members - all in one powerful dashboard.
          </p>
        </div>
        <div className="space-y-4">
          {[
            "Full content management with rich text editing",
            "Role-based access control and team management",
            "Real-time analytics and application tracking",
            "Image uploads with automatic optimization",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3 text-primary-foreground/80">
              <div className="w-5 h-5 rounded-full bg-card/30 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-card" />
              </div>
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} className="h-12 w-12 object-contain" />
            <span className="text-xl font-bold text-foreground">{ADMIN_APP_NAME}</span>
          </div>

          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>Sign in to manage your platform</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <Alert className="bg-primary/10 border-primary/20">
                      <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-primary text-xs">
                      Sign in with an existing portal account, or create a Viewer or Writer account below.
                    </AlertDescription>
                  </Alert>

                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <FormField control={loginForm.control} name="username" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={loginForm.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" {...field} />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </Form>

                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={registerForm.control} name="firstName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl><Input placeholder="First name" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={registerForm.control} name="lastName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl><Input placeholder="Last name" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={registerForm.control} name="username" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl><Input placeholder="Choose a username" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={registerForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={registerForm.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type={showPassword ? "text" : "password"} placeholder="12+ chars with number & symbol" {...field} />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={registerForm.control} name="role" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                              <SelectItem value="writer">Writer - Create & edit content</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                        {isLoading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>

              {pendingMfaChallengeToken && (
                <div className="mt-6 space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-medium text-foreground">Two-Factor Verification</p>
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit code from your authenticator app.
                  </p>
                  <Input
                    value={mfaCode}
                    onChange={(event) => setMfaCode(event.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    className="w-full"
                    onClick={onVerifyMfaChallenge}
                    disabled={isLoading || mfaCode.trim().length < 6}
                  >
                    {isLoading ? "Verifying..." : "Verify MFA Code"}
                  </Button>
                </div>
              )}

              {pendingMfaSetup && (
                <div className="mt-6 space-y-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
                  <p className="text-sm font-medium text-foreground">Set Up MFA to Continue</p>
                  <p className="text-xs text-muted-foreground">
                    Admin accounts require MFA. Scan the QR code with Google Authenticator, Microsoft Authenticator, Authy, or any TOTP app, then enter the generated 6-digit code.
                  </p>
                  <div className="rounded-xl border bg-white p-3 shadow-sm">
                    <img
                      src={pendingMfaSetup.qrCodeDataUrl}
                      alt={`MFA QR code for ${pendingMfaSetup.account}`}
                      className="mx-auto h-48 w-48"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border bg-background p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Issuer</span>
                      <p className="font-medium text-foreground">{pendingMfaSetup.issuer}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Code format</span>
                      <p className="font-medium text-foreground">
                        {pendingMfaSetup.digits} digits / {pendingMfaSetup.period}s
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Setup secret</p>
                    <div className="rounded border bg-background p-2 text-xs font-mono break-all">
                      {pendingMfaSetup.secret}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className="w-full" onClick={copyMfaSecret}>
                      {secretCopied ? "Secret Copied" : "Copy Secret"}
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <a href={pendingMfaSetup.otpauthUrl}>Open Authenticator</a>
                    </Button>
                  </div>
                  <Input
                    value={mfaCode}
                    onChange={(event) => setMfaCode(event.target.value)}
                    placeholder="Enter 6-digit setup code"
                    maxLength={6}
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    className="w-full"
                    onClick={onEnableMfaSetup}
                    disabled={isLoading || mfaCode.trim().length < 6}
                  >
                    {isLoading ? "Enabling..." : "Enable MFA and Continue"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



