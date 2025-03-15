
import { WeeklyTask } from '@/types';
import { differenceInDays, parseISO, format, isSameDay, startOfWeek, endOfWeek, isWithinInterval, isToday as dateIsToday, addDays } from 'date-fns';

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
 * Export isToday function to fix the build error
 */
export function isToday(dateStr: string): boolean {
  return dateIsToday(parseISO(dateStr));
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
 * Modified to only consider tasks completed today or within their interval
 */
export function calculateCurrentCompletionRate(tasks: WeeklyTask[]): number {
  if (tasks.length === 0) return 0;
  
  // Filter tasks that have intervals set
  const tasksWithIntervals = tasks.filter(task => !!task.interval);
  if (tasksWithIntervals.length === 0) return 0;
  
  // Count tasks that are completed today (blue) or within interval (green)
  let onScheduleTasks = 0;
  
  tasksWithIntervals.forEach(task => {
    const daysSince = getDaysSinceLastCompletion(task);
    
    // If task is completed today or within its interval (green/blue status)
    if (daysSince === 0 || (daysSince !== null && daysSince <= (task.interval || Infinity))) {
      onScheduleTasks++;
    }
  });
  
  // Return the percentage of tasks that are on schedule
  return Math.round((onScheduleTasks / tasksWithIntervals.length) * 100);
}

/**
 * Calculate average completion rate across all tasks
 * Modified to consider the average of daily completion rates
 */
export function calculateAverageCompletionRate(tasks: WeeklyTask[]): number {
  if (tasks.length === 0) return 0;
  
  // Filter tasks that have intervals set
  const tasksWithIntervals = tasks.filter(task => !!task.interval);
  if (tasksWithIntervals.length === 0) return 0;
  
  // Get all unique dates from completions
  const allDates = new Set<string>();
  tasksWithIntervals.forEach(task => {
    task.completedDays.forEach(day => {
      allDates.add(day.split('T')[0]); // Store just the date part
    });
  });
  
  const dateArray = Array.from(allDates).sort();
  
  // If no completion dates, return 0
  if (dateArray.length === 0) return 0;
  
  // Calculate completion rate for each day
  let totalDailyRates = 0;
  
  dateArray.forEach(date => {
    let tasksCompletedOnDay = 0;
    
    tasksWithIntervals.forEach(task => {
      const wasCompletedOnDay = task.completedDays.some(day => day.startsWith(date));
      if (wasCompletedOnDay) {
        tasksCompletedOnDay++;
      }
    });
    
    const dailyRate = (tasksCompletedOnDay / tasksWithIntervals.length) * 100;
    totalDailyRates += dailyRate;
  });
  
  // Return the average of all daily rates
  return Math.round(totalDailyRates / dateArray.length);
}

/**
 * Get completions grouped by week
 * Modified to show daily completion rates within each week
 */
export function getWeeklyCompletions(tasks: WeeklyTask[], weeksToInclude: number = 6): any[] {
  if (tasks.length === 0) return [];
  
  const tasksWithIntervals = tasks.filter(task => !!task.interval);
  if (tasksWithIntervals.length === 0) return [];
  
  const today = new Date();
  const weeklyData = [];
  
  // Process the last N weeks
  for (let weekOffset = 0; weekOffset < weeksToInclude; weekOffset++) {
    const weekDate = new Date(today);
    weekDate.setDate(today.getDate() - (weekOffset * 7));
    
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    // Calculate daily completion rates for this week
    const dailyRates = [];
    let weekTotalRate = 0;
    let daysWithData = 0;
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDay = addDays(weekStart, dayOffset);
      const dayKey = format(currentDay, 'yyyy-MM-dd');
      
      // Count tasks completed on this day
      let tasksCompletedOnDay = 0;
      
      tasksWithIntervals.forEach(task => {
        const wasCompletedOnDay = task.completedDays.some(day => 
          day.startsWith(dayKey)
        );
        
        if (wasCompletedOnDay) {
          tasksCompletedOnDay++;
        }
      });
      
      // Calculate completion rate for this day
      const dayRate = tasksWithIntervals.length > 0 
        ? Math.round((tasksCompletedOnDay / tasksWithIntervals.length) * 100)
        : 0;
      
      if (tasksCompletedOnDay > 0) {
        weekTotalRate += dayRate;
        daysWithData++;
      }
      
      dailyRates.push({
        day: format(currentDay, 'EEE'),
        date: dayKey,
        rate: dayRate
      });
    }
    
    // Calculate average rate for the week
    const weekAvgRate = daysWithData > 0 
      ? Math.round(weekTotalRate / daysWithData)
      : 0;
    
    // Count total completions for this week
    const weekCompletions = tasksWithIntervals.reduce((total, task) => {
      const completionsThisWeek = task.completedDays.filter(day => {
        const date = parseISO(day);
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
      }).length;
      
      return total + completionsThisWeek;
    }, 0);
    
    // Only add weeks that have some data
    if (weekCompletions > 0 || weekAvgRate > 0) {
      weeklyData.push({
        weekStart: weekKey,
        label: format(weekStart, 'MMM d'),
        avgRate: weekAvgRate,
        completions: weekCompletions,
        days: dailyRates
      });
    }
  }
  
  // Return sorted from oldest to newest
  return weeklyData.sort((a, b) => 
    parseISO(a.weekStart).getTime() - parseISO(b.weekStart).getTime()
  );
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
