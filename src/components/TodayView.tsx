import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { WeeklyTask } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, RotateCcw, CheckCircle2 } from 'lucide-react';
import { getDaysSinceLastCompletion } from '@/lib/task-analytics';
import { cn } from '@/lib/utils';

interface TodayViewProps {
  tasks: WeeklyTask[];
  onIncrement: (taskId: string, dateStr: string) => void;
  onDecrement: (taskId: string, dateStr: string) => void;
  onReset: (taskId: string, dateStr: string) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
}

const TodayView = ({ tasks, onIncrement, onDecrement, onReset, showAll, onToggleShowAll }: TodayViewProps) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = format(today, 'yyyy-MM-dd');

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
          <h2 className="text-lg font-semibold tracking-tight">{format(today, 'EEEE')}</h2>
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
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{task.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    {task.interval ? <span>every {task.interval}d</span> : <span>no interval</span>}
                    {daysSince !== null && !completed && (
                      <span>· {daysSince}d since last</span>
                    )}
                    {completed && <span>· {count} {count === 1 ? 'set' : 'sets'}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={() => onDecrement(task.id, todayStr)}
                    disabled={count === 0}
                    aria-label="Decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[2rem] text-center font-semibold text-base tabular-nums">
                    {count}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => onIncrement(task.id, todayStr)}
                    aria-label="Add set"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                  {count > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => onReset(task.id, todayStr)}
                      aria-label="Reset"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TodayView;