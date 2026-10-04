import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Loader2, Volume2, StopCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceChatProps {
  isVpnConnected?: boolean;
}

export function VoiceChat({ isVpnConnected }: VoiceChatProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const lastSpokenRef = useRef<string>('');

  useEffect(() => {
    if (!autoSpeak) return;
    
    const lastMessage = transcript[transcript.length - 1];
    if (lastMessage?.role === 'model' && lastMessage.text !== lastSpokenRef.current) {
      const timer = setTimeout(() => {
        speakText(lastMessage.text, transcript.length - 1);
        lastSpokenRef.current = lastMessage.text;
      }, 1500); // Wait for 1.5s of silence before speaking
      return () => clearTimeout(timer);
    }
  }, [transcript, autoSpeak]);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const sessionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const speakText = (text: string, index: number) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(index);
      utterance.onend = () => setIsSpeaking(null);
      utterance.onerror = () => setIsSpeaking(null);
      
      const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || 
                             voices.find(v => v.lang.startsWith('en'));
      if (preferredVoice) utterance.voice = preferredVoice;
      
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const connect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API Key is missing in the environment.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
      if (playbackCtxRef.current.state === 'suspended') {
        await playbackCtxRef.current.resume();
      }
      nextPlayTimeRef.current = playbackCtxRef.current.currentTime;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          systemInstruction: "You are ꧁Rᴀʙʙʏ Eғᴛʏ꧂, a helpful and friendly AI assistant. You are part of the ꧁Rᴀʙʙʏ Eғᴛʏ꧂ suite of tools. Keep your responses concise and conversational. Always identify yourself as ꧁Rᴀʙʙʏ Eғᴛʏ꧂ if asked.",
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
              streamRef.current = stream;
              audioCtxRef.current = new AudioContext({ sampleRate: 16000 });
              if (audioCtxRef.current.state === 'suspended') {
                await audioCtxRef.current.resume();
              }
              const source = audioCtxRef.current.createMediaStreamSource(stream);
              const processor = audioCtxRef.current.createScriptProcessor(4096, 1, 1);
              
              const session = await sessionPromise;
              
              processor.onaudioprocess = (e) => {
                const channelData = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(channelData.length);
                for (let i = 0; i < channelData.length; i++) {
                  pcm16[i] = Math.max(-1, Math.min(1, channelData[i])) * 0x7FFF;
                }
                const buffer = new Uint8Array(pcm16.buffer);
                let binary = '';
                for (let i = 0; i < buffer.byteLength; i++) {
                  binary += String.fromCharCode(buffer[i]);
                }
                const base64 = btoa(binary);
                session.sendRealtimeInput({ audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
              };
              
              source.connect(processor);
              processor.connect(audioCtxRef.current.destination);
              processorRef.current = processor;
              
              setIsConnected(true);
              setIsConnecting(false);
            } catch (err) {
              console.error("Mic error:", err);
              setError("Could not access microphone.");
              disconnect();
            }
          },
          onmessage: (message: LiveServerMessage) => {
            const msg = message as any;
            
            // Handle Audio Playback
            const parts = msg.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              const base64Audio = part.inlineData?.data;
              if (base64Audio && playbackCtxRef.current) {
                const binary = atob(base64Audio);
                const buffer = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                  buffer[i] = binary.charCodeAt(i);
                }
                const pcm16 = new Int16Array(buffer.buffer);
                const float32 = new Float32Array(pcm16.length);
                for (let i = 0; i < pcm16.length; i++) {
                  float32[i] = pcm16[i] / 0x7FFF;
                }
                const audioBuffer = playbackCtxRef.current.createBuffer(1, float32.length, 24000);
                audioBuffer.getChannelData(0).set(float32);
                const source = playbackCtxRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(playbackCtxRef.current.destination);

                const currentTime = playbackCtxRef.current.currentTime;
                if (nextPlayTimeRef.current < currentTime) {
                  nextPlayTimeRef.current = currentTime;
                }
                source.start(nextPlayTimeRef.current);
                nextPlayTimeRef.current += audioBuffer.duration;
                
                source.onended = () => {
                  activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
                };
                activeSourcesRef.current.push(source);
              }
            }
            
            if (msg.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) {}
              });
              activeSourcesRef.current = [];
              if (playbackCtxRef.current) {
                nextPlayTimeRef.current = playbackCtxRef.current.currentTime;
              }
            }

            // Handle Transcriptions
            if (msg.serverContent?.modelTurn?.parts) {
              const textPart = msg.serverContent.modelTurn.parts.find((p: any) => p.text);
              if (textPart?.text) {
                setTranscript(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'model') {
                    const newText = last.text + textPart.text;
                    // If autoSpeak is on and we have a complete sentence or it's the end
                    // This is tricky with streaming, so we'll just speak the whole thing when it's done
                    // But for now, let's just update the text.
                    return [...prev.slice(0, -1), { ...last, text: newText }];
                  }
                  return [...prev, { role: 'model', text: textPart.text }];
                });
              }
            }

            // The SDK might use inputTranscription/outputTranscription directly or under serverContent
            const inputTranscription = msg.inputTranscription || msg.serverContent?.inputTranscription;
            if (inputTranscription?.text) {
              setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + inputTranscription.text }];
                }
                return [...prev, { role: 'user', text: inputTranscription.text }];
              });
            }

            const outputTranscription = msg.outputTranscription || msg.serverContent?.outputTranscription;
            if (outputTranscription?.text) {
              setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'model') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + outputTranscription.text }];
                }
                return [...prev, { role: 'model', text: outputTranscription.text }];
              });
            }
          },
          onclose: () => {
            disconnect();
          }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message || '';
      const errorString = typeof err === 'object' ? JSON.stringify(err) : String(err);
      
      setError(errorMessage || errorString || "Failed to connect to voice chat.");
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setTranscript([]);
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(console.error);
    }
    audioCtxRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (playbackCtxRef.current && playbackCtxRef.current.state !== 'closed') {
      playbackCtxRef.current.close().catch(console.error);
    }
    playbackCtxRef.current = null;
    if (sessionRef.current) {
      sessionRef.current.then((s: any) => s.close()).catch(console.error);
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden">
      {/* Header */}
      <div className="p-4 pt-10 flex items-center justify-between z-10 glass-panel border-b border-white/5 sticky top-0">
        <div className="flex items-center space-x-2">
          <Mic className="w-5 h-5 text-pink-400" />
          <h1 className="text-lg font-semibold tracking-tight">꧁Rᴀʙʙʏ Eғᴛʏ꧂ Voice</h1>
          {isVpnConnected && (
            <div className="flex items-center space-x-1.5 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-green-400">Secure</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-safe relative z-10 flex flex-col items-center justify-center custom-scrollbar">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <p className="text-white/60 text-[15px]">Have a real-time conversation with ꧁Rᴀʙʙʏ Eғᴛʏ꧂.</p>
          </div>

          <div className="relative flex items-center justify-center py-8">
          {isConnected && (
            <>
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-48 h-48 bg-indigo-500 rounded-full blur-2xl"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                className="absolute w-40 h-40 bg-purple-500 rounded-full blur-xl"
              />
            </>
          )}

          <button
            onClick={isConnected ? disconnect : connect}
            disabled={isConnecting}
            className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 liquid-glass ${
              isConnected 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
            } ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
          >
            {isConnecting ? (
              <Loader2 className="w-12 h-12 animate-spin" />
            ) : isConnected ? (
              <MicOff className="w-12 h-12" />
            ) : (
              <Mic className="w-12 h-12" />
            )}
          </button>
        </div>

        <div className={`glass-card liquid-glass p-6 rounded-3xl inline-block mx-auto border shadow-lg transition-all duration-500 ${isVpnConnected ? 'border-green-500/30 ring-1 ring-green-500/20' : 'border-white/10'}`}>
          <div className="text-white/90 font-medium flex flex-col items-center justify-center space-y-2">
            {isVpnConnected && (
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">VPN Secure Connection</span>
            )}
            <div className="flex items-center space-x-2">
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Connecting...</span>
                </>
              ) : isConnected ? (
                <>
                  <Volume2 className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <span>Listening... Speak now.</span>
                </>
              ) : (
                <span>Tap the microphone to start</span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-2xl text-center backdrop-blur-md">
            {error}
          </div>
        )}

        {/* Transcript Display */}
        <AnimatePresence>
          {transcript.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full glass-card liquid-glass rounded-3xl border border-white/10 overflow-hidden"
            >
              <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center space-x-4">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Live Transcript</span>
                  <button 
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-full border transition-all ${autoSpeak ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-white/30'}`}
                  >
                    <Volume2 className={`w-3 h-3 ${autoSpeak ? 'animate-pulse' : ''}`} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Auto-Speak</span>
                  </button>
                </div>
                <button 
                  onClick={() => setTranscript([])}
                  className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-4 p-4 text-left custom-scrollbar">
                {transcript.map((item, i) => (
                  <div key={i} className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                      {item.role === 'user' ? 'You' : '꧁Rᴀʙʙʏ Eғᴛʏ꧂'}
                    </span>
                    <div className={`p-3 rounded-2xl text-sm relative group ${
                      item.role === 'user' 
                        ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30' 
                        : 'bg-white/5 text-white/90 border border-white/10'
                    }`}>
                      {item.text}
                      
                      {/* Speak Button */}
                      <button
                        onClick={() => isSpeaking === i ? ('speechSynthesis' in window && window.speechSynthesis.cancel()) : speakText(item.text, i)}
                        className={`absolute -bottom-2 ${item.role === 'user' ? '-left-2' : '-right-2'} p-1.5 rounded-full bg-zinc-800 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 shadow-lg z-10`}
                        title={isSpeaking === i ? "Stop speaking" : "Speak response"}
                      >
                        {isSpeaking === i ? (
                          <StopCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
