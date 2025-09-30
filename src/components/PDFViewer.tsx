import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  FileText,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';

// Configure PDF.js worker
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use the same worker setup as in pdf.ts
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl as unknown as string;

interface PDFViewerProps {
  filePath: string;
  className?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ filePath, className = '' }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document loading handlers
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
    setCurrentPage(1);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: any) => {
    console.error('Error loading PDF:', error);
    setError(`Failed to load PDF: ${error?.message ?? 'Unknown error'}`);
    setLoading(false);
  }, []);

  const onDocumentLoadStart = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  // Navigation handlers
  const goToPage = useCallback((pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Zoom handlers
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1.0);
  }, []);

  // Rotation handler
  const rotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Fit to container width - simplified for react-pdf
  const fitToWidth = useCallback(() => {
    // With react-pdf, we can use a more standard approach
    // Standard PDF page width is roughly 612 points, container has padding
    const estimatedContainerWidth = 800; // Rough estimation
    const estimatedPageWidth = 612;
    const newScale = estimatedContainerWidth / estimatedPageWidth;
    setScale(Math.max(0.5, Math.min(newScale, 3.0)));
  }, []);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="glass rounded-2xl p-8 border border-white/20 backdrop-blur-xl text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading PDF</h3>
          <p className="text-gray-600 dark:text-gray-300">Processing your document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="glass rounded-2xl p-8 border border-white/20 backdrop-blur-xl text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading PDF</h3>
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!filePath) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="glass rounded-2xl p-8 border border-white/20 backdrop-blur-xl text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No PDF Loaded</h3>
          <p className="text-gray-600 dark:text-gray-300">Select a document to view</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full glass rounded-2xl border border-white/20 backdrop-blur-xl ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-white/20 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            PDF Viewer
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Navigation */}
          <Button
            size="sm"
            variant="ghost"
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2 px-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentPage} / {totalPages}
            </span>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />

          {/* Zoom Controls */}
          <Button
            size="sm"
            variant="ghost"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={resetZoom}
            className="h-8 px-2 text-xs"
          >
            {Math.round(scale * 100)}%
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />

          {/* Additional Controls */}
          <Button
            size="sm"
            variant="ghost"
            onClick={rotate}
            className="h-8 w-8 p-0"
          >
            <RotateCw className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={fitToWidth}
            className="h-8 w-8 p-0"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900/50 custom-scrollbar">
        <div className="flex justify-center">
          <div className="bg-white shadow-lg">
            <Document
              file={filePath}
              onLoadStart={onDocumentLoadStart}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mr-3" />
                  <span className="text-gray-600">Loading PDF...</span>
                </div>
              }
              error={
                <div className="flex items-center justify-center p-8 text-red-600">
                  <FileText className="w-8 h-8 mr-3" />
                  <span>Failed to load PDF</span>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                rotate={rotation}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mr-2" />
                    <span className="text-sm text-gray-600">Rendering page...</span>
                  </div>
                }
                error={
                  <div className="flex items-center justify-center p-8 text-red-600">
                    <span className="text-sm">Failed to render page</span>
                  </div>
                }
              />
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom scrollbar styles for the PDF viewer
export const pdfScrollbarStyles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.custom-scrollbar::-webkit-scrollbar-corner {
  background: rgba(0, 0, 0, 0.1);
}
`;
