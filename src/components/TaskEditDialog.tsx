import { useEffect, useState } from 'react';
import { WeeklyTask } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaskEditDialogProps {
  task: WeeklyTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: { name: string; interval?: number }) => void;
  onDelete: (id: string) => void;
}

const TaskEditDialog = ({ task, open, onOpenChange, onSave, onDelete }: TaskEditDialogProps) => {
  const [name, setName] = useState('');
  const [interval, setInterval] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setInterval(task.interval != null ? String(task.interval) : '');
    }
  }, [task]);

  if (!task) return null;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Name is required');
      return;
    }
    const parsed = interval.trim() ? parseInt(interval, 10) : undefined;
    onSave(task.id, { name: trimmed, interval: parsed });
    toast.success('Task updated');
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(task.id);
    setConfirmOpen(false);
    onOpenChange(false);
    toast.info('Task deleted', { description: `"${task.name}" removed` });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>Update the name or interval.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-name">Name</Label>
              <Input
                id="task-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-interval">Interval (days)</Label>
              <Input
                id="task-interval"
                value={interval}
                onChange={(e) => setInterval(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                placeholder="e.g. 3 — leave blank for daily"
              />
              <p className="text-xs text-muted-foreground">
                How many days between repetitions. Blank = no interval.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes "{task.name}" and all its history. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskEditDialog;