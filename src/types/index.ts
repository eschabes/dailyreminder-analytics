
export interface ChecklistItem {
  id: string;
  name: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DayChecklist {
  date: string; // ISO date string
  items: ChecklistItem[];
}

export interface WeekData {
  startDate: string; // ISO date string of the start of the week (Sunday)
  days: DayChecklist[];
}

export interface AnalyticsData {
  totalItems: number;
  completedItems: number;
  completionRate: number;
  mostProductiveDay: string | null;
  leastProductiveDay: string | null;
  weeklyTrend: {
    date: string;
    completionRate: number;
  }[];
}

export interface WeeklyTask {
  id: string;
  name: string;
  completedDays: string[]; // Array of ISO date strings for days the task was completed
  createdAt: string;
  updatedAt: string;
  interval?: number; // Number of days until task should be done again
  completionCounts?: Record<string, number>; // Map of date strings to completion counts
}
