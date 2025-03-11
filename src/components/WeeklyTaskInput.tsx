
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { WeeklyTask } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WeeklyTaskInputProps {
  onAddTask: (task: WeeklyTask) => void;
}

const WeeklyTaskInput = ({ onAddTask }: WeeklyTaskInputProps) => {
  const [newTaskName, setNewTaskName] = useState('');
  const [taskInterval, setTaskInterval] = useState<string>('');

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
    
    onAddTask(newTask);
    setNewTaskName('');
    setTaskInterval('');
    
    toast.success('Weekly task added', {
      description: `"${newTaskName}" has been added to your weekly tasks`,
    });
  };

  return (
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
  );
};

export default WeeklyTaskInput;
