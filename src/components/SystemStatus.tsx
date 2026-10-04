import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Battery, Wifi, Signal, Cpu, HardDrive, Activity, Zap, Globe, Clock, Server, Smartphone, CheckCircle2, AlertCircle, Sun, Moon, LogOut, User as UserIcon, ChevronRight, Info, Download, Settings, Languages, X, Check, Share2 } from 'lucide-react';
import { Card } from './ui/card';
import { User } from '../firebase';

interface StatusItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  progress?: number;
  theme?: 'light' | 'dark';
}

const StatusItem = ({ icon, label, value, subValue, status = 'info', progress, theme = 'dark' }: StatusItemProps) => {
  const statusColors = {
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-rose-400',
    info: 'text-indigo-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card liquid-glass p-4 rounded-2xl border-white/5 flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${statusColors[status]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'light' ? 'text-zinc-500' : 'text-white/40'}`}>{label}</span>
          {status === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-lg font-bold truncate ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{value}</span>
          {subValue && <span className={`text-xs truncate ${theme === 'light' ? 'text-zinc-500' : 'text-white/30'}`}>{subValue}</span>}
        </div>
        {progress !== undefined && (
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={`h-full ${statusColors[status].replace('text', 'bg')}`}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const SystemStatus = ({ 
  isVpnConnected, 
  theme,
  setTheme,
  user,
  isAuthLoading,
  handleSignIn,
  handleLogout
}: {
  isVpnConnected: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  user: User | null;
  isAuthLoading: boolean;
  handleSignIn: () => void;
  handleLogout: () => void;
}) => {
  const [uptime, setUptime] = useState('00:00:00');
  const [startTime] = useState(Date.now() - performance.now());
  
  // Real device states
  const [realBatteryLevel, setRealBatteryLevel] = useState<number | null>(null);
  const [realIsCharging, setRealIsCharging] = useState<boolean | null>(null);
  const [networkType, setNetworkType] = useState<string>('Unknown');
  const [downlink, setDownlink] = useState<number | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);
  const [storageUsage, setStorageUsage] = useState<{used: number, total: number} | null>(null);
  const [cpuUsage, setCpuUsage] = useState(12);
  const [ramUsage, setRamUsage] = useState(45);
  
  const [deviceInfo, setDeviceInfo] = useState({
    os: 'Unknown OS',
    model: 'Unknown Device',
    cores: 8,
    memory: 8,
    browser: 'Unknown Browser'
  });

  const [showLanguageRegion, setShowLanguageRegion] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState(() => localStorage.getItem('app_language') || 'English');
  const [activeRegion, setActiveRegion] = useState(() => localStorage.getItem('app_region') || 'United States');

  const languages = ['English', 'Bangla', 'Hindi'];
  const regions = ['United States', 'United Kingdom', 'India', 'Bangladesh'];

  const handleSaveLanguageRegion = (lang: string, reg: string) => {
    setActiveLanguage(lang);
    setActiveRegion(reg);
    localStorage.setItem('app_language', lang);
    localStorage.setItem('app_region', reg);
    setShowLanguageRegion(false);
  };

  useEffect(() => {
    // 1. Get OS and Browser Info
    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    let model = 'Device';
    let browser = 'Unknown Browser';
    
    if (ua.includes('Macintosh')) { os = 'macOS'; model = 'Mac'; }
    else if (ua.includes('Windows')) { os = 'Windows'; model = 'PC'; }
    else if (ua.includes('Android')) { os = 'Android'; model = 'Smartphone'; }
    else if (ua.includes('iPhone')) { os = 'iOS'; model = 'iPhone'; }
    else if (ua.includes('iPad')) { os = 'iOS'; model = 'iPad'; }
    else if (ua.includes('Linux')) { os = 'Linux'; model = 'PC'; }

    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    const cores = navigator.hardwareConcurrency || 8;
    const memory = (navigator as any).deviceMemory || 8;

    setDeviceInfo({ os, model, cores, memory, browser });

    // 2. Get Battery Info
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setRealBatteryLevel(Math.round(battery.level * 100));
        setRealIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => setRealBatteryLevel(Math.round(battery.level * 100)));
        battery.addEventListener('chargingchange', () => setRealIsCharging(battery.charging));
      }).catch(() => console.log('Battery API not supported'));
    }

    // 3. Get Network Info
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const updateNetworkInfo = () => {
        setNetworkType(connection.effectiveType?.toUpperCase() || 'UNKNOWN');
        setDownlink(connection.downlink);
        setRtt(connection.rtt);
      };
      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
    }

    // 4. Get Storage Info
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(({ quota, usage }) => {
        if (quota && usage) {
          setStorageUsage({
            used: usage,
            total: quota
          });
        }
      }).catch(console.error);
    }

    // 5. Uptime & Simulated CPU/RAM (since real CPU/RAM % isn't available in browser)
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const h = Math.floor(diff / 3600).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setUptime(`${h}:${m}:${s}`);
      
      // Simulate fluctuations for CPU/RAM as browsers don't expose this for security
      setCpuUsage(prev => Math.max(2, Math.min(98, prev + (Math.random() * 10 - 5))));
      setRamUsage(prev => Math.max(20, Math.min(85, prev + (Math.random() * 4 - 2))));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const displayBattery = realBatteryLevel !== null ? realBatteryLevel : 100;
  const displayCharging = realIsCharging !== null ? realIsCharging : false;
  const displayWifiSignal = 3;
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-12 pt-14 pb-24 relative z-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2 mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 glass-card liquid-glass rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border-white/10"
          >
            <Activity className="w-10 h-10 text-indigo-400" />
          </motion.div>
          <h1 className={`text-4xl font-black tracking-tight ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>System Status</h1>
          <p className={`font-medium ${theme === 'light' ? 'text-zinc-500' : 'text-white/40'}`}>{deviceInfo.model} • {deviceInfo.os} • {deviceInfo.browser}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 glass-card border-white/10 md:col-span-2 space-y-4">
            <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-2 flex items-center ${theme === 'light' ? 'text-zinc-400' : 'text-white/30'}`}>
              <UserIcon className="w-3 h-3 mr-2 text-indigo-400" />
              Account
            </h3>
            
            <div className="flex flex-col gap-4">
              {isAuthLoading ? (
                <div className="flex items-center justify-center py-3">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : user ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-white/20" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-white/10">
                        <UserIcon className="w-6 h-6 text-indigo-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <p className={`text-sm font-semibold truncate ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{user.displayName || 'User'}</p>
                        {isVpnConnected && <Shield className="w-3 h-3 text-green-400" />}
                      </div>
                      <p className={`text-xs truncate flex items-center gap-1 ${theme === 'light' ? 'text-zinc-500' : 'text-white/40'}`}>
                        {user.email}
                        {isVpnConnected && <span className="text-[8px] bg-green-500/20 text-green-400 px-1 rounded border border-green-500/30 uppercase font-bold">Secure</span>}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 transition-colors border border-red-500/20"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleSignIn}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all border border-white/10 shadow-lg liquid-glass"
                >
                  <div className="bg-white p-1 rounded-full">
                    <svg className="w-3 h-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </Card>

          <Card className="p-6 glass-card border-white/10 md:col-span-2 space-y-4">
            <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-2 flex items-center ${theme === 'light' ? 'text-zinc-400' : 'text-white/30'}`}>
              <Settings className="w-3 h-3 mr-2 text-zinc-400" />
              General
            </h3>
            
            <div className={`flex flex-col rounded-2xl overflow-hidden border ${theme === 'light' ? 'border-black/10' : 'border-white/10'}`}>
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors border-b ${theme === 'light' ? 'bg-black/5 border-black/10 hover:bg-black/10 text-zinc-900' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${theme === 'light' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-black'}`}>
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </div>
                  <span className="font-medium">Appearance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${theme === 'light' ? 'text-zinc-500' : 'text-white/50'}`}>{theme === 'light' ? 'Light' : 'Dark'}</span>
                  <ChevronRight className={`w-4 h-4 ${theme === 'light' ? 'text-zinc-400' : 'text-white/30'}`} />
                </div>
              </button>

              <button 
                onClick={() => setShowAbout(true)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors border-b ${theme === 'light' ? 'bg-black/5 border-black/10 hover:bg-black/10 text-zinc-900' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                  <span className="font-medium">About</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${theme === 'light' ? 'text-zinc-400' : 'text-white/30'}`} />
              </button>

              <button className={`w-full flex items-center justify-between px-4 py-3 transition-colors border-b ${theme === 'light' ? 'bg-black/5 border-black/10 hover:bg-black/10 text-zinc-900' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-500 text-white flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Software Update</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <ChevronRight className={`w-4 h-4 ${theme === 'light' ? 'text-zinc-400' : 'text-white/30'}`} />
                </div>
              </button>

              <button 
                onClick={() => setShowLanguageRegion(true)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors border-b ${theme === 'light' ? 'bg-black/5 border-black/10 hover:bg-black/10 text-zinc-900' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                    <Languages className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Language & Region</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${theme === 'light' ? 'text-zinc-500' : 'text-white/50'}`}>{activeLanguage}</span>
                  <ChevronRight className={`w-4 h-4 ${theme === 'light' ? 'text-zinc-400' : 'text-white/30'}`} />
                </div>
              </button>

              <button 
                onClick={async () => {
                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: '꧁Rᴀʙʙʏ Eғᴛʏ꧂ OS',
                        text: 'Check out this awesome cloud OS with AI tools, VPN, and more!',
                        url: window.location.href,
                      });
                    } else {
                      await navigator.clipboard.writeText(window.location.href);
                      alert('App link copied to clipboard!');
                    }
                  } catch (err) {
                    console.error('Error sharing:', err);
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${theme === 'light' ? 'bg-black/5 hover:bg-black/10 text-zinc-900' : 'bg-white/5 hover:bg-white/10 text-white'}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Share App</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className={`w-4 h-4 ${theme === 'light' ? 'text-zinc-400' : 'text-white/30'}`} />
                </div>
              </button>
            </div>
          </Card>

          <StatusItem
            icon={<Shield className="w-6 h-6" />}
            label="Security"
            value={isVpnConnected ? "VPN Active" : "VPN Inactive"}
            subValue={isVpnConnected ? "Secure Tunnel" : "Direct Connection"}
            status={isVpnConnected ? "success" : "warning"}
            theme={theme}
          />
          <StatusItem
            icon={<Battery className="w-6 h-6" />}
            label="Battery"
            value={`${displayBattery}%`}
            subValue={displayCharging ? "Charging" : "Discharging"}
            status={displayBattery > 20 ? "success" : "error"}
            progress={displayBattery}
            theme={theme}
          />
          <StatusItem
            icon={<Wifi className="w-6 h-6" />}
            label="Network"
            value={networkType !== 'Unknown' ? networkType : (displayWifiSignal === 3 ? "Excellent" : displayWifiSignal === 2 ? "Good" : "Weak")}
            subValue={downlink ? `${downlink} Mbps ↓` : "Connected"}
            status="success"
            progress={downlink ? Math.min((downlink / 100) * 100, 100) : (displayWifiSignal / 3) * 100}
            theme={theme}
          />
          <StatusItem
            icon={<Cpu className="w-6 h-6" />}
            label="Processor"
            value={`${deviceInfo.cores} Cores`}
            subValue={`Load: ~${Math.round(cpuUsage)}%`}
            status={cpuUsage > 80 ? "error" : cpuUsage > 50 ? "warning" : "success"}
            progress={cpuUsage}
            theme={theme}
          />
          <StatusItem
            icon={<HardDrive className="w-6 h-6" />}
            label="Memory (RAM)"
            value={`~${deviceInfo.memory} GB`}
            subValue={`Usage: ~${Math.round(ramUsage)}%`}
            status="info"
            progress={ramUsage}
            theme={theme}
          />
          <StatusItem
            icon={<Clock className="w-6 h-6" />}
            label="Session Uptime"
            value={uptime}
            subValue="Since page load"
            status="info"
            theme={theme}
          />
          <StatusItem
            icon={<Server className="w-6 h-6" />}
            label="Browser Storage"
            value={storageUsage ? formatBytes(storageUsage.used) : "Calculating..."}
            subValue={storageUsage ? `of ${formatBytes(storageUsage.total)}` : "Checking quota"}
            status="success"
            progress={storageUsage ? (storageUsage.used / storageUsage.total) * 100 : 0}
            theme={theme}
          />
          <StatusItem
            icon={<Globe className="w-6 h-6" />}
            label="Latency"
            value={rtt ? `${rtt}ms` : "Global"}
            subValue={rtt ? "Round Trip Time" : "Connection Active"}
            status="success"
            theme={theme}
          />
        </div>

        <Card className="p-6 glass-card border-white/10 mt-8">
          <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center ${theme === 'light' ? 'text-zinc-400' : 'text-white/30'}`}>
            <Zap className="w-3 h-3 mr-2 text-amber-400" />
            Active Device Services
          </h3>
          <div className="space-y-4">
            {[
              { name: 'Hardware Concurrency', status: 'Active', load: `${deviceInfo.cores} Logical Cores` },
              { name: 'Device Memory API', status: 'Active', load: `~${deviceInfo.memory} GB Class` },
              { name: 'Network Information API', status: networkType !== 'Unknown' ? 'Active' : 'Unsupported', load: networkType },
              { name: 'Battery Status API', status: realBatteryLevel !== null ? 'Active' : 'Unsupported', load: realBatteryLevel !== null ? `${realBatteryLevel}%` : 'N/A' },
            ].map((service, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex flex-col">
                  <span className={`text-sm font-bold ${theme === 'light' ? 'text-zinc-900' : 'text-white/90'}`}>{service.name}</span>
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${theme === 'light' ? 'text-zinc-500' : 'text-white/30'}`}>{service.status}</span>
                </div>
                <span className="text-xs font-mono text-indigo-400">{service.load}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-center pt-8">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Real Device Data Active</span>
          </div>
        </div>
      </div>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ${theme === 'light' ? 'bg-white' : 'bg-zinc-900 border border-white/10'}`}
          >
            <div className={`p-4 flex items-center justify-between border-b ${theme === 'light' ? 'border-zinc-200' : 'border-white/10'}`}>
              <h2 className={`text-lg font-bold ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>About</h2>
              <button 
                onClick={() => setShowAbout(false)}
                className={`p-2 rounded-full transition-colors ${theme === 'light' ? 'hover:bg-zinc-100 text-zinc-500' : 'hover:bg-white/10 text-white/50'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center justify-center space-y-2 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-2">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                <h3 className={`text-xl font-black ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>RabbyOS</h3>
                <p className={`text-sm font-medium ${theme === 'light' ? 'text-zinc-500' : 'text-white/50'}`}>Version 17.0.1 PRO</p>
              </div>

              <div className="space-y-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-zinc-500' : 'text-white/40'}`}>Device Owner</h3>
                <div className={`rounded-2xl overflow-hidden border ${theme === 'light' ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'} p-4 flex items-center gap-4`}>
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Owner" className="w-12 h-12 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-white/10">
                      <UserIcon className="w-6 h-6 text-indigo-400" />
                    </div>
                  )}
                  <div>
                    <p className={`font-bold ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{user?.displayName || 'Guest User'}</p>
                    <p className={`text-xs ${theme === 'light' ? 'text-zinc-500' : 'text-white/50'}`}>{user?.email || 'Not signed in'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-zinc-500' : 'text-white/40'}`}>Device Info</h3>
                <div className={`rounded-2xl overflow-hidden border ${theme === 'light' ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'}`}>
                  <div className={`flex justify-between p-3 border-b ${theme === 'light' ? 'border-zinc-200' : 'border-white/10'}`}>
                    <span className={`text-sm ${theme === 'light' ? 'text-zinc-600' : 'text-white/60'}`}>Name</span>
                    <span className={`text-sm font-medium ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>Rabby's iPhone 17 Pro Max</span>
                  </div>
                  <div className={`flex justify-between p-3 border-b ${theme === 'light' ? 'border-zinc-200' : 'border-white/10'}`}>
                    <span className={`text-sm ${theme === 'light' ? 'text-zinc-600' : 'text-white/60'}`}>Model</span>
                    <span className={`text-sm font-medium ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{deviceInfo.model}</span>
                  </div>
                  <div className={`flex justify-between p-3 border-b ${theme === 'light' ? 'border-zinc-200' : 'border-white/10'}`}>
                    <span className={`text-sm ${theme === 'light' ? 'text-zinc-600' : 'text-white/60'}`}>System</span>
                    <span className={`text-sm font-medium ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{deviceInfo.os}</span>
                  </div>
                  <div className={`flex justify-between p-3 border-b ${theme === 'light' ? 'border-zinc-200' : 'border-white/10'}`}>
                    <span className={`text-sm ${theme === 'light' ? 'text-zinc-600' : 'text-white/60'}`}>Browser</span>
                    <span className={`text-sm font-medium ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{deviceInfo.browser}</span>
                  </div>
                  <div className={`flex justify-between p-3 border-b ${theme === 'light' ? 'border-zinc-200' : 'border-white/10'}`}>
                    <span className={`text-sm ${theme === 'light' ? 'text-zinc-600' : 'text-white/60'}`}>Processor</span>
                    <span className={`text-sm font-medium ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{deviceInfo.cores} Cores</span>
                  </div>
                  <div className={`flex justify-between p-3 border-b ${theme === 'light' ? 'border-zinc-200' : 'border-white/10'}`}>
                    <span className={`text-sm ${theme === 'light' ? 'text-zinc-600' : 'text-white/60'}`}>Memory</span>
                    <span className={`text-sm font-medium ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>~{deviceInfo.memory} GB</span>
                  </div>
                  <div className={`flex justify-between p-3`}>
                    <span className={`text-sm ${theme === 'light' ? 'text-zinc-600' : 'text-white/60'}`}>Storage Capacity</span>
                    <span className={`text-sm font-medium ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{storageUsage ? formatBytes(storageUsage.total) : 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Language & Region Modal */}
      {showLanguageRegion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ${theme === 'light' ? 'bg-white' : 'bg-zinc-900 border border-white/10'}`}
          >
            <div className={`p-4 flex items-center justify-between border-b ${theme === 'light' ? 'border-zinc-200' : 'border-white/10'}`}>
              <h2 className={`text-lg font-bold ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>Language & Region</h2>
              <button 
                onClick={() => setShowLanguageRegion(false)}
                className={`p-2 rounded-full transition-colors ${theme === 'light' ? 'hover:bg-zinc-100 text-zinc-500' : 'hover:bg-white/10 text-white/50'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Language Selection */}
              <div className="space-y-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-zinc-500' : 'text-white/40'}`}>Language</h3>
                <div className={`rounded-2xl overflow-hidden border ${theme === 'light' ? 'border-zinc-200' : 'border-white/10'}`}>
                  {languages.map((lang, idx) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLanguage(lang)}
                      className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${idx !== languages.length - 1 ? (theme === 'light' ? 'border-b border-zinc-200' : 'border-b border-white/10') : ''} ${theme === 'light' ? 'bg-zinc-50 hover:bg-zinc-100 text-zinc-900' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                    >
                      <span className="font-medium">{lang}</span>
                      {activeLanguage === lang && <Check className="w-5 h-5 text-indigo-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Region Selection */}
              <div className="space-y-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-zinc-500' : 'text-white/40'}`}>Region</h3>
                <div className={`rounded-2xl overflow-hidden border ${theme === 'light' ? 'border-zinc-200' : 'border-white/10'}`}>
                  {regions.map((reg, idx) => (
                    <button
                      key={reg}
                      onClick={() => setActiveRegion(reg)}
                      className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${idx !== regions.length - 1 ? (theme === 'light' ? 'border-b border-zinc-200' : 'border-b border-white/10') : ''} ${theme === 'light' ? 'bg-zinc-50 hover:bg-zinc-100 text-zinc-900' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                    >
                      <span className="font-medium">{reg}</span>
                      {activeRegion === reg && <Check className="w-5 h-5 text-indigo-500" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`p-4 border-t ${theme === 'light' ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-black/20'}`}>
              <button
                onClick={() => handleSaveLanguageRegion(activeLanguage, activeRegion)}
                className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-colors shadow-lg shadow-indigo-500/25"
              >
                Apply Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
