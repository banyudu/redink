import React, { useState } from 'react';
import { FileText, Clock, X, Trash2, MessageSquare, File } from 'lucide-react';
import { Button } from './ui/button';
import type { RecentFile } from '../lib/cache';

interface RecentFilesProps {
  recentFiles: RecentFile[];
  onFileSelect: (file: RecentFile) => Promise<void>;
  onRemoveFile: (path: string) => void;
  loading?: boolean;
}

export const RecentFiles: React.FC<RecentFilesProps> = ({
  recentFiles,
  onFileSelect,
  onRemoveFile,
  loading = false,
}) => {
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getFileIcon = () => {
    // Always use ArXiv logo for all documents
    return <img src="/arxiv.png" alt="ArXiv" className="h-5 w-5" />;
  };

  if (recentFiles.length === 0) {
    return (
      <div className="glass rounded-lg border border-white/20 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-gray-400 to-gray-500">
          <File className="h-8 w-8 text-white" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          No Recent Files
        </h3>
        <p className="mx-auto max-w-md text-gray-600 dark:text-gray-300">
          Load your first PDF to see it appear in your recent files list for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Files</h3>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
            {recentFiles.length}
          </span>
        </div>

        {recentFiles.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => recentFiles.forEach((f) => onRemoveFile(f.path))}
            className="text-gray-500 transition-colors duration-200 hover:text-red-500"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      <div className="custom-scrollbar max-h-96 space-y-2 overflow-y-auto">
        {recentFiles.map((file) => (
          <div
            key={file.id}
            className={`group relative overflow-hidden transition-all duration-300 ${
              hoveredFile === file.id ? 'scale-[1.02]' : ''
            }`}
            onMouseEnter={() => setHoveredFile(file.id)}
            onMouseLeave={() => setHoveredFile(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onFileSelect(file);
              }
            }}
          >
            <div
              className={`glass cursor-pointer rounded-lg border p-4 backdrop-blur-xl transition-all duration-300 ${
                hoveredFile === file.id
                  ? 'border-blue-500/50 bg-blue-50/50 shadow-lg dark:bg-blue-900/20'
                  : 'border-white/20 hover:border-white/40 hover:bg-white/10'
              }`}
              onClick={() => onFileSelect(file)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onFileSelect(file);
                }
              }}
            >
              {/* Background gradient for hover effect */}
              <div
                className={`absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 transition-opacity duration-300 ${
                  hoveredFile === file.id ? 'opacity-100' : ''
                }`}
              />

              <div className="relative z-10 flex items-center gap-3">
                {/* File Icon */}
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md">
                    {getFileIcon()}
                  </div>
                </div>

                {/* File Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="line-clamp-1 text-sm font-semibold text-gray-900 transition-colors duration-300 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                        {file.title || file.path.split('/').pop() || 'Untitled'}
                      </h4>

                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                        {file.pageCount && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {file.pageCount} pages
                          </span>
                        )}

                        {file.fileSize && <span>{formatFileSize(file.fileSize)}</span>}

                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(file.lastAccessed)}
                        </span>
                      </div>

                      {/* File path truncated */}
                      <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                        {file.path}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="ml-3 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFile(file.path);
                        }}
                        className="h-6 w-6 p-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </Button>

                      <div
                        className={`transition-transform duration-300 ${
                          hoveredFile === file.id ? 'translate-x-1' : ''
                        }`}
                      >
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    Loading...
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Custom scrollbar styles
export const scrollbarStyles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}
`;
