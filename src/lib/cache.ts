import { BaseDirectory, exists, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { generateFileId } from './utils';

export interface RecentFile {
  id: string;
  path: string;
  title: string;
  lastAccessed: number;
  fileSize?: number;
  pageCount?: number;
  addedDate: number;
}

const CACHE_DIR = 'redink';
const RECENT_FILES_FILE = 'recent-files.json';
const MAX_RECENT_FILES = 5;

class CacheManager {
  private recentFiles: RecentFile[] = [];

  async initialize(): Promise<void> {
    try {
      // Ensure cache directory exists
      if (!(await exists(CACHE_DIR, { baseDir: BaseDirectory.AppData }))) {
        await mkdir(CACHE_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
      }
      
      // Load existing recent files
      await this.loadRecentFiles();
    } catch (error) {
      console.error('Failed to initialize cache manager:', error);
    }
  }

  private async loadRecentFiles(): Promise<void> {
    try {
      const filePath = `${CACHE_DIR}/${RECENT_FILES_FILE}`;
      if (await exists(filePath, { baseDir: BaseDirectory.AppData })) {
        const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
        this.recentFiles = JSON.parse(content);
        
        // Clean up files that no longer exist
        await this.cleanupMissingFiles();
      }
    } catch (error) {
      console.error('Failed to load recent files:', error);
      this.recentFiles = [];
    }
  }

  private async saveRecentFiles(): Promise<void> {
    try {
      const filePath = `${CACHE_DIR}/${RECENT_FILES_FILE}`;
      const content = JSON.stringify(this.recentFiles, null, 2);
      await writeTextFile(filePath, content, { baseDir: BaseDirectory.AppData });
    } catch (error) {
      console.error('Failed to save recent files:', error);
    }
  }

  private async cleanupMissingFiles(): Promise<void> {
    const validFiles: RecentFile[] = [];
    
    for (const file of this.recentFiles) {
      try {
        if (await exists(file.path)) {
          validFiles.push(file);
        }
      } catch (error) {
        // File doesn't exist, skip it
        console.log(`Removing missing file from recent: ${file.path}`);
      }
    }
    
    if (validFiles.length !== this.recentFiles.length) {
      this.recentFiles = validFiles;
      await this.saveRecentFiles();
    }
  }

  async addRecentFile(path: string, title: string, metadata?: { pageCount?: number; fileSize?: number }): Promise<void> {
    const now = Date.now();
    const id = this.generateId(path);
    
    // Remove if already exists
    this.recentFiles = this.recentFiles.filter(f => f.id !== id);
    
    // Add to beginning
    const recentFile: RecentFile = {
      id,
      path,
      title: title || this.extractFilename(path),
      lastAccessed: now,
      addedDate: now,
      ...metadata
    };
    
    this.recentFiles.unshift(recentFile);
    
    // Keep only max files
    if (this.recentFiles.length > MAX_RECENT_FILES) {
      this.recentFiles = this.recentFiles.slice(0, MAX_RECENT_FILES);
    }
    
    await this.saveRecentFiles();
  }

  async updateLastAccessed(path: string): Promise<void> {
    const id = this.generateId(path);
    const fileIndex = this.recentFiles.findIndex(f => f.id === id);
    
    if (fileIndex !== -1) {
      // Update timestamp
      this.recentFiles[fileIndex].lastAccessed = Date.now();
      
      // Move to front
      const file = this.recentFiles.splice(fileIndex, 1)[0];
      this.recentFiles.unshift(file);
      
      await this.saveRecentFiles();
    }
  }

  getRecentFiles(): RecentFile[] {
    return [...this.recentFiles];
  }

  async removeRecentFile(path: string): Promise<void> {
    const id = this.generateId(path);
    this.recentFiles = this.recentFiles.filter(f => f.id !== id);
    await this.saveRecentFiles();
  }

  async clearRecentFiles(): Promise<void> {
    this.recentFiles = [];
    await this.saveRecentFiles();
  }

  private generateId(path: string): string {
    return generateFileId(path);
  }

  private extractFilename(path: string): string {
    return path.split('/').pop() || path.split('\\').pop() || 'Unknown';
  }
}

export const cacheManager = new CacheManager();

// Initialize on module load
cacheManager.initialize().catch(console.error);
