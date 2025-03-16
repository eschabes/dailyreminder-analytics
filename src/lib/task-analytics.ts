
import { WeeklyTask } from '@/types';
import { differenceInDays, parseISO, format, isSameDay, startOfWeek, endOfWeek, isWithinInterval, isToday as dateIsToday, addDays, isAfter, isBefore } from 'date-fns';

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
 * Only considers tasks completed today or within their interval
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
 * Considers each day individually up to the reference date and calculates proper average
 */
export function calculateAverageCompletionRate(tasks: WeeklyTask[], referenceDate?: Date): number {
  if (tasks.length === 0) return 0;
  
  // Filter tasks that have intervals set
  const tasksWithIntervals = tasks.filter(task => !!task.interval);
  if (tasksWithIntervals.length === 0) return 0;
  
  const today = referenceDate || new Date();
  
  // Get all unique dates from completions (that are not after today)
  const allDates = new Set<string>();
  tasksWithIntervals.forEach(task => {
    task.completedDays.forEach(day => {
      const date = parseISO(day);
      if (!isAfter(date, today)) {
        allDates.add(format(date, 'yyyy-MM-dd')); // Store just the date part
      }
    });
  });
  
  const dateArray = Array.from(allDates).sort();
  
  // If no completion dates, return 0
  if (dateArray.length === 0) return 0;
  
  // Calculate status for each task on each day
  let totalDailyRates = 0;
  let daysWithData = 0;
  
  dateArray.forEach(date => {
    const dateObj = parseISO(date);
    
    // Skip future dates relative to the reference date
    if (isAfter(dateObj, today)) {
      return;
    }
    
    let tasksOnSchedule = 0;
    
    tasksWithIntervals.forEach(task => {
      // Find completions up to this date
      const completionsBefore = task.completedDays
        .filter(day => {
          const completionDate = parseISO(day);
          return !isAfter(completionDate, dateObj);
        })
        .sort((a, b) => parseISO(b).getTime() - parseISO(a).getTime());
      
      if (completionsBefore.length === 0) {
        // Task never completed before this date
        return;
      }
      
      const lastCompletion = parseISO(completionsBefore[0]);
      const daysSince = differenceInDays(dateObj, lastCompletion);
      
      // Task on schedule if completed on this day or within interval
      if (isSameDay(dateObj, lastCompletion) || (daysSince <= (task.interval || Infinity))) {
        tasksOnSchedule++;
      }
    });
    
    // Only count days where we have tasks that could be on schedule
    if (tasksWithIntervals.length > 0) {
      const dailyRate = Math.round((tasksOnSchedule / tasksWithIntervals.length) * 100);
      totalDailyRates += dailyRate;
      daysWithData++;
    }
  });
  
  // Return the average of all daily rates
  return daysWithData > 0 ? Math.round(totalDailyRates / daysWithData) : 0;
}

/**
 * Get completions grouped by week
 * Show daily completion rates within each week
 */
export function getWeeklyCompletions(tasks: WeeklyTask[], weeksToInclude: number = 8): any[] {
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
    
    // Skip future weeks
    if (isBefore(today, weekStart)) {
      continue;
    }
    
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    // Calculate daily completion rates for this week
    const dailyRates = [];
    let weekTotalRate = 0;
    let daysWithData = 0;
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDay = addDays(weekStart, dayOffset);
      
      // Skip future days
      if (isAfter(currentDay, today)) {
        dailyRates.push({
          day: format(currentDay, 'EEE'),
          date: format(currentDay, 'yyyy-MM-dd'),
          rate: null, // null for future days
          isFuture: true
        });
        continue;
      }
      
      const dayKey = format(currentDay, 'yyyy-MM-dd');
      
      let tasksOnSchedule = 0;
      
      tasksWithIntervals.forEach(task => {
        // Find completions up to this day
        const completionsBefore = task.completedDays
          .filter(day => {
            const completionDate = parseISO(day);
            return !isAfter(completionDate, currentDay);
          })
          .sort((a, b) => parseISO(b).getTime() - parseISO(a).getTime());
        
        if (completionsBefore.length === 0) {
          // Task never completed before this day
          return;
        }
        
        const lastCompletion = parseISO(completionsBefore[0]);
        const daysSince = differenceInDays(currentDay, lastCompletion);
        
        // Task on schedule if completed on this day or within interval
        if (isSameDay(currentDay, lastCompletion) || (daysSince <= (task.interval || Infinity))) {
          tasksOnSchedule++;
        }
      });
      
      // Calculate completion rate for this day
      const dayRate = tasksWithIntervals.length > 0 
        ? Math.round((tasksOnSchedule / tasksWithIntervals.length) * 100)
        : 0;
      
      if (tasksWithIntervals.length > 0) {
        weekTotalRate += dayRate;
        daysWithData++;
      }
      
      dailyRates.push({
        day: format(currentDay, 'EEE'),
        date: dayKey,
        rate: dayRate,
        isFuture: false
      });
    }
    
    // Calculate average rate for the week
    const weekAvgRate = daysWithData > 0 
      ? Math.round(weekTotalRate / daysWithData)
      : 0;
    
    // Count total completions for this week (but not future days)
    const weekCompletions = tasksWithIntervals.reduce((total, task) => {
      const completionsThisWeek = task.completedDays.filter(day => {
        const date = parseISO(day);
        return isWithinInterval(date, { start: weekStart, end: weekEnd }) && !isAfter(date, today);
      }).length;
      
      return total + completionsThisWeek;
    }, 0);
    
    // Only add weeks that have some data or are in the past
    if (weekCompletions > 0 || weekAvgRate > 0 || isBefore(weekEnd, today)) {
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
