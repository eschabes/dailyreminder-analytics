
import { useState, useEffect } from 'react';
import { WeekData } from '@/types';
import { 
  formatDate,
  getWeekDates,
  isCurrentWeek
} from '@/lib/dates';
import { getOrCreateWeekData } from '@/lib/storage';
import { useIsMobile } from '@/hooks/use-mobile';
import WeekNavigation from './WeekNavigation';
import WeeklyTaskView from './WeeklyTaskView';

interface WeeklyChecklistProps {
  onAnalyticsUpdate: () => void;
}

const WeeklyChecklist = ({ onAnalyticsUpdate }: WeeklyChecklistProps) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const isMobile = useIsMobile();

  // Load week data
  useEffect(() => {
    const data = getOrCreateWeekData(currentDate);
    setWeekData(data);
  }, [currentDate]);

  const handlePreviousWeek = () => {
    setCurrentDate(prevDate => new Date(prevDate.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const handleNextWeek = () => {
    setCurrentDate(prevDate => new Date(prevDate.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const handleCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  if (!weekData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-md bg-muted h-8 w-64 mb-4" />
          <div className="rounded-md bg-muted h-64 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <WeekNavigation
        currentWeekStart={new Date(weekData.startDate)}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onCurrentWeek={handleCurrentWeek}
      />
      
      <WeeklyTaskView 
        currentDate={currentDate} 
        onAnalyticsUpdate={onAnalyticsUpdate}
      />
    </div>
  );
};

export default WeeklyChecklist;
