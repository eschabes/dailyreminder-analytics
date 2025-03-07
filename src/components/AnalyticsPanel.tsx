
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CheckCircle2, XCircle, TrendingUp, Trophy, Calendar } from 'lucide-react';
import { AnalyticsData } from '@/types';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface AnalyticsPanelProps {
  analytics: AnalyticsData;
}

const AnalyticsPanel = ({ analytics }: AnalyticsPanelProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatChartData = () => {
    return analytics.weeklyTrend.map(week => ({
      name: format(parseISO(week.date), 'MMM d'),
      rate: Math.round(week.completionRate),
    }));
  };

  const chartData = formatChartData();

  if (!mounted) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
      <Card className="col-span-1 md:col-span-2 neomorphism">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            Weekly Completion Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Completion Rate']}
                    contentStyle={{ 
                      background: 'rgba(255, 255, 255, 0.9)', 
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="rate" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">No data available yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="neomorphism">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-primary" />
            Completion Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total Tasks</span>
              <span className="text-3xl font-bold">{analytics.totalItems}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Completed</span>
              <span className="text-3xl font-bold">{analytics.completedItems}</span>
            </div>
            <div className="col-span-2">
              <span className="text-sm text-muted-foreground">Completion Rate</span>
              <div className="flex items-center mt-1">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${analytics.completionRate}%` }}
                  />
                </div>
                <span className="ml-2 font-medium text-sm w-12 text-right">
                  {Math.round(analytics.completionRate)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="neomorphism">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-primary" />
            Productivity Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Most Productive Day</span>
              <div className="flex items-center mt-1">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                <span className={cn(
                  "text-base font-medium",
                  !analytics.mostProductiveDay && "text-muted-foreground italic"
                )}>
                  {analytics.mostProductiveDay || "Not enough data"}
                </span>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Least Productive Day</span>
              <div className="flex items-center mt-1">
                <XCircle className="h-5 w-5 mr-2 text-muted-foreground" />
                <span className={cn(
                  "text-base font-medium",
                  !analytics.leastProductiveDay && "text-muted-foreground italic"
                )}>
                  {analytics.leastProductiveDay || "Not enough data"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPanel;
