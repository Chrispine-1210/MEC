import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Mail, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiSubscriber } from "@/lib/api-types";

type SubscriberResponse = {
  subscribers: ApiSubscriber[];
  total: number;
};

const statusTone = (status: string) => {
  if (status === "active") return "bg-mtendere-green/15 text-mtendere-green border-mtendere-green/25";
  if (status === "unsubscribed") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-mtendere-orange/15 text-mtendere-orange border-mtendere-orange/25";
};

export default function SubscriberManager() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const query = {
    search: search || undefined,
    status: status === "all" ? undefined : status,
  };

  const { data, isLoading } = useQuery<SubscriberResponse>({
    queryKey: ["/api/admin/subscribers", query],
  });

  const subscribers = data?.subscribers || [];
  const stats = useMemo(() => {
    return subscribers.reduce(
      (acc, subscriber) => {
        acc.total += 1;
        if (subscriber.status === "active") acc.active += 1;
        if (subscriber.status === "pending") acc.pending += 1;
        if (subscriber.status === "unsubscribed") acc.unsubscribed += 1;
        return acc;
      },
      { total: 0, active: 0, pending: 0, unsubscribed: 0 },
    );
  }, [subscribers]);

  const exportCsv = () => {
    const header = ["Email", "Name", "Status", "Preferences", "Source", "Created"];
    const rows = subscribers.map((subscriber) => [
      subscriber.email,
      subscriber.name || "",
      subscriber.status,
      (subscriber.preferences || []).join("; "),
      subscriber.source || "",
      subscriber.createdAt || "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mtendere-subscribers.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: "Visible Results", value: stats.total, tone: "text-mtendere-blue" },
          { label: "Active", value: stats.active, tone: "text-mtendere-green" },
          { label: "Pending", value: stats.pending, tone: "text-mtendere-orange" },
          { label: "Unsubscribed", value: stats.unsubscribed, tone: "text-destructive" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className={`text-2xl font-bold ${item.tone}`}>{item.value}</p>
              </div>
              <Users className="h-6 w-6 text-muted-foreground/50" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-mtendere-blue">Subscription Management</CardTitle>
              <CardDescription>Review double opt-in status, segment preferences, and export subscribers.</CardDescription>
            </div>
            <Button variant="outline" onClick={exportCsv} disabled={subscribers.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by email or name"
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : subscribers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-10 text-center">
              <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">No subscribers match this view.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_1fr] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <span>Subscriber</span>
                <span>Status</span>
                <span>Source</span>
                <span>Preferences</span>
              </div>
              <div className="divide-y">
                {subscribers.map((subscriber) => (
                  <div key={subscriber.id} className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr] md:items-center">
                    <div>
                      <p className="font-semibold text-foreground">{subscriber.email}</p>
                      <p className="text-xs text-muted-foreground">{subscriber.name || "No name"} - {subscriber.createdAt ? new Date(subscriber.createdAt).toLocaleDateString() : "New"}</p>
                    </div>
                    <Badge variant="outline" className={statusTone(subscriber.status)}>
                      {subscriber.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{subscriber.source || "website"}</span>
                    <div className="flex flex-wrap gap-1">
                      {(subscriber.preferences || ["general"]).map((preference) => (
                        <Badge key={preference} variant="secondary" className="text-xs">
                          {preference}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
