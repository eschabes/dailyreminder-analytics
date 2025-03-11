
import { WeeklyTask } from '@/types';
import { differenceInDays, parseISO, format, isSameDay } from 'date-fns';

/**
 * Calculate days since last completion of a task
 */
export function getDaysSinceLastCompletion(task: WeeklyTask): number | null {
  if (!task.completedDays.length) {
    return null;
  }

  // Sort completed days in descending order
  const sortedDays = [...task.completedDays].sort((a, b) => 
    parseISO(b).getTime() - parseISO(a).getTime()
  );

  const lastCompletionDate = parseISO(sortedDays[0]);
  const today = new Date();
  
  return differenceInDays(today, lastCompletionDate);
}

/**
 * Get status color based on days since last completion and task interval
 */
export function getTaskStatusColor(daysSince: number | null, interval: number | undefined): string {
  if (daysSince === null) {
    return 'bg-soft-gray'; // Never completed
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
export function isToday(dateStr: string): boolean {
  return isSameDay(parseISO(dateStr), new Date());
}

/**
 * Format date for Excel export
 */
export function formatDateForExport(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy-MM-dd');
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
      'Completion Dates': task.completedDays
        .map(date => formatDateForExport(date))
        .join(', ')
    };
  });
}
