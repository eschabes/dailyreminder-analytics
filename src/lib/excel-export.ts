
import { WeeklyTask } from '@/types';
import { prepareTasksForExport } from './task-analytics';

/**
 * Export tasks to Excel/CSV format
 */
export function exportTasksToExcel(tasks: WeeklyTask[]): void {
  const data = prepareTasksForExport(tasks);
  if (!data.length) {
    return;
  }

  // Get all keys from the first object
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV format
  const csvContent = [
    // Headers row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Wrap values with commas in quotes
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  // Create a Blob containing the CSV data
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link and trigger the download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `weekly-tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
