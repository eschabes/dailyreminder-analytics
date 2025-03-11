
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { WeeklyTask } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Circle, Plus, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { getWeekDates } from '@/lib/dates';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

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
    };
    
    const updatedTasks = [...weeklyTasks, newTask];
    setWeeklyTasks(updatedTasks);
    saveWeeklyTasks(updatedTasks);
    setNewTaskName('');
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

  return (
    <Card className="neomorphism border-none mb-6">
      <CardHeader className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
        "px-4 py-3 sm:px-6 sm:py-4"
      )}>
        <h2 className="text-lg font-semibold tracking-tight">Weekly Tasks</h2>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Input
            placeholder="Add a new weekly task..."
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            className="w-full sm:w-64"
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
                          <th className="text-left py-2 px-2 sm:px-3 font-medium text-muted-foreground text-sm w-24 sm:w-64">Task</th>
                          {weekDates.map((date) => (
                            <th key={date.toISOString()} className="text-center py-2 px-1 sm:px-2 font-medium text-muted-foreground text-xs sm:text-sm">
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
                        {weeklyTasks.map((task, index) => (
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
                                <td className="py-2 sm:py-3 px-2 sm:px-3 font-medium text-sm sm:text-base">
                                  <div className="max-w-[120px] sm:max-w-full overflow-hidden text-ellipsis">
                                    {task.name}
                                  </div>
                                </td>
                                {weekDates.map((date) => {
                                  const dateStr = format(date, 'yyyy-MM-dd');
                                  const isCompleted = task.completedDays.includes(dateStr);
                                  return (
                                    <td key={dateStr} className="py-2 sm:py-3 px-1 sm:px-2 text-center">
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
                        ))}
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
