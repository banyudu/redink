import { loggers } from './logger';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

/**
 * Check for updates and prompt user to install if available
 * @returns Promise that resolves when update check is complete
 */
export async function checkForUpdates(): Promise<void> {
  try {
    loggers.app('[Updater] Checking for updates...');

    const update = await check();

    if (update === null) {
      loggers.app('[Updater] No updates available');
      return;
    }

    loggers.app('[Updater] Update available:', update.version);
    loggers.app('[Updater] Current version:', update.currentVersion);
    loggers.app('[Updater] Release date:', update.date);
    loggers.app('[Updater] Release notes:', update.body);

    // The updater plugin will show a native dialog if dialog: true in config
    // If user accepts, download and install the update
    await update.downloadAndInstall();

    // Relaunch the app after update
    loggers.app('[Updater] Update installed, relaunching...');
    await relaunch();
  } catch (error) {
    loggers.app('[Updater] Failed to check for updates:', error);
    // Don't throw error - update checking should not break the app
  }
}

/**
 * Check for updates silently without prompting user
 * @returns Promise that resolves to true if update is available, false otherwise
 */
export async function checkForUpdatesQuietly(): Promise<boolean> {
  try {
    loggers.app('[Updater] Checking for updates (quiet mode)...');

    const update = await check();

    if (update === null) {
      loggers.app('[Updater] No updates available');
      return false;
    }

    loggers.app('[Updater] Update available:', update.version);
    return true;
  } catch (error) {
    loggers.app('[Updater] Failed to check for updates:', error);
    return false;
  }
}

/**
 * Schedule periodic update checks
 * @param intervalMs Interval in milliseconds (default: 1 hour)
 * @returns Function to stop the periodic checks
 */
export function scheduleUpdateChecks(intervalMs = 3600000): () => void {
  loggers.app('[Updater] Scheduling periodic update checks every', intervalMs / 1000, 'seconds');

  // Check immediately on startup
  checkForUpdatesQuietly();

  // Then check periodically
  const intervalId = setInterval(() => {
    checkForUpdatesQuietly();
  }, intervalMs);

  // Return cleanup function
  return () => {
    loggers.app('[Updater] Stopping periodic update checks');
    clearInterval(intervalId);
  };
}
