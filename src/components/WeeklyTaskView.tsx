
import { useState, useEffect } from 'react';
import { WeeklyTask } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { getWeekDates } from '@/lib/dates';
import { DropResult } from 'react-beautiful-dnd';
import { exportTasksToExcel } from '@/lib/excel-export';
import WeeklyTaskInput from './WeeklyTaskInput';
import WeeklyTaskList from './WeeklyTaskList';
import ExportButton from './ExportButton';

interface WeeklyTaskViewProps {
  currentDate: Date;
  onAnalyticsUpdate: () => void;
}

// Storage key for weekly tasks
const STORAGE_KEY = 'weeklyTasks';

const loadWeeklyTasks = (): WeeklyTask[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading weekly tasks:', error);
    return [];
  }
};

const saveWeeklyTasks = (tasks: WeeklyTask[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving weekly tasks:', error);
  }
};

const WeeklyTaskView = ({ currentDate, onAnalyticsUpdate }: WeeklyTaskViewProps) => {
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const isMobile = useIsMobile();
  const weekDates = getWeekDates(currentDate);
  
  useEffect(() => {
    setWeeklyTasks(loadWeeklyTasks());
  }, []);

  const handleAddTask = (newTask: WeeklyTask) => {
    const updatedTasks = [...weeklyTasks, newTask];
    setWeeklyTasks(updatedTasks);
    saveWeeklyTasks(updatedTasks);
    onAnalyticsUpdate();
  };

  const handleToggleDay = (taskId: string, dateStr: string) => {
    const updatedTasks = weeklyTasks.map(task => {
      if (task.id === taskId) {
        let completedDays = [...task.completedDays];
        
        if (completedDays.includes(dateStr)) {
          // Remove date if already completed
          completedDays = completedDays.filter(d => d !== dateStr);
        } else {
          // Add date if not completed
          completedDays.push(dateStr);
        }
        
        return {
          ...task,
          completedDays,
          updatedAt: new Date().toISOString(),
        };
      }
      return task;
    });
    
    setWeeklyTasks(updatedTasks);
    saveWeeklyTasks(updatedTasks);
    onAnalyticsUpdate();
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = weeklyTasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    
    const updatedTasks = weeklyTasks.filter(t => t.id !== taskId);
    setWeeklyTasks(updatedTasks);
    saveWeeklyTasks(updatedTasks);
    onAnalyticsUpdate();
    
    toast.info('Task deleted', {
      description: `"${taskToDelete.name}" has been removed from your weekly tasks`,
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(weeklyTasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setWeeklyTasks(items);
    saveWeeklyTasks(items);
    onAnalyticsUpdate();
  };

  const handleUpdateInterval = (taskId: string, interval: string) => {
    const parsedInterval = interval.trim() ? parseInt(interval) : undefined;
    
    const updatedTasks = weeklyTasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          interval: parsedInterval,
          updatedAt: new Date().toISOString(),
        };
      }
      return task;
    });
    
    setWeeklyTasks(updatedTasks);
    saveWeeklyTasks(updatedTasks);
    onAnalyticsUpdate();
    
    toast.success('Task updated', {
      description: parsedInterval 
        ? `Completion interval set to ${parsedInterval} days` 
        : 'Completion interval removed',
    });
  };

  const handleUpdateTaskName = (taskId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const updatedTasks = weeklyTasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          name: newName.trim(),
          updatedAt: new Date().toISOString(),
        };
      }
      return task;
    });
    
    setWeeklyTasks(updatedTasks);
    saveWeeklyTasks(updatedTasks);
    onAnalyticsUpdate();
    
    toast.success('Task updated', {
      description: `Task name changed to "${newName.trim()}"`,
    });
  };

  const handleExportToExcel = () => {
    exportTasksToExcel(weeklyTasks);
    toast.success('Export successful', {
      description: 'Your weekly tasks have been exported to CSV format',
    });
  };

  return (
    <Card className="neomorphism border-none mb-6">
      <CardHeader className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
        "px-2 sm:px-6 py-3 sm:py-4"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
          <h2 className="text-lg font-semibold tracking-tight">Weekly Tasks</h2>
          
          <div className="flex items-center ml-auto">
            <ExportButton 
              onExport={handleExportToExcel} 
              disabled={weeklyTasks.length === 0} 
            />
          </div>
        </div>
      </CardHeader>
      
      <CardHeader className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-0",
        "px-2 sm:px-6 pb-2"
      )}>
        <WeeklyTaskInput onAddTask={handleAddTask} />
      </CardHeader>
      
      <CardContent className="px-2 sm:px-6 py-2 sm:py-4 overflow-hidden">
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
      </CardContent>
    </Card>
  );
};

export default WeeklyTaskView;
