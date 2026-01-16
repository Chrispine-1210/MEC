import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  timestamp: Date;
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

const mockActivities: Activity[] = [
  {
    id: "1",
    action: "Created 3 scholarship opportunities",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    impact: 150,
    category: "scholarship",
  },
  {
    id: "2",
    action: "Reviewed 5 applications",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    impact: 100,
    category: "application",
  },
  {
    id: "3",
    action: "Published 2 blog posts",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    impact: 75,
    category: "blog",
  },
  {
    id: "4",
    action: "Added 4 team members",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    impact: 200,
    category: "user",
  },
];

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
  const [streak, setStreak] = useState(5);
  const totalPoints = mockActivities.reduce((sum, a) => sum + a.impact, 0);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      scholarship: "bg-gradient-to-r from-blue-100 to-blue-50 border-blue-200",
      job: "bg-gradient-to-r from-green-100 to-green-50 border-green-200",
      blog: "bg-gradient-to-r from-purple-100 to-purple-50 border-purple-200",
      user: "bg-gradient-to-r from-orange-100 to-orange-50 border-orange-200",
      application: "bg-gradient-to-r from-pink-100 to-pink-50 border-pink-200",
    };
    return colors[category] || "bg-gray-50";
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      scholarship: "bg-blue-200 text-blue-800",
      job: "bg-green-200 text-green-800",
      blog: "bg-purple-200 text-purple-800",
      user: "bg-orange-200 text-orange-800",
      application: "bg-pink-200 text-pink-800",
    };
    return colors[category] || "bg-gray-200";
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Points & Streak Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-100">
              <Zap className="h-4 w-4" />
              Total Impact Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalPoints}</div>
            <p className="text-xs text-blue-200 mt-1">+525 this week</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0 text-white shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-orange-100">
              <Flame className="h-4 w-4" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{streak} days</div>
            <p className="text-xs text-orange-200 mt-1">Keep it going!</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
          {mockActivities.map((activity, idx) => (
            <div
              key={activity.id}
              className={`p-4 rounded-lg border-2 animate-slideInUp ${getCategoryColor(
                activity.category
              )}`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      className={`text-xs capitalize ${getCategoryBadgeColor(
                        activity.category
                      )}`}
                    >
                      {activity.category}
                    </Badge>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor(
                        (Date.now() - activity.timestamp.getTime()) / 60000
                      )}{" "}
                      min ago
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    +{activity.impact}
                  </div>
                  <span className="text-xs text-gray-500">points</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Achievements & Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement, idx) => (
              <div
                key={achievement.id}
                className="p-4 rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-all group"
                style={{ animation: `slideInUp 0.5s ease-out ${idx * 150}ms both` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg group-hover:scale-110 transition-transform">
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {achievement.title}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      {achievement.progress}/{achievement.target}
                    </span>
                    <span className="font-semibold text-gray-700">
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
