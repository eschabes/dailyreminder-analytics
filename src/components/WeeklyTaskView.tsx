import { useState } from 'react';
import { WeeklyTask } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import WeeklyTaskInput from './WeeklyTaskInput';
import TodayView from './TodayView';
import TaskEditDialog from './TaskEditDialog';
import { useWeeklyTasks } from '@/hooks/useWeeklyTasks';

interface WeeklyTaskViewProps {
  currentDate: Date;
}

const WeeklyTaskView = ({ currentDate }: WeeklyTaskViewProps) => {
  const { tasks: weeklyTasks, loading, addTask, updateTask, deleteTask } =
    useWeeklyTasks();
  const [showAll, setShowAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleExportToExcel = () => {
    exportTasksToExcel(weeklyTasks);
    toast.success('Export successful', { description: 'Tasks exported to CSV' });
  };

  const editingTask = weeklyTasks.find((t) => t.id === editingId) ?? null;

  return (
    <Card className="neomorphism border-none mb-6">
      <CardHeader
        className={cn(
          'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3',
          'px-2 sm:px-6 py-3 sm:py-4'
        )}
      >
        <div className="flex items-center justify-end w-full">
          <ExportButton onExport={handleExportToExcel} disabled={weeklyTasks.length === 0} />
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
        ) : (
          <TodayView
            tasks={weeklyTasks}
            date={currentDate}
            onIncrement={(id, d) => applyOp(id, `increment:${d}`)}
            onDecrement={(id, d) => applyOp(id, `decrement:${d}`)}
            onReset={(id, d) => applyOp(id, `reset:${d}`)}
            showAll={showAll}
            onToggleShowAll={() => setShowAll((s) => !s)}
            onEditTask={(id) => setEditingId(id)}
          />
        )}
      </CardContent>

      <TaskEditDialog
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(o) => !o && setEditingId(null)}
        onSave={(id, patch) => updateTask(id, patch)}
        onDelete={(id) => deleteTask(id)}
      />
    </Card>
  );
};

export default WeeklyTaskView;