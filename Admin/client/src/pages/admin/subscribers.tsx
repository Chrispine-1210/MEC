import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import DataTable from "@/components/admin/DataTable";
import { authFetch } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { getInitialUrlSearchParam } from "@/hooks/use-url-search-param";
import {
  CalendarPlus,
  Clock3,
  Download,
  Mail,
  RefreshCw,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

type AdminSubscriber = {
  id: number;
  email: string;
  name?: string | null;
  status: string;
  preferences?: string[] | null;
  source?: string | null;
  verifiedAt?: string | null;
  unsubscribedAt?: string | null;
  lastEmailAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type SubscriberSummary = {
  total: number;
  active: number;
  pending: number;
  unsubscribed: number;
  newToday: number;
};

type SubscribersResponse = {
  subscribers: AdminSubscriber[];
  total: number;
  summary: SubscriberSummary;
  sources?: string[];
};

const statusStyles: Record<string, string> = {
  active: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  unsubscribed: "bg-muted text-muted-foreground",
  suppressed: "bg-destructive/15 text-destructive",
};

const formatLabel = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function SubscribersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(() => getInitialUrlSearchParam());
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<SubscribersResponse>({
    queryKey: ["/api/admin/subscribers", page, limit, search, status, source],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
      });
      if (status !== "all") params.set("status", status);
      if (source !== "all") params.set("source", source);

      const response = await authFetch(`/api/admin/subscribers?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch subscribers");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleExport = async () => {
    try {
      const response = await authFetch("/api/admin/subscribers/export");
      if (!response.ok) throw new Error("Failed to export subscribers");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mtendere-subscribers.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not export subscribers.",
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      key: "name",
      header: "Subscriber",
      render: (value: string | null, row: AdminSubscriber) => (
        <div className="flex min-w-56 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{value || "Newsletter subscriber"}</p>
            <p className="truncate text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value: string) => (
        <Badge className={`border-0 capitalize ${statusStyles[value] || "bg-muted text-muted-foreground"}`}>
          {formatLabel(value)}
        </Badge>
      ),
    },
    {
      key: "preferences",
      header: "Interests",
      render: (value: string[] | null) => (
        <div className="flex max-w-64 flex-wrap gap-1">
          {(value || []).length > 0 ? (
            (value || []).map((preference) => (
              <Badge key={preference} variant="secondary" className="font-normal">
                {formatLabel(preference)}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">None selected</span>
          )}
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (value: string | null) => (
        <span className="text-sm text-muted-foreground">{value ? formatLabel(value) : "Website"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Subscribed",
      render: (value: string | null) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {value ? new Date(value).toLocaleString() : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Contact",
      render: (_value: unknown, row: AdminSubscriber) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <a href={`mailto:${row.email}`} aria-label={`Email ${row.email}`}>
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Email subscriber</TooltipContent>
        </Tooltip>
      ),
    },
  ];

  const summary = data?.summary;
  const metricCards = [
    { label: "Total subscribers", value: summary?.total ?? 0, icon: Users, color: "text-primary" },
    { label: "Active", value: summary?.active ?? 0, icon: UserCheck, color: "text-success" },
    { label: "Pending confirmation", value: summary?.pending ?? 0, icon: Clock3, color: "text-warning" },
    { label: "Unsubscribed", value: summary?.unsubscribed ?? 0, icon: UserMinus, color: "text-muted-foreground" },
    { label: "New today", value: summary?.newToday ?? 0, icon: CalendarPlus, color: "text-info" },
  ];

  return (
    <div className="space-y-6">
      <SEO title="Subscribers" description="Newsletter audience and consent status." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Subscribers</h1>
            <p className="text-muted-foreground">Newsletter audience and confirmation status.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <metric.icon className={`h-8 w-8 shrink-0 ${metric.color}`} />
              <div className="min-w-0">
                <p className="text-2xl font-bold">{metric.value.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label="Filter by subscription status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending confirmation</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            <SelectItem value="suppressed">Suppressed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={source}
          onValueChange={(value) => {
            setSource(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label="Filter by subscription source">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {(data?.sources || []).map((item) => (
              <SelectItem key={item} value={item}>{formatLabel(item)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.subscribers || []}
        loading={isLoading}
        filterable={false}
        pagination={{
          page,
          limit,
          total: data?.total || 0,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
        searchPlaceholder="Search by name, email, source, status, or interest..."
        onSearch={handleSearch}
      />
    </div>
  );
}
