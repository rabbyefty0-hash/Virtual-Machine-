import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Mic, Square, Loader2, Sparkles, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function VoiceAssistant() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [citations, setCitations] = useState<{uri: string, title: string}[]>([]);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthesisRef.current = window.speechSynthesis;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript.trim()) {
            await handleUserInput(transcript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error !== 'no-speech') {
             stopSession();
          } else {
             // Restart listening if no speech was detected
             if (isConnected && !isSpeaking) {
                 try { recognitionRef.current.start(); } catch(e) {}
             }
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          // Restart listening if connected and not speaking
          if (isConnected && !isSpeaking) {
             try { recognitionRef.current.start(); setIsListening(true); } catch(e) {}
          }
        };
      }
    }
  }, [isConnected, isSpeaking]);

  const handleUserInput = async (text: string) => {
    if (!chatSessionRef.current) return;
    setIsSpeaking(true);
    setIsListening(false);
    setLastResponse(null);
    setCitations([]);
    try {
      const response = await chatSessionRef.current.sendMessage({ message: text });
      setLastResponse(response.text);

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const extractedCitations = chunks.map((c: any) => c.web).filter(Boolean);
        setCitations(extractedCitations);
      }

      speakResponse(response.text);
    } catch (err) {
      console.error("Failed to get response:", err);
      speakResponse("Sorry, I encountered an error.");
      setLastResponse("Sorry, I encountered an error.");
    }
  };

  const speakResponse = (text: string) => {
    if (!synthesisRef.current) return;
    
    synthesisRef.current.cancel(); // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      // Resume listening after speaking
      if (isConnected) {
        try { recognitionRef.current?.start(); setIsListening(true); } catch(e) {}
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      if (isConnected) {
        try { recognitionRef.current?.start(); setIsListening(true); } catch(e) {}
      }
    };

    synthesisRef.current.speak(utterance);
  };


  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key is missing");

      const ai = new GoogleGenAI({ apiKey });
      
      chatSessionRef.current = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are a helpful, concise, and friendly AI assistant, similar to Siri. Keep your answers brief and conversational. You are integrated into a mobile-like web application.",
          tools: [{ googleSearch: {} }]
        }
      });

      setIsConnected(true);
      setIsConnecting(false);
      
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); setIsListening(true); } catch(e) {}
      } else {
        setError("Speech recognition not supported.");
        stopSession();
      }

    } catch (err: any) {
      console.error("Failed to start voice assistant:", err);
      setError(err.message || "Failed to start");
      setIsConnecting(false);
      stopSession();
    }
  };

  const stopSession = () => {
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsListening(false);
    
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
    chatSessionRef.current = null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + Space to toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        if (isConnected || isConnecting) {
          stopSession();
        } else {
          startSession();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnected, isConnecting]);

  return (
    <div className="absolute bottom-28 right-2 z-[100] flex flex-col items-end space-y-4">
      <AnimatePresence>
        {(isConnected || isConnecting) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="bg-zinc-900/90 backdrop-blur-xl text-white rounded-3xl p-4 shadow-2xl border border-white/10 w-64 mr-2"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-medium text-sm">AI Assistant</span>
              </div>
              <button onClick={stopSession} className="text-zinc-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-6">
              {isConnecting ? (
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              ) : (
                <div className="relative">
                  {/* Glowing orb effect */}
                  <motion.div
                    animate={{
                      scale: isSpeaking ? [1, 1.5, 1] : [1, 1.1, 1],
                      opacity: isSpeaking ? [0.5, 0.8, 0.5] : [0.3, 0.5, 0.3],
                    }}
                    transition={{ repeat: Infinity, duration: isSpeaking ? 1 : 2 }}
                    className={`absolute inset-0 rounded-full blur-xl ${isSpeaking ? 'bg-purple-500' : 'bg-emerald-500'}`}
                  />
                  <div className={`relative w-16 h-16 rounded-full flex items-center justify-center bg-zinc-800 border-2 ${isSpeaking ? 'border-purple-500' : 'border-emerald-500'} shadow-lg`}>
                    {isSpeaking ? <Volume2 className="w-8 h-8 text-purple-400" /> : <Mic className="w-8 h-8 text-emerald-400" />}
                  </div>
                </div>
              )}
              <p className="mt-4 text-xs text-zinc-400 font-medium text-center">
                {error ? <span className="text-red-400">{error}</span> : isConnecting ? 'Connecting...' : isSpeaking ? 'Speaking...' : 'Listening...'}
              </p>
            </div>

            {/* Citations/Response Area */}
            {(lastResponse || citations.length > 0) && (
              <div className="mt-2 pt-4 border-t border-white/10 max-h-48 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-white/20">
                {lastResponse && (
                  <p className="text-sm text-zinc-200 mb-3 leading-relaxed">
                    {lastResponse}
                  </p>
                )}
                {citations.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Sources</p>
                    <div className="flex flex-col space-y-1">
                      {citations.map((cite, i) => (
                        <a 
                          key={i} 
                          href={cite.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-purple-400 hover:text-purple-300 truncate transition-colors"
                        >
                          {cite.title || cite.uri}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!(isConnected || isConnecting) && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startSession}
          className="w-14 h-14 bg-[#8b5cf6] text-white rounded-full shadow-[0_0_20px_rgba(139,92,246,0.5)] flex items-center justify-center hover:shadow-[0_0_25px_rgba(139,92,246,0.7)] transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
          title="Start Voice Assistant (Cmd/Ctrl + Shift + Space)"
        >
          <Mic className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
}
