
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarClock, CalendarCheck } from "lucide-react";
import { formatWeekRange, isCurrentWeek, getDisplayWeek } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";

interface WeekNavigationProps {
  currentWeekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  mode?: "day" | "week";
}

const WeekNavigation = ({
  currentWeekStart,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
  mode = "week",
}: WeekNavigationProps) => {
  const isDayMode = mode === "day";
  const isCurrentActive = isDayMode
    ? isSameDay(currentWeekStart, new Date())
    : isCurrentWeek(currentWeekStart);
  const mainLabel = isDayMode
    ? format(currentWeekStart, "EEE, MMM d")
    : getDisplayWeek(currentWeekStart);
  const subLabel = isDayMode
    ? format(currentWeekStart, "yyyy")
    : formatWeekRange(currentWeekStart);
  const prevLabel = isDayMode ? "Previous day" : "Previous week";
  const nextLabel = isDayMode ? "Next day" : "Next week";
  const todayLabel = isDayMode ? "Go to today" : "Go to current week";

  return (
    <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center md:justify-between w-full py-2">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousWeek}
          className="h-9 w-9 rounded-full btn-hover"
          aria-label={prevLabel}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center">
          <Button
            variant="ghost"
            className={cn(
              "flex items-center space-x-2 rounded-full px-3 py-2 text-sm font-medium btn-hover",
              isCurrentActive && "text-primary"
            )}
            onClick={onCurrentWeek}
          >
            <CalendarClock className="h-4 w-4 mr-2" />
            <span className="text-base font-medium">{mainLabel}</span>
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onNextWeek}
          className="h-9 w-9 rounded-full btn-hover"
          aria-label={nextLabel}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {!isCurrentActive && (
          <Button
            variant="outline"
            size="icon"
            onClick={onCurrentWeek}
            className="h-9 w-9 rounded-full btn-hover bg-primary/10 text-primary hover:bg-primary/20"
            title={todayLabel}
            aria-label={todayLabel}
          >
            <CalendarCheck className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="text-sm font-medium text-muted-foreground">
        {subLabel}
      </div>
    </div>
  );
};

export default WeekNavigation;
