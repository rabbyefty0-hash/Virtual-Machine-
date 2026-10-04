import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Image as ImageIcon, Loader2, Download, Upload, X, Wand2, Crop, Maximize, Settings2, Sparkles, Sun, Contrast, Droplets, Palette, RotateCcw, ShieldCheck, ZoomIn, ZoomOut, History, Trash2, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../ThemeContext';

interface ImageGeneratorProps {
  isVpnConnected?: boolean;
}

export function ImageGenerator({ isVpnConnected }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sourceImage, setSourceImage] = useState<{data: string, mimeType: string, url: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { iconShape } = useTheme();
  
  // Advanced settings
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('2K');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [photorealistic, setPhotorealistic] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  
  // Image editing filters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [red, setRed] = useState(0);
  const [green, setGreen] = useState(0);
  const [blue, setBlue] = useState(0);

  // Zoom and Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isRefining, setIsRefining] = useState(false);
  const [recentPrompts, setRecentPrompts] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentImagePrompts');
    return saved ? JSON.parse(saved) : [];
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const ENHANCE_PRESETS = [
    "Enhance Image Quality",
    "Apply HDR effect",
    "Apply DSLR iPhone filter",
    "Enhance lighting and details",
    "Studio portrait lighting",
    "Make it cinematic",
    "Vintage film camera look",
    "Black and white noir",
    "Cyberpunk neon style",
    "Convert to anime style",
    "3D Pixar animation style",
    "Oil painting masterpiece",
    "Turn into a watercolor painting",
    "Pencil sketch"
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSourceImage({
        data: base64String,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);
  };

  const clearSourceImage = () => {
    setSourceImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processImage = async (action: 'crop' | 'scale' | 'filter', value?: number) => {
    setIsProcessing(true);
    try {
      const targetUrl = imageUrl || (sourceImage ? `data:${sourceImage.mimeType};base64,${sourceImage.data}` : null);
      if (!targetUrl) return;

      const resultDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          if (action === 'crop' && value !== undefined) {
            const ratio = value;
            let srcWidth = img.width;
            let srcHeight = img.height;
            let srcRatio = srcWidth / srcHeight;
            
            let destWidth = srcWidth;
            let destHeight = srcHeight;
            
            if (srcRatio > ratio) {
              destWidth = srcHeight * ratio;
            } else {
              destHeight = srcWidth / ratio;
            }
            
            canvas.width = destWidth;
            canvas.height = destHeight;
            
            const offsetX = (srcWidth - destWidth) / 2;
            const offsetY = (srcHeight - destHeight) / 2;
            
            ctx.drawImage(img, offsetX, offsetY, destWidth, destHeight, 0, 0, destWidth, destHeight);
          } else if (action === 'scale' && value !== undefined) {
            const scaleFactor = value;
            canvas.width = img.width * scaleFactor;
            canvas.height = img.height * scaleFactor;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          } else if (action === 'filter') {
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Apply CSS-like filters
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
            ctx.drawImage(img, 0, 0);
            
            // Apply manual color balance if needed
            if (red !== 0 || green !== 0 || blue !== 0) {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, data[i] + red));     // R
                data[i+1] = Math.min(255, Math.max(0, data[i+1] + green)); // G
                data[i+2] = Math.min(255, Math.max(0, data[i+2] + blue));  // B
              }
              ctx.putImageData(imageData, 0, 0);
            }
          }
          
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Failed to load image for processing'));
        img.src = targetUrl;
      });

      if (imageUrl) {
        setImageUrl(resultDataUrl);
      } else if (sourceImage) {
        setSourceImage({
          data: resultDataUrl.split(',')[1],
          mimeType: 'image/png',
          url: resultDataUrl
        });
      }

      if (action === 'filter') {
        resetFilters();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRed(0);
    setGreen(0);
    setBlue(0);
  };

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

  const surpriseMe = async () => {
    setIsRefining(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('API Key missing');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Generate a random, creative, and visually stunning image prompt for an AI generator. Something unique like 'A floating city made of bioluminescent jellyfish in a nebula'. Keep it under 30 words.",
      });
      if (response.text) {
        setPrompt(response.text.trim());
      }
    } catch (err) {
      console.error('Failed to get surprise prompt:', err);
    } finally {
      setIsRefining(false);
    }
  };

  const clearHistory = () => {
    setRecentPrompts([]);
    localStorage.removeItem('recentImagePrompts');
  };

  const handleGenerate = async (e?: React.FormEvent, presetPrompt?: string) => {
    if (e) e.preventDefault();
    let finalPrompt = presetPrompt || prompt;
    if (!finalPrompt.trim() && !sourceImage) return;

    // Save to history if it's a custom prompt
    if (!presetPrompt && prompt.trim()) {
      setRecentPrompts(prev => {
        const updated = [prompt, ...prev.filter(p => p !== prompt)].slice(0, 8);
        localStorage.setItem('recentImagePrompts', JSON.stringify(updated));
        return updated;
      });
    }

    if (photorealistic && !sourceImage) {
      finalPrompt = `${finalPrompt}, highly detailed, photorealistic, 8k resolution, masterpiece, cinematic lighting, sharp focus, hyper-realistic`;
    }

    if (red !== 0 || green !== 0 || blue !== 0) {
      const tints = [];
      if (red > 20) tints.push("strong red tint");
      else if (red > 0) tints.push("slight red tint");
      else if (red < -20) tints.push("reduced red colors");
      
      if (green > 20) tints.push("strong green tint");
      else if (green > 0) tints.push("slight green tint");
      else if (green < -20) tints.push("reduced green colors");
      
      if (blue > 20) tints.push("strong blue tint");
      else if (blue > 0) tints.push("slight blue tint");
      else if (blue < -20) tints.push("reduced blue colors");
      
      if (tints.length > 0) {
        finalPrompt += `, with ${tints.join(", ")}`;
      }
    }

    setIsGenerating(true);
    setError('');
    setImageUrl(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API Key is missing in the environment.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const parts: any[] = [];
      if (sourceImage) {
        parts.push({
          inlineData: {
            data: sourceImage.data,
            mimeType: sourceImage.mimeType
          }
        });
        finalPrompt = `${finalPrompt}. CRITICAL INSTRUCTION: Preserve the original face, facial features, and subject identity perfectly. Do not alter or change the face of the person in the image.`;
      }
      
      parts.push({ text: finalPrompt || 'Enhance this image' });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setImageUrl(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
          foundImage = true;
          resetFilters();
          break;
        }
      }
      
      if (!foundImage) {
        throw new Error('No image was generated. Please try a different prompt.');
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message || '';
      const errorString = typeof err === 'object' ? JSON.stringify(err) : String(err);
      
      setError(errorMessage || errorString || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ai-studio-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Zoom and Pan Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if ((imageUrl || sourceImage)) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.min(Math.max(scale + delta, 0.5), 5);
      setScale(newScale);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const getIconShapeClass = () => {
    switch (iconShape) {
      case 'circle': return 'rounded-full';
      case 'square': return 'rounded-md';
      case 'squircle': default: return 'rounded-2xl';
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden">
      {/* Header */}
      <div className="p-4 pt-12 flex items-center justify-between z-10 glass-panel border-b border-white/5 sticky top-0">
        <div className="flex items-center space-x-2">
          <ImageIcon className="w-5 h-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight">꧁Rᴀʙʙʏ Eғᴛʏ꧂ Image</h1>
          {isVpnConnected && (
            <div className="flex items-center space-x-1.5 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-green-400">Secure</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-safe relative z-10 flex flex-col items-center custom-scrollbar">
        <div className="w-full max-w-3xl space-y-6">
          <div className="text-center space-y-2 mt-2 mb-6">
            <div className={`w-16 h-16 glass-card ${getIconShapeClass()} flex items-center justify-center mx-auto mb-4 shadow-sm`}>
              <ImageIcon className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-white/60 text-[15px]">Describe what you want to see, or upload an image to edit and enhance it.</p>
          </div>

          <Card className={`p-4 relative transition-all duration-500 ${isVpnConnected ? 'border-green-500/30 ring-1 ring-green-500/20' : 'border-white/10'}`}>
          <AnimatePresence>
            {isVpnConnected && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-6 left-4"
              >
                <div className="flex items-center space-x-1.5 bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded-t-lg">
                  <ShieldCheck className="w-3 h-3 text-green-400" />
                  <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">VPN Secured Generation</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {sourceImage && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="relative block w-full"
              >
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-sm inline-block">
                  <img src={sourceImage.url} alt="Source" className="h-40 w-auto object-cover" />
                  <button 
                    onClick={clearSourceImage}
                    className={`absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white ${getIconShapeClass()} flex items-center justify-center backdrop-blur-md transition-colors`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={(e) => handleGenerate(e)} className="flex flex-col md:flex-row gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <div className="flex-1 flex items-center gap-2 relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className={`h-14 w-14 ${getIconShapeClass()} shrink-0 border-white/10 bg-white/5 hover:bg-white/10 text-indigo-400`}
                title="Upload image to edit"
              >
                <Upload className="w-5 h-5" />
              </Button>
              <div className="relative flex-1">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={sourceImage ? "How should ꧁Rᴀʙʙʏ Eғᴛʏ꧂ edit this?" : "Ask ꧁Rᴀʙʙʏ Eғᴛʏ꧂ to generate..."}
                  disabled={isGenerating || isRefining}
                  className={`w-full glass-input ${getIconShapeClass()} pl-6 pr-12 h-14 text-base text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 border-none`}
                />
                {prompt && (
                  <button
                    type="button"
                    onClick={() => setPrompt('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={refinePrompt}
                disabled={!prompt.trim() || isGenerating || isRefining}
                className={`h-14 w-14 ${getIconShapeClass()} shrink-0 border-white/10 bg-white/5 hover:bg-white/10 text-amber-400 transition-all ${isRefining ? 'animate-pulse' : ''}`}
                title="Magic Refine Prompt"
              >
                {isRefining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className={`h-14 w-14 ${getIconShapeClass()} shrink-0 border-white/10 transition-colors ${showSettings ? 'bg-indigo-500 text-white' : 'bg-white/5 hover:bg-white/10 text-indigo-400'}`}
                title="Advanced Settings"
              >
                <Settings2 className="w-5 h-5" />
              </Button>
              <Button 
                type="submit" 
                disabled={(!prompt.trim() && !sourceImage) || isGenerating}
                className={`flex-1 md:flex-none h-14 px-8 ${getIconShapeClass()} shadow-sm bg-indigo-500 hover:bg-indigo-600 text-white border-none shrink-0 font-bold`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  sourceImage ? 'Edit / Enhance' : 'Generate'
                )}
              </Button>
            </div>
          </form>
        </Card>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="overflow-hidden"
            >
              <Card className="p-4 glass-card border-white/10 space-y-4">
                <details className="group" open>
                  <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-medium text-white/80">
                    <div className="flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-indigo-400" />
                      Generation Settings
                    </div>
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Resolution</label>
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                          {(['1K', '2K', '4K'] as const).map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setImageSize(size)}
                              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${imageSize === size ? 'bg-indigo-500 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Aspect Ratio</label>
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 overflow-x-auto hide-scrollbar">
                          {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((ratio) => (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setAspectRatio(ratio)}
                              className={`flex-1 min-w-[48px] py-2 text-xs font-medium rounded-lg transition-all ${aspectRatio === ratio ? 'bg-indigo-500 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium text-white">Photorealistic Enhancement</label>
                        <p className="text-xs text-white/50">Automatically appends high-quality modifiers to your prompt</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhotorealistic(!photorealistic)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${photorealistic ? 'bg-indigo-500' : 'bg-white/10'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${photorealistic ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </details>

                <details className="group pt-4 border-t border-white/5">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-medium text-white/80">
                    <div className="flex items-center">
                      <Palette className="w-4 h-4 mr-2 text-indigo-400" />
                      Color Balance (Tint)
                    </div>
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-red-400 uppercase tracking-wider">Red Tint</label>
                          <span className="text-xs font-mono text-white/90 bg-black/30 px-2 py-0.5 rounded">{red > 0 ? `+${red}` : red}</span>
                        </div>
                        <input 
                          type="range" min="-100" max="100" value={red} 
                          onChange={(e) => setRed(parseInt(e.target.value))}
                          className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-red-500"
                        />
                      </div>
                      <div className="space-y-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-green-400 uppercase tracking-wider">Green Tint</label>
                          <span className="text-xs font-mono text-white/90 bg-black/30 px-2 py-0.5 rounded">{green > 0 ? `+${green}` : green}</span>
                        </div>
                        <input 
                          type="range" min="-100" max="100" value={green} 
                          onChange={(e) => setGreen(parseInt(e.target.value))}
                          className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                      </div>
                      <div className="space-y-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">Blue Tint</label>
                          <span className="text-xs font-mono text-white/90 bg-black/30 px-2 py-0.5 rounded">{blue > 0 ? `+${blue}` : blue}</span>
                        </div>
                        <input 
                          type="range" min="-100" max="100" value={blue} 
                          onChange={(e) => setBlue(parseInt(e.target.value))}
                          className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>
                    {(imageUrl || sourceImage) && (
                      <div className="flex justify-end pt-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => processImage('filter')}
                          disabled={isProcessing}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs h-8"
                        >
                          {isProcessing ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Palette className="w-3 h-3 mr-1.5" />}
                          Apply Tint to Image
                        </Button>
                      </div>
                    )}
                  </div>
                </details>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={surpriseMe}
            disabled={isGenerating || isRefining}
            className="rounded-full bg-white/5 border-white/10 text-indigo-300 hover:bg-white/10 text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            Surprise Me
          </Button>
        </div>

        <AnimatePresence>
          {recentPrompts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center">
                  <History className="w-3 h-3 mr-1.5" />
                  Recent Prompts
                </h3>
                <button 
                  onClick={clearHistory}
                  className="text-[10px] font-bold text-red-400/50 hover:text-red-400 transition-colors uppercase tracking-widest"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(p)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all max-w-[200px] truncate"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sourceImage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-wrap gap-2 justify-center"
            >
              {ENHANCE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(preset);
                    handleGenerate(undefined, preset);
                  }}
                  disabled={isGenerating}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 transition-colors shadow-sm backdrop-blur-md"
                >
                  <Wand2 className="w-3 h-3 text-indigo-400" />
                  <span>{preset}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(sourceImage || imageUrl) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center">
                  <Crop className="w-3 h-3 mr-1.5" />
                  Resize & Crop
                </div>
                <button 
                  onClick={() => setShowEditor(!showEditor)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center ${showEditor ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                >
                  <Palette className="w-3 h-3 mr-1.5" />
                  {showEditor ? 'Hide Advanced Tools' : 'Show Advanced Tools'}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { label: '1:1', value: 1, type: 'crop' as const },
                  { label: '16:9', value: 16/9, type: 'crop' as const },
                  { label: '9:16', value: 9/16, type: 'crop' as const },
                  { label: '4:3', value: 4/3, type: 'crop' as const },
                  { label: 'Scale 2x', value: 2, type: 'scale' as const },
                  { label: 'Upscale 4X', value: 4, type: 'scale' as const },
                  { label: 'Upscale 8X', value: 8, type: 'scale' as const },
                  { label: 'Scale 0.5x', value: 0.5, type: 'scale' as const },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => processImage(action.type, action.value)}
                    disabled={isProcessing || isGenerating}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 transition-colors shadow-sm backdrop-blur-md flex items-center"
                  >
                    {isProcessing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                    {action.label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {showEditor && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <Card className="p-6 glass-card border-white/10 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Basic Adjustments */}
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center">
                                <Sun className="w-3 h-3 mr-1.5" />
                                Brightness
                              </label>
                              <span className="text-xs text-white/70">{brightness}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="200" value={brightness} 
                              onChange={(e) => setBrightness(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center">
                                <Contrast className="w-3 h-3 mr-1.5" />
                                Contrast
                              </label>
                              <span className="text-xs text-white/70">{contrast}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="200" value={contrast} 
                              onChange={(e) => setContrast(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center">
                                <Droplets className="w-3 h-3 mr-1.5" />
                                Saturation
                              </label>
                              <span className="text-xs text-white/70">{saturation}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="200" value={saturation} 
                              onChange={(e) => setSaturation(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-4 pt-4 border-t border-white/5">
                        <button
                          onClick={resetFilters}
                          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Filters</span>
                        </button>
                        <Button
                          onClick={() => processImage('filter')}
                          disabled={isProcessing}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl px-6"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          Apply Changes
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-2xl text-center backdrop-blur-md">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative rounded-[2.5rem] overflow-hidden glass-card shadow-xl border border-white/10 p-2 w-full aspect-square md:aspect-video flex items-center justify-center bg-white/5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              <div className="flex flex-col items-center justify-center space-y-4 z-10">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="text-indigo-300 font-medium animate-pulse">Generating your masterpiece...</p>
              </div>
            </motion.div>
          ) : (imageUrl || sourceImage) ? (
            <motion.div
              key="image"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative rounded-[2.5rem] overflow-hidden glass-card shadow-xl border border-white/10 p-2 w-full"
              onWheel={handleWheel}
            >
              <div 
                className="relative w-full h-full overflow-hidden rounded-[2rem] bg-zinc-900/50"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img 
                  src={imageUrl || sourceImage?.url || undefined} 
                  alt={prompt || "Source image"} 
                  className="w-full h-auto object-contain select-none pointer-events-none"
                  style={{ 
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
                    cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                  }}
                  referrerPolicy="no-referrer"
                />
                
                {/* Real-time Color Tint Overlay */}
                {(red !== 0 || green !== 0 || blue !== 0) && (
                  <div 
                    className="absolute inset-0 pointer-events-none mix-blend-overlay"
                    style={{
                      backgroundColor: `rgb(${red > 0 ? 255 : 0}, ${green > 0 ? 255 : 0}, ${blue > 0 ? 255 : 0})`,
                      opacity: Math.max(Math.abs(red), Math.abs(green), Math.abs(blue)) / 200
                    }}
                  />
                )}
              </div>

              {/* Zoom Controls */}
              <div className="absolute top-6 right-6 flex flex-col space-y-2">
                <button 
                  onClick={() => setScale(prev => Math.min(prev + 0.2, 5))}
                  className="w-10 h-10 bg-black/50 backdrop-blur-xl text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors border border-white/10"
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
                  className="w-10 h-10 bg-black/50 backdrop-blur-xl text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors border border-white/10"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button 
                  onClick={resetZoom}
                  className="w-10 h-10 bg-black/50 backdrop-blur-xl text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors border border-white/10"
                  title="Reset Zoom"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute bottom-6 right-6 flex space-x-2">
                {imageUrl && (
                  <button 
                    onClick={handleDownload}
                    className="px-5 h-12 bg-black/50 backdrop-blur-xl text-white rounded-full shadow-lg flex items-center justify-center hover:bg-black/70 transition-colors border border-white/10"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    <span className="font-medium">Download</span>
                  </button>
                )}
                {!imageUrl && sourceImage && (
                  <div className="px-5 h-12 bg-indigo-500/80 backdrop-blur-xl text-white rounded-full shadow-lg flex items-center justify-center border border-white/10">
                    <Wand2 className="w-5 h-5 mr-2" />
                    <span className="font-medium">Ready to Edit</span>
                  </div>
                )}
              </div>
              
              {scale > 1 && (
                <div className="absolute bottom-6 left-6 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold text-white/70 uppercase tracking-widest border border-white/10">
                  Zoom: {Math.round(scale * 100)}% • Drag to Pan
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
