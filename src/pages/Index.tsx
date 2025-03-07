
import { useState, useEffect } from 'react';
import WeeklyChecklist from '@/components/WeeklyChecklist';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import { calculateAnalytics } from '@/lib/dates';
import { loadAllWeekData } from '@/lib/storage';
import { AnalyticsData } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Index = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalItems: 0,
    completedItems: 0,
    completionRate: 0,
    mostProductiveDay: null,
    leastProductiveDay: null,
    weeklyTrend: [],
  });
  const [activeTab, setActiveTab] = useState<string>("checklist");

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
          
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-auto"
          >
            <TabsList className="grid grid-cols-2 w-[220px] h-10 bg-muted/60 p-1">
              <TabsTrigger 
                value="checklist" 
                className={cn(
                  "font-medium text-sm flex items-center justify-center",
                  "data-[state=active]:shadow-none data-[state=active]:bg-background"
                )}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Checklist
              </TabsTrigger>
              <TabsTrigger 
                value="analytics"
                className={cn(
                  "font-medium text-sm flex items-center justify-center",
                  "data-[state=active]:shadow-none data-[state=active]:bg-background"
                )}
              >
                <LineChart className="h-4 w-4 mr-1" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>
      
      <main className="w-full max-w-5xl mx-auto px-4 mt-6 flex-1">
        <TabsContent value="checklist" className="mt-0 outline-none">
          <div className="w-full animate-fade-in">
            <WeeklyChecklist onAnalyticsUpdate={updateAnalytics} />
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="mt-0 outline-none">
          <div className="w-full animate-fade-in">
            <AnalyticsPanel analytics={analytics} />
          </div>
        </TabsContent>
      </main>
    </div>
  );
};

export default Index;
