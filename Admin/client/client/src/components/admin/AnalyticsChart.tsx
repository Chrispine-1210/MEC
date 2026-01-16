import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, BarChart3, Calendar, Download } from "lucide-react";

interface ChartData {
  name: string;
  value: number;
  label?: string;
  color?: string;
}

interface AnalyticsChartProps {
  title: string;
  description?: string;
  data: ChartData[];
  type?: "line" | "bar" | "pie" | "area";
  height?: number;
  loading?: boolean;
  showControls?: boolean;
  className?: string;
}

export default function AnalyticsChart({
  title,
  description,
  data,
  type = "bar",
  height = 300,
  loading = false,
  showControls = true,
  className,
}: AnalyticsChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [chartType, setChartType] = useState(type);

  // Calculate trend
  const getTrend = () => {
    if (data.length < 2) return null;
    const current = data[data.length - 1]?.value || 0;
    const previous = data[data.length - 2]?.value || 0;
    
    if (previous === 0) return null;
    
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change > 0,
    };
  };

  const trend = getTrend();
  const maxValue = Math.max(...data.map(d => d.value));
  const totalValue = data.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const BarChart = () => (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm text-gray-600 min-w-0 flex-1">
            {item.name}
          </span>
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900 w-12 text-right">
              {item.value.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const PieChart = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        {data.map((item, index) => {
          const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
          const colors = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-red-500"];
          
          return (
            <div key={index} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 font-medium truncate">
                  {item.name}
                </div>
                <div className="text-xs text-gray-500">
                  {percentage.toFixed(1)}% ({item.value.toLocaleString()})
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const LineChart = () => (
    <div className="relative">
      <svg width="100%" height={height} className="overflow-visible">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[...Array(5)].map((_, i) => (
          <line
            key={i}
            x1="0"
            y1={`${(i / 4) * 100}%`}
            x2="100%"
            y2={`${(i / 4) * 100}%`}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        
        {/* Data line */}
        <polyline
          points={data
            .map((item, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - (item.value / maxValue) * 80;
              return `${x}%,${y}%`;
            })
            .join(" ")}
          fill="none"
          stroke="rgb(59, 130, 246)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {data.map((item, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - (item.value / maxValue) * 80;
          
          return (
            <circle
              key={i}
              cx={`${x}%`}
              cy={`${y}%`}
              r="4"
              fill="rgb(59, 130, 246)"
              className="cursor-pointer hover:r-6 transition-all"
            />
          );
        })}
      </svg>
      
      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {data.map((item, i) => (
          <span key={i} className="text-center">
            {item.label || item.name}
          </span>
        ))}
      </div>
    </div>
  );

  const renderChart = () => {
    switch (chartType) {
      case "pie":
        return <PieChart />;
      case "line":
      case "area":
        return <LineChart />;
      default:
        return <BarChart />;
    }
  };

  return (
    <Card className={className} data-testid="analytics-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold" data-testid="chart-title">
              {title}
            </CardTitle>
            {description && (
              <CardDescription data-testid="chart-description">
                {description}
              </CardDescription>
            )}
          </div>
          
          {trend && (
            <Badge
              variant={trend.isPositive ? "default" : "destructive"}
              className="flex items-center gap-1"
              data-testid="chart-trend"
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.value.toFixed(1)}%
            </Badge>
          )}
        </div>
        
        {showControls && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24h</SelectItem>
                  <SelectItem value="7d">7d</SelectItem>
                  <SelectItem value="30d">30d</SelectItem>
                  <SelectItem value="90d">90d</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={chartType} onValueChange={(value) => setChartType(value as "line" | "bar" | "pie" | "area")}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="pie">Pie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="ghost" size="sm" data-testid="download-chart">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div style={{ height: `${height}px` }} className="w-full">
          {data.length > 0 ? (
            renderChart()
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No data available</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}