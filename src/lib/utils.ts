import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { loggers } from './logger';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Deprecated: Use loggers from './logger' instead
export const whisper = loggers.app;

/**
 * Generate a unique ID from a file path using a hash function
 * This ensures consistent IDs across the application without collisions
 */
export function generateFileId(filePath: string): string {
  // Use a simple hash function to generate a more unique ID
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    const char = filePath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to base36 for a shorter string and add a prefix based on the path
  const hashStr = Math.abs(hash).toString(36);
  const prefix = btoa(filePath.substring(0, Math.min(10, filePath.length)))
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 8);
  return `${prefix}${hashStr}`;
}