
import { useState } from 'react';
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

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <tr 
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="border-t border-border/40"
        >
          <td className="w-8 py-2 px-1 fixed-column handle-column">
            <div
              {...provided.dragHandleProps}
              className="flex items-center justify-center h-full cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </td>
          <td 
            className={cn(
              "py-2 sm:py-3 px-2 sm:px-3 font-medium text-sm sm:text-base relative fixed-column task-column",
              statusColor
            )}
          >
            <div 
              className="max-w-[100px] sm:max-w-full overflow-hidden text-ellipsis cursor-pointer flex items-center"
              onClick={() => setIsEditing(true)}
            >
              {task.name}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Pencil className="h-3 w-3 ml-1 text-muted-foreground opacity-50" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit task</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {isEditing && (
              <div className="absolute z-30 top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-md p-3 w-64">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Task Name</label>
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="h-8 text-sm"
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
          <td className="py-2 px-1 text-center text-xs fixed-column days-column">
            {daysSince !== null ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      {daysSince}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Days since last completion</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-muted-foreground text-xs">-</span>
            )}
          </td>
          {weekDates.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const isCompleted = task.completedDays.includes(dateStr);
            const isCurrentDay = isToday(dateStr);
            const isSelectedDay = selectedDate === dateStr;
            
            return (
              <td 
                key={dateStr} 
                className={cn(
                  "py-2 sm:py-3 px-1 sm:px-2 text-center",
                  isCurrentDay ? "bg-today-highlight" : "",
                  isSelectedDay && !isCurrentDay ? "bg-selected-day" : "",
                  isSelectedDay && isCurrentDay ? "bg-current-selected-day" : ""
                )}
              >
                <button
                  onClick={() => onToggleDay(task.id, dateStr)}
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
              onClick={() => onDeleteTask(task.id)}
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hover:text-destructive transition-colors" />
            </Button>
          </td>
        </tr>
      )}
    </Draggable>
  );
};

export default WeeklyTaskRow;
