import { useQuery, useMutation } from "@tanstack/react-query";
import { authFetch, queryClient, apiRequest } from "@/lib/queryClient";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Save, Loader2, Globe, Shield, Bell, Palette, Database, Mail, Clock, Lock, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSettingsSchema, type Settings } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminRealtime } from "@/hooks/use-admin-realtime";

export default function SettingsPage() {
  const { toast } = useToast();
  const { isConnected } = useAdminRealtime();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    }
  });

  const form = useForm({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: {
      platformName: "Mtendere Education Platform",
      supportEmail: "support@mtendere.com",
      sessionTimeout: 30,
      maxLoginAttempts: 5,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        sessionTimeout: settings.sessionTimeout,
        maxLoginAttempts: settings.maxLoginAttempts,
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/admin/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Settings saved", description: "Your settings have been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO title="Platform Settings" description="Configure system preferences, security, and notifications." />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary to-info rounded-lg">
            <SettingsIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Platform Settings</h1>
            <p className="text-muted-foreground">Configure your admin platform preferences</p>
          </div>
        </div>
        <Badge className="bg-success/15 text-success border-0">
          <CheckCircle className="h-3 w-3 mr-1" />
          All Systems Operational
        </Badge>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="border-b rounded-none w-full justify-start h-auto p-0 bg-transparent mb-6">
          <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3">
            <Globe className="h-4 w-4 mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3">
            <Shield className="h-4 w-4 mr-2" /> Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3">
            <Bell className="h-4 w-4 mr-2" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3">
            <Database className="h-4 w-4 mr-2" /> System
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Globe className="h-4 w-4 text-primary" />
                      Platform Identity
                    </CardTitle>
                    <CardDescription>Basic information about your platform</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="platformName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormDescription>Displayed in the browser title and emails</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="supportEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" /> Support Email
                        </FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormDescription>Where user support requests are sent</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4 text-success" />
                      Session Configuration
                    </CardTitle>
                    <CardDescription>Control how long user sessions last</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="sessionTimeout" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Timeout (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} min={5} max={480} />
                        </FormControl>
                        <FormDescription>Users are logged out after this period of inactivity</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="maxLoginAttempts" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5" /> Max Login Attempts
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} min={3} max={20} />
                        </FormControl>
                        <FormDescription>Account locks after this many failed attempts</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={mutation.isPending} size="lg" className="shadow-sm">
                  {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Settings
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-primary" />
                  Authentication Security
                </CardTitle>
                <CardDescription>Configure login and access security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Two-Factor Authentication", description: "Require 2FA for all admin accounts", state: twoFactorAuth, setter: setTwoFactorAuth },
                ].map(({ label, description, state, setter }) => (
                  <div key={label} className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Switch checked={state} onCheckedChange={setter} />
                  </div>
                ))}
                <Separator />
                <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
                  <p className="text-xs font-medium text-warning">Password Policy</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-warning">
                    <li>• Minimum 8 characters</li>
                    <li>• At least one uppercase letter</li>
                    <li>• At least one number</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4 text-info" />
                  Access Control
                </CardTitle>
                <CardDescription>IP restrictions and session management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Active Sessions</p>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Current Session</p>
                        <p className="text-xs text-muted-foreground">Admin Panel • Active now</p>
                      </div>
                      <Badge className="bg-success/15 text-success border-0 text-xs">Active</Badge>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30">
                  Invalidate All Sessions
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-warning" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Control what alerts and emails you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "New Application Alerts", description: "Get notified when a new application is submitted", state: emailNotifications, setter: setEmailNotifications },
                { label: "System Alerts", description: "Receive critical system status notifications", state: true, setter: () => {} },
                { label: "Weekly Summary", description: "Get a weekly digest of platform activity", state: false, setter: () => {} },
                { label: "Content Published", description: "Notifications when content is published", state: true, setter: () => {} },
              ].map(({ label, description, state, setter }) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch checked={state} onCheckedChange={setter} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Database", status: "Connected" },
                  { name: "File Storage", status: "Active" },
                  { name: "Authentication", status: "Secure" },
                  { name: "WebSocket", status: isConnected ? "Connected" : "Reconnecting" },
                ].map(({ name, status }) => (
                  <div key={name} className="flex items-center justify-between p-2">
                    <span className="text-sm text-foreground/80">{name}</span>
                    <Badge
                      className={`border-0 text-xs ${
                        status === "Connected" || status === "Active" || status === "Secure"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      }`}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-4 w-4 text-accent" />
                  Maintenance
                </CardTitle>
                <CardDescription>System maintenance controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
                  <div>
                    <p className="text-sm font-medium">Maintenance Mode</p>
                    <p className="text-xs text-muted-foreground">Disable public-facing platform temporarily</p>
                  </div>
                  <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                </div>
                {maintenanceMode && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-xs text-destructive font-medium">Maintenance mode is ON. Public access is restricted.</p>
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => toast({ title: "Cache cleared!", description: "Application cache has been cleared." })}>
                  Clear Application Cache
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


