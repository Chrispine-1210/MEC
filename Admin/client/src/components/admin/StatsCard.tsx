import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
  loading?: boolean;
  className?: string;
}

export default function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  loading = false,
  className,
}: StatsCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + 'M';
      } else if (val >= 1000) {
        return (val / 1000).toFixed(1) + 'K';
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.value === 0) {
      return <Minus className="h-3 w-3" />;
    }
    
    return trend.isPositive ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <TrendingDown className="h-3 w-3" />
    );
  };

  const getTrendColor = () => {
    if (!trend || trend.value === 0) return "text-gray-500";
    return trend.isPositive ? "text-green-600" : "text-red-600";
  };

  const getTrendBadgeVariant = () => {
    if (!trend || trend.value === 0) return "secondary";
    return trend.isPositive ? "default" : "destructive";
  };

  return (
    <Card 
      className={`${className} animate-scaleIn hover:shadow-lg transition-all duration-300 hover:border-blue-200 cursor-pointer group`}
      data-testid="stats-card"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition" data-testid="stats-title">
          {title}
        </CardTitle>
        <div className="text-gray-400 group-hover:text-blue-500 group-hover:animate-float transition" data-testid="stats-icon">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition mb-1" data-testid="stats-value">
          {formatValue(value)}
        </div>
        
        <div className="flex items-center justify-between">
          {description && (
            <p className="text-xs text-gray-500 group-hover:text-gray-700 transition" data-testid="stats-description">
              {description}
            </p>
          )}
          
          {trend && (
            <Badge 
              variant={getTrendBadgeVariant()} 
              className={`flex items-center gap-1 text-xs ${getTrendColor()} group-hover:scale-110 transition-transform`}
              data-testid="stats-trend"
            >
              {getTrendIcon()}
              {Math.abs(trend.value)}%
              {trend.period && ` ${trend.period}`}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}