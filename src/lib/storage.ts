import { BaseDirectory, exists, mkdir, writeFile, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { homeDir } from '@tauri-apps/api/path';

// Common paths for PDF storage
const IBOOKS_RELATIVE_PATH = 'Library/Mobile Documents/iCloud~com~apple~iBooks/Documents';
const APP_LIBRARY_RELATIVE_PATH = 'Library/Application Support/redink/papers';
const CACHE_RELATIVE_PATH = '.cache/redink/papers';
const PREFERENCES_FILE = 'redink/preferences.json';

// User preferences interface
export interface UserPreferences {
  arxivCategories: string[];
  lastUpdated: number;
}

// Default categories
const DEFAULT_ARXIV_CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV'];

export class StorageManager {
  private static instance: StorageManager;
  private storagePath: string | null = null;
  private preferences: UserPreferences | null = null;

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async initialize(): Promise<void> {
    this.storagePath = await this.findBestStorageLocation();
    await this.ensureDirectoryExists(this.storagePath);
    await this.loadPreferences();
  }

  private async findBestStorageLocation(): Promise<string> {
    try {
      const home = await homeDir();
      
      // Try iBooks location first
      const iBooksPath = `${home}${IBOOKS_RELATIVE_PATH}`;
      if (await this.isDirectoryWritable(iBooksPath)) {
        console.log('Using iBooks directory for PDF storage:', iBooksPath);
        return iBooksPath;
      }
      
      // Fallback to app library
      const appLibraryPath = `${home}${APP_LIBRARY_RELATIVE_PATH}`;
      if (await this.isDirectoryWritable(appLibraryPath)) {
        console.log('Using app library directory for PDF storage:', appLibraryPath);
        return appLibraryPath;
      }
      
      // Final fallback to cache directory
      const cachePath = `${home}/${CACHE_RELATIVE_PATH}`;
      console.log('Using cache directory for PDF storage:', cachePath);
      return cachePath;
      
    } catch (error) {
      console.error('Error finding storage location:', error);
      // Ultimate fallback - use app data directory
      return 'redink/papers';
    }
  }

  private async isDirectoryWritable(path: string): Promise<boolean> {
    try {
      // Check if directory exists or can be created
      if (!(await exists(path))) {
        await mkdir(path, { recursive: true });
      }
      return true;
    } catch (error) {
      console.warn(`Directory ${path} is not writable:`, error);
      return false;
    }
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    try {
      if (!(await exists(path))) {
        await mkdir(path, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create storage directory:', error);
      throw error;
    }
  }

  async downloadArxivPaper(arxivId: string, title: string, downloadUrl: string): Promise<string> {
    if (!this.storagePath) {
      throw new Error('Storage manager not initialized');
    }

    try {
      // Sanitize arXiv ID to remove slashes (e.g., "physics/0110044" -> "physics_0110044")
      const sanitizedArxivId = arxivId.replace(/\//g, '_');
      
      // Sanitize filename
      const sanitizedTitle = this.sanitizeFileName(title);
      const fileName = `${sanitizedArxivId}_${sanitizedTitle}.pdf`;
      const filePath = `${this.storagePath}/${fileName}`;

      // Ensure the parent directory exists before writing
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      if (!(await exists(dirPath))) {
        await mkdir(dirPath, { recursive: true });
        console.log('Created directory:', dirPath);
      }

      // Download the PDF
      console.log('Downloading arXiv paper:', downloadUrl);
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Save to file
      await writeFile(filePath, uint8Array);
      console.log('Successfully downloaded paper to:', filePath);
      
      return filePath;
    } catch (error) {
      console.error('Error downloading arXiv paper:', error);
      throw error;
    }
  }

  private sanitizeFileName(fileName: string): string {
    // Remove or replace characters that are invalid in file names
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .substring(0, 100) // Limit length
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  }

  getStoragePath(): string | null {
    return this.storagePath;
  }

  async listDownloadedPapers(): Promise<string[]> {
    if (!this.storagePath) {
      return [];
    }

    try {
      // This would require additional Tauri APIs to list directory contents
      // For now, we'll return an empty array as a placeholder
      // TODO: Implement directory listing when needed
      return [];
    } catch (error) {
      console.error('Error listing downloaded papers:', error);
      return [];
    }
  }

  // Preferences management
  private async loadPreferences(): Promise<void> {
    try {
      // Ensure the directory exists
      const dirPath = PREFERENCES_FILE.split('/').slice(0, -1).join('/');
      if (dirPath && !(await exists(dirPath, { baseDir: BaseDirectory.AppData }))) {
        await mkdir(dirPath, { baseDir: BaseDirectory.AppData, recursive: true });
      }
      
      if (await exists(PREFERENCES_FILE, { baseDir: BaseDirectory.AppData })) {
        const content = await readTextFile(PREFERENCES_FILE, { baseDir: BaseDirectory.AppData });
        this.preferences = JSON.parse(content);
        console.log('[Storage] Loaded user preferences:', this.preferences);
      } else {
        // Initialize with defaults
        console.log('[Storage] No preferences file found, creating with defaults');
        this.preferences = {
          arxivCategories: DEFAULT_ARXIV_CATEGORIES,
          lastUpdated: Date.now()
        };
        await this.savePreferences();
        console.log('[Storage] Created default preferences:', this.preferences);
      }
    } catch (error) {
      console.error('[Storage] Failed to load preferences:', error);
      this.preferences = {
        arxivCategories: DEFAULT_ARXIV_CATEGORIES,
        lastUpdated: Date.now()
      };
    }
  }

  private async savePreferences(): Promise<void> {
    if (!this.preferences) return;
    
    try {
      // Ensure the directory exists
      const dirPath = PREFERENCES_FILE.split('/').slice(0, -1).join('/');
      if (dirPath && !(await exists(dirPath, { baseDir: BaseDirectory.AppData }))) {
        await mkdir(dirPath, { baseDir: BaseDirectory.AppData, recursive: true });
      }
      
      const content = JSON.stringify(this.preferences, null, 2);
      await writeTextFile(PREFERENCES_FILE, content, { baseDir: BaseDirectory.AppData });
      console.log('[Storage] Saved user preferences');
    } catch (error) {
      console.error('[Storage] Failed to save preferences:', error);
    }
  }

  getPreferences(): UserPreferences {
    return this.preferences || {
      arxivCategories: DEFAULT_ARXIV_CATEGORIES,
      lastUpdated: Date.now()
    };
  }

  async updateArxivCategories(categories: string[]): Promise<void> {
    if (!this.preferences) {
      this.preferences = {
        arxivCategories: categories,
        lastUpdated: Date.now()
      };
    } else {
      this.preferences.arxivCategories = categories;
      this.preferences.lastUpdated = Date.now();
    }
    await this.savePreferences();
  }
}

// Export singleton instance
export const storageManager = StorageManager.getInstance();
