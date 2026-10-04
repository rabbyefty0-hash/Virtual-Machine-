import React, { useState } from 'react';
import { Download, Link as LinkIcon, Film, Loader2, CheckCircle2, AlertCircle, PlayCircle, Music, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VideoDownloaderProps {
  isVpnConnected?: boolean;
}

export function VideoDownloader({ isVpnConnected }: VideoDownloaderProps) {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setIsAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const lowerUrl = url.toLowerCase();
      let source = 'Web Content';
      if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) source = 'YouTube';
      else if (lowerUrl.includes('tiktok.com')) source = 'TikTok';
      else if (lowerUrl.includes('instagram.com')) source = 'Instagram';
      else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) source = 'X (Twitter)';
      else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) source = 'Facebook';
      else if (lowerUrl.includes('vimeo.com')) source = 'Vimeo';
      else if (lowerUrl.includes('dailymotion.com')) source = 'Dailymotion';
      else if (lowerUrl.includes('soundcloud.com')) source = 'SoundCloud';

      // Use a public API for video downloading (Cobalt API)
      const response = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url.trim(),
          vQuality: '1080',
          filenamePattern: 'classic'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze video. Please check the URL or try again later.');
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(data.text || 'Error analyzing video.');
      }

      let formats = [];
      let thumbnail = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80";

      if (data.status === 'redirect' || data.status === 'stream') {
        formats.push({ quality: 'Best Quality', size: 'Unknown', type: 'MP4', url: data.url, icon: <Film className="w-4 h-4" /> });
        // Add an audio option just in case
        formats.push({ quality: 'Audio Only', size: 'Unknown', type: 'MP3', url: data.url, icon: <Music className="w-4 h-4" /> });
      } else if (data.status === 'picker') {
        thumbnail = data.picker[0]?.thumb || thumbnail;
        data.picker.forEach((item: any, index: number) => {
          formats.push({ quality: `Item ${index + 1}`, size: 'Unknown', type: item.type === 'video' ? 'MP4' : 'Image', url: item.url, icon: item.type === 'video' ? <Film className="w-4 h-4" /> : <Download className="w-4 h-4" /> });
        });
      }

      setResult({
        title: `Extracted Content from ${source}`,
        thumbnail: thumbnail,
        duration: "Ready",
        source: source,
        formats: formats
      });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = (format: any) => {
    if (format.url) {
      window.open(format.url, '_blank');
    } else {
      alert(`Started downloading: ${format.quality} ${format.type}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-12 pt-14 pb-24 relative z-10 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 glass-card rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Download className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">꧁Rᴀʙʙʏ Eғᴛʏ꧂ Downloader</h1>
          <p className="text-white/60">Download videos and MP3 (320K) from any website or platform link.</p>
        </div>

        <div className={`glass-card p-2 rounded-full border shadow-lg transition-all duration-500 ${isVpnConnected ? 'border-green-500/30 ring-1 ring-green-500/20' : 'border-white/10'}`}>
          <form onSubmit={handleAnalyze} className="flex space-x-2">
            <div className="flex-1 flex items-center pl-4">
              {isVpnConnected ? (
                <ShieldCheck className="w-5 h-5 text-green-400 mr-3" />
              ) : (
                <LinkIcon className="w-5 h-5 text-white/40 mr-3" />
              )}
              <input 
                type="url" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={isVpnConnected ? "Securely paste video URL..." : "Paste video URL for ꧁Rᴀʙʙʏ Eғᴛʏ꧂..."}
                disabled={isAnalyzing}
                className="w-full bg-transparent text-white placeholder:text-white/40 outline-none"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={!url.trim() || isAnalyzing}
              className="h-12 px-8 rounded-full shadow-sm bg-indigo-500 hover:bg-indigo-600 text-white border-none shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Download'
              )}
            </button>
          </form>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-2xl flex items-center space-x-3 backdrop-blur-md"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card rounded-3xl border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-48 h-32 rounded-xl overflow-hidden shrink-0 bg-zinc-800">
                  <img src={result.thumbnail} alt="Thumbnail" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="w-10 h-10 text-white/80" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-medium text-white">
                    {result.duration}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white/10 text-xs font-medium text-white/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{result.source}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white line-clamp-2">{result.title}</h3>
                  <p className="text-sm text-white/50">Select a format below to start downloading.</p>
                </div>
              </div>
              <div className="p-6 bg-black/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.formats.map((format: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleDownload(format)}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center space-x-3 text-white/90">
                        <div className="p-2 bg-white/10 rounded-lg group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                          {format.icon}
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{format.quality}</p>
                          <p className="text-xs text-white/50">{format.type} • {format.size}</p>
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
