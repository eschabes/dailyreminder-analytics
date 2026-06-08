
import { useState } from 'react';
import WeekNavigation from './WeekNavigation';
import WeeklyTaskView from './WeeklyTaskView';
import { addDays } from 'date-fns';

const WeeklyChecklist = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const handlePrevious = () => setCurrentDate((prev) => addDays(prev, -1));
  const handleNext = () => setCurrentDate((prev) => addDays(prev, 1));
  const handleCurrent = () => setCurrentDate(new Date());

  return (
    <div className="space-y-6">
      <WeekNavigation
        currentWeekStart={currentDate}
        onPreviousWeek={handlePrevious}
        onNextWeek={handleNext}
        onCurrentWeek={handleCurrent}
        mode="day"
      />

      <WeeklyTaskView currentDate={currentDate} />
    </div>
  );
};

export default WeeklyChecklist;
