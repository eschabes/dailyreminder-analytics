
import { format, parseISO, differenceInDays, subDays, startOfWeek, addDays, isAfter, compareAsc } from 'date-fns';
import { WeeklyTask } from '@/types';

/**
 * Calculate the number of days since the last completion of a task
 */
export const getDaysSinceLastCompletion = (task: WeeklyTask, selectedDate: string | null = null): number | null => {
  const completedDays = task.completedDays;

  if (completedDays.length === 0) {
    return null;
  }

  const referenceDate = selectedDate ? parseISO(selectedDate) : new Date();

  const sortedDays = completedDays
    .map(date => parseISO(date))
    .sort((a, b) => b.getTime() - a.getTime());

  const mostRecentCompletion = sortedDays[0];
  return differenceInDays(referenceDate, mostRecentCompletion);
};

/**
 * Get the appropriate status color based on days since last completion and interval
 */
export const getTaskStatusColor = (daysSince: number | null, interval?: number): string => {
  if (daysSince === null) {
    return 'bg-soft-gray';
  }

  if (interval === undefined) {
    return 'bg-soft-green';
  }

  if (daysSince <= interval) {
    return 'bg-soft-green';
  } else if (daysSince <= 2 * interval) {
    return 'bg-soft-yellow';
  } else {
    return 'bg-soft-red';
  }
};

/**
 * Check if a date string is today's date
 */
export const isToday = (dateStr: string): boolean => {
  const today = new Date();
  const date = parseISO(dateStr);
  return differenceInDays(today, date) === 0;
};

/**
 * Calculate the completion rate of a single task
 */
export const calculateTaskCompletionRate = (task: WeeklyTask): number => {
  const completedCount = task.completedDays.length;
  const createdAt = parseISO(task.createdAt);
  const today = new Date();
  const daysSinceCreation = differenceInDays(today, createdAt) + 1;
  
  if (daysSinceCreation <= 0) return 0;
  
  return Math.min(Math.round((completedCount / daysSinceCreation) * 100), 100);
};

/**
 * Calculate the average completion rate of all tasks
 */
export const calculateAverageCompletionRate = (tasks: WeeklyTask[]): number => {
  if (tasks.length === 0) {
    return 0;
  }

  const totalCompletionRate = tasks.reduce((sum, task) => {
    return sum + calculateTaskCompletionRate(task);
  }, 0);

  return Math.round(totalCompletionRate / tasks.length);
};

/**
 * Calculate the current completion rate based on task intervals
 */
export const calculateCurrentCompletionRate = (tasks: WeeklyTask[]): number => {
  if (tasks.length === 0) {
    return 0;
  }

  let completedTasks = 0;
  tasks.forEach(task => {
    const daysSince = getDaysSinceLastCompletion(task);
    if (daysSince !== null && task.interval !== undefined && daysSince <= task.interval) {
      completedTasks++;
    }
  });

  return Math.round((completedTasks / tasks.length) * 100);
};

/**
 * Get weekly completions data for analytics
 */
