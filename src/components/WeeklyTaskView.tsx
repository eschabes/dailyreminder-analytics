import { useEffect, useState } from 'react';
import { WeeklyTask } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { getWeekDates } from '@/lib/dates';
import { DropResult } from 'react-beautiful-dnd';
import { exportTasksToExcel } from '@/lib/excel-export';
import { CalendarDays, ListChecks } from 'lucide-react';
import WeeklyTaskInput from './WeeklyTaskInput';
import WeeklyTaskList from './WeeklyTaskList';
import ExportButton from './ExportButton';
import TodayView from './TodayView';
import { useWeeklyTasks } from '@/hooks/useWeeklyTasks';

interface WeeklyTaskViewProps {
  currentDate: Date;
  onAnalyticsUpdate: () => void;
  view?: 'today' | 'week';
  onViewChange?: (view: 'today' | 'week') => void;
}

const WeeklyTaskView = ({ currentDate, onAnalyticsUpdate, view: viewProp, onViewChange }: WeeklyTaskViewProps) => {
  const isMobile = useIsMobile();
  const weekDates = getWeekDates(currentDate);
  const { tasks: weeklyTasks, loading, addTask, updateTask, deleteTask, reorder } =
    useWeeklyTasks();
  const [internalView, setInternalView] = useState<'today' | 'week'>(isMobile ? 'today' : 'week');
  const view = viewProp ?? internalView;
  const setView = (v: 'today' | 'week') => {
    if (onViewChange) onViewChange(v);
    else setInternalView(v);
  };
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    onAnalyticsUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyTasks]);

  const handleAddTask = (newTask: WeeklyTask) => {
    addTask(newTask.name, newTask.interval);
  };

  const applyOp = (taskId: string, dateStr: string) => {
    const task = weeklyTasks.find((t) => t.id === taskId);
    if (!task) return;
    let completedDays = [...task.completedDays];
    const completionCounts = { ...(task.completionCounts || {}) };

    let op: 'increment' | 'decrement' | 'reset' | 'toggle' = 'toggle';
    let actual = dateStr;
    if (dateStr.startsWith('increment:')) { op = 'increment'; actual = dateStr.slice(10); }
    else if (dateStr.startsWith('decrement:')) { op = 'decrement'; actual = dateStr.slice(10); }
    else if (dateStr.startsWith('reset:')) { op = 'reset'; actual = dateStr.slice(6); }

    if (op === 'increment') {
      if (!completedDays.includes(actual)) completedDays.push(actual);
      completionCounts[actual] = (completionCounts[actual] || 0) + 1;
    } else if (op === 'decrement') {
      const cur = completionCounts[actual] || 0;
      if (cur > 1) {
        completionCounts[actual] = cur - 1;
      } else if (cur === 1) {
        completedDays = completedDays.filter((d) => d !== actual);
        completionCounts[actual] = 0;
      }
    } else if (op === 'reset') {
      completedDays = completedDays.filter((d) => d !== actual);
      completionCounts[actual] = 0;
    } else {
      if (completedDays.includes(actual)) {
        completedDays = completedDays.filter((d) => d !== actual);
        completionCounts[actual] = 0;
      } else {
        completedDays.push(actual);
        completionCounts[actual] = 1;
      }
    }

    updateTask(taskId, { completedDays, completionCounts });
  };

  const handleToggleDay = (taskId: string, dateStr: string) => applyOp(taskId, dateStr);

  const handleDeleteTask = (taskId: string) => {
    const task = weeklyTasks.find((t) => t.id === taskId);
    deleteTask(taskId);
    if (task) toast.info('Task deleted', { description: `"${task.name}" removed` });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(weeklyTasks);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    reorder(items);
  };

  const handleUpdateInterval = (taskId: string, interval: string) => {
    const parsed = interval.trim() ? parseInt(interval) : undefined;
    updateTask(taskId, { interval: parsed });
    toast.success('Task updated', {
      description: parsed ? `Interval set to ${parsed} days` : 'Interval removed',
    });
  };

  const handleUpdateTaskName = (taskId: string, newName: string) => {
    if (!newName.trim()) return;
    updateTask(taskId, { name: newName.trim() });
  };

  const handleExportToExcel = () => {
    exportTasksToExcel(weeklyTasks);
    toast.success('Export successful', { description: 'Tasks exported to CSV' });
  };

  return (
    <Card className="neomorphism border-none mb-6">
      <CardHeader
        className={cn(
          'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3',
          'px-2 sm:px-6 py-3 sm:py-4'
        )}
      >
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center rounded-full border border-border/60 p-0.5">
            <Button
              variant={view === 'today' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => setView('today')}
            >
              <ListChecks className="h-3.5 w-3.5 mr-1" />
              Today
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => setView('week')}
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              Week
            </Button>
          </div>
          <div className="flex items-center ml-auto">
            <ExportButton onExport={handleExportToExcel} disabled={weeklyTasks.length === 0} />
          </div>
        </div>
      </CardHeader>

      <CardHeader
        className={cn(
          'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-0',
          'px-2 sm:px-6 pb-2'
        )}
      >
        <WeeklyTaskInput onAddTask={handleAddTask} />
      </CardHeader>

      <CardContent className="px-2 sm:px-6 py-2 sm:py-4 overflow-hidden">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : view === 'today' ? (
          <TodayView
            tasks={weeklyTasks}
            date={currentDate}
            onIncrement={(id, d) => applyOp(id, `increment:${d}`)}
            onDecrement={(id, d) => applyOp(id, `decrement:${d}`)}
            onReset={(id, d) => applyOp(id, `reset:${d}`)}
            showAll={showAll}
            onToggleShowAll={() => setShowAll((s) => !s)}
          />
        ) : (
          <WeeklyTaskList
            weeklyTasks={weeklyTasks}
            weekDates={weekDates}
            isMobile={isMobile}
            onToggleDay={handleToggleDay}
            onDeleteTask={handleDeleteTask}
            onUpdateInterval={handleUpdateInterval}
            onUpdateTaskName={handleUpdateTaskName}
            onDragEnd={handleDragEnd}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyTaskView;