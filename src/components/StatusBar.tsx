import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Signal, Wifi } from 'lucide-react';

interface StatusBarProps {
  theme: 'light' | 'dark';
  isVpnConnected: boolean;
}

export function StatusBar({ theme, isVpnConnected }: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [wifiSignal, setWifiSignal] = useState(3); // 0-3

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // Update every 10 seconds
    return () => clearInterval(timer);
  }, []);

  // Battery Status
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      });
    }
  }, []);

  // Simulated Wifi Signal Fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setWifiSignal(prev => {
        const change = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        return Math.max(1, Math.min(3, prev + change));
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-2 left-0 right-0 h-[36px] z-[60] flex items-center justify-between px-8 pointer-events-none">
      <div className={`text-[14px] font-bold tracking-tight flex items-center space-x-1 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>
        <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        {isVpnConnected && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black tracking-tighter ml-1 shadow-lg"
          >
            VPN
          </motion.div>
        )}
      </div>
      
      <div className={`flex items-center space-x-2 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>
        <Signal className={`w-4 h-4 ${wifiSignal < 2 ? 'opacity-50' : 'opacity-100'}`} />
        <Wifi className={`w-4 h-4 ${wifiSignal < 3 ? 'opacity-70' : 'opacity-100'}`} />
        <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border ${theme === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/10 backdrop-blur-md border-white/10'}`}>
          <span className="text-[11px] font-bold">{batteryLevel}%</span>
          <div className={`w-6 h-3 border rounded-[4px] p-[1px] relative ${theme === 'light' ? 'border-zinc-400' : 'border-white/30'}`}>
            <div 
              className={`h-full rounded-[2px] transition-all duration-500 ${batteryLevel < 20 ? 'bg-red-500' : (isCharging ? 'bg-green-400' : (theme === 'light' ? 'bg-zinc-800' : 'bg-white'))}`} 
              style={{ width: `${batteryLevel}%` }} 
            />
            <div className={`absolute -right-1 top-1/2 -translate-y-1/2 w-0.5 h-1.5 rounded-r-sm ${theme === 'light' ? 'bg-zinc-400' : 'bg-white/30'}`} />
            {isCharging && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme === 'light' ? 'bg-white' : 'bg-zinc-900'}`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
