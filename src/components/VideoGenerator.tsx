import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Video, Loader2, Download, AlertCircle, Paperclip, ArrowUp, Sparkles, Wand2, X, Scissors, Type, Film, Plus, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface VideoGeneratorProps {
  isVpnConnected?: boolean;
}

export function VideoGenerator({ isVpnConnected }: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState<'generate' | 'enhance' | 'edit'>('generate');
  
  const [activeTool, setActiveTool] = useState<'trim' | 'text' | 'merge' | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(100);
  const [overlayText, setOverlayText] = useState('');
  const [mergeVideo, setMergeVideo] = useState<string | null>(null);
  const [stabilizationLevel, setStabilizationLevel] = useState(50);

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } else {
      // Fallback for local dev or if not in AI Studio environment
      setHasKey(true);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true); // Assume success as per guidelines
    }
  };

  const ENHANCE_PRESETS = [
    'Apply cinematic color grading',
    'Stabilize shaky footage',
    'Improve audio quality',
    'Add subtle background music',
    'Adjust playback speed'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | undefined;
    
    if ('dataTransfer' in e) {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      file = e.dataTransfer.files?.[0];
    } else {
      file = e.target.files?.[0];
    }

    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setUploadedVideo(url);
      setVideoUrl(null); // Clear generated video if uploading a new one
      setMode('edit'); // Default to edit mode when a video is uploaded
      setTrimStart(0);
      setTrimEnd(100);
      setOverlayText('');
      setMergeVideo(null);
      setActiveTool(null);
    } else if (file) {
      setError('Please upload a valid video file.');
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const [isRefining, setIsRefining] = useState(false);

  const refinePrompt = async () => {
    if (!prompt.trim()) return;
    setIsRefining(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('API Key missing');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Enhance the following prompt to be more specific and action-oriented, focusing on clarity and conciseness. For example, instead of 'Add search', suggest 'Implement a search bar with real-time suggestions'. Prompt: "${prompt}"`,
      });
      if (response.text) {
        setPrompt(response.text.trim());
      }
    } catch (err) {
      console.error('Failed to refine prompt:', err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() && !uploadedVideo) return;

    // Check key again before generating
    if (window.aistudio?.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (!selected) {
        await handleSelectKey();
      }
    }

    setIsGenerating(true);
    setError('');
    setStatus('Checking API Key...');

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API Key is missing in the environment.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      setStatus(`Submitting ${mode} request...`);
      
      let finalPrompt = prompt || 'A cinematic video';
      if (mode === 'enhance') {
        finalPrompt = `Enhance this video: ${prompt || 'Apply general enhancements'}. 
        Stabilization intensity: ${stabilizationLevel}%.`;
      } else if (mode === 'edit' && uploadedVideo) {
        const edits = [];
        if (trimStart > 0 || trimEnd < videoDuration) {
          edits.push(`Trim video from ${trimStart.toFixed(1)}s to ${trimEnd.toFixed(1)}s`);
        }
        if (overlayText) {
          edits.push(`Add text overlay: "${overlayText}"`);
        }
        if (mergeVideo) {
          edits.push(`Merge with the provided second video`);
        }
        
        if (edits.length > 0) {
          finalPrompt = `${prompt ? prompt + '\n\n' : ''}Please apply the following edits:\n- ${edits.join('\n- ')}`;
        }
      }

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: finalPrompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      setStatus('Processing video... This may take a few minutes.');
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setStatus('Fetching video file...');
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': apiKey,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch the generated video file.');
        }
        
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
        setUploadedVideo(null); // Clear uploaded video to show the result
        setStatus('');
      } else {
        throw new Error('No video URL returned from the model.');
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message || '';
      const errorString = typeof err === 'object' ? JSON.stringify(err) : String(err);
      
      setError(errorMessage || errorString || 'Failed to process video');
      setStatus('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div 
      className="flex-1 relative z-10 flex flex-col text-white font-sans"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleFileUpload}
    >
      {/* Key Selection Banner */}
      {hasKey === false && (
        <div className="absolute top-[72px] left-4 right-4 z-50 bg-indigo-500/90 backdrop-blur-xl p-4 rounded-2xl flex items-center justify-between shadow-2xl border border-white/20 animate-in slide-in-from-top duration-500">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">API Key Required</h3>
              <p className="text-[10px] text-white/80">Select a paid key to generate videos for free.</p>
            </div>
          </div>
          <button
            onClick={handleSelectKey}
            className="px-4 py-2 bg-white text-indigo-600 text-xs font-bold rounded-xl hover:bg-zinc-100 transition-all active:scale-95 shadow-sm"
          >
            Select Key
          </button>
        </div>
      )}

      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-indigo-500/20 backdrop-blur-sm border-4 border-indigo-500 border-dashed m-4 rounded-3xl flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="bg-black/80 p-6 rounded-2xl flex flex-col items-center">
              <Video className="w-12 h-12 text-indigo-400 mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-white">Drop video to edit</h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-4 pt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 z-10 glass-panel border-b border-white/5 sticky top-0">
        <div className="flex items-center space-x-2">
          <Video className="w-5 h-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight">꧁Rᴀʙʙʏ Eғᴛʏ꧂ Video</h1>
          {isVpnConnected && (
            <div className="flex items-center space-x-1.5 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-green-400">Secure</span>
            </div>
          )}
        </div>
        <div className="flex space-x-1 bg-white/5 p-1 rounded-lg border border-white/10 w-full sm:w-auto overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setMode('generate')}
            className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'generate' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            Generate
          </button>
          <button 
            onClick={() => setMode('enhance')}
            className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'enhance' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            Enhance
          </button>
          <button 
            onClick={() => setMode('edit')}
            className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'edit' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            Edit
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-14 pb-24 flex flex-col items-center justify-center relative">
        <div className="w-full max-w-4xl flex flex-col items-center justify-center z-10">
          
          {!videoUrl && !uploadedVideo && !isGenerating && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 mb-12"
            >
              <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10 glass-card liquid-glass">
                <Sparkles className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">What do you want to create?</h2>
                <p className="text-zinc-400 max-w-md mx-auto">
                  Generate high-quality videos from text, or upload an existing video to enhance and edit it using Veo 3.
                </p>
              </div>
              
              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-6 py-3 glass-card hover:bg-white/10 border border-white/20 rounded-full text-white font-medium transition-all hover:scale-105 active:scale-95"
                >
                  <Video className="w-5 h-5" />
                  <span>Upload Video to Edit</span>
                </button>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {(uploadedVideo || videoUrl) && (
              <motion.div
                key={uploadedVideo ? 'uploaded' : 'generated'}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="relative w-full aspect-video rounded-2xl overflow-hidden glass-card liquid-glass border border-white/10 shadow-2xl mb-8"
              >
                <video 
                  src={uploadedVideo || videoUrl || undefined} 
                  controls
                  autoPlay
                  muted
                  playsInline
                  loop
                  onLoadedMetadata={(e) => {
                    if (uploadedVideo && !videoUrl) {
                      setVideoDuration(e.currentTarget.duration);
                      setTrimEnd(e.currentTarget.duration);
                    }
                  }}
                  className="w-full h-full object-contain"
                />
                
                {uploadedVideo && !isGenerating && (
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button 
                      onClick={() => setUploadedVideo(null)}
                      className="w-8 h-8 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {videoUrl && !isGenerating && (
                  <div className="absolute bottom-4 right-4 flex space-x-2">
                    <a 
                      href={videoUrl} 
                      download="veo-video.mp4"
                      className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full shadow-lg flex items-center space-x-2 hover:bg-zinc-200 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </a>
                  </div>
                )}
                
                {uploadedVideo && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md text-xs font-medium rounded-full border border-white/10">
                    Original Video
                  </div>
                )}
                {videoUrl && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-indigo-500/50 backdrop-blur-md text-xs font-medium rounded-full border border-indigo-400/30">
                    Generated by Veo 3
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit Tools Panel */}
          {uploadedVideo && mode === 'enhance' && !isGenerating && !videoUrl && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full glass-card liquid-glass border border-white/10 rounded-2xl p-6 mb-8 shadow-xl space-y-6"
            >
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-3 px-2">Enhancement Presets</h3>
                <div className="flex flex-wrap gap-2">
                  {ENHANCE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPrompt(preset);
                        handleGenerate(undefined);
                      }}
                      disabled={isGenerating}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 transition-colors shadow-sm backdrop-blur-md"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-3 px-2">
                  <h3 className="text-sm font-medium text-white/80 flex items-center space-x-2">
                    <Wand2 className="w-4 h-4 text-indigo-400" />
                    <span>Stabilization Intensity</span>
                  </h3>
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {stabilizationLevel}%
                  </span>
                </div>
                <div className="px-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="1" 
                    value={stabilizationLevel} 
                    onChange={(e) => setStabilizationLevel(parseInt(e.target.value))} 
                    className="w-full h-2 bg-white/10 rounded-lg cursor-pointer accent-indigo-500 appearance-none" 
                  />
                  <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                    <span>Natural</span>
                    <span>Smooth</span>
                    <span>Locked</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {uploadedVideo && mode === 'edit' && !isGenerating && !videoUrl && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full glass-card liquid-glass border border-white/10 rounded-2xl p-4 mb-8 shadow-xl"
            >
              <div className="flex space-x-2 mb-4 border-b border-white/10 pb-4 overflow-x-auto hide-scrollbar">
                <button 
                  onClick={() => setActiveTool(activeTool === 'trim' ? null : 'trim')} 
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTool === 'trim' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                >
                  <Scissors className="w-4 h-4" /> <span>Trim</span>
                </button>
                <button 
                  onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')} 
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTool === 'text' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                >
                  <Type className="w-4 h-4" /> <span>Text Overlay</span>
                </button>
                <button 
                  onClick={() => setActiveTool(activeTool === 'merge' ? null : 'merge')} 
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTool === 'merge' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                >
                  <Film className="w-4 h-4" /> <span>Merge</span>
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeTool === 'trim' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                    <div className="flex justify-between text-xs font-medium text-zinc-400">
                      <span>Start: {trimStart.toFixed(1)}s</span>
                      <span>End: {trimEnd.toFixed(1)}s</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <input 
                        type="range" 
                        min="0" 
                        max={videoDuration || 100} 
                        step="0.1" 
                        value={trimStart} 
                        onChange={(e) => setTrimStart(Math.min(parseFloat(e.target.value), trimEnd - 0.5))} 
                        className="flex-1 h-2 bg-white/10 rounded-lg cursor-pointer accent-indigo-500" 
                      />
                      <input 
                        type="range" 
                        min="0" 
                        max={videoDuration || 100} 
                        step="0.1" 
                        value={trimEnd} 
                        onChange={(e) => setTrimEnd(Math.max(parseFloat(e.target.value), trimStart + 0.5))} 
                        className="flex-1 h-2 bg-white/10 rounded-lg cursor-pointer accent-indigo-500" 
                      />
                    </div>
                  </motion.div>
                )}
                {activeTool === 'text' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                    <input 
                      type="text" 
                      value={overlayText} 
                      onChange={(e) => setOverlayText(e.target.value)} 
                      placeholder="Enter text to overlay on video..." 
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                    />
                  </motion.div>
                )}
                {activeTool === 'merge' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                    <input 
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      ref={mergeFileInputRef} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setMergeVideo(URL.createObjectURL(file));
                      }} 
                    />
                    {!mergeVideo ? (
                      <button 
                        onClick={() => mergeFileInputRef.current?.click()} 
                        className="w-full py-8 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-zinc-500 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all"
                      >
                        <Plus className="w-6 h-6 mb-2" />
                        <span className="text-sm font-medium">Upload second video to merge</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-4 p-4 bg-black/50 rounded-xl border border-white/10">
                        <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                          <video src={mergeVideo || undefined} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">Second video ready to merge</p>
                          <p className="text-xs text-zinc-500">Will be appended to the end</p>
                        </div>
                        <button 
                          onClick={() => setMergeVideo(null)} 
                          className="p-2 bg-white/10 rounded-full text-zinc-400 hover:text-white hover:bg-red-500/80 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {isGenerating && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full aspect-video rounded-2xl overflow-hidden glass-card shadow-xl border border-white/10 p-2 flex items-center justify-center bg-white/5 mb-8"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              <div className="flex flex-col items-center justify-center space-y-4 z-10">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-indigo-300 animate-pulse">{status}</p>
                  <p className="text-sm text-zinc-400">This might take a few minutes</p>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center space-x-3 mb-8"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area (Grok style) */}
      <div className="p-4 md:p-6 z-20">
        <div className="max-w-4xl mx-auto relative">
          <form onSubmit={handleGenerate} className="relative flex items-end glass-input liquid-glass border border-white/10 rounded-3xl overflow-hidden focus-within:border-white/30 transition-colors shadow-2xl">
            
            <input 
              type="file" 
              accept="video/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 text-zinc-400 hover:text-white transition-colors"
              title="Upload Video"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <textarea 
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder={
                mode === 'generate' ? "Ask ꧁Rᴀʙʙʏ Eғᴛʏ꧂ to generate a video..." :
                mode === 'enhance' ? "How should ꧁Rᴀʙʙʏ Eғᴛʏ꧂ enhance this?" :
                "Describe the edits for ꧁Rᴀʙʙʏ Eғᴛʏ꧂..."
              }
              disabled={isGenerating}
              className="flex-1 bg-transparent py-4 px-2 text-white placeholder:text-zinc-500 focus:outline-none resize-none min-h-[56px] max-h-[150px]"
              rows={1}
            />
            
            <div className="p-2 flex gap-2">
              <button
                type="button"
                onClick={refinePrompt}
                disabled={!prompt.trim() || isGenerating || isRefining}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isRefining ? 'animate-pulse bg-white/10 text-amber-400' : 'text-amber-400 hover:bg-white/10 hover:text-amber-300'} disabled:opacity-50 disabled:hover:bg-transparent`}
                title="Enhance Prompt"
              >
                {isRefining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              </button>
              <button 
                type="submit"
                disabled={(!prompt.trim() && !uploadedVideo) || isGenerating || isRefining}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                {mode === 'enhance' ? <Sparkles className="w-5 h-5" /> : 
                 mode === 'edit' ? <Wand2 className="w-5 h-5" /> : 
                 <ArrowUp className="w-5 h-5" />}
              </button>
            </div>
          </form>
          
          <div className="text-center mt-3">
            <p className="text-[10px] text-zinc-500">
              Veo 3 can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
