import React, { useState, useRef } from 'react';
import { Swords, Send, ShieldCheck, Bot, Loader2, Sparkles, Image as ImageIcon, Type, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { compareModels, ArenaResult } from '../services/gemini';
import { UploadedFile } from '../types';

const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash' },
  { id: 'chatgpt-5-style', name: 'ChatGPT-5 (Simulated)' },
  { id: 'grok-2-style', name: 'Grok 2.0 (Simulated)' },
  { id: 'claude-3-5-style', name: 'Claude 3.5 Opus (Simulated)' },
  { id: 'llama-3-style', name: 'Llama 3 (Simulated)' },
  { id: 'mistral-large-style', name: 'Mistral Large (Simulated)' },
  { id: 'cohere-command-style', name: 'Cohere Command R+ (Simulated)' },
];

const IMAGE_STYLES = [
  { id: 'realistic', name: 'Realistic / Photographic' },
  { id: 'anime', name: 'Anime / Manga' },
  { id: '3d-render', name: '3D Render / Pixar' },
  { id: 'watercolor', name: 'Watercolor Painting' },
  { id: 'cyberpunk', name: 'Cyberpunk / Neon' },
  { id: 'enhance', name: 'Enhance / Upscale' },
  { id: 'studio', name: 'Studio Lighting' },
  { id: 'remove-bg', name: 'Isolate Subject (White BG)' },
];

interface ArenaAiProps {
  isVpnConnected?: boolean;
}

export function ArenaAi({ isVpnConnected }: ArenaAiProps) {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [modelA, setModelA] = useState(MODELS[0].id);
  const [modelB, setModelB] = useState(MODELS[1].id);
  const [styleA, setStyleA] = useState(IMAGE_STYLES[0].id);
  const [styleB, setStyleB] = useState(IMAGE_STYLES[1].id);
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState<ArenaResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRefining, setIsRefining] = useState(false);

  const refinePrompt = async () => {
    if (!prompt.trim()) return;
    setIsRefining(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('API Key missing');
      const { GoogleGenAI } = await import('@google/genai');
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setUploadedImage({
        name: file.name,
        type: file.type,
        data: base64String,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !uploadedImage) return;
    
    setIsComparing(true);
    setResult(null);
    try {
      const res = await compareModels(prompt, uploadedImage || undefined, modelA, modelB, mode, styleA, styleB);
      setResult(res);
    } catch (err) {
      console.error(err);
      alert('Failed to compare models.');
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative z-10 bg-white/95 backdrop-blur-2xl overflow-hidden border-white/20 shadow-2xl pt-12 pb-24">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-zinc-200 p-4 flex flex-col space-y-3 shadow-sm z-20">
        <div className="flex items-center justify-between text-zinc-700">
          <div className="flex items-center space-x-2 flex-1 bg-zinc-100/80 px-4 py-2 rounded-full border border-zinc-200/50 mr-4">
            {isVpnConnected ? (
              <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
            ) : (
              <Swords className="w-5 h-5 text-indigo-500 shrink-0" />
            )}
            <div className="flex-1 text-sm font-bold truncate">
              Arena AI - Real Model Comparison
            </div>
          </div>
          
          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button
              onClick={() => { setMode('text'); setResult(null); }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Text</span>
            </button>
            <button
              onClick={() => { setMode('image'); setResult(null); }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'image' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Image</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Controls */}
        <div className="glass-card p-4 rounded-2xl border border-white/20 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                {mode === 'text' ? 'Model A' : 'Style A'}
              </label>
              {mode === 'text' ? (
                <select 
                  value={modelA} 
                  onChange={(e) => setModelA(e.target.value)}
                  className="w-full bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                >
                  {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              ) : (
                <select 
                  value={styleA} 
                  onChange={(e) => setStyleA(e.target.value)}
                  className="w-full bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                >
                  {IMAGE_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex items-center justify-center pt-6">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm">VS</div>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                {mode === 'text' ? 'Model B' : 'Style B'}
              </label>
              {mode === 'text' ? (
                <select 
                  value={modelB} 
                  onChange={(e) => setModelB(e.target.value)}
                  className="w-full bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                >
                  {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              ) : (
                <select 
                  value={styleB} 
                  onChange={(e) => setStyleB(e.target.value)}
                  className="w-full bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                >
                  {IMAGE_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
          </div>
          
          <form onSubmit={handleCompare} className="relative flex flex-col gap-3">
            {uploadedImage && (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/20 shadow-sm">
                <img 
                  src={`data:${uploadedImage.type};base64,${uploadedImage.data}`} 
                  alt="Uploaded" 
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setUploadedImage(null)}
                  className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="relative flex items-center gap-2">
              <input 
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-colors"
                title="Upload Image"
              >
                <Upload className="w-5 h-5" />
              </button>
              <div className="relative flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={mode === 'text' ? "Ask anything to compare models..." : "Describe an image to generate..."}
                    className="w-full bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-xl pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    disabled={isComparing || isRefining}
                  />
                  <button 
                    type="submit"
                    disabled={(!prompt.trim() && !uploadedImage) || isComparing || isRefining}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                  >
                    {isComparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={refinePrompt}
                  disabled={!prompt.trim() || isComparing || isRefining}
                  className={`p-3 bg-zinc-100 border border-zinc-200 text-amber-500 rounded-xl hover:bg-zinc-200 transition-colors ${isRefining ? 'animate-pulse' : ''}`}
                  title="Enhance Prompt"
                >
                  {isRefining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Model A Result */}
              <div className="glass-card rounded-2xl border border-white/20 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-indigo-50/50 p-3 border-b border-indigo-100 flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-indigo-500" />
                  <span className="font-semibold text-indigo-900">
                    {mode === 'text' ? MODELS.find(m => m.id === modelA)?.name : IMAGE_STYLES.find(s => s.id === styleA)?.name}
                  </span>
                </div>
                <div className="p-4 flex-1 overflow-y-auto prose prose-sm max-w-none text-zinc-700">
                  {mode === 'image' ? (
                    result.modelA.image ? (
                      <img src={result.modelA.image} alt="Generated A" className="w-full h-auto rounded-lg shadow-md" />
                    ) : (
                      <p className="text-zinc-500 italic">No image generated.</p>
                    )
                  ) : (
                    <Markdown>{result.modelA.text || 'No response.'}</Markdown>
                  )}
                </div>
              </div>

              {/* Model B Result */}
              <div className="glass-card rounded-2xl border border-white/20 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-emerald-50/50 p-3 border-b border-emerald-100 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold text-emerald-900">
                    {mode === 'text' ? MODELS.find(m => m.id === modelB)?.name : IMAGE_STYLES.find(s => s.id === styleB)?.name}
                  </span>
                </div>
                <div className="p-4 flex-1 overflow-y-auto prose prose-sm max-w-none text-zinc-700">
                  {mode === 'image' ? (
                    result.modelB.image ? (
                      <img src={result.modelB.image} alt="Generated B" className="w-full h-auto rounded-lg shadow-md" />
                    ) : (
                      <p className="text-zinc-500 italic">No image generated.</p>
                    )
                  ) : (
                    <Markdown>{result.modelB.text || 'No response.'}</Markdown>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
