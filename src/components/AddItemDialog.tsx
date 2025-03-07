
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateForDisplay, DAYS_OF_WEEK } from '@/lib/dates';

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (name: string, date: string) => void;
  selectedDate: Date;
  availableDates: Date[];
}

const AddItemDialog = ({ isOpen, onClose, onAddItem, selectedDate, availableDates }: AddItemDialogProps) => {
  const [itemName, setItemName] = useState('');
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    return availableDates.find(d => d.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0])
      ?.toISOString().split('T')[0] || availableDates[0].toISOString().split('T')[0];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemName.trim()) {
      onAddItem(itemName.trim(), selectedDateStr);
      setItemName('');
      onClose();
    }
  };

  const getDayIndex = (date: Date) => {
    return date.getDay(); // 0 for Sunday, 1 for Monday, etc.
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md glassmorphism">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium leading-6">Add New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="itemName" className="text-sm font-medium">
              Task Name
            </Label>
            <Input
              id="itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Enter task name"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Day of the Week</Label>
            <div className="grid grid-cols-7 gap-1">
              {availableDates.map((date, index) => {
                const dateStr = date.toISOString().split('T')[0];
                const isSelected = dateStr === selectedDateStr;
                const dayIndex = getDayIndex(date);
                
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-md px-1 py-2 text-xs font-medium transition-all",
                      isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    )}
                  >
                    <span className="text-xs">{DAYS_OF_WEEK[dayIndex].substring(0, 1)}</span>
                    <span className="text-sm font-bold mt-0.5">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="btn-hover"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!itemName.trim()} 
              className="btn-hover bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Add Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import { cn } from '@/lib/utils';
export default AddItemDialog;
