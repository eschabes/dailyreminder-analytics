
import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ChecklistItem as ChecklistItemType, WeekData, DayChecklist } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  formatDate, 
  formatDateForDisplay,
  getDayName,
  getCurrentWeekDates,
  getPreviousWeek,
  getNextWeek,
  getWeekDates,
  isCurrentWeek
} from '@/lib/dates';
import { getOrCreateWeekData, saveWeekData } from '@/lib/storage';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import WeekNavigation from './WeekNavigation';
import ChecklistItem from './ChecklistItem';
import AddItemDialog from './AddItemDialog';
import { cn } from '@/lib/utils';

interface WeeklyChecklistProps {
  onAnalyticsUpdate: () => void;
}

const WeeklyChecklist = ({ onAnalyticsUpdate }: WeeklyChecklistProps) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [activeDay, setActiveDay] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const isMobile = useIsMobile();

  // Load week data
  useEffect(() => {
    const data = getOrCreateWeekData(currentDate);
    setWeekData(data);
    
    // Set active day to current day or first day of the week
    const today = new Date();
    const todayString = formatDate(today);
    const dayInWeek = data.days.find(day => day.date === todayString);
    
    if (dayInWeek && isCurrentWeek(currentDate)) {
      setActiveDay(todayString);
    } else {
      setActiveDay(data.days[0].date);
    }
  }, [currentDate]);

  const handlePreviousWeek = () => {
    setCurrentDate(prevDate => getPreviousWeek(prevDate));
  };

  const handleNextWeek = () => {
    setCurrentDate(prevDate => getNextWeek(prevDate));
  };

  const handleCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  const handleAddItem = (name: string, dateString: string) => {
    if (!weekData) return;
    
    const newItem: ChecklistItemType = {
      id: uuidv4(),
      name,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedWeekData: WeekData = {
      ...weekData,
      days: weekData.days.map(day => 
        day.date === dateString
          ? { ...day, items: [...day.items, newItem] }
          : day
      ),
    };
    
    setWeekData(updatedWeekData);
    saveWeekData(updatedWeekData);
    onAnalyticsUpdate();
    
    toast.success("Task added successfully", {
      description: `"${name}" added to ${format(parseISO(dateString), 'EEEE')}`,
    });
  };

  const handleToggleComplete = (dayDate: string, itemId: string) => {
    if (!weekData) return;
    
    const updatedWeekData: WeekData = {
      ...weekData,
      days: weekData.days.map(day => 
        day.date === dayDate
          ? { 
              ...day, 
              items: day.items.map(item => 
                item.id === itemId
                  ? { ...item, completed: !item.completed, updatedAt: new Date().toISOString() }
                  : item
              ),
            }
          : day
      ),
    };
    
    setWeekData(updatedWeekData);
    saveWeekData(updatedWeekData);
    onAnalyticsUpdate();
  };

  const handleDeleteItem = (dayDate: string, itemId: string) => {
    if (!weekData) return;
    
    const itemToDelete = weekData.days
      .find(day => day.date === dayDate)?.items
      .find(item => item.id === itemId);
      
    if (!itemToDelete) return;
    
    const updatedWeekData: WeekData = {
      ...weekData,
      days: weekData.days.map(day => 
        day.date === dayDate
          ? { ...day, items: day.items.filter(item => item.id !== itemId) }
          : day
      ),
    };
    
    setWeekData(updatedWeekData);
    saveWeekData(updatedWeekData);
    onAnalyticsUpdate();
    
    toast.info("Task deleted", {
      description: `"${itemToDelete.name}" has been removed`,
    });
  };

  const openAddDialog = (date: Date) => {
    setSelectedDate(date);
    setIsAddDialogOpen(true);
  };

  const getCompletedCount = (day: DayChecklist) => {
    return day.items.filter(item => item.completed).length;
  };

  const getDayProgress = (day: DayChecklist) => {
    if (day.items.length === 0) return 0;
    return (getCompletedCount(day) / day.items.length) * 100;
  };

  if (!weekData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-md bg-muted h-8 w-64 mb-4" />
          <div className="rounded-md bg-muted h-64 w-full" />
        </div>
      </div>
    );
  }

  const currentWeekDates = getWeekDates(currentDate);
  
  return (
    <div className="space-y-6">
      <WeekNavigation
        currentWeekStart={parseISO(weekData.startDate)}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onCurrentWeek={handleCurrentWeek}
      />
      
      <Tabs 
        value={activeDay} 
        onValueChange={setActiveDay}
        className="w-full"
      >
        <div className="relative">
          <ScrollArea className="w-full">
            <TabsList className="w-full justify-start md:justify-center p-1 bg-transparent">
              {weekData.days.map((day, index) => {
                const date = parseISO(day.date);
                const dayName = format(date, 'EEE');
                const dayNumber = format(date, 'd');
                const progress = getDayProgress(day);
                const hasItems = day.items.length > 0;
                const allCompleted = hasItems && getCompletedCount(day) === day.items.length;
                
                return (
                  <TabsTrigger
                    key={day.date}
                    value={day.date}
                    className={cn(
                      "flex flex-col items-center space-y-1 py-2 px-4 relative min-w-[70px]",
                      "data-[state=active]:bg-accent/50 data-[state=active]:shadow-none",
                      "hover:bg-accent/30 transition-all duration-300"
                    )}
                  >
                    {allCompleted && hasItems && (
                      <CheckCircle 
                        className="h-3 w-3 absolute top-1 right-1 text-primary" 
                        strokeWidth={3}
                      />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">{dayName}</span>
                    <span className="text-base font-bold">{dayNumber}</span>
                    {hasItems && (
                      <div className="w-full h-1 bg-muted/60 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500 ease-out",
                            progress === 100 ? "bg-primary" : "bg-muted-foreground/60"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>
        </div>
        
        {weekData.days.map((day) => (
          <TabsContent key={day.date} value={day.date} className="mt-4 outline-none ring-0">
            <Card className="neomorphism border-none overflow-hidden">
              <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {format(parseISO(day.date), 'EEEE')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDateForDisplay(parseISO(day.date))}
                  </p>
                </div>
                <Button
                  onClick={() => openAddDialog(parseISO(day.date))}
                  className="rounded-full h-9 px-4 btn-hover bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Task
                </Button>
              </CardHeader>
              
              <CardContent className="px-6 py-4">
                <ScrollArea className={cn(
                  "rounded-md",
                  isMobile ? "max-h-[calc(100vh-24rem)]" : "max-h-[calc(100vh-18rem)]"
                )}>
                  <div className="space-y-1 pb-4">
                    {day.items.length === 0 ? (
                      <div className="py-8 flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-accent p-3 mb-3">
                          <Plus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-medium mb-1">No Tasks Yet</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Add tasks to track your progress for {format(parseISO(day.date), 'EEEE')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {day.items.map((item) => (
                          <ChecklistItem
                            key={item.id}
                            item={item}
                            onToggleComplete={(id) => handleToggleComplete(day.date, id)}
                            onDelete={(id) => handleDeleteItem(day.date, id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      <AddItemDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAddItem={handleAddItem}
        selectedDate={selectedDate}
        availableDates={currentWeekDates}
      />
    </div>
  );
};

export default WeeklyChecklist;
