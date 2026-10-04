import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Globe, Power, Activity, MapPin, Star, X, Check, Clock, ArrowDown, ArrowUp, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SERVERS = [
  { id: 'us-ny', name: 'United States - New York', flag: '🇺🇸', premium: true },
  { id: 'us-la', name: 'United States - Los Angeles', flag: '🇺🇸', premium: true },
  { id: 'us-mia', name: 'United States - Miami', flag: '🇺🇸', premium: true },
  { id: 'us-chi', name: 'United States - Chicago', flag: '🇺🇸', premium: true },
  { id: 'us-dal', name: 'United States - Dallas', flag: '🇺🇸', premium: true },
  { id: 'us-sea', name: 'United States - Seattle', flag: '🇺🇸', premium: true },
  { id: 'uk-lon', name: 'United Kingdom - London', flag: '🇬🇧', premium: true },
  { id: 'uk-man', name: 'United Kingdom - Manchester', flag: '🇬🇧', premium: true },
  { id: 'jp-tok', name: 'Japan - Tokyo', flag: '🇯🇵', premium: true },
  { id: 'jp-osa', name: 'Japan - Osaka', flag: '🇯🇵', premium: true },
  { id: 'kr-sel', name: 'South Korea - Seoul', flag: '🇰🇷', premium: true },
  { id: 'de-fra', name: 'Germany - Frankfurt', flag: '🇩🇪', premium: true },
  { id: 'de-ber', name: 'Germany - Berlin', flag: '🇩🇪', premium: true },
  { id: 'fr-par', name: 'France - Paris', flag: '🇫🇷', premium: true },
  { id: 'sg', name: 'Singapore', flag: '🇸🇬', premium: true },
  { id: 'au-syd', name: 'Australia - Sydney', flag: '🇦🇺', premium: true },
  { id: 'au-mel', name: 'Australia - Melbourne', flag: '🇦🇺', premium: true },
  { id: 'ae-dxb', name: 'UAE - Dubai', flag: '🇦🇪', premium: true },
  { id: 'ch-zur', name: 'Switzerland - Zurich', flag: '🇨🇭', premium: true },
  { id: 'ca-tor', name: 'Canada - Toronto', flag: '🇨🇦', premium: false },
  { id: 'ca-van', name: 'Canada - Vancouver', flag: '🇨🇦', premium: false },
  { id: 'nl-ams', name: 'Netherlands - Amsterdam', flag: '🇳🇱', premium: false },
  { id: 'in-mum', name: 'India - Mumbai', flag: '🇮🇳', premium: false },
  { id: 'in-del', name: 'India - Delhi', flag: '🇮🇳', premium: false },
  { id: 'br-sao', name: 'Brazil - São Paulo', flag: '🇧🇷', premium: false },
  { id: 'za-jnb', name: 'South Africa - Johannesburg', flag: '🇿🇦', premium: false },
  { id: 'it-mil', name: 'Italy - Milan', flag: '🇮🇹', premium: false },
  { id: 'es-mad', name: 'Spain - Madrid', flag: '🇪🇸', premium: false },
  { id: 'se-sto', name: 'Sweden - Stockholm', flag: '🇸🇪', premium: false },
  { id: 'pl-war', name: 'Poland - Warsaw', flag: '🇵🇱', premium: false },
  { id: 'hk', name: 'Hong Kong', flag: '🇭🇰', premium: true },
  { id: 'tw-tpe', name: 'Taiwan - Taipei', flag: '🇹🇼', premium: true },
];

interface VpnProps {
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
}