export const getWeeklyCompletions = (tasks: WeeklyTask[], weeksToShow: number = 8): any[] => {
  if (!tasks.length) return [];
  
  // Get the current date and calculate start dates for each week
  const today = new Date();
  const weeks = [];
  
  for (let i = 0; i < weeksToShow; i++) {
    const weekStart = subDays(today, (i * 7) + (today.getDay() || 7));
    const weekStartStr = format(startOfWeek(weekStart, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    const weekLabel = format(weekStart, 'MMM d');
    
    weeks.push({
      weekStart: weekStartStr,
      label: weekLabel,
      days: [],
      tasks: tasks.map(t => ({ id: t.id, name: t.name })),
      taskCompletions: {},
      dayRates: {},
      completions: 0
    });
  }
  
  // Sort weeks by date (oldest to newest)
  weeks.sort((a, b) => compareAsc(parseISO(a.weekStart), parseISO(b.weekStart)));
  
  // Process each week
  weeks.forEach(week => {
    // Generate array of days for this week
    const weekStartDate = parseISO(week.weekStart);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStartDate, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const isFuture = isAfter(day, today);
      
      days.push({
        date: dayStr,
        day: format(day, 'EEE'),
        completions: 0,
        tasksCompleted: 0,
        totalTasks: tasks.length,
        rate: 0,
        isFuture
      });
      
      // Initialize taskCompletions for this day
      week.taskCompletions[dayStr] = [];
    }
    
    week.days = days;
    
    // Calculate completions for each day and total for week
    let weeklyCompletionCount = 0;
    let daysWithData = 0;
    
    // Count unique weeks where tasks were completed
    const taskCompletionWeeks = new Map();
    
    tasks.forEach(task => {
      task.completedDays.forEach(dateStr => {
        const date = parseISO(dateStr);
        const dayStr = format(date, 'yyyy-MM-dd');
        const weekOfYear = format(date, 'yyyy-ww');
        
        if (!taskCompletionWeeks.has(task.id)) {
          taskCompletionWeeks.set(task.id, new Set());
        }
        taskCompletionWeeks.get(task.id).add(weekOfYear);
        
        // Check if the completion is in this week
        const dayObj = week.days.find(d => d.date === dayStr);
        if (dayObj) {
          // Get the count for this completion (default to 1 if no counts available)
          const count = task.completionCounts?.[dayStr] || 1;
          weeklyCompletionCount += count;
          dayObj.completions += count;
          
          if (!week.taskCompletions[dayStr].includes(task.id)) {
            week.taskCompletions[dayStr].push(task.id);
            dayObj.tasksCompleted++;
          }
        }
      });
    });
    
    // Calculate average completions per week
    // First, count the number of unique weeks for all tasks
    let totalUniqueWeeks = 0;
    taskCompletionWeeks.forEach(weekSet => {
      totalUniqueWeeks += weekSet.size;
    });
    
    // Calculate the average
    const avgCompletionsPerWeek = totalUniqueWeeks > 0 
      ? Math.round((weeklyCompletionCount / tasks.length) * 10) / 10 
      : 0;
    
    week.completions = avgCompletionsPerWeek;
    
    // Calculate completion rate for each day
    week.days.forEach(day => {
      if (!day.isFuture) {
        daysWithData++;
        day.rate = day.totalTasks > 0 
          ? Math.round((day.tasksCompleted / day.totalTasks) * 100) 
          : 0;
        week.dayRates[day.date] = day.rate;
      }
    });
    
    // Calculate average rate for the week
    const ratesSum = Object.values(week.dayRates).reduce((sum: number, rate: any) => {
      // Ensure rate is a number before adding
      const numericRate = typeof rate === 'number' ? rate : 0;
      return sum + numericRate;
    }, 0);
    
    // Calculate the average rate safely
    const avgRate = daysWithData > 0 ? Math.round(Number(ratesSum) / Number(daysWithData)) : 0;
    week.avgRate = avgRate;
  });
  
  return weeks;
};

/**
 * Prepare tasks data for export to Excel/CSV
 */
export const prepareTasksForExport = (tasks: WeeklyTask[]): any[] => {
  if (!tasks.length) return [];
  
  return tasks.map(task => {
    const completionRate = calculateTaskCompletionRate(task);
    const daysSinceLastCompletion = getDaysSinceLastCompletion(task);
    const status = daysSinceLastCompletion !== null && task.interval
      ? daysSinceLastCompletion <= task.interval 
        ? 'On schedule' 
        : 'Overdue'
      : 'Not tracked';
      
    return {
      Name: task.name,
      'Completion Rate (%)': completionRate,
      'Days Since Last Completion': daysSinceLastCompletion || 'Never completed',
      'Interval (days)': task.interval || 'Not set',
      Status: status,
      'Created On': format(parseISO(task.createdAt), 'MMM d, yyyy'),
      'Total Completions': task.completedDays.length,
    };
  });
};
