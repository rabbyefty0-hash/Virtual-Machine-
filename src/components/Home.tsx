import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Video, Mic, Shield, Globe, DownloadCloud, ThumbsUp, Smartphone, Swords, Activity, CreditCard, Mail, MessageCircle, Phone, Folder, Cloud, Battery, Calendar, Search, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../ThemeContext';

interface HomeProps {
  onNavigate: (tab: any) => void;
  recentApps: any[];
}

export function Home({ onNavigate, recentApps }: HomeProps) {
  const [currentWidget, setCurrentWidget] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { iconShape, iconSize } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentWidget((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getIconShapeClass = () => {
    switch (iconShape) {
      case 'circle': return 'rounded-full';
      case 'square': return 'rounded-md';
      case 'squircle': default: return 'rounded-[1.4rem]';
    }
  };

  const getIconSizeClass = () => {
    switch (iconSize) {
      case 'small': return 'w-[50px] h-[50px]';
      case 'large': return 'w-[70px] h-[70px]';
      case 'medium': default: return 'w-[60px] h-[60px]';
    }
  };

  return (
    <motion.div 
      className="flex-1 overflow-y-auto p-6 pt-20 pb-32 relative z-10 custom-scrollbar h-full"
    >
      <div className="max-w-md mx-auto relative">
        
        {/* Liquid Glass Clock Widget */}
        <div className="w-full mb-8 relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-[2.5rem] blur-md transition-all duration-500 group-hover:blur-lg" />
          <div className="relative bg-white/10 dark:bg-black/20 backdrop-blur-3xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-[2.5rem] p-8 flex flex-col items-center justify-center overflow-hidden ios-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <h2 className="text-white/90 text-sm font-medium tracking-widest uppercase mb-2 drop-shadow-md">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <h1 className="text-7xl font-light tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-lg mb-2">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </h1>
            <p className="text-white/70 text-sm font-medium tracking-wide">{getGreeting()}</p>
          </div>
        </div>

        {/* Smart Stack Widget */}
        <div className="w-full h-32 bg-white/10 dark:bg-black/20 rounded-[2rem] backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden relative mb-6 ios-shadow">
          <AnimatePresence mode="wait">
            {currentWidget === 0 && (
              <motion.div
                key="weather"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 p-5 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white/80 font-medium">Cupertino</h3>
                    <h1 className="text-4xl font-light text-white">72°</h1>
                  </div>
                  <Cloud className="w-8 h-8 text-white" />
                </div>
                <div className="text-white/80 text-sm font-medium">Mostly Cloudy</div>
              </motion.div>
            )}
            {currentWidget === 1 && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 p-5 flex flex-col justify-between bg-gradient-to-br from-indigo-500/20 to-purple-500/20"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white/80 font-medium">Siri Suggestions</h3>
                    <p className="text-white text-sm mt-1">Based on your routine</p>
                  </div>
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onNavigate('whatsapp')} className="bg-white/20 rounded-xl p-2 flex items-center gap-2 flex-1 backdrop-blur-md">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-white font-medium">Message</span>
                  </button>
                  <button onClick={() => onNavigate('voice')} className="bg-white/20 rounded-xl p-2 flex items-center gap-2 flex-1 backdrop-blur-md">
                    <Mic className="w-4 h-4 text-pink-400" />
                    <span className="text-xs text-white font-medium">Voice Chat</span>
                  </button>
                </div>
              </motion.div>
            )}
            {currentWidget === 2 && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 p-5 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-red-400" />
                    <h3 className="text-white/80 font-medium uppercase text-xs tracking-wider">Up Next</h3>
                  </div>
                </div>
                <div>
                  <h2 className="text-white font-medium text-lg">Design Review</h2>
                  <p className="text-white/60 text-sm">1:00 PM - 2:00 PM</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Widget Pagination Dots */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-1.5 rounded-full transition-all duration-300 ${currentWidget === i ? 'h-3 bg-white' : 'h-1.5 bg-white/30'}`} />
            ))}
          </div>
        </div>

        {/* Recently Used Apps Carousel */}
        {recentApps && recentApps.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4 pl-2">
              <Clock className="w-4 h-4 text-white/60" />
              <h3 className="text-white/80 font-medium text-sm tracking-wide uppercase">Recently Used</h3>
            </div>
            <div className="flex overflow-x-auto hide-scrollbar -mx-6 px-6 gap-4 pb-4 snap-x snap-mandatory">
              {recentApps.map((app, idx) => (
                <motion.button
                  key={app.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => onNavigate(app.id)}
                  className="flex flex-col items-center space-y-2 group snap-start flex-shrink-0"
                >
                  <div className={`${getIconSizeClass()} ${getIconShapeClass()} ${app.bg} flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.2)] border border-white/30 backdrop-blur-xl transition-all duration-300 group-hover:scale-105 group-active:scale-95 relative overflow-hidden`}>
                    {/* Glossy top reflection */}
                    <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/40 to-white/5 pointer-events-none rounded-t-[inherit]" />
                    {/* Diagonal light sweep */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-black/20 pointer-events-none" />
                    {/* Inner shadow for depth */}
                    <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] pointer-events-none rounded-[inherit]" />
                    <app.icon className={`w-8 h-8 ${app.color} drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] relative z-10`} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-medium text-white/90 truncate w-16 text-center drop-shadow-md tracking-wide">{app.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button onClick={() => onNavigate('browser')} className="bg-gradient-to-br from-blue-500/80 to-blue-700/80 rounded-[2rem] p-5 backdrop-blur-xl border border-white/30 shadow-xl flex flex-col items-center justify-center gap-3 ios-shadow hover:scale-105 transition-all relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-black/20 pointer-events-none" />
            <Globe className="w-8 h-8 text-white drop-shadow-md relative z-10" />
            <span className="text-white font-medium relative z-10 drop-shadow-md">Browser</span>
          </button>
          <button onClick={() => onNavigate('gallery')} className="bg-gradient-to-br from-purple-500/80 to-fuchsia-600/80 rounded-[2rem] p-5 backdrop-blur-xl border border-white/30 shadow-xl flex flex-col items-center justify-center gap-3 ios-shadow hover:scale-105 transition-all relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-black/20 pointer-events-none" />
            <ImageIcon className="w-8 h-8 text-white drop-shadow-md relative z-10" />
            <span className="text-white font-medium relative z-10 drop-shadow-md">Photos</span>
          </button>
        </div>

      </div>
    </motion.div>
  );
}
