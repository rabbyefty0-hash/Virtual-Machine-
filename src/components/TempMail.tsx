import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, Copy, Trash2, Inbox, ChevronLeft, ShieldCheck } from 'lucide-react';

interface TempMailProps {
  isVpnConnected?: boolean;
}

interface EmailMessage {
  id: number;
  from: string;
  subject: string;
  date: string;
}

interface EmailDetail extends EmailMessage {
  textBody: string;
  htmlBody: string;
}

export function TempMail({ isVpnConnected }: TempMailProps) {
  const [email, setEmail] = useState('');
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EmailDetail | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);

  const fetchWithFallback = async (url: string) => {
    const proxies = [
      '', // Try direct fetch first
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      'https://api.codetabs.com/v1/proxy?quest='
    ];

    let lastError;
    for (const proxy of proxies) {
      try {
        const fetchUrl = proxy ? `${proxy}${encodeURIComponent(url)}` : url;
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  };

  const generateEmail = async () => {
    setLoading(true);
    try {
      const data = await fetchWithFallback('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
      if (data && data.length > 0) {
        setEmail(data[0]);
        setMessages([]);
        setSelectedMessage(null);
      }
    } catch (err) {
      // Fallback to a hardcoded domain if API completely fails
      const randomString = Math.random().toString(36).substring(2, 10);
      setEmail(`${randomString}@1secmail.com`);
      setMessages([]);
      setSelectedMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const [login, domain] = email.split('@');
      const data = await fetchWithFallback(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);
      setMessages(data || []);
    } catch (err) {
      console.warn('Failed to fetch messages. The API or proxies might be blocked.');
    } finally {
      setLoading(false);
    }
  };

  const readMessage = async (id: number) => {
    if (!email) return;
    setLoadingMessage(true);
    try {
      const [login, domain] = email.split('@');
      const data = await fetchWithFallback(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${id}`);
      setSelectedMessage(data);
    } catch (err) {
      console.warn('Failed to read message. The API or proxies might be blocked.');
    } finally {
      setLoadingMessage(false);
    }
  };

  useEffect(() => {
    generateEmail();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (email) {
      interval = setInterval(fetchMessages, 10000);
    }
    return () => clearInterval(interval);
  }, [email]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(email);
    alert('Email copied to clipboard!');
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
              <Mail className="w-5 h-5 text-indigo-500 shrink-0" />
            )}
            <div className="flex-1 text-sm font-bold truncate">
              Native Temp Mail
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Email Address Display */}
        <div className="glass-card p-6 rounded-2xl border border-white/20 shadow-sm text-center space-y-4">
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Your Temporary Email Address</p>
          <div className="flex items-center justify-center space-x-2">
            <div className="bg-zinc-100 border border-zinc-200 text-zinc-800 font-mono text-lg md:text-xl px-6 py-3 rounded-xl select-all">
              {email || 'Generating...'}
            </div>
            <button 
              onClick={copyToClipboard}
              disabled={!email}
              className="p-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50"
              title="Copy"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={generateEmail}
              disabled={loading}
              className="flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-md font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Generate New Email</span>
            </button>
            <button 
              onClick={fetchMessages}
              disabled={loading || !email}
              className="flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl hover:bg-zinc-200 transition-colors font-medium disabled:opacity-50"
            >
              <Inbox className="w-5 h-5" />
              <span>Refresh Inbox</span>
            </button>
          </div>
        </div>

        {/* Inbox Area */}
        <div className="glass-card rounded-2xl border border-white/20 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center space-x-3">
                <button 
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-zinc-600" />
                </button>
                <div className="flex-1">
                  <h3 className="font-bold text-zinc-900">{selectedMessage.subject || 'No Subject'}</h3>
                  <p className="text-sm text-zinc-500">From: {selectedMessage.from}</p>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-white">
                {selectedMessage.htmlBody ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedMessage.htmlBody }} className="prose max-w-none" />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-zinc-800">{selectedMessage.textBody}</pre>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center space-x-2">
                <Inbox className="w-5 h-5 text-zinc-500" />
                <h3 className="font-bold text-zinc-800">Inbox ({messages.length})</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-3 py-12">
                    <Inbox className="w-12 h-12 opacity-20" />
                    <p>Waiting for incoming emails...</p>
                    <p className="text-xs">Auto-refreshes every 10 seconds</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {messages.map(msg => (
                      <button 
                        key={msg.id}
                        onClick={() => readMessage(msg.id)}
                        className="w-full text-left p-4 hover:bg-zinc-50 transition-colors flex flex-col space-y-1"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-zinc-900 truncate pr-4">{msg.from}</span>
                          <span className="text-xs text-zinc-500 whitespace-nowrap">{new Date(msg.date).toLocaleTimeString()}</span>
                        </div>
                        <span className="text-sm text-zinc-600 truncate">{msg.subject || '(No Subject)'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