export function Vpn({ isConnected, setIsConnected }: VpnProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedServer, setSelectedServer] = useState(SERVERS[0]);
  const [showServers, setShowServers] = useState(false);
  
  // Connection details state
  const [connectionStartTime, setConnectionStartTime] = useState<number | null>(null);
  const [uptime, setUptime] = useState('00:00:00');
  const [dataUsage, setDataUsage] = useState({ up: 0, down: 0 });
  const [serverIp, setServerIp] = useState('');

  // Generate a random IP based on server ID
  const generateIp = (serverId: string) => {
    const hash = serverId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `${100 + (hash % 100)}.${10 + (hash % 50)}.${20 + (hash % 200)}.${Math.floor(Math.random() * 250) + 1}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      if (!connectionStartTime) {
        setConnectionStartTime(Date.now());
        setServerIp(generateIp(selectedServer.id));
        setDataUsage({ up: 0, down: 0 });
      }

      interval = setInterval(() => {
        // Update uptime
        const diff = Math.floor((Date.now() - (connectionStartTime || Date.now())) / 1000);
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        setUptime(`${h}:${m}:${s}`);

        // Simulate data usage (random bytes per second)
        setDataUsage(prev => ({
          up: prev.up + Math.floor(Math.random() * 50000) + 10000, // 10KB - 60KB/s
          down: prev.down + Math.floor(Math.random() * 200000) + 50000 // 50KB - 250KB/s
        }));
      }, 1000);
    } else {
      setConnectionStartTime(null);
      setUptime('00:00:00');
    }

    return () => clearInterval(interval);
  }, [isConnected, connectionStartTime, selectedServer.id]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleVpn = () => {
    if (isConnected) {
      setIsConnected(false);
    } else {
      setIsConnecting(true);
      setTimeout(() => {
        setIsConnecting(false);
        setIsConnected(true);
      }, 2000);
    }
  };

  const handleSelectServer = (server: typeof SERVERS[0]) => {
    if (isConnected) {
      setIsConnected(false);
      setSelectedServer(server);
      setIsConnecting(true);
      setTimeout(() => {
        setIsConnecting(false);
        setIsConnected(true);
      }, 2000);
    } else {
      setSelectedServer(server);
    }
    setShowServers(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-12 pt-14 pb-24 relative z-10 flex flex-col items-center justify-center h-full text-white">
      <div className="w-full max-w-md space-y-12 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">꧁Rᴀʙʙʏ Eғᴛʏ꧂ VPN</h1>
          <p className="text-white/60">Protect your privacy and secure your connection.</p>
        </div>

        <div className="relative flex items-center justify-center py-12">
          {isConnected && (
            <>
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-48 h-48 bg-emerald-500 rounded-full blur-2xl"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                className="absolute w-40 h-40 bg-green-400 rounded-full blur-xl"
              />
            </>
          )}

          <button
            onClick={toggleVpn}
            disabled={isConnecting}
            className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              isConnected 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10'
            } ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
          >
            {isConnecting ? (
              <Power className="w-12 h-12 animate-pulse text-emerald-400" />
            ) : isConnected ? (
              <ShieldCheck className="w-12 h-12" />
            ) : (
              <Power className="w-12 h-12 text-white/50" />
            )}
          </button>
        </div>

        <div className="glass-card liquid-glass p-6 rounded-3xl inline-block mx-auto border border-white/10 w-full">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <Globe className="w-5 h-5 text-indigo-400" />
              <div className="text-left">
                <p className="text-xs text-white/50 uppercase tracking-wider">Location</p>
                <p className="text-sm font-medium flex items-center space-x-2">
                  <span>{selectedServer.flag}</span>
                  <span>{selectedServer.name}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowServers(true)}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors"
            >
              Change
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-indigo-400" />
              <div className="text-left">
                <p className="text-xs text-white/50 uppercase tracking-wider">Status</p>
                <p className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-white/80'}`}>
                  {isConnecting ? 'Connecting...' : isConnected ? 'Connected & Secured' : 'Disconnected'}
                </p>
              </div>
            </div>
          </div>

          {/* Connection Details (Only visible when connected) */}
          <AnimatePresence>
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden border-t border-white/10 pt-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <div className="text-left">
                      <p className="text-[10px] text-white/50 uppercase tracking-wider">Uptime</p>
                      <p className="text-xs font-medium font-mono">{uptime}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <HardDrive className="w-4 h-4 text-indigo-400" />
                    <div className="text-left">
                      <p className="text-[10px] text-white/50 uppercase tracking-wider">Server IP</p>
                      <p className="text-xs font-medium font-mono">{serverIp}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <ArrowDown className="w-4 h-4 text-emerald-400" />
                    <div className="text-left">
                      <p className="text-[10px] text-white/50 uppercase tracking-wider">Download</p>
                      <p className="text-xs font-medium font-mono">{formatBytes(dataUsage.down)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <ArrowUp className="w-4 h-4 text-purple-400" />
                    <div className="text-left">
                      <p className="text-[10px] text-white/50 uppercase tracking-wider">Upload</p>
                      <p className="text-xs font-medium font-mono">{formatBytes(dataUsage.up)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Server Selection Modal */}
      <AnimatePresence>
        {showServers && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowServers(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass-panel liquid-glass z-50 rounded-3xl border border-white/10 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="font-semibold text-lg flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-indigo-400" />
                  <span>Select Server</span>
                </h3>
                <button 
                  onClick={() => setShowServers(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-2">
                {SERVERS.map((server) => (
                  <button
                    key={server.id}
                    onClick={() => handleSelectServer(server)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${
                      selectedServer.id === server.id ? 'bg-indigo-500/20 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{server.flag}</span>
                      <div className="text-left">
                        <p className="font-medium text-white/90">{server.name}</p>
                        {server.premium ? (
                          <p className="text-xs text-amber-400 flex items-center space-x-1 mt-0.5">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>Premium (Free Access)</span>
                          </p>
                        ) : (
                          <p className="text-xs text-white/50 mt-0.5">Standard Server</p>
                        )}
                      </div>
                    </div>
                    {selectedServer.id === server.id && (
                      <Check className="w-5 h-5 text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
