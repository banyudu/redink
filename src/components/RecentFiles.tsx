import React, { useState } from 'react';
import { 
  FileText, 
  Clock, 
  X,
  Trash2,
  MessageSquare,
  File
} from 'lucide-react';
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
  loading = false
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

  const getFileIcon = (file: RecentFile) => {
    if (file.path.toLowerCase().includes('arxiv') || file.title?.toLowerCase().includes('arxiv')) {
      return <img src="/logo.png" alt="Logo" className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  if (recentFiles.length === 0) {
    return (
      <div className="glass rounded-lg p-8 border border-white/20 backdrop-blur-xl text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center mx-auto mb-4">
          <File className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Recent Files</h3>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          Load your first PDF to see it appear in your recent files list for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Files</h3>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            {recentFiles.length}
          </span>
        </div>
        
        {recentFiles.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => recentFiles.forEach(f => onRemoveFile(f.path))}
            className="text-gray-500 hover:text-red-500 transition-colors duration-200"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
        {recentFiles.map((file) => (
          <div
            key={file.id}
            className={`group relative overflow-hidden transition-all duration-300 ${
              hoveredFile === file.id ? 'scale-[1.02]' : ''
            }`}
            onMouseEnter={() => setHoveredFile(file.id)}
            onMouseLeave={() => setHoveredFile(null)}
          >
            <div
              className={`glass rounded-lg p-4 border backdrop-blur-xl cursor-pointer transition-all duration-300 ${
                hoveredFile === file.id
                  ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg'
                  : 'border-white/20 hover:border-white/40 hover:bg-white/10'
              }`}
              onClick={() => onFileSelect(file)}
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
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    {getFileIcon(file)}
                  </div>
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                        {file.title || file.path.split('/').pop() || 'Untitled'}
                      </h4>
                      
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-300">
                        {file.pageCount && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {file.pageCount} pages
                          </span>
                        )}
                        
                        {file.fileSize && (
                          <span>
                            {formatFileSize(file.fileSize)}
                          </span>
                        )}
                        
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(file.lastAccessed)}
                        </span>
                      </div>

                      {/* File path truncated */}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                        {file.path}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFile(file.path);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-red-500 h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      
                      <div 
                        className={`transition-transform duration-300 ${
                          hoveredFile === file.id ? 'translate-x-1' : ''
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
