
import { ScrollArea } from '@/components/ui/scroll-area';
import { WeeklyTask } from '@/types';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import WeeklyTaskRow from './WeeklyTaskRow';
import WeeklyTaskTableHeader from './WeeklyTaskTableHeader';

interface WeeklyTaskListProps {
  weeklyTasks: WeeklyTask[];
  weekDates: Date[];
  isMobile: boolean;
  onToggleDay: (taskId: string, dateStr: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateInterval: (taskId: string, interval: string) => void;
  onDragEnd: (result: DropResult) => void;
}

const WeeklyTaskList = ({
  weeklyTasks,
  weekDates,
  isMobile,
  onToggleDay,
  onDeleteTask,
  onUpdateInterval,
  onDragEnd
}: WeeklyTaskListProps) => {
  if (weeklyTasks.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-accent p-3 mb-3">
          <Plus className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium mb-1">No Weekly Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Add tasks that you want to track across multiple days of the week
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn(
      "rounded-md",
      isMobile ? "max-h-[calc(100vh-14rem)]" : "max-h-[calc(100vh-18rem)]"
    )}>
      <div className="w-full overflow-x-auto pb-2">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="tasks">
            {(provided) => (
              <table className="w-full" {...provided.droppableProps} ref={provided.innerRef}>
                <WeeklyTaskTableHeader weekDates={weekDates} isMobile={isMobile} />
                <tbody className="divide-y divide-border/30">
                  {weeklyTasks.map((task, index) => (
                    <WeeklyTaskRow
                      key={task.id}
                      task={task}
                      index={index}
                      weekDates={weekDates}
                      onToggleDay={onToggleDay}
                      onDeleteTask={onDeleteTask}
                      onUpdateInterval={onUpdateInterval}
                    />
                  ))}
                  {provided.placeholder}
                </tbody>
              </table>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </ScrollArea>
  );
};

export default WeeklyTaskList;
