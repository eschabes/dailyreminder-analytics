
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
        <th className="handle-column fixed-column w-8"></th>
        <th className="text-left py-2 px-1 sm:px-2 font-medium text-muted-foreground text-xs sm:text-sm task-column fixed-column">Task</th>
        <th className="text-center py-2 px-1 font-medium text-muted-foreground text-xs days-column fixed-column">
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
                "text-center py-1 sm:py-2 px-0 font-medium text-xs cursor-pointer whitespace-nowrap day-column",
                isCurrentDay ? "bg-today-highlight" : "",
                isSelected && !isCurrentDay ? "bg-selected-day" : "",
                isSelected && isCurrentDay ? "bg-current-selected-day" : ""
              )}
              onClick={() => onSelectDate(dateStr === selectedDate ? null : dateStr)}
            >
              <div className="flex flex-col items-center">
                <span>{format(date, 'E')}</span>
                <span className="text-xs">{format(date, 'd')}</span>
              </div>
            </th>
          );
        })}
        <th className="w-6 sm:w-8"></th>
      </tr>
    </thead>
  );
};

export default WeeklyTaskTableHeader;
