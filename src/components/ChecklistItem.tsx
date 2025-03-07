
import { useState, useRef, useEffect } from 'react';
import { ChecklistItem as ChecklistItemType } from '@/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

const ChecklistItem = ({ item, onToggleComplete, onDelete }: ChecklistItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const checkboxRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    // Add subtle animation when item is rendered
    const timer = setTimeout(() => {
      if (checkboxRef.current) {
        checkboxRef.current.classList.add('animate-scale-in');
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={cn(
        'group flex items-center justify-between py-3 px-4 rounded-lg transition-all duration-300',
        'border border-transparent hover:border-border',
        item.completed ? 'bg-muted/50' : 'hover:bg-accent/50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="relative">
          <Checkbox
            ref={checkboxRef}
            checked={item.completed}
            onCheckedChange={() => onToggleComplete(item.id)}
            className={cn(
              "h-5 w-5 rounded-md border-2 transition-all", 
              item.completed ? 'border-primary' : 'border-muted-foreground',
            )}
          />
          {item.completed && (
            <Check 
              className="absolute top-0.5 left-0.5 h-4 w-4 text-primary-foreground" 
              strokeWidth={3}
            />
          )}
        </div>
        
        <span 
          className={cn(
            "text-base font-medium transition-all duration-300",
            item.completed && "text-muted-foreground line-through"
          )}
        >
          {item.name}
        </span>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
      </Button>
    </div>
  );
};

export default ChecklistItem;
