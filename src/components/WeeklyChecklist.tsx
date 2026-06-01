
import { useState, useEffect } from 'react';
import { WeekData } from '@/types';
import { getOrCreateWeekData } from '@/lib/storage';
import { useIsMobile } from '@/hooks/use-mobile';
import WeekNavigation from './WeekNavigation';
import WeeklyTaskView from './WeeklyTaskView';
import { addDays, startOfWeek } from 'date-fns';

interface WeeklyChecklistProps {
  onAnalyticsUpdate: () => void;
}

const WeeklyChecklist = ({ onAnalyticsUpdate }: WeeklyChecklistProps) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const isMobile = useIsMobile();
  const [view, setView] = useState<'today' | 'week'>(isMobile ? 'today' : 'week');

  // Load week data
  useEffect(() => {
    const data = getOrCreateWeekData(currentDate);
    setWeekData(data);
  }, [currentDate]);

  const step = view === 'today' ? 1 : 7;
  const handlePrevious = () => {
    setCurrentDate(prev => addDays(prev, -step));
  };
  const handleNext = () => {
    setCurrentDate(prev => addDays(prev, step));
  };
  const handleCurrent = () => {
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

  const navAnchor =
    view === 'today' ? currentDate : new Date(weekData.startDate);

  return (
    <div className="space-y-6">
      <WeekNavigation
        currentWeekStart={navAnchor}
        onPreviousWeek={handlePrevious}
        onNextWeek={handleNext}
        onCurrentWeek={handleCurrent}
        mode={view === 'today' ? 'day' : 'week'}
      />

      <WeeklyTaskView
        currentDate={currentDate}
        onAnalyticsUpdate={onAnalyticsUpdate}
        view={view}
        onViewChange={setView}
      />
    </div>
  );
};

export default WeeklyChecklist;
