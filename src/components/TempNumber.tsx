import React, { useState, useEffect } from 'react';
import { Phone, RefreshCw, Copy, MessageSquare, ShieldCheck, ChevronLeft, Globe, Loader2, Signal, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TempNumberProps {
  isVpnConnected?: boolean;
}

interface SmsMessage {
  id: string;
  sender: string;
  time: string;
  text: string;
}

interface PhoneNumber {
  number: string;
  country: string;
}

export function TempNumber({ isVpnConnected }: TempNumberProps) {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');

  const fetchHtmlWithFallback = async (url: string) => {
    const proxies = [
      `https://api.codetabs.com/v1/proxy?quest=${url}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];
    let lastError;
    for (const proxy of proxies) {
      try {
        const res = await fetch(proxy);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        if (proxy.includes('allorigins.win/get')) {
          const data = await res.json();
          return data.contents;
        }
        
        return await res.text();
      } catch (err) {
        lastError = err;
        console.warn(`Fetch failed with proxy, trying next...`);
      }
    }
    throw lastError;
  };

  const loadNumbers = async () => {
    setLoadingNumbers(true);
    setError('');
    try {
      // Try to scrape receive-smss.com
      const html = await fetchHtmlWithFallback('https://receive-smss.com/');
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const numberElements = Array.from(doc.querySelectorAll('a[href^="/sms/"]'));
      const parsedNumbers = numberElements.map(el => {
        const href = el.getAttribute('href') || '';
        const num = href.replace('/sms/', '').replace('/', '');
        const text = el.textContent || '';
        let country = 'Global';
        if (text.includes('+1') || num.startsWith('1')) country = 'US/CA';
        else if (text.includes('+44') || num.startsWith('44')) country = 'UK';
        else if (text.includes('+46') || num.startsWith('46')) country = 'SE';
        else if (text.includes('+33') || num.startsWith('33')) country = 'FR';
        
        return { number: num, country };
      }).filter(n => n.number && n.number.match(/^\d+$/));
      
      // Remove duplicates
      const uniqueNumbers = Array.from(new Map(parsedNumbers.map(item => [item.number, item])).values());
      
      if (uniqueNumbers.length > 0) {
        setNumbers(uniqueNumbers);
      } else {
        throw new Error('No numbers found in scraped HTML');
      }
    } catch (err) {
      console.error('Failed to load numbers:', err);
      // Fallback to some known numbers if scraping fails
      setNumbers([
        { number: '12018556789', country: 'US/CA' },
        { number: '447700900000', country: 'UK' },
        { number: '46700000000', country: 'SE' },
        { number: '33700000000', country: 'FR' }
      ]);
      setError('Using fallback numbers. Live numbers could not be loaded due to network restrictions.');
    } finally {
      setLoadingNumbers(false);
    }
  };

  const loadMessages = async (number: string) => {
    setLoadingMessages(true);
    try {
      const html = await fetchHtmlWithFallback(`https://receive-smss.com/sms/${number}/`);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // The messages are usually in a table
      const rows = Array.from(doc.querySelectorAll('table tr'));
      
      const msgs = rows.map((row, index) => {
        const cols = Array.from(row.querySelectorAll('td'));
        if (cols.length >= 3) {
          // Typically: Sender, Time, Message
          return {
            id: `${number}-${index}`,
            sender: cols[0].textContent?.trim() || 'Unknown',
            time: cols[1].textContent?.trim() || 'Unknown',
            text: cols[2].textContent?.trim() || ''
          };
        }
        return null;
      }).filter(Boolean) as SmsMessage[];
      
      if (msgs.length > 0) {
        setMessages(msgs);
      } else {
        setMessages([
          { id: '1', sender: 'System', time: 'Just now', text: 'Waiting for new messages... (Refresh to check again)' }
        ]);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([
        { id: '1', sender: 'System Error', time: 'Just now', text: 'Could not load live messages. The service might be blocking requests or the number is offline.' }
      ]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadNumbers();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (selectedNumber) {
      loadMessages(selectedNumber);
      // Auto-refresh every 15 seconds
      interval = setInterval(() => loadMessages(selectedNumber), 15000);
    }
    return () => clearInterval(interval);
  }, [selectedNumber]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const formatNumber = (num: string) => {
    if (num.startsWith('1')) {
      return `+1 (${num.slice(1, 4)}) ${num.slice(4, 7)}-${num.slice(7)}`;
    } else if (num.startsWith('44')) {
      return `+44 ${num.slice(2, 6)} ${num.slice(6)}`;
    }
    return `+${num}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full relative z-10 bg-white/95 backdrop-blur-2xl overflow-hidden border-white/20 shadow-2xl pt-12 pb-24">
      {/* Toolbar */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-zinc-200 p-4 flex flex-col space-y-3 shadow-sm z-20">
        <div className="flex items-center space-x-3 text-zinc-700">
          <div className="flex items-center space-x-2 flex-1 bg-zinc-100/80 px-4 py-2 rounded-full border border-zinc-200/50">
            {isVpnConnected ? (
              <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
            ) : (
              <Phone className="w-5 h-5 text-indigo-500 shrink-0" />
            )}
            <div className="flex-1 text-sm font-bold truncate">
              Temp SMS Number
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
        {!selectedNumber ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-zinc-800">Select a Temporary Number</h2>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                Choose a free public number to receive SMS online. Use it for OTP verification, registrations, and more.
              </p>
            </div>

            {error && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-start space-x-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button 
                onClick={loadNumbers}
                disabled={loadingNumbers}
                className="flex items-center space-x-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 px-4 py-2 rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 ${loadingNumbers ? 'animate-spin' : ''}`} />
                <span>Refresh List</span>
              </button>
            </div>

            {loadingNumbers && numbers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-zinc-500 font-medium">Fetching available numbers...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {numbers.map((item, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedNumber(item.number)}
                    className="bg-white border border-zinc-200 hover:border-indigo-300 hover:shadow-md transition-all rounded-2xl p-5 text-left group flex flex-col space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-zinc-400" />
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{item.country}</span>
                      </div>
                      <Signal className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-xl font-mono font-bold text-zinc-800 group-hover:text-indigo-600 transition-colors">
                      {formatNumber(item.number)}
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Receive SMS & OTP
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 h-full flex flex-col">
            <button 
              onClick={() => setSelectedNumber(null)}
              className="flex items-center space-x-2 text-zinc-500 hover:text-zinc-800 transition-colors w-fit"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back to Numbers</span>
            </button>

            {/* Number Display */}
            <div className="glass-card p-6 rounded-2xl border border-white/20 shadow-sm text-center space-y-4 bg-gradient-to-b from-indigo-50/50 to-white">
              <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Your Temporary Number</p>
              <div className="flex items-center justify-center space-x-2">
                <div className="bg-white border border-indigo-100 text-indigo-900 font-mono text-xl md:text-2xl px-6 py-4 rounded-xl shadow-sm select-all font-bold">
                  +{selectedNumber}
                </div>
                <button 
                  onClick={() => copyToClipboard(`+${selectedNumber}`)}
                  className="p-4 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-md"
                  title="Copy Number"
                >
                  <Copy className="w-6 h-6" />
                </button>
              </div>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Use this number to receive SMS. Messages will appear below automatically. 
                <span className="text-amber-600 font-medium block mt-1">Warning: This is a public number. Anyone can read these messages.</span>
              </p>
            </div>

            {/* Messages Area */}
            <div className="glass-card rounded-2xl border border-white/20 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[400px]">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-zinc-800">Received Messages</h3>
                </div>
                <button 
                  onClick={() => loadMessages(selectedNumber)}
                  disabled={loadingMessages}
                  className="flex items-center space-x-2 text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-100"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto bg-white p-0">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-3 py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    <p>Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-3 py-12">
                    <MessageSquare className="w-12 h-12 opacity-20" />
                    <p>No messages yet. Waiting for SMS...</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {messages.map((msg, idx) => (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 hover:bg-zinc-50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-zinc-800 text-sm bg-zinc-100 px-2 py-1 rounded-md">{msg.sender}</span>
                          <span className="text-xs text-zinc-500 font-medium">{msg.time}</span>
                        </div>
                        <p className="text-zinc-700 text-sm whitespace-pre-wrap">{msg.text}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
