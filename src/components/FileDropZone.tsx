'use client';

import { useState, useCallback } from 'react';
import { parseExpressionMap, ExpressionMap, mergeExpressionMaps, autoAssignRemoteTriggers, hasUnassignedRemotes } from '@/lib/expressionMapParser';

interface FileDropZoneProps {
  onMapLoaded: (map: ExpressionMap) => void;
  onMapsLoaded?: (maps: ExpressionMap[]) => void; // For multiple files
  onError: (error: string) => void;
  autoMerge?: boolean; // If true, auto-merge multiple files
}

export function FileDropZone({ onMapLoaded, onMapsLoaded, onError, autoMerge = true }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);

  const processFile = useCallback(async (file: File): Promise<ExpressionMap | null> => {
    if (!file.name.endsWith('.expressionmap')) {
      return null;
    }

    try {
      const content = await file.text();
      let map = parseExpressionMap(content, file.name);

      if (map.articulations.length === 0) {
        return null;
      }

      // Auto-assign remote triggers if needed
      if (hasUnassignedRemotes(map)) {
        map = autoAssignRemoteTriggers(map);
      }

      return map;
    } catch (error) {
      console.error(`Failed to parse ${file.name}:`, error);
      return null;
    }
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    const expressionMapFiles = files.filter(f => f.name.endsWith('.expressionmap'));

    if (expressionMapFiles.length === 0) {
      onError('Please drop Cubase Expression Map files (.expressionmap)');
      return;
    }

    setIsLoading(true);
    setLoadingCount(expressionMapFiles.length);

    try {
      // Process all files in parallel
      const results = await Promise.all(expressionMapFiles.map(processFile));
      const validMaps = results.filter((m): m is ExpressionMap => m !== null);

      if (validMaps.length === 0) {
        onError('No valid articulations found in the dropped files');
        return;
      }

      if (validMaps.length === 1) {
        // Single file - just load it
        onMapLoaded(validMaps[0]);
      } else if (autoMerge) {
        // Multiple files with auto-merge - merge and load
        const merged = mergeExpressionMaps(validMaps);
        onMapLoaded(merged);
      } else if (onMapsLoaded) {
        // Multiple files without auto-merge - load all separately
        onMapsLoaded(validMaps);
      } else {
        // Fallback: merge anyway
        const merged = mergeExpressionMaps(validMaps);
        onMapLoaded(merged);
      }
    } catch (error) {
      onError(`Failed to process files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setLoadingCount(0);
    }
  }, [onMapLoaded, onMapsLoaded, onError, autoMerge, processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
    e.target.value = ''; // Reset for re-selection
  }, [handleFiles]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative border-2 border-dashed rounded-xl p-8
        transition-all duration-200 cursor-pointer
        ${isDragging 
          ? 'border-cubase-highlight bg-cubase-highlight/10 scale-[1.02]' 
          : 'border-cubase-accent hover:border-cubase-highlight/50 hover:bg-cubase-surface/50'
        }
      `}
    >
      <input
        type="file"
        accept=".expressionmap"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center text-center">
        {isLoading ? (
          <>
            <div className="w-12 h-12 border-4 border-cubase-highlight border-t-transparent
                          rounded-full animate-spin mb-4" />
            <p className="text-cubase-text font-medium">
              Loading {loadingCount > 1 ? `${loadingCount} expression maps...` : 'expression map...'}
            </p>
          </>
        ) : (
          <>
            <svg 
              className={`w-12 h-12 mb-4 transition-colors ${
                isDragging ? 'text-cubase-highlight' : 'text-cubase-muted'
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
            <p className="text-cubase-text font-medium mb-2">
              Drop Expression Maps Here
            </p>
            <p className="text-cubase-muted text-sm">
              or click to browse
            </p>
            <p className="text-cubase-muted text-xs mt-4">
              Drop multiple files to auto-merge into one view
            </p>
          </>
        )}
      </div>
    </div>
  );
}
