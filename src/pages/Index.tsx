
import { useState, useEffect } from 'react';
import WeeklyChecklist from '@/components/WeeklyChecklist';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import { calculateAnalytics } from '@/lib/dates';
import { loadAllWeekData, loadWeeklyTasks } from '@/lib/storage';
import { AnalyticsData } from '@/types';
import { CheckSquare, LineChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { calculateAverageCompletionRate, calculateCurrentCompletionRate } from '@/lib/task-analytics';

const Index = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalItems: 0,
    completedItems: 0,
    completionRate: 0,
    mostProductiveDay: null,
    leastProductiveDay: null,
    weeklyTrend: [],
  });
  const [averageCompletionRate, setAverageCompletionRate] = useState<number>(0);
  const [currentCompletionRate, setCurrentCompletionRate] = useState<number>(0);
  const [activeView, setActiveView] = useState<'tasks' | 'analytics'>('tasks');
  const isMobile = useIsMobile();

  const updateAnalytics = () => {
    // Load and calculate general analytics from week data
    const allWeekData = loadAllWeekData();
    const calculatedAnalytics = calculateAnalytics(allWeekData);
    
    // Calculate average and current completion rates from task data
    const weeklyTasks = loadWeeklyTasks();
    const avgRate = calculateAverageCompletionRate(weeklyTasks);
    const currRate = calculateCurrentCompletionRate(weeklyTasks);
    
    setAnalytics(calculatedAnalytics);
    setAverageCompletionRate(avgRate);
    setCurrentCompletionRate(currRate);
  };

  useEffect(() => {
    updateAnalytics();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center bg-background text-foreground pb-10">
      <header className="w-full bg-background pt-4 pb-2 px-2 sm:px-4 border-b border-border/40 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold tracking-tight flex items-center">
            <CheckSquare className="h-6 w-6 mr-2 text-primary" />
            <span>WeeklyTrack</span>
          </Link>
          
          <div className="flex space-x-2">
            <Button
              variant={activeView === 'tasks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('tasks')}
              className="flex items-center gap-1"
            >
              <CheckSquare className="h-4 w-4" />
              <span className={cn("", {"hidden": isMobile})}>Tasks</span>
            </Button>
            <Button
              variant={activeView === 'analytics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('analytics')}
              className="flex items-center gap-1"
            >
              <LineChart className="h-4 w-4" />
              <span className={cn("", {"hidden": isMobile})}>Analytics</span>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="w-full max-w-5xl mx-auto px-2 sm:px-4 mt-6 flex-1">
        {activeView === 'analytics' ? (
          <div className="animate-fade-in">
            <AnalyticsPanel 
              analytics={analytics} 
              averageCompletionRate={averageCompletionRate}
              currentCompletionRate={currentCompletionRate}
            />
          </div>
        ) : (
          <div className="animate-fade-in">
            <WeeklyChecklist onAnalyticsUpdate={updateAnalytics} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
