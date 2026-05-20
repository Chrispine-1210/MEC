import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/queryClient";
import {
  Target,
  Zap,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  Flame,
} from "lucide-react";

interface Activity {
  id: string;
  action: string;
  timestamp: string;
  impact: number;
  category: "scholarship" | "job" | "blog" | "user" | "application";
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  target: number;
  unlocked: boolean;
}

const achievements: Achievement[] = [
  {
    id: "1",
    title: "Content Creator",
    description: "Create 10 pieces of content",
    icon: <Zap className="h-5 w-5" />,
    progress: 7,
    target: 10,
    unlocked: false,
  },
  {
    id: "2",
    title: "Community Builder",
    description: "Add 20 team members",
    icon: <Award className="h-5 w-5" />,
    progress: 12,
    target: 20,
    unlocked: false,
  },
  {
    id: "3",
    title: "Goal Getter",
    description: "Review 50 applications",
    icon: <Target className="h-5 w-5" />,
    progress: 28,
    target: 50,
    unlocked: false,
  },
  {
    id: "4",
    title: "On Fire!",
    description: "Maintain 7-day streak",
    icon: <Flame className="h-5 w-5" />,
    progress: 5,
    target: 7,
    unlocked: false,
  },
];

export default function ActivityTracker() {
  const { data, isLoading } = useQuery<{ activity: Array<{ id: string; action: string; entityType: string; createdAt: string }> }>({
    queryKey: ["/api/admin/dashboard/recent-activity"],
    queryFn: async () => {
      const response = await authFetch("/api/admin/dashboard/recent-activity");
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const activities = useMemo<Activity[]>(() => {
    const pointsByCategory: Record<Activity["category"], number> = {
      scholarship: 120,
      job: 100,
      blog: 80,
      user: 90,
      application: 60,
    };

    const toCategory = (value: string): Activity["category"] => {
      if (value.includes("scholarship")) return "scholarship";
      if (value.includes("job")) return "job";
      if (value.includes("blog")) return "blog";
      if (value.includes("application")) return "application";
      return "user";
    };

    return (data?.activity ?? []).map((item) => {
      const category = toCategory(item.entityType.toLowerCase());
      return {
        id: item.id,
        action: item.action.replace(/_/g, " "),
        timestamp: item.createdAt,
        impact: pointsByCategory[category],
        category,
      };
    });
  }, [data]);

  const streak = useMemo(() => {
    const uniqueDays = Array.from(
      new Set(
        activities.map((activity) => new Date(activity.timestamp).toISOString().slice(0, 10)),
      ),
    ).sort((a, b) => (a > b ? -1 : 1));

    let runningStreak = 0;
    let cursor = new Date();
    for (const day of uniqueDays) {
      const cursorDay = cursor.toISOString().slice(0, 10);
      if (day !== cursorDay) break;
      runningStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return runningStreak;
  }, [activities]);

  const totalPoints = activities.reduce((sum, activity) => sum + activity.impact, 0);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      scholarship: "bg-gradient-to-r from-primary/15 to-primary/5 border-primary/20",
      job: "bg-gradient-to-r from-success/15 to-success/5 border-success/20",
      blog: "bg-gradient-to-r from-info/15 to-info/5 border-info/20",
      user: "bg-gradient-to-r from-warning/15 to-warning/5 border-warning/20",
      application: "bg-gradient-to-r from-accent/15 to-accent/5 border-accent/20",
    };
    return colors[category] || "bg-muted/40";
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      scholarship: "bg-primary/15 text-primary",
      job: "bg-success/20 text-success",
      blog: "bg-info/20 text-info",
      user: "bg-warning/20 text-warning",
      application: "bg-accent/20 text-accent",
    };
    return colors[category] || "bg-muted";
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Points & Streak Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 text-white shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
              <Zap className="h-4 w-4" />
              Total Impact Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{isLoading ? <Skeleton className="h-10 w-24 bg-white/20" /> : totalPoints}</div>
            <p className="text-xs text-primary-foreground/70 mt-1">Live points from recent admin actions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning to-warning/80 border-0 text-white shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Flame className="h-4 w-4" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{isLoading ? <Skeleton className="h-10 w-24 bg-white/20" /> : `${streak} day${streak === 1 ? "" : "s"}`}</div>
            <p className="text-xs text-white/70 mt-1">Consecutive active days</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-muted/40 border-b border-border/60">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
          {isLoading && (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          )}
          {!isLoading && activities.map((activity, idx) => (
            <div
              key={activity.id}
              className={`p-4 rounded-lg border-2 animate-slideInUp ${getCategoryColor(
                activity.category
              )}`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{activity.action}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      className={`text-xs capitalize ${getCategoryBadgeColor(
                        activity.category
                      )}`}
                    >
                      {activity.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor(
                        (Date.now() - new Date(activity.timestamp).getTime()) / 60000
                      )}{" "}
                      min ago
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    +{activity.impact}
                  </div>
                  <span className="text-xs text-muted-foreground">points</span>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && activities.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
              Recent admin actions will appear here as soon as content or application work starts flowing.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-muted/40 border-b border-border/60">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-info" />
            Achievements & Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement, idx) => (
              <div
                key={achievement.id}
                className="p-4 rounded-lg border-2 border-border/60 hover:border-primary/30 transition-all group"
                style={{ animation: `slideInUp 0.5s ease-out ${idx * 150}ms both` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-info/15 to-info/5 rounded-lg group-hover:scale-110 transition-transform">
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">
                      {achievement.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {achievement.progress}/{achievement.target}
                    </span>
                    <span className="font-semibold text-foreground/80">
                      {Math.round((achievement.progress / achievement.target) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(achievement.progress / achievement.target) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



