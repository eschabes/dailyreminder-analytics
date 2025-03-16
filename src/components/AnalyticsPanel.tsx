import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { CheckCircle2, Activity, TrendingUp, Calendar, BarChart2, Clock, Award, List, Percent } from 'lucide-react';
import { AnalyticsData } from '@/types';
import { format, parseISO, differenceInDays, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { loadWeeklyTasks } from '@/lib/storage';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { getDaysSinceLastCompletion, getTaskStatusColor, getWeeklyCompletions, calculateTaskCompletionRate } from '@/lib/task-analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalyticsPanelProps {
  analytics: AnalyticsData;
  averageCompletionRate: number;
  currentCompletionRate: number;
}

const AnalyticsPanel = ({ analytics, averageCompletionRate, currentCompletionRate }: AnalyticsPanelProps) => {
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeDays, setActiveDays] = useState<any[]>([]);
  const [completionTrend, setCompletionTrend] = useState<any[]>([]);
  const [weeklyCompletions, setWeeklyCompletions] = useState<any[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = () => {
    const weeklyTasks = loadWeeklyTasks();
    if (!weeklyTasks.length) return;

    // Process tasks with completion stats
    const processedTasks = weeklyTasks.map(task => {
      const daysSince = getDaysSinceLastCompletion(task);
      const statusColor = getTaskStatusColor(daysSince, task.interval);
      const lastCompletedDate = task.completedDays.length > 0 
        ? task.completedDays.sort((a, b) => parseISO(b).getTime() - parseISO(a).getTime())[0]
        : null;
        
      // Calculate completion rate
      const completionRate = calculateTaskCompletionRate(task);
      
      // Calculate consistency (completions per week)
      const completionDates = task.completedDays.map(d => format(parseISO(d), 'yyyy-ww'));
      const uniqueWeeks = new Set(completionDates);
      const weeksCount = uniqueWeeks.size;
      const averagePerWeek = weeksCount > 0 
        ? (task.completedDays.length / weeksCount).toFixed(1) 
        : '0';
      
      // Current streak calculation
      const sortedDates = [...task.completedDays].sort((a, b) => 
        parseISO(a).getTime() - parseISO(b).getTime()
      );
      
      let currentStreak = 0;
      if (sortedDates.length > 0) {
        const today = new Date();
        const lastDate = parseISO(sortedDates[sortedDates.length - 1]);
        if (differenceInDays(today, lastDate) <= 7) {
          currentStreak = 1;
          // Count consecutive weeks
          for (let i = sortedDates.length - 2; i >= 0; i--) {
            const prevDate = parseISO(sortedDates[i]);
            const currDate = parseISO(sortedDates[i + 1]);
            if (differenceInDays(currDate, prevDate) <= 7) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }
      
      return {
        id: task.id,
        name: task.name,
        totalCompleted: task.completedDays.length,
        lastCompleted: lastCompletedDate 
          ? format(parseISO(lastCompletedDate), 'MMM d, yyyy')
          : 'Never',
        daysSinceLastCompletion: daysSince !== null ? daysSince : '-',
        statusColor,
        interval: task.interval || '-',
        completionRate: `${completionRate}%`,
        averagePerWeek,
        currentStreak,
        createdAt: format(parseISO(task.createdAt), 'MMM d, yyyy')
      };
    });
    
    // Sort by most recently completed
    processedTasks.sort((a, b) => {
      if (a.daysSinceLastCompletion === '-') return 1;
      if (b.daysSinceLastCompletion === '-') return -1;
      return Number(a.daysSinceLastCompletion) - Number(b.daysSinceLastCompletion);
    });
    
    setTasks(processedTasks);
    
    // Active days analysis
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCount = daysOfWeek.map(day => {
      const dayCompletions = weeklyTasks.flatMap(task => 
        task.completedDays.filter(date => {
          const weekday = format(parseISO(date), 'EEEE');
          return weekday === day;
        })
      ).length;
      
      return {
        name: day.substring(0, 3),
        completions: dayCompletions
      };
    });
    
    setActiveDays(dayCount);
    
    // Completion trend over time (daily)
    const allCompletions = weeklyTasks.flatMap(task => 
      task.completedDays.map(date => ({
        date,
        taskId: task.id,
        taskName: task.name
      }))
    );
    
    // Group by day
    const dailyCompletions = {};
    allCompletions.forEach(completion => {
      const dayKey = format(parseISO(completion.date), 'yyyy-MM-dd');
      if (!dailyCompletions[dayKey]) {
        dailyCompletions[dayKey] = { 
          date: dayKey,
          count: 0,
          tasks: new Set()
        };
      }
      dailyCompletions[dayKey].count++;
      dailyCompletions[dayKey].tasks.add(completion.taskId);
    });
    
    const trendData = Object.values(dailyCompletions)
      .sort((a: any, b: any) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .map((day: any) => ({
        date: format(parseISO(day.date), 'MMM d'),
        completions: day.count,
        uniqueTasks: day.tasks.size
      }))
      .slice(-14); // Show last 14 days with data
      
    setCompletionTrend(trendData);
    
    // Get weekly completion data with improved metrics
    const weeklyCmpl = getWeeklyCompletions(weeklyTasks, 8);
    setWeeklyCompletions(weeklyCmpl);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className={cn("", {"hidden": isMobile})}>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className={cn("", {"hidden": isMobile})}>Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className={cn("", {"hidden": isMobile})}>Trends</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
                  Completion Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Tasks Tracked</span>
                    <span className="text-2xl font-bold">{tasks.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Total Completions</span>
                    <span className="text-2xl font-bold">{tasks.reduce((sum, t) => sum + t.totalCompleted, 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Current Rate</span>
                    <span className="text-2xl font-bold">{currentCompletionRate}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Average Rate</span>
                    <span className="text-2xl font-bold">{averageCompletionRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  Activity by Day
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-48">
                  {activeDays.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeDays} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value) => [`${value}`, 'Completions']}
                          contentStyle={{ 
                            background: 'rgba(255, 255, 255, 0.95)', 
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                          }}
                        />
                        <Bar 
                          dataKey="completions" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                          animationDuration={1000}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground text-sm">No activity data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-border/40 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-primary" />
                  Daily Completions (Last 14 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-56">
                  {completionTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={completionTrend} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value, name) => {
                            const label = name === 'completions' ? 'Completions' : 'Unique Tasks';
                            return [`${value}`, label];
                          }}
                          contentStyle={{ 
                            background: 'rgba(255, 255, 255, 0.95)', 
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone"
                          dataKey="completions" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          animationDuration={1000}
                          name="Completions"
                        />
                        <Line 
                          type="monotone"
                          dataKey="uniqueTasks" 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          animationDuration={1000}
                          name="Unique Tasks"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground text-sm">No trend data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="tasks">
          <Card className="border border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center">
                <List className="h-4 w-4 mr-2 text-primary" />
                Task Completion Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[calc(100vh-220px)] pr-4">
                {tasks.length > 0 ? (
                  <div className="space-y-3">
                    {tasks.map(task => (
                      <div key={task.id} className="border border-border/40 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{task.name}</h3>
                          <Badge 
                            variant="outline" 
                            className={cn("ml-2", {
                              "bg-soft-green text-green-700": task.statusColor === 'bg-soft-green',
                              "bg-soft-yellow text-yellow-700": task.statusColor === 'bg-soft-yellow',
                              "bg-soft-red text-red-700": task.statusColor === 'bg-soft-red',
                              "bg-soft-gray text-gray-700": task.statusColor === 'bg-soft-gray',
                            })}
                          >
                            {task.daysSinceLastCompletion === 0 
                              ? 'Today' 
                              : task.daysSinceLastCompletion === 1 
                                ? 'Yesterday'
                                : task.daysSinceLastCompletion === '-' 
                                  ? 'Never done' 
                                  : `${task.daysSinceLastCompletion} days ago`}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 mr-1.5" />
                            <span>Interval:</span>
                            <span className="ml-1 font-medium text-foreground">
                              {task.interval !== '-' ? `${task.interval} days` : 'Not set'}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-muted-foreground">
                            <Award className="h-3.5 w-3.5 mr-1.5" />
                            <span>Streak:</span>
                            <span className="ml-1 font-medium text-foreground">
                              {task.currentStreak > 0 ? `${task.currentStreak} weeks` : 'None'}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            <span>Avg Per Week:</span>
                            <span className="ml-1 font-medium text-foreground">{task.averagePerWeek}</span>
                          </div>
                          
                          <div className="flex items-center text-muted-foreground">
                            <Percent className="h-3.5 w-3.5 mr-1.5" />
                            <span>Rate:</span>
                            <span className="ml-1 font-medium text-foreground">{task.completionRate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-muted-foreground">No tasks available</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends">
          <Card className="border border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                Weekly Completion Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                {weeklyCompletions.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={weeklyCompletions} 
                      margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        formatter={(value, name, props) => {
                          if (name === 'avgRate') return [`${value}%`, 'Average Rate'];
                          if (name === 'completions') return [`${value}`, 'Avg Completions Per Week'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Week of ${label}`}
                        contentStyle={{ 
                          background: 'rgba(255, 255, 255, 0.95)', 
                          border: '1px solid rgba(0, 0, 0, 0.05)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="avgRate" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                        animationDuration={1000}
                        name="Weekly Average Rate"
                      />
                      <Bar 
                        dataKey="completions" 
                        fill="hsl(var(--muted-foreground))" 
                        radius={[4, 4, 0, 0]}
                        animationDuration={1000}
                        name="Avg Completions Per Week"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-sm">No weekly trend data available yet</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border/40">
                <h4 className="font-medium mb-2">Daily Completion Rates</h4>
                {weeklyCompletions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {weeklyCompletions.slice(-2).reverse().map((week) => (
                      <div key={week.weekStart} className="mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <h5 className="text-sm font-medium">Week of {week.label}</h5>
                          <span className="text-sm text-muted-foreground">Average: {week.avgRate}%</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {week.days.map((day) => (
                            <div 
                              key={day.date} 
                              className="flex flex-col items-center"
                            >
                              <span className="text-xs text-muted-foreground">{day.day}</span>
                              <div 
                                className={cn(
                                  "w-full h-8 rounded-sm flex items-center justify-center text-xs font-medium",
                                  {
                                    "bg-primary/10 text-primary": day.rate > 0,
                                    "bg-muted text-muted-foreground": day.rate === 0,
                                    "bg-muted/30 text-muted-foreground/50": day.isFuture
                                  }
                                )}
                                style={{
                                  opacity: day.rate > 0 ? Math.max(0.3, day.rate / 100) : day.isFuture ? 0.1 : 0.2
                                }}
                              >
                                {day.isFuture ? 'N/A' : (day.rate > 0 ? `${day.rate}%` : '-')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available for daily completion rates</p>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border/40">
                <p className="text-sm text-muted-foreground">
                  Completion rate is calculated by looking at each day individually and checking if tasks were
                  completed on that day or within their interval. Future dates are excluded from calculations.
                  The weekly average combines the daily rates from days in that week.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card className="border border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-primary" />
                  Most Productive Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  {analytics.mostProductiveDay ? (
                    <>
                      <h3 className="text-3xl font-bold mb-2">{analytics.mostProductiveDay}</h3>
                      <p className="text-sm text-muted-foreground">
                        You complete more tasks on this day than any other
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-primary" />
                  Least Productive Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  {analytics.leastProductiveDay ? (
                    <>
                      <h3 className="text-3xl font-bold mb-2">{analytics.leastProductiveDay}</h3>
                      <p className="text-sm text-muted-foreground">
                        You complete fewer tasks on this day than others
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPanel;
