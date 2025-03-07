
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CheckCircle2, XCircle, TrendingUp, Trophy, Calendar, Repeat, Clock } from 'lucide-react';
import { AnalyticsData } from '@/types';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { loadWeeklyTasks } from '@/lib/storage';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

interface AnalyticsPanelProps {
  analytics: AnalyticsData;
}

const AnalyticsPanel = ({ analytics }: AnalyticsPanelProps) => {
  const [mounted, setMounted] = useState(false);
  const [consistencyData, setConsistencyData] = useState<any[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
    calculateConsistencyMetrics();
  }, []);

  const calculateConsistencyMetrics = () => {
    const weeklyTasks = loadWeeklyTasks();
    if (!weeklyTasks.length) return;

    const metrics = weeklyTasks.map(task => {
      // Get all dates for this task
      const dates = task.completedDays.sort();
      
      // Calculate times per week
      const weeksMap = new Map();
      dates.forEach(date => {
        const weekStart = format(parseISO(date), 'yyyy-ww');
        weeksMap.set(weekStart, (weeksMap.get(weekStart) || 0) + 1);
      });
      
      // Calculate average completions per week
      const totalWeeks = weeksMap.size;
      const totalCompletions = dates.length;
      const avgPerWeek = totalWeeks > 0 ? (totalCompletions / totalWeeks).toFixed(1) : '0';
      
      // Calculate streak (consecutive weeks)
      let currentStreak = 0;
      let longestStreak = 0;
      
      // For simplicity, using a set of week identifiers
      const weekIdentifiers = Array.from(weeksMap.keys()).sort();
      
      if (weekIdentifiers.length > 0) {
        currentStreak = 1;
        longestStreak = 1;
        
        for (let i = 1; i < weekIdentifiers.length; i++) {
          const prevWeekNum = parseInt(weekIdentifiers[i-1].split('-')[1]);
          const currWeekNum = parseInt(weekIdentifiers[i].split('-')[1]);
          const prevYear = parseInt(weekIdentifiers[i-1].split('-')[0]);
          const currYear = parseInt(weekIdentifiers[i].split('-')[0]);
          
          // Check if consecutive weeks (accounting for year changes)
          const isConsecutive = 
            (currWeekNum - prevWeekNum === 1 && currYear === prevYear) ||
            (prevWeekNum === 52 && currWeekNum === 1 && currYear - prevYear === 1);
          
          if (isConsecutive) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
          } else {
            currentStreak = 1;
          }
        }
      }
      
      // Total days completed
      const totalDaysCompleted = dates.length;
      
      return {
        name: task.name,
        avgPerWeek,
        streak: currentStreak,
        longestStreak,
        totalCompleted: totalDaysCompleted,
        lastCompleted: dates.length > 0 ? format(parseISO(dates[dates.length - 1]), 'MMM d') : 'Never'
      };
    });
    
    setConsistencyData(metrics);
  };

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
    <div className="grid grid-cols-1 gap-4 animate-fade-in">
      <Card className="neomorphism">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <Repeat className="h-5 w-5 mr-2 text-primary" />
            Task Consistency
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className={cn(
            "rounded-md",
            isMobile ? "max-h-[calc(100vh-14rem)]" : "max-h-[calc(100vh-18rem)]"
          )}>
            {consistencyData.length > 0 ? (
              <div className="space-y-4">
                {consistencyData.map((task, index) => (
                  <Card key={index} className="p-4 border border-border/40">
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-base">{task.name}</h3>
                        <Badge variant={task.streak > 2 ? "default" : "outline"} className="ml-2">
                          {task.streak > 1 ? `${task.streak} week streak` : 'No streak'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-1">Total:</span>
                          <span>{task.totalCompleted} days</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-1">Per week:</span>
                          <span>{task.avgPerWeek}×</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Trophy className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-1">Best streak:</span>
                          <span>{task.longestStreak} weeks</span>
                        </div>
                        
                        <div className="flex items-center">
                          <CheckCircle2 className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-1">Last done:</span>
                          <span>{task.lastCompleted}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-accent p-3 mb-3">
                  <Repeat className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium mb-1">No Consistency Data</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Start tracking your weekly tasks to see consistency metrics
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="neomorphism">
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
            Overall Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total Days Tracked</span>
              <span className="text-3xl font-bold">{analytics.totalItems}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Days Completed</span>
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
    </div>
  );
};

export default AnalyticsPanel;
