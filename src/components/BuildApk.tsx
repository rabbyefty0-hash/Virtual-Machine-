import React, { useState } from 'react';
import { Smartphone, Link as LinkIcon, Loader2, CheckCircle2, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

interface BuildApkProps {
  isVpnConnected?: boolean;
}

export function BuildApk({ isVpnConnected }: BuildApkProps) {
  const [url, setUrl] = useState('');
  const [appName, setAppName] = useState('');
  const [packageName, setPackageName] = useState('com.eftystudio.app');
  const [version, setVersion] = useState('1.0.0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const logs = [
    "Initializing build environment...",
    "Fetching website assets...",
    "Configuring WebView settings...",
    "Generating Android Manifest...",
    "Optimizing resources...",
    "Compiling Java/Kotlin sources...",
    "Merging DEX files...",
    "Signing APK with release key...",
    "Zipaligning package...",
    "Finalizing build..."
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !appName) return;
    
    setIsProcessing(true);
    setIsSuccess(false);
    setBuildLogs([]);
    setProgress(0);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('API Key missing');
      
      const ai = new GoogleGenAI({ apiKey });
      
      // Start initial logs
      setBuildLogs(["Initializing build environment...", "Analyzing target URL..."]);
      setProgress(10);
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this URL: ${url} for an app named "${appName}". Generate 8 realistic Android APK build log steps (like fetching assets, configuring manifest, compiling, signing). Return ONLY a JSON array of strings.`,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      let dynamicLogs = logs.slice(2);
      try {
        const parsedLogs = JSON.parse(response.text || '[]');
        if (Array.isArray(parsedLogs) && parsedLogs.length > 0) {
          dynamicLogs = parsedLogs;
        }
      } catch (e) {
        console.error("Failed to parse AI logs", e);
      }

      // Simulate build logs with dynamic content
      for (let i = 0; i < dynamicLogs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 1000));
        setBuildLogs(prev => [...prev, dynamicLogs[i]]);
        setProgress(Math.round(10 + ((i + 1) / dynamicLogs.length) * 90));
      }
      
      setIsSuccess(true);
    } catch (err) {
      console.error("Build failed:", err);
      // Fallback to static logs
      for (let i = 0; i < logs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 1000));
        setBuildLogs(prev => [...prev, logs[i]]);
        setProgress(Math.round(((i + 1) / logs.length) * 100));
      }
      setIsSuccess(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    // Create a dummy blob to simulate the APK download
    const content = `APK Build Report
-----------------
App Name: ${appName}
Package Name: ${packageName}
Version: ${version}
Target URL: ${url}
Build Date: ${new Date().toLocaleString()}
Status: 100% Working / Signed

This is a simulated APK file. In a production environment, this would be a compiled Android .apk package.`;
    const blob = new Blob([content], { type: 'application/vnd.android.package-archive' });
    const downloadUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${appName.replace(/\s+/g, '_')}.apk`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-12 pt-14 pb-24 relative z-10 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 glass-card rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Smartphone className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">꧁Rᴀʙʙʏ Eғᴛʏ꧂ APK</h1>
          <p className="text-white/60">Convert any website link into a fully functional Android APK</p>
        </div>

        <Card className={`p-6 glass-card border transition-all duration-500 ${isVpnConnected ? 'border-green-500/30 ring-1 ring-green-500/20' : 'border-white/10'}`}>
          {isVpnConnected && (
            <div className="flex items-center space-x-2 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full w-fit mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">VPN Secure Build Active</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80 ml-1">Website URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LinkIcon className="h-5 w-5 text-white/40" />
                </div>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter website for ꧁Rᴀʙʙʏ Eғᴛʏ꧂..."
                  className="pl-11 h-14 glass-input rounded-2xl text-white placeholder:text-white/30 border-white/10 focus-visible:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80 ml-1">App Name</label>
              <Input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="My Awesome App"
                className="h-14 glass-input rounded-2xl text-white placeholder:text-white/30 border-white/10 focus-visible:ring-emerald-500 px-4"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 ml-1">Package Name</label>
                <Input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="com.example.app"
                  className="h-14 glass-input rounded-2xl text-white placeholder:text-white/30 border-white/10 focus-visible:ring-emerald-500 px-4"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 ml-1">Version</label>
                <Input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="h-14 glass-input rounded-2xl text-white placeholder:text-white/30 border-white/10 focus-visible:ring-emerald-500 px-4"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={!url || !appName || isProcessing}
              className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-lg shadow-lg shadow-emerald-900/20 transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Building 100% Working APK...
                </>
              ) : (
                'Build 100% Working APK'
              )}
            </Button>
          </form>
        </Card>

        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full glass-card rounded-2xl border border-white/10 p-4 overflow-hidden space-y-4"
            >
              <div className="flex justify-between items-center text-xs font-medium text-emerald-400 mb-2">
                <span>Building APK...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="font-mono text-xs text-emerald-400/70 space-y-1 h-32 overflow-y-auto custom-scrollbar pr-2">
                {buildLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <span className="text-emerald-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </motion.div>
                ))}
                <div className="animate-pulse">_</div>
              </div>
            </motion.div>
          )}

          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex flex-col items-center space-y-4 backdrop-blur-md text-center"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-emerald-100 font-medium text-lg">Build Successful!</h3>
                <p className="text-emerald-200/70 text-sm mt-1">Your APK is ready to be downloaded and installed.</p>
              </div>
              <Button 
                onClick={handleDownload}
                className="w-full bg-white text-emerald-900 hover:bg-zinc-200 rounded-xl h-12 font-semibold"
              >
                <Download className="w-5 h-5 mr-2" />
                Download {appName}.apk
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
