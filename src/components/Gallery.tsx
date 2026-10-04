import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Share, Trash2, Heart, Play, Sparkles, Image as ImageIcon } from 'lucide-react';
import { VFSNode, getAllFiles, getNode, deleteNode } from '../lib/vfs';
import { getMimeType } from '../lib/mime';
import { GoogleGenAI } from '@google/genai';

export function Gallery() {
  const [mediaFiles, setMediaFiles] = useState<VFSNode[]>([]);
  const [previewNode, setPreviewNode] = useState<VFSNode | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  useEffect(() => {
    loadMedia();
    
    const handleVfsUpdate = () => loadMedia();
    window.addEventListener('vfs-updated', handleVfsUpdate);
    return () => window.removeEventListener('vfs-updated', handleVfsUpdate);
  }, []);

  const loadMedia = async () => {
    const allFiles = await getAllFiles();
    const media = allFiles.filter(f => {
      const mime = getMimeType(f.name, f.mimeType);
      return mime.startsWith('image/') || mime.startsWith('video/');
    });
    // Sort by newest first
    media.sort((a, b) => b.createdAt - a.createdAt);
    setMediaFiles(media);
  };

  const openPreview = async (node: VFSNode) => {
    const fullNode = await getNode(node.id);
    if (fullNode?.data) {
      const url = URL.createObjectURL(fullNode.data);
      setPreviewUrl(url);
      setPreviewNode({...fullNode, mimeType: getMimeType(fullNode.name, fullNode.mimeType)});
      setAiDescription(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewNode(null);
    setAiDescription(null);
  };

  const handleDelete = async () => {
    if (previewNode) {
      await deleteNode(previewNode.id);
      closePreview();
      loadMedia();
    }
  };

  const generateDescription = async () => {
    if (!previewNode || !previewNode.data || !previewNode.mimeType?.startsWith('image/')) return;
    
    if (!process.env.GEMINI_API_KEY) {
      setAiDescription("AI features require a Gemini API key.");
      return;
    }

    setIsGeneratingDescription(true);
    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(previewNode.data);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64String = base64data.split(',')[1];

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: previewNode.mimeType || 'image/jpeg',
                  data: base64String
                }
              },
              { text: "Describe this image in a short, engaging sentence." }
            ]
          }
        });
        
        setAiDescription(response.text || "Could not generate description.");
        setIsGeneratingDescription(false);
      };
    } catch (error) {
      console.error("Error generating description:", error);
      setAiDescription("Failed to generate description.");
      setIsGeneratingDescription(false);
    }
  };

  const setAsWallpaper = () => {
    if (previewNode && previewNode.mimeType?.startsWith('image/')) {
      localStorage.setItem('wallpaperId', previewNode.id);
      window.dispatchEvent(new CustomEvent('wallpaper-updated'));
      
      const btn = document.getElementById('wallpaper-btn');
      if (btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<span class="text-green-400 text-xs font-medium">Set!</span>';
        setTimeout(() => {
          btn.innerHTML = originalHtml;
        }, 2000);
      }
    }
  };

  // Group by date (simplified to just a flat grid for now, but we can add headers)
  return (
    <div className="h-full bg-white dark:bg-black text-black dark:text-white flex flex-col relative overflow-hidden font-sans">
      {/* Header */}
      <div className="pt-12 pb-4 px-4 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10 flex-shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Photos</h1>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {mediaFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p>No Photos or Videos</p>
            <p className="text-sm mt-2">Add media from the Files app</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 p-1">
            {mediaFiles.map(node => (
              <MediaThumbnail key={node.id} node={node} onClick={() => openPreview(node)} />
            ))}
          </div>
        )}
      </div>

      {/* Full Screen Preview */}
      <AnimatePresence>
        {previewNode && previewUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black flex flex-col"
          >
            {/* Top Bar */}
            <div className="flex justify-between items-center p-4 pt-12 text-white bg-gradient-to-b from-black/50 to-transparent absolute top-0 left-0 right-0 z-10">
              <button onClick={closePreview} className="flex items-center text-blue-400 font-medium">
                <ChevronLeft className="w-6 h-6 -ml-2" />
                <span>Photos</span>
              </button>
              <button className="text-blue-400 font-medium">Edit</button>
            </div>

            {/* Media Content */}
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-black relative">
              {previewNode.mimeType?.startsWith('image/') && (
                <img src={previewUrl} alt={previewNode.name} className="max-w-full max-h-full object-contain" />
              )}
              {previewNode.mimeType?.startsWith('video/') && (
                <video src={previewUrl} controls autoPlay className="max-w-full max-h-full" />
              )}
              
              {/* AI Description Overlay */}
              {previewNode.mimeType?.startsWith('image/') && (
                <div className="absolute bottom-24 left-4 right-4 flex flex-col items-center">
                  <AnimatePresence>
                    {aiDescription && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="bg-black/60 backdrop-blur-md text-white px-4 py-3 rounded-2xl mb-4 text-center text-sm shadow-lg max-w-md border border-white/10"
                      >
                        {aiDescription}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {!aiDescription && !isGeneratingDescription && (
                    <button
                      onClick={generateDescription}
                      className="bg-black/40 hover:bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm transition-colors border border-white/10"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Describe with AI
                    </button>
                  )}
                  
                  {isGeneratingDescription && (
                    <div className="bg-black/40 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm border border-white/10">
                      <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                      Analyzing...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="flex justify-between items-center p-6 pb-8 text-white bg-gradient-to-t from-black/50 to-transparent absolute bottom-0 left-0 right-0 z-10">
              <button className="text-blue-400 flex flex-col items-center gap-1 hover:scale-110 active:scale-95 transition-all">
                <Share className="w-6 h-6" />
                <span className="text-[10px] font-medium opacity-80">Share</span>
              </button>
              {previewNode.mimeType?.startsWith('image/') && (
                <button id="wallpaper-btn" onClick={setAsWallpaper} className="text-white flex flex-col items-center gap-1 hover:scale-110 active:scale-95 transition-all">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[10px] font-medium opacity-80">Wallpaper</span>
                </button>
              )}
              <button className="text-white flex flex-col items-center gap-1 hover:scale-110 active:scale-95 transition-all">
                <Heart className="w-6 h-6" />
                <span className="text-[10px] font-medium opacity-80">Favorite</span>
              </button>
              <button onClick={handleDelete} className="text-red-400 flex flex-col items-center gap-1 hover:scale-110 active:scale-95 transition-all">
                <Trash2 className="w-6 h-6" />
                <span className="text-[10px] font-medium opacity-80">Delete</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Separate component for thumbnail to handle async blob loading
function MediaThumbnail({ node, onClick }: { node: VFSNode, onClick: () => void }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    const loadThumb = async () => {
      const fullNode = await getNode(node.id);
      if (fullNode?.data) {
        url = URL.createObjectURL(fullNode.data);
        setThumbUrl(url);
      }
    };
    loadThumb();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [node.id]);

  return (
    <button 
      onClick={onClick}
      className="aspect-square bg-gray-200 dark:bg-zinc-800 relative overflow-hidden"
    >
      {thumbUrl ? (
        node.mimeType?.startsWith('video/') ? (
          <>
            <video src={thumbUrl} className="w-full h-full object-cover" />
            <div className="absolute bottom-1 right-1 text-white drop-shadow-md">
              <Play className="w-4 h-4 fill-white" />
            </div>
          </>
        ) : (
          <img src={thumbUrl} alt={node.name} className="w-full h-full object-cover" />
        )
      ) : (
        <div className="w-full h-full animate-pulse bg-gray-300 dark:bg-zinc-700" />
      )}
    </button>
  );
}
