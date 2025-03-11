
import { useState } from 'react';
import { format } from 'date-fns';
import { WeeklyTask } from '@/types';
import { Draggable } from 'react-beautiful-dnd';
import { CheckCircle, Circle, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDaysSinceLastCompletion, getTaskStatusColor, isToday } from '@/lib/task-analytics';

interface WeeklyTaskRowProps {
  task: WeeklyTask;
  index: number;
  weekDates: Date[];
  onToggleDay: (taskId: string, dateStr: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateInterval: (taskId: string, interval: string) => void;
}

const WeeklyTaskRow = ({ 
  task, 
  index, 
  weekDates, 
  onToggleDay, 
  onDeleteTask, 
  onUpdateInterval 
}: WeeklyTaskRowProps) => {
  const [taskBeingEdited, setTaskBeingEdited] = useState<string | null>(null);
  const [taskInterval, setTaskInterval] = useState<string>('');
  const daysSince = getDaysSinceLastCompletion(task);
  const statusColor = getTaskStatusColor(daysSince, task.interval);

  const handleUpdateInterval = (taskId: string, interval: string) => {
    onUpdateInterval(taskId, interval);
    setTaskBeingEdited(null);
    setTaskInterval('');
  };

  return (
    <Draggable draggableId={task.id} index={index}>
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
