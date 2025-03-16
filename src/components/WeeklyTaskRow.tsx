
import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { WeeklyTask } from '@/types';
import { Draggable } from 'react-beautiful-dnd';
import { CheckCircle, Circle, Trash2, GripVertical, X, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDaysSinceLastCompletion, getTaskStatusColor, isToday } from '@/lib/task-analytics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WeeklyTaskRowProps {
  task: WeeklyTask;
  index: number;
  weekDates: Date[];
  selectedDate: string | null;
  onToggleDay: (taskId: string, dateStr: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateInterval: (taskId: string, interval: string) => void;
  onUpdateTaskName: (taskId: string, newName: string) => void;
}

const WeeklyTaskRow = ({ 
  task, 
  index, 
  weekDates, 
  selectedDate,
  onToggleDay, 
  onDeleteTask, 
  onUpdateInterval,
  onUpdateTaskName
}: WeeklyTaskRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(task.name);
  const [editedInterval, setEditedInterval] = useState(task.interval?.toString() || '');
  const [longPressTimers, setLongPressTimers] = useState<Record<string, NodeJS.Timeout | null>>({});
  const [lastTapTime, setLastTapTime] = useState<Record<string, number>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const taskNameRef = useRef<HTMLDivElement>(null);
  
  // Use the selected date if available, otherwise use the normal calculation
  const daysSince = selectedDate 
    ? (task.completedDays.includes(selectedDate) 
        ? 0 
        : getDaysSinceLastCompletion(task, selectedDate))
    : getDaysSinceLastCompletion(task);
    
  const statusColor = getTaskStatusColor(daysSince, task.interval);

  const handleSave = () => {
    // Update name if it changed and is not empty
    if (editedName.trim() !== task.name && editedName.trim() !== '') {
      onUpdateTaskName(task.id, editedName);
    }
    
    // Update interval
    onUpdateInterval(task.id, editedInterval);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(task.name);
    setEditedInterval(task.interval?.toString() || '');
    setIsEditing(false);
  };

  // Handle clicking outside the editor
  useEffect(() => {
    if (!isEditing) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if the click is outside both the dropdown and the task name
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) && 
        taskNameRef.current && 
        !taskNameRef.current.contains(target)
      ) {
        handleCancel();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);

  // Clean up any lingering timers
  useEffect(() => {
    return () => {
      Object.values(longPressTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [longPressTimers]);

  // Get completion count for a specific date
  const getCompletionCount = (dateStr: string): number => {
    const completions = task.completionCounts?.[dateStr] || 0;
    return completions;
  };

  // Handle mouse down for long press
  const handleMouseDown = (dateStr: string) => {
    // Start timer for long press
    const timer = setTimeout(() => {
      // Reset completions to zero for this date
      const updatedCounts = { ...(task.completionCounts || {}) };
      updatedCounts[dateStr] = 0;
      
      // Call toggle with a special signal to update counts
      onToggleDay(task.id, `reset:${dateStr}`);
      
      // Clear the timer
      setLongPressTimers(prev => ({ ...prev, [dateStr]: null }));
    }, 800); // 800ms for long press
    
    setLongPressTimers(prev => ({ ...prev, [dateStr]: timer }));
  };

  // Handle mouse up to cancel long press
  const handleMouseUp = (dateStr: string) => {
    const timer = longPressTimers[dateStr];
    if (timer) {
      clearTimeout(timer);
      setLongPressTimers(prev => ({ ...prev, [dateStr]: null }));
    }
  };

  // Handle click/tap on completion button
  const handleCompletionClick = (dateStr: string) => {
    // Cancel any long press timer
    const timer = longPressTimers[dateStr];
    if (timer) {
      clearTimeout(timer);
      setLongPressTimers(prev => ({ ...prev, [dateStr]: null }));
    }
    
    // Check for double tap (within 300ms)
    const now = Date.now();
    const lastTap = lastTapTime[dateStr] || 0;
    const isDoubleTap = now - lastTap < 300;
    
    // Update last tap time
    setLastTapTime(prev => ({ ...prev, [dateStr]: now }));
    
    if (isDoubleTap) {
      // Double tap - decrease count (but not below 0)
      onToggleDay(task.id, `decrement:${dateStr}`);
    } else {
      // Single tap - increase count
      onToggleDay(task.id, `increment:${dateStr}`);
    }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <tr 
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="border-t border-border/40"
          data-task-id={task.id}
        >
          <td className="py-1 px-0 handle-column fixed-column">
            <div
              {...provided.dragHandleProps}
              className="flex items-center justify-center h-full cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>
          </td>
          <td 
            className={cn(
              "py-1 px-1 font-medium text-xs relative task-column fixed-column",
              statusColor
            )}
          >
            <div 
              ref={taskNameRef}
              className="truncate cursor-pointer flex items-center task-name"
              onClick={() => setIsEditing(true)}
            >
              {task.name}
              <Pencil className="h-2 w-2 ml-1 text-muted-foreground opacity-50" />
            </div>
            
            {isEditing && (
              <div 
                ref={dropdownRef}
                className="task-edit-dropdown"
              >
                <div className="space-y-3 p-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Task Name</label>
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Interval (days)
                      {task.interval && (
                        <span className="text-muted-foreground ml-1">
                          {task.interval} days
                        </span>
                      )}
                    </label>
                    <Input
                      value={editedInterval}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setEditedInterval(value);
                      }}
                      className="h-8 text-sm"
                      placeholder="Days between completions"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 px-2 text-xs"
                      onClick={handleCancel}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={handleSave}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </td>
          <td className="py-1 px-0 text-center text-xs days-column fixed-column">
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {daysSince !== null ? daysSince : '-'}
            </Badge>
          </td>
          {weekDates.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const completionCount = getCompletionCount(dateStr);
            const isCompleted = completionCount > 0;
            const isCurrentDay = isToday(dateStr);
            const isSelectedDay = selectedDate === dateStr;
            
            return (
              <td 
                key={dateStr} 
                className={cn(
                  "py-1 px-0 text-center day-column",
                  isCurrentDay ? "bg-today-highlight" : "",
                  isSelectedDay && !isCurrentDay ? "bg-selected-day" : "",
                  isSelectedDay && isCurrentDay ? "bg-current-selected-day" : ""
                )}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleCompletionClick(dateStr)}
                        onMouseDown={() => handleMouseDown(dateStr)}
                        onMouseUp={() => handleMouseUp(dateStr)}
                        onMouseLeave={() => handleMouseUp(dateStr)}
                        onTouchStart={() => handleMouseDown(dateStr)}
                        onTouchEnd={() => handleMouseUp(dateStr)}
                        className="mx-auto block transition-all"
                      >
                        {isCompleted ? (
                          <div className="relative">
                            <CheckCircle className="h-4 w-4 text-primary fill-primary" />
                            {completionCount > 1 && (
                              <span className="absolute -top-2 -right-2 flex items-center justify-center bg-primary text-white rounded-full text-[9px] h-3.5 w-3.5 font-semibold">
                                {completionCount}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs p-2">
                      <p className="font-medium">{format(date, 'EEEE, MMM d')}</p>
                      <p>
                        {completionCount === 0 
                          ? "Not completed" 
                          : `Completed ${completionCount} ${completionCount === 1 ? "time" : "times"}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Single tap: +1 completion<br />
                        Double tap: -1 completion<br />
                        Long press: Reset to 0
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </td>
            );
          })}
          <td className="py-1 px-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-full opacity-70 hover:opacity-100"
              onClick={() => onDeleteTask(task.id)}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive transition-colors" />
            </Button>
          </td>
        </tr>
      )}
    </Draggable>
  );
};

export default WeeklyTaskRow;
