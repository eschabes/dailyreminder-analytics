
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday } from '@/lib/task-analytics';

interface WeeklyTaskTableHeaderProps {
  weekDates: Date[];
  isMobile: boolean;
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
}

const WeeklyTaskTableHeader = ({ 
  weekDates, 
  isMobile, 
  selectedDate, 
  onSelectDate 
}: WeeklyTaskTableHeaderProps) => {
  return (
    <thead className="sticky top-0 bg-background z-10">
      <tr>
        <th className="w-6 sm:w-8 fixed-column handle-column"></th>
        <th className="text-left py-2 px-1 sm:px-3 font-medium text-muted-foreground text-xs sm:text-sm w-16 sm:w-52 fixed-column task-column">Task</th>
        <th className="text-center py-2 px-1 font-medium text-muted-foreground text-xs w-12 sm:w-20 fixed-column days-column">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="hidden sm:inline">Days</span>
          </div>
        </th>
        {weekDates.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isCurrentDay = isToday(dateStr);
          const isSelected = selectedDate === dateStr;
          
          return (
            <th 
              key={date.toISOString()} 
              className={cn(
                "text-center py-1 sm:py-2 px-1 sm:px-2 font-medium text-xs cursor-pointer whitespace-nowrap min-w-10",
                isCurrentDay ? "bg-today-highlight" : "",
                isSelected && !isCurrentDay ? "bg-selected-day" : "",
                isSelected && isCurrentDay ? "bg-current-selected-day" : ""
              )}
              onClick={() => onSelectDate(dateStr === selectedDate ? null : dateStr)}
            >
              <div className="flex flex-col items-center">
                <span>{format(date, isMobile ? 'E' : 'EEE')}</span>
                <span className="text-xs">{format(date, 'd')}</span>
              </div>
            </th>
          );
        })}
        <th className="w-6 sm:w-10"></th>
      </tr>
    </thead>
  );
};

export default WeeklyTaskTableHeader;
