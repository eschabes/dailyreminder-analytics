
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday } from '@/lib/task-analytics';

interface WeeklyTaskTableHeaderProps {
  weekDates: Date[];
  isMobile: boolean;
}

const WeeklyTaskTableHeader = ({ weekDates, isMobile }: WeeklyTaskTableHeaderProps) => {
  return (
    <thead>
      <tr>
        <th className="w-8"></th>
        <th className="text-left py-2 px-2 sm:px-3 font-medium text-muted-foreground text-sm w-24 sm:w-52">Task</th>
        <th className="text-center py-2 px-1 sm:px-2 font-medium text-muted-foreground text-xs sm:text-sm w-16 sm:w-20">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Days</span>
          </div>
        </th>
        {weekDates.map((date) => (
          <th 
            key={date.toISOString()} 
            className={cn(
              "text-center py-2 px-1 sm:px-2 font-medium text-xs sm:text-sm",
              isToday(format(date, 'yyyy-MM-dd')) ? "bg-today-highlight" : ""
            )}
          >
            <div className="flex flex-col items-center">
              <span>{format(date, isMobile ? 'E' : 'EEE')}</span>
              <span className="text-xs">{format(date, 'd')}</span>
            </div>
          </th>
        ))}
        <th className="w-8 sm:w-10"></th>
      </tr>
    </thead>
  );
};

export default WeeklyTaskTableHeader;
