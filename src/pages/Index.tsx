
import { useState, useEffect } from 'react';
import WeeklyChecklist from '@/components/WeeklyChecklist';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import { calculateAnalytics } from '@/lib/dates';
import { loadAllWeekData } from '@/lib/storage';
import { AnalyticsData } from '@/types';
import { CheckSquare, LineChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalItems: 0,
    completedItems: 0,
    completionRate: 0,
    mostProductiveDay: null,
    leastProductiveDay: null,
    weeklyTrend: [],
  });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const isMobile = useIsMobile();

  const updateAnalytics = () => {
    const allWeekData = loadAllWeekData();
    const calculatedAnalytics = calculateAnalytics(allWeekData);
    setAnalytics(calculatedAnalytics);
  };

  useEffect(() => {
    updateAnalytics();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center bg-background text-foreground pb-10">
      <header className="w-full bg-background pt-4 pb-2 px-4 border-b border-border/40 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold tracking-tight flex items-center">
            <CheckSquare className="h-6 w-6 mr-2 text-primary" />
            <span>WeeklyTrack</span>
          </Link>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-1"
          >
            {showAnalytics ? (
              <>
                <CheckSquare className="h-4 w-4" />
                <span className={cn("", {"hidden": isMobile})}>Tasks</span>
              </>
            ) : (
              <>
                <LineChart className="h-4 w-4" />
                <span className={cn("", {"hidden": isMobile})}>Analytics</span>
              </>
            )}
          </Button>
        </div>
      </header>
      
      <main className="w-full max-w-5xl mx-auto px-4 mt-6 flex-1">
        {showAnalytics ? (
          <div className="animate-fade-in">
            <AnalyticsPanel analytics={analytics} />
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
