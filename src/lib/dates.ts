
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, subWeeks, addWeeks, isSameWeek, differenceInCalendarWeeks } from 'date-fns';
import type { WeekData, DayChecklist, AnalyticsData } from '@/types';

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getCurrentWeekDates(): Date[] {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // 0 = Sunday
  
  return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
}

export function getWeekDates(referenceDate: Date): Date[] {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 }); // 0 = Sunday
  
  return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDateForDisplay(date: Date): string {
  return format(date, 'EEE, MMM d');
}

export function formatWeekRange(startDate: Date): string {
  const endDate = endOfWeek(startDate, { weekStartsOn: 0 });
  return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
}

export function generateEmptyWeekData(referenceDate: Date): WeekData {
  const weekDates = getWeekDates(referenceDate);
  const startDate = formatDate(weekDates[0]);
  
  const days: DayChecklist[] = weekDates.map(date => ({
    date: formatDate(date),
    items: [],
  }));
  
  return {
    startDate,
    days,
  };
}

export function getPreviousWeek(referenceDate: Date): Date {
  return subWeeks(referenceDate, 1);
}

export function getNextWeek(referenceDate: Date): Date {
  return addWeeks(referenceDate, 1);
}

export function isCurrentWeek(date: Date): boolean {
  return isSameWeek(date, new Date(), { weekStartsOn: 0 });
}

export function isFutureWeek(date: Date): boolean {
  return date > new Date();
}

export function getWeeksDifference(date1: Date, date2: Date): number {
  return differenceInCalendarWeeks(date1, date2, { weekStartsOn: 0 });
}

export function getDisplayWeek(date: Date): string {
  if (isCurrentWeek(date)) {
    return 'This Week';
  }
  
  const weekDiff = getWeeksDifference(new Date(), date);
  
  if (weekDiff === -1) {
    return 'Last Week';
  } else if (weekDiff === 1) {
    return 'Next Week';
  } else if (weekDiff < 0) {
    return `${Math.abs(weekDiff)} Weeks Ago`;
  } else {
    return `${weekDiff} Weeks From Now`;
  }
}

export function getDayName(dateString: string): string {
  return format(parseISO(dateString), 'EEEE');
}

export function calculateAnalytics(weeks: WeekData[]): AnalyticsData {
  if (!weeks.length) {
    return {
      totalItems: 0,
      completedItems: 0,
      completionRate: 0,
      mostProductiveDay: null,
      leastProductiveDay: null,
      weeklyTrend: [],
    };
  }

  // Total items and completed items
  let totalItems = 0;
  let completedItems = 0;

  // Day-wise completion tracking
  const dayCompletion: Record<string, { total: number; completed: number }> = {};
  DAYS_OF_WEEK.forEach(day => {
    dayCompletion[day] = { total: 0, completed: 0 };
  });

  // Weekly trends
  const weeklyTrend: { date: string; completionRate: number }[] = [];

  // Process each week
  weeks.forEach(week => {
    const weekTotalItems: number = week.days.reduce((sum, day) => sum + day.items.length, 0);
    const weekCompletedItems: number = week.days.reduce(
      (sum, day) => sum + day.items.filter(item => item.completed).length, 
      0
    );
    
    if (weekTotalItems > 0) {
      weeklyTrend.push({
        date: week.startDate,
        completionRate: (weekCompletedItems / weekTotalItems) * 100,
      });
    }

    // Process each day
    week.days.forEach(day => {
      const dayName = getDayName(day.date);
      dayCompletion[dayName].total += day.items.length;
      dayCompletion[dayName].completed += day.items.filter(item => item.completed).length;
      
      totalItems += day.items.length;
      completedItems += day.items.filter(item => item.completed).length;
    });
  });

  // Find most and least productive days
  let mostProductiveDay: string | null = null;
  let highestRate = 0;
  let leastProductiveDay: string | null = null;
  let lowestRate = 100;

  Object.entries(dayCompletion).forEach(([day, stats]) => {
    if (stats.total > 0) {
      const rate = (stats.completed / stats.total) * 100;
      
      if (rate > highestRate) {
        highestRate = rate;
        mostProductiveDay = day;
      }
      
      if (rate < lowestRate) {
        lowestRate = rate;
        leastProductiveDay = day;
      }
    }
  });

  // Sort weekly trend by date
  weeklyTrend.sort((a, b) => {
    return parseISO(a.date).getTime() - parseISO(b.date).getTime();
  });

  return {
    totalItems,
    completedItems,
    completionRate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
    mostProductiveDay,
    leastProductiveDay,
    weeklyTrend,
  };
}
