import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

/**
 * Check for updates and prompt user to install if available
 * @returns Promise that resolves when update check is complete
 */
export async function checkForUpdates(): Promise<void> {
  try {
    console.log('[Updater] Checking for updates...');
    
    const update = await check();
    
    if (update === null) {
      console.log('[Updater] No updates available');
      return;
    }

    console.log('[Updater] Update available:', update.version);
    console.log('[Updater] Current version:', update.currentVersion);
    console.log('[Updater] Release date:', update.date);
    console.log('[Updater] Release notes:', update.body);

    // The updater plugin will show a native dialog if dialog: true in config
    // If user accepts, download and install the update
    await update.downloadAndInstall();
    
    // Relaunch the app after update
    console.log('[Updater] Update installed, relaunching...');
    await relaunch();
    
  } catch (error) {
    console.error('[Updater] Failed to check for updates:', error);
    // Don't throw error - update checking should not break the app
  }
}

/**
 * Check for updates silently without prompting user
 * @returns Promise that resolves to true if update is available, false otherwise
 */
export async function checkForUpdatesQuietly(): Promise<boolean> {
  try {
    console.log('[Updater] Checking for updates (quiet mode)...');
    
    const update = await check();
    
    if (update === null) {
      console.log('[Updater] No updates available');
      return false;
    }

    console.log('[Updater] Update available:', update.version);
    return true;
    
  } catch (error) {
    console.error('[Updater] Failed to check for updates:', error);
    return false;
  }
}

/**
 * Schedule periodic update checks
 * @param intervalMs Interval in milliseconds (default: 1 hour)
 * @returns Function to stop the periodic checks
 */
export function scheduleUpdateChecks(intervalMs = 3600000): () => void {
  console.log('[Updater] Scheduling periodic update checks every', intervalMs / 1000, 'seconds');
  
  // Check immediately on startup
  checkForUpdatesQuietly();
  
  // Then check periodically
  const intervalId = setInterval(() => {
    checkForUpdatesQuietly();
  }, intervalMs);
  
  // Return cleanup function
  return () => {
    console.log('[Updater] Stopping periodic update checks');
    clearInterval(intervalId);
  };
}

