
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import { formatWeekRange, isCurrentWeek, getDisplayWeek } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface WeekNavigationProps {
  currentWeekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
}

const WeekNavigation = ({
  currentWeekStart,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
}: WeekNavigationProps) => {
  const isCurrentWeekActive = isCurrentWeek(currentWeekStart);

  return (
    <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center md:justify-between w-full py-2">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousWeek}
          className="h-9 w-9 rounded-full btn-hover"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center">
          <Button
            variant="ghost"
            className={cn(
              "flex items-center space-x-2 rounded-full px-3 py-2 text-sm font-medium btn-hover",
              isCurrentWeekActive && "text-primary"
            )}
            onClick={onCurrentWeek}
          >
            <CalendarClock className="h-4 w-4 mr-2" />
            <span className="text-base font-medium">{getDisplayWeek(currentWeekStart)}</span>
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onNextWeek}
          className="h-9 w-9 rounded-full btn-hover"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="text-sm font-medium text-muted-foreground">
        {formatWeekRange(currentWeekStart)}
      </div>
    </div>
  );
};

export default WeekNavigation;
