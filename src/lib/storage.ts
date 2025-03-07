
import { WeekData } from '@/types';
import { formatDate, generateEmptyWeekData } from './dates';

const STORAGE_KEY = 'weeklyChecklist';

export function loadWeekData(startDate: string): WeekData | null {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return null;

    const parsedData: WeekData[] = JSON.parse(storedData);
    return parsedData.find(week => week.startDate === startDate) || null;
  } catch (error) {
    console.error('Error loading week data:', error);
    return null;
  }
}

export function loadAllWeekData(): WeekData[] {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return [];

    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error loading all week data:', error);
    return [];
  }
}

export function saveWeekData(weekData: WeekData): void {
  try {
    const existingData = loadAllWeekData();
    const existingIndex = existingData.findIndex(week => week.startDate === weekData.startDate);
    
    if (existingIndex >= 0) {
      existingData[existingIndex] = weekData;
    } else {
      existingData.push(weekData);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
  } catch (error) {
    console.error('Error saving week data:', error);
  }
}

export function getOrCreateWeekData(date: Date): WeekData {
  const weekStartDate = formatDate(date);
  const existingData = loadWeekData(weekStartDate);
  
  if (existingData) {
    return existingData;
  }
  
  const newWeekData = generateEmptyWeekData(date);
  saveWeekData(newWeekData);
  return newWeekData;
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
