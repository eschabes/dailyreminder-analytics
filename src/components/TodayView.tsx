import { useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { WeeklyTask } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { getDaysSinceLastCompletion } from '@/lib/task-analytics';
import { cn } from '@/lib/utils';

interface TodayViewProps {
  tasks: WeeklyTask[];
  date?: Date;
  onIncrement: (taskId: string, dateStr: string) => void;
  onDecrement: (taskId: string, dateStr: string) => void;
  onReset: (taskId: string, dateStr: string) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
  onEditTask?: (taskId: string) => void;
}

const TodayView = ({ tasks, date, onIncrement, onDecrement, onReset, showAll, onToggleShowAll, onEditTask }: TodayViewProps) => {
  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const longPressFired = useRef<Record<string, boolean>>({});

  const startPress = (taskId: string, dateStr: string) => {
    longPressFired.current[taskId] = false;
    longPressTimers.current[taskId] = setTimeout(() => {
      longPressFired.current[taskId] = true;
      onReset(taskId, dateStr);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(30);
      }
    }, 600);
  };
  const endPress = (taskId: string, dateStr: string) => {
    const t = longPressTimers.current[taskId];
    if (t) {
      clearTimeout(t);
      delete longPressTimers.current[taskId];
    }
    if (!longPressFired.current[taskId]) {
      onIncrement(taskId, dateStr);
    }
    longPressFired.current[taskId] = false;
  };
  const cancelPress = (taskId: string) => {
    const t = longPressTimers.current[taskId];
    if (t) {
      clearTimeout(t);
      delete longPressTimers.current[taskId];
    }
    longPressFired.current[taskId] = true; // prevent click after cancel
  };

  const today = useMemo(() => date ?? new Date(), [date]);
  const todayStr = format(today, 'yyyy-MM-dd');
  const isToday = format(new Date(), 'yyyy-MM-dd') === todayStr;

  const visibleTasks = useMemo(() => {
    if (showAll) return tasks;
    return tasks.filter((task) => {
      const completedToday = (task.completionCounts?.[todayStr] || 0) > 0;
      if (completedToday) return true;
      if (!task.interval) return true; // no interval = always due
      const daysSince = getDaysSinceLastCompletion(task);
      if (daysSince === null) return true; // never completed
      return daysSince >= task.interval;
    });
  }, [tasks, showAll, todayStr]);

  const dueCount = visibleTasks.filter((t) => (t.completionCounts?.[todayStr] || 0) === 0).length;
  const doneCount = visibleTasks.filter((t) => (t.completionCounts?.[todayStr] || 0) > 0).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {isToday ? 'Today' : format(today, 'EEEE')}
          </h2>
          <p className="text-xs text-muted-foreground">{format(today, 'MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {doneCount} done · {dueCount} to go
          </Badge>
          <Button variant="outline" size="sm" onClick={onToggleShowAll} className="text-xs h-8">
            {showAll ? 'Due today' : 'Show all'}
          </Button>
        </div>
      </div>

      {visibleTasks.length === 0 ? (
        <Card className="p-8 text-center neomorphism border-none">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-primary" />
          <h3 className="font-medium">All done for today</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Tap "Show all" to see every task.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleTasks.map((task) => {
            const count = task.completionCounts?.[todayStr] || 0;
            const completed = count > 0;
            const daysSince = getDaysSinceLastCompletion(task);
            const overdue =
              task.interval !== undefined &&
              !completed &&
              daysSince !== null &&
              daysSince > task.interval;

            return (
              <Card
                key={task.id}
                className={cn(
                  'p-3 flex items-center gap-3 border-l-4 transition-colors',
                  completed
                    ? 'border-l-primary bg-soft-green/40'
                    : overdue
                      ? 'border-l-destructive bg-soft-red/30'
                      : 'border-l-muted'
                )}
              >
                <button
                  type="button"
                  onClick={() => onEditTask?.(task.id)}
                  className="flex-1 min-w-0 text-left rounded-lg -mx-1 px-1 py-1 hover:bg-muted/50 active:bg-muted transition-colors"
                  aria-label={`Edit ${task.name}`}
                >
                  <div className="font-medium text-sm truncate">{task.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    {task.interval ? <span>every {task.interval}d</span> : <span>no interval</span>}
                    {daysSince !== null && !completed && (
                      <span>· {daysSince}d since last</span>
                    )}
                    {completed && <span>· {count} {count === 1 ? 'set' : 'sets'}</span>}
                  </div>
                </button>

                <button
                  type="button"
                  aria-label={`${count} sets. Tap to add, hold to reset.`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    startPress(task.id, todayStr);
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    endPress(task.id, todayStr);
                  }}
                  onPointerLeave={() => cancelPress(task.id)}
                  onPointerCancel={() => cancelPress(task.id)}
                  onContextMenu={(e) => e.preventDefault()}
                  className={cn(
                    'h-16 w-16 rounded-2xl flex items-center justify-center select-none',
                    'font-bold text-2xl tabular-nums shadow-sm active:scale-95 transition-transform',
                    count > 0
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground border border-border'
                  )}
                >
                  {count === 0 ? '+' : count}
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TodayView;