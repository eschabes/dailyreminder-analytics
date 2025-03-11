
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { WeeklyTask } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Plus, Trash2, GripVertical, FileSpreadsheet, Clock, Calendar } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { getWeekDates } from '@/lib/dates';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { getDaysSinceLastCompletion, getTaskStatusColor, isToday } from '@/lib/task-analytics';
import { exportTasksToExcel } from '@/lib/excel-export';

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
  const [newTaskName, setNewTaskName] = useState('');
  const [taskBeingEdited, setTaskBeingEdited] = useState<string | null>(null);
  const [taskInterval, setTaskInterval] = useState<string>('');
  const isMobile = useIsMobile();
  const weekDates = getWeekDates(currentDate);
  
  useEffect(() => {
    setWeeklyTasks(loadWeeklyTasks());
  }, []);

  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    
    const newTask: WeeklyTask = {
      id: uuidv4(),
      name: newTaskName.trim(),
      completedDays: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      interval: parseInt(taskInterval) || undefined
    };
    
    const updatedTasks = [...weeklyTasks, newTask];
    setWeeklyTasks(updatedTasks);
    saveWeeklyTasks(updatedTasks);
    setNewTaskName('');
    setTaskInterval('');
    onAnalyticsUpdate();
    
    toast.success('Weekly task added', {
      description: `"${newTaskName}" has been added to your weekly tasks`,
    });
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
    setTaskBeingEdited(null);
    onAnalyticsUpdate();
    
    toast.success('Task updated', {
      description: parsedInterval 
        ? `Completion interval set to ${parsedInterval} days` 
        : 'Completion interval removed',
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
        "px-4 py-3 sm:px-6 sm:py-4"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
          <h2 className="text-lg font-semibold tracking-tight">Weekly Tasks</h2>
          
          <div className="flex items-center ml-auto">
            <Button
              onClick={handleExportToExcel}
              size="sm"
              variant="outline"
              className="rounded-full h-9 btn-hover mr-2"
              disabled={weeklyTasks.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardHeader className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-0",
        "px-4 pb-2 sm:px-6"
      )}>
        <div className="flex items-center space-x-2 w-full">
          <Input
            placeholder="Add a new weekly task..."
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            className="w-full"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          />
          
          <Input
            placeholder="Interval (days)"
            value={taskInterval}
            onChange={(e) => {
              // Only allow numbers
              const value = e.target.value.replace(/[^\d]/g, '');
              setTaskInterval(value);
            }}
            className="w-20 sm:w-32"
            type="text"
            inputMode="numeric"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          />
          
          <Button
            onClick={handleAddTask}
            disabled={!newTaskName.trim()}
            size="sm"
            className="rounded-full h-9 btn-hover bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          >
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-2 sm:px-6 py-2 sm:py-4">
        {weeklyTasks.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-accent p-3 mb-3">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium mb-1">No Weekly Tasks</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Add tasks that you want to track across multiple days of the week
            </p>
          </div>
        ) : (
          <ScrollArea className={cn(
            "rounded-md",
            isMobile ? "max-h-[calc(100vh-14rem)]" : "max-h-[calc(100vh-18rem)]"
          )}>
            <div className="w-full overflow-x-auto pb-2">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="tasks">
                  {(provided) => (
                    <table className="w-full" {...provided.droppableProps} ref={provided.innerRef}>
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
                          <th className="text-center py-2 px-1 sm:px-2 font-medium text-muted-foreground text-xs sm:text-sm w-14 sm:w-20">
                            <div className="flex items-center justify-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Int.</span>
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
                      <tbody className="divide-y divide-border/30">
                        {weeklyTasks.map((task, index) => {
                          const daysSince = getDaysSinceLastCompletion(task);
                          const statusColor = getTaskStatusColor(daysSince, task.interval);
                          
                          return (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided) => (
                                <tr 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="border-t border-border/40"
                                >
                                  <td className="w-8 py-2 px-1">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="flex items-center justify-center h-full cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </td>
                                  <td 
                                    className={cn(
                                      "py-2 sm:py-3 px-2 sm:px-3 font-medium text-sm sm:text-base",
                                      statusColor
                                    )}
                                  >
                                    <div className="max-w-[100px] sm:max-w-full overflow-hidden text-ellipsis">
                                      {task.name}
                                    </div>
                                  </td>
                                  <td className="py-2 px-1 text-center text-xs">
                                    {daysSince !== null ? (
                                      <Badge variant="outline" className="text-xs">
                                        {daysSince}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-1 text-center">
                                    {taskBeingEdited === task.id ? (
                                      <div className="flex items-center justify-center">
                                        <Input
                                          value={taskInterval}
                                          onChange={(e) => {
                                            const value = e.target.value.replace(/[^\d]/g, '');
                                            setTaskInterval(value);
                                          }}
                                          className="w-12 h-7 text-xs text-center p-1"
                                          autoFocus
                                          onBlur={() => handleUpdateInterval(task.id, taskInterval)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleUpdateInterval(task.id, taskInterval);
                                            } else if (e.key === 'Escape') {
                                              setTaskBeingEdited(null);
                                              setTaskInterval('');
                                            }
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <Badge 
                                        variant="outline" 
                                        className="cursor-pointer text-xs"
                                        onClick={() => {
                                          setTaskBeingEdited(task.id);
                                          setTaskInterval(task.interval?.toString() || '');
                                        }}
                                      >
                                        {task.interval || '-'}
                                      </Badge>
                                    )}
                                  </td>
                                  {weekDates.map((date) => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const isCompleted = task.completedDays.includes(dateStr);
                                    const isCurrentDay = isToday(dateStr);
                                    
                                    return (
                                      <td 
                                        key={dateStr} 
                                        className={cn(
                                          "py-2 sm:py-3 px-1 sm:px-2 text-center",
                                          isCurrentDay ? "bg-today-highlight" : ""
                                        )}
                                      >
                                        <button
                                          onClick={() => handleToggleDay(task.id, dateStr)}
                                          className="mx-auto block transition-all duration-200 hover:scale-110 mobile-touch-friendly"
                                        >
                                          {isCompleted ? (
                                            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary fill-primary" />
                                          ) : (
                                            <Circle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                                          )}
                                        </button>
                                      </td>
                                    );
                                  })}
                                  <td className="py-2 sm:py-3 px-1 sm:px-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full opacity-70 hover:opacity-100"
                                      onClick={() => handleDeleteTask(task.id)}
                                    >
                                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hover:text-destructive transition-colors" />
                                    </Button>
                                  </td>
                                </tr>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </tbody>
                    </table>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyTaskView;
