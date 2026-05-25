import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  GraduationCap,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { resolveApiUrl } from "@/lib/api-base";
import { cn } from "@/lib/utils";

type GlobalSearchResult = {
  id: string | number;
  type: "scholarship" | "job" | "partner" | "blog" | "event" | "team";
  title: string;
  description?: string | null;
  href: string;
  category?: string | null;
  imageUrl?: string | null;
};

type GlobalSearchResponse = {
  query: string;
  results: GlobalSearchResult[];
  total: number;
};

type GlobalSearchProps = {
  className?: string;
  onNavigate?: () => void;
  placeholder?: string;
};

const resultIcons = {
  scholarship: GraduationCap,
  job: Briefcase,
  partner: Building2,
  blog: FileText,
  event: CalendarDays,
  team: Users,
};

const resultLabels = {
  scholarship: "Scholarship",
  job: "Job",
  partner: "Partner",
  blog: "Blog",
  event: "Event",
  team: "Team",
};

export default function GlobalSearch({
  className,
  onNavigate,
  placeholder = "Search opportunities...",
}: GlobalSearchProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  const { data, isFetching } = useQuery<GlobalSearchResponse>({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: async () => {
      const response = await fetch(resolveApiUrl(`/api/search?q=${encodeURIComponent(debouncedQuery)}`), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 15000,
  });

  const results = debouncedQuery.length >= 2 ? data?.results ?? [] : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearSearch = () => {
    setQuery("");
    setIsOpen(false);
  };

  const navigateTo = (result: GlobalSearchResult) => {
    setLocation(result.href);
    clearSearch();
    onNavigate?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      clearSearch();
      return;
    }

    if (event.key === "Enter" && results[0]) {
      event.preventDefault();
      navigateTo(results[0]);
    }
  };

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search Mtendere content"
          className="h-10 rounded-full border-border/70 bg-background/90 pl-9 pr-10 text-sm shadow-sm focus:border-mtendere-blue"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-lg border border-border/70 bg-card shadow-xl">
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {isFetching ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((result) => {
                  const Icon = resultIcons[result.type] ?? Search;
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => navigateTo(result)}
                      className="group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mtendere-blue/10 text-mtendere-blue">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {result.title}
                          </span>
                          <Badge variant="secondary" className="shrink-0 border-0 bg-muted text-[10px] text-muted-foreground">
                            {resultLabels[result.type]}
                          </Badge>
                        </span>
                        {result.description ? (
                          <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {result.description}
                          </span>
                        ) : null}
                      </span>
                      <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results for "{debouncedQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

