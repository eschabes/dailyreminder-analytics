
import { WeeklyTask } from '@/types';
import { differenceInDays, parseISO, format, isSameDay, startOfWeek, endOfWeek, isWithinInterval, isToday, addDays } from 'date-fns';

/**
 * Calculate days since last completion of a task
 */
export function getDaysSinceLastCompletion(task: WeeklyTask, referenceDate?: string | null): number | null {
  if (!task.completedDays.length) {
    return null;
  }

  // Sort completed days in descending order
  const sortedDays = [...task.completedDays].sort((a, b) => 
    parseISO(b).getTime() - parseISO(a).getTime()
  );

  const lastCompletionDate = parseISO(sortedDays[0]);
  const compareDate = referenceDate ? parseISO(referenceDate) : new Date();
  
  return differenceInDays(compareDate, lastCompletionDate);
}

/**
 * Get status color based on days since last completion and task interval
 */
export function getTaskStatusColor(daysSince: number | null, interval: number | undefined): string {
  if (daysSince === null) {
    return 'bg-soft-gray'; // Never completed
  }
  
  if (daysSince === 0) {
    return 'bg-soft-blue'; // Completed today or on selected day
  }

  if (!interval) {
    return ''; // No interval set
  }

  // Status colors based on completion timing
  if (daysSince <= Math.floor(interval * 0.5)) {
    return 'bg-soft-green'; // Recently completed (less than 50% of interval)
  } else if (daysSince <= interval) {
    return 'bg-soft-yellow'; // Approaching due date (50-100% of interval)
  } else {
    return 'bg-soft-red'; // Overdue (more than 100% of interval)
  }
}

/**
 * Check if the given date is today
 */
export function isDateToday(dateStr: string): boolean {
  return isSameDay(parseISO(dateStr), new Date());
}

/**
 * Format date for Excel export
 */
export function formatDateForExport(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy-MM-dd');
}

/**
 * Calculate completion rate for a task based on its interval and completion history
 */
export function calculateTaskCompletionRate(task: WeeklyTask): number {
  if (!task.interval || task.completedDays.length === 0) {
    return 0;
  }

  const now = new Date();
  const oldestCompletion = parseISO(
    [...task.completedDays].sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime())[0]
  );
  
  // Calculate the expected number of completions since the first completion
  const daysSinceFirst = differenceInDays(now, oldestCompletion);
  const expectedCompletions = Math.max(1, Math.floor(daysSinceFirst / task.interval));
  
  // Calculate actual vs expected
  return Math.min(100, Math.round((task.completedDays.length / expectedCompletions) * 100));
}

/**
 * Calculate current completion rate (tasks that are on schedule)
 */
export function calculateCurrentCompletionRate(tasks: WeeklyTask[]): number {
  if (tasks.length === 0) return 0;
  
  // Filter tasks that have intervals set
  const tasksWithIntervals = tasks.filter(task => !!task.interval);
  if (tasksWithIntervals.length === 0) return 0;
  
  // Count tasks that are on schedule (not overdue)
  let onScheduleTasks = 0;
  
  tasksWithIntervals.forEach(task => {
    const daysSince = getDaysSinceLastCompletion(task);
    
    // If never completed or completed today, skip
    if (daysSince === null) return;
    
    // Check if the task is within its interval
    if (daysSince <= (task.interval || Infinity)) {
      onScheduleTasks++;
    }
  });
  
  // Return the percentage of tasks that are on schedule
  return Math.round((onScheduleTasks / tasksWithIntervals.length) * 100);
}

/**
 * Calculate average completion rate across all tasks
 */
export function calculateAverageCompletionRate(tasks: WeeklyTask[]): number {
  if (tasks.length === 0) return 0;
  
  // Filter tasks that have intervals set
  const tasksWithIntervals = tasks.filter(task => !!task.interval);
  if (tasksWithIntervals.length === 0) return 0;
  
  // Calculate the sum of all completion rates
  const totalRate = tasksWithIntervals.reduce((sum, task) => {
    return sum + calculateTaskCompletionRate(task);
  }, 0);
  
  // Return the average
  return Math.round(totalRate / tasksWithIntervals.length);
}

/**
 * Get completions grouped by week
 */
export function getWeeklyCompletions(tasks: WeeklyTask[], weeksToInclude: number = 10): any[] {
  const weeklyData: Record<string, { date: string, completions: number, rate: number }> = {};
  const today = new Date();
  
  // Initialize the past weeks data structure
  for (let i = 0; i < weeksToInclude; i++) {
    const weekDate = new Date(today);
    weekDate.setDate(today.getDate() - (i * 7));
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    weeklyData[weekKey] = {
      date: weekKey,
      completions: 0,
      rate: 0
    };
  }
  
  // Count completions by week
  tasks.forEach(task => {
    task.completedDays.forEach(day => {
      const date = parseISO(day);
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (weeklyData[weekKey]) {
        weeklyData[weekKey].completions += 1;
      }
    });
  });
  
  // Calculate completion rates for each week
  Object.keys(weeklyData).forEach(weekKey => {
    const weekStart = parseISO(weekKey);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    
    // Calculate total tasks that should have been completed this week
    let expectedTasks = 0;
    let completedTasks = 0;
    
    tasks.forEach(task => {
      if (task.interval) {
        // Check if the task existed during this week
        const taskCreated = parseISO(task.createdAt);
        if (taskCreated <= weekEnd) {
          expectedTasks += 1;
          
          // Count if task was completed during this week
          const wasCompletedThisWeek = task.completedDays.some(day => {
            const completionDate = parseISO(day);
            return isWithinInterval(completionDate, { start: weekStart, end: weekEnd });
          });
          
          if (wasCompletedThisWeek) {
            completedTasks += 1;
          }
        }
      }
    });
    
    // Calculate completion rate for this week
    weeklyData[weekKey].rate = expectedTasks > 0 ? Math.round((completedTasks / expectedTasks) * 100) : 0;
  });
  
  // Convert to array and sort by date
  return Object.values(weeklyData)
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
}

/**
 * Prepare tasks data for Excel export
 */
export function prepareTasksForExport(tasks: WeeklyTask[]): any[] {
  return tasks.map(task => {
    const daysSince = getDaysSinceLastCompletion(task);
    
    return {
      'Task Name': task.name,
      'Created On': formatDateForExport(task.createdAt),
      'Last Updated': formatDateForExport(task.updatedAt),
      'Total Completions': task.completedDays.length,
      'Last Completed': task.completedDays.length > 0 
        ? formatDateForExport(task.completedDays.sort((a, b) => 
            parseISO(b).getTime() - parseISO(a).getTime()
          )[0]) 
        : 'Never',
      'Days Since Last Completion': daysSince !== null ? daysSince : 'N/A',
      'Completion Interval (Days)': task.interval || 'Not set',
      'Completion Rate': `${calculateTaskCompletionRate(task)}%`,
      'Completion Dates': task.completedDays
        .map(date => formatDateForExport(date))
        .join(', ')
    };
  });
}
