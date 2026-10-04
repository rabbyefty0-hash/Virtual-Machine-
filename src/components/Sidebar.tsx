import React, { useCallback } from 'react';
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { UploadedFile } from '@/src/types';
import { Button } from './ui/button';

interface SidebarProps {
  files: UploadedFile[];
  onFilesAdded: (files: UploadedFile[]) => void;
  onRemoveFile: (index: number) => void;
  onGenerateAgenda: () => void;
  isGenerating: boolean;
}

export function Sidebar({ files, onFilesAdded, onRemoveFile, onGenerateAgenda, isGenerating }: SidebarProps) {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  }, []);

  const processFiles = (newFiles: File[]) => {
    const promises = newFiles.map((file) => {
      return new Promise<UploadedFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = (e.target?.result as string).split(',')[1];
          let mimeType = file.type;
          if (!mimeType) {
            if (file.name.endsWith('.txt')) mimeType = 'text/plain';
            else if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
            else if (file.name.endsWith('.csv')) mimeType = 'text/csv';
            else mimeType = 'text/plain'; // Fallback
          }
          resolve({
            name: file.name,
            type: mimeType,
            data: base64,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then((processedFiles) => {
      onFilesAdded(processedFiles);
    });
  };

  return (
    <div className="w-80 glass-panel border-r border-white/40 flex flex-col h-full z-20">
      <div className="p-6 border-b border-white/30">
        <h2 className="text-lg font-semibold text-zinc-900">Meeting Source</h2>
        <p className="text-sm text-zinc-600 mt-1">Upload documents to generate an agenda.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-white/60 bg-white/20 rounded-[2rem] p-8 text-center hover:bg-white/30 transition-colors cursor-pointer relative group shadow-sm backdrop-blur-md"
        >
          <input
            type="file"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileInput}
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center group-hover:bg-white/60 transition-colors shadow-sm">
              <UploadCloud className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-zinc-900">Click or drag files here</p>
            <p className="text-xs text-zinc-600">Supports PDF, DOCX, TXT, Images</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-900">Uploaded Files</h3>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 glass-card rounded-2xl">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span className="text-sm text-zinc-800 font-medium truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={() => onRemoveFile(index)}
                    className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-white/50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/30 bg-white/10 backdrop-blur-md">
        <Button
          className="w-full rounded-full shadow-md"
          disabled={files.length === 0 || isGenerating}
          onClick={onGenerateAgenda}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Agenda...
            </>
          ) : (
            'Generate Agenda'
          )}
        </Button>
      </div>
    </div>
  );
}
