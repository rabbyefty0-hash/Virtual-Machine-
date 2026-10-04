import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, Video, MessageCircle, Send, Search, MoreVertical, 
  PhoneCall, PhoneOff, Mic, MicOff, VideoOff, Camera, 
  ArrowLeft, Check, CheckCheck, UserCircle2, ShieldCheck, Sparkles
} from 'lucide-react';
import { auth, db, signInWithPhoneMock } from '../firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, doc, setDoc, getDocs 
} from 'firebase/firestore';
import Peer, { MediaConnection } from 'peerjs';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

declare global {
  interface Window {
    recaptchaVerifier: any;
    grecaptcha: any;
  }
}

// Types
interface Contact {
  uid: string;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: any;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
}

interface WhatsAppProps {
  onBack?: () => void;
}

export function WhatsApp({ onBack }: WhatsAppProps) {
  // Auth State
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [authStep, setAuthStep] = useState<'phone' | 'otp' | 'authenticated'>(user ? 'authenticated' : 'phone');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Chat State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeChat, setActiveChat] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Call State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'receiving' | 'connected'>('idle');
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
  const [currentCall, setCurrentCall] = useState<MediaConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // AI Call State
  const [isAiCall, setIsAiCall] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // --- Auth Flow ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthStep('authenticated');
        // Save user to Firestore
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            phoneNumber: currentUser.phoneNumber || '',
            displayName: currentUser.displayName || currentUser.phoneNumber || 'Unknown User',
            photoURL: currentUser.photoURL || '',
            isOnline: true,
            lastSeen: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error("Error saving user:", e);
        }
      } else {
        setAuthStep('phone');
      }
    });
    return () => unsubscribe();
  }, []);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        }
      });
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    try {
      setupRecaptcha();
      const formattedPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setAuthStep('otp');
      setOtp(''); // Clear the default mock OTP
    } catch (error: any) {
      console.error(error);
      setAuthError(error.message || 'Failed to send OTP.');
      // Reset recaptcha if error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then((widgetId: any) => {
          window.grecaptcha?.reset(widgetId);
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(otp);
      } else {
        // Fallback to mock if for some reason confirmationResult is missing (shouldn't happen in real flow)
        const formattedPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
        await signInWithPhoneMock(formattedPhone);
      }
      // Auth state observer will handle the rest
    } catch (error: any) {
      console.error(error);
      setAuthError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  // --- Chat Flow ---
  useEffect(() => {
    if (!user) return;

    // Fetch contacts (all users for demo purposes, including self)
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: Contact[] = [];
      
      // Add AI Bot
      usersData.push({
        uid: 'ai_bot',
        displayName: 'WhatsApp AI Assistant',
        phoneNumber: 'AI Bot',
        isOnline: true,
        photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=whatsapp'
      });

      snapshot.forEach((doc) => {
        usersData.push(doc.data() as Contact);
      });
      setContacts(usersData);
    }, (error) => {
      console.error("Error fetching contacts:", error);
      // Fallback if rules fail
      setAuthError("Could not load contacts. Please check Firebase rules.");
    });

    return () => unsubscribe();
  }, [user]);

  const getChatId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  useEffect(() => {
    if (!user || !activeChat) return;

    const chatId = getChatId(user.uid, activeChat.uid);
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      
      // Generate smart replies if the last message is from the other person
      if (msgs.length > 0) {
        const lastMessage = msgs[msgs.length - 1];
        if (lastMessage.senderId !== user.uid) {
          generateSmartReplies(lastMessage.text);
        } else {
          setSmartReplies([]);
        }
      }

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [user, activeChat]);

  const generateSmartReplies = async (text: string) => {
    if (!process.env.GEMINI_API_KEY) {
      // Fallback if no API key
      setSmartReplies(['Ok', 'Thanks!', 'Sounds good.']);
      return;
    }

    setIsGeneratingReplies(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate 3 short, conversational replies to this message: "${text}". Return ONLY a JSON array of 3 strings. Do not include markdown formatting or any other text.`,
      });
      
      const replyText = response.text || '[]';
      try {
        // Strip markdown if present
        const cleanedText = replyText.replace(/```json/g, '').replace(/```/g, '').trim();
        const replies = JSON.parse(cleanedText);
        if (Array.isArray(replies) && replies.length > 0) {
          setSmartReplies(replies.slice(0, 3));
        }
      } catch (e) {
        console.error("Failed to parse smart replies:", e);
        setSmartReplies(['Ok', 'Thanks!', 'Sounds good.']);
      }
    } catch (error) {
      console.error("Error generating smart replies:", error);
      setSmartReplies(['Ok', 'Thanks!', 'Sounds good.']);
    } finally {
      setIsGeneratingReplies(false);
    }
  };

  const generateBotReply = async (text: string, chatId: string) => {
    if (!process.env.GEMINI_API_KEY) return;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a helpful WhatsApp AI assistant. Keep your replies concise and friendly, like a chat message. The user says: "${text}"`,
      });
      
      if (response.text) {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        await addDoc(messagesRef, {
          text: response.text,
          senderId: 'ai_bot',
          timestamp: serverTimestamp()
        });
        
        await setDoc(doc(db, 'chats', chatId), {
          participants: [user!.uid, 'ai_bot'],
          lastMessage: response.text,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error generating bot reply:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeChat) return;

    const chatId = getChatId(user.uid, activeChat.uid);
    const messagesRef = collection(db, 'chats', chatId, 'messages');

    const messageText = newMessage;
    setNewMessage('');

    try {
      await addDoc(messagesRef, {
        text: messageText,
        senderId: user.uid,
        timestamp: serverTimestamp()
      });
      
      // Update last message in chat doc
      await setDoc(doc(db, 'chats', chatId), {
        participants: [user.uid, activeChat.uid],
        lastMessage: messageText,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // If chatting with AI bot, generate reply
      if (activeChat.uid === 'ai_bot') {
        generateBotReply(messageText, chatId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // --- Call Flow (PeerJS) ---
  useEffect(() => {
    if (!user) return;

    // Initialize PeerJS with Firebase UID
    const newPeer = new Peer(user.uid, {
      debug: 2
    });

    newPeer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
    });

    newPeer.on('call', (call) => {
      console.log('Incoming call...', call);
      setIncomingCall(call);
      setCallState('receiving');
      // Check if it's video or audio based on metadata (we'll pass it when calling)
      setIsVideoCall(call.metadata?.video || false);
    });

    newPeer.on('error', (err) => {
      console.error('PeerJS error:', err);
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, [user]);

  const startAiCall = async () => {
    setIsAiCall(true);
    setCallState('calling');
    setIsVideoCall(false);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API Key is missing.');
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
          systemInstruction: "You are WhatsApp AI Assistant. Keep your responses concise and conversational.",
        },
        callbacks: {
          onopen: async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
              streamRef.current = stream;
              setLocalStream(stream);
              
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
              
              setCallState('connected');
            } catch (err) {
              console.error("Mic error:", err);
              endAiCall();
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) {}
              });
              activeSourcesRef.current = [];
              if (playbackCtxRef.current) {
                nextPlayTimeRef.current = playbackCtxRef.current.currentTime;
              }
            }
            
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && playbackCtxRef.current) {
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              const audioBuffer = playbackCtxRef.current.createBuffer(1, bytes.length / 2, 24000);
              const channelData = audioBuffer.getChannelData(0);
              const dataView = new DataView(bytes.buffer);
              for (let i = 0; i < channelData.length; i++) {
                channelData[i] = dataView.getInt16(i * 2, true) / 0x8000;
              }
              
              const source = playbackCtxRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(playbackCtxRef.current.destination);
              
              const currentTime = playbackCtxRef.current.currentTime;
              const playTime = Math.max(currentTime, nextPlayTimeRef.current);
              source.start(playTime);
              
              nextPlayTimeRef.current = playTime + audioBuffer.duration;
              activeSourcesRef.current.push(source);
              
              source.onended = () => {
                activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
              };
            }
          },
          onclose: () => {
            endAiCall();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            endAiCall();
          }
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start AI call:", err);
      endAiCall();
    }
  };

  const endAiCall = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close();
      playbackCtxRef.current = null;
    }
    activeSourcesRef.current = [];
    setIsAiCall(false);
    setCallState('idle');
    setIsMuted(false);
    setLocalStream(null);
  };

  const startCall = async (video: boolean) => {
    if (!activeChat || !user) return;
    
    if (activeChat.uid === 'ai_bot') {
      startAiCall();
      return;
    }

    if (!peer) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      setLocalStream(stream);
      setIsVideoCall(video);
      setCallState('calling');

      const call = peer.call(activeChat.uid, stream, {
        metadata: { video }
      });

      setupCallEvents(call, stream);
    } catch (err) {
      console.error('Failed to get local stream', err);
      alert('Could not access camera/microphone');
    }
  };

  const answerCall = async () => {
    if (!incomingCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: isVideoCall, 
        audio: true 
      });
      setLocalStream(stream);
      setCallState('connected');
      
      incomingCall.answer(stream);
      setupCallEvents(incomingCall, stream);
    } catch (err) {
      console.error('Failed to get local stream', err);
      alert('Could not access camera/microphone');
      endCall();
    }
  };

  const setupCallEvents = (call: MediaConnection, localStr: MediaStream) => {
    setCurrentCall(call);

    call.on('stream', (remoteStr) => {
      setRemoteStream(remoteStr);
      setCallState('connected');
    });

    call.on('close', () => {
      endCallCleanup(localStr);
    });

    call.on('error', (err) => {
      console.error('Call error:', err);
      endCallCleanup(localStr);
    });
  };

  const endCall = () => {
    if (isAiCall) {
      endAiCall();
      return;
    }
    if (currentCall) {
      currentCall.close();
    }
    if (incomingCall) {
      incomingCall.close();
    }
    endCallCleanup(localStream);
  };

  const endCallCleanup = (stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCurrentCall(null);
    setIncomingCall(null);
    setCallState('idle');
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
      });
    }
    if (streamRef.current && streamRef.current !== localStream) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
      });
    }
    setIsMuted(newMutedState);
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  // --- Renderers ---

  if (authStep !== 'authenticated') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black/40 backdrop-blur-xl rounded-3xl p-6 text-white relative">
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute top-6 left-6 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.5)]">
          <MessageCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Welcome to WhatsApp</h2>
        <p className="text-white/60 text-center mb-8 max-w-xs">
          Sign in with your phone number to start messaging and calling friends.
        </p>

        {authError && (
          <div className="bg-red-500/20 text-red-200 p-3 rounded-xl mb-6 text-sm text-center max-w-xs border border-red-500/30">
            {authError}
          </div>
        )}

        {authStep === 'phone' ? (
          <form onSubmit={handleSendOtp} className="w-full max-w-xs space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-xl px-2 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 w-[100px]"
                >
                  <option value="+1" className="text-black">🇺🇸 +1</option>
                  <option value="+44" className="text-black">🇬🇧 +44</option>
                  <option value="+91" className="text-black">🇮🇳 +91</option>
                  <option value="+61" className="text-black">🇦🇺 +61</option>
                  <option value="+49" className="text-black">🇩🇪 +49</option>
                  <option value="+33" className="text-black">🇫🇷 +33</option>
                  <option value="+81" className="text-black">🇯🇵 +81</option>
                  <option value="+86" className="text-black">🇨🇳 +86</option>
                  <option value="+55" className="text-black">🇧🇷 +55</option>
                  <option value="+52" className="text-black">🇲🇽 +52</option>
                  <option value="+7" className="text-black">🇷🇺 +7</option>
                  <option value="+27" className="text-black">🇿🇦 +27</option>
                  <option value="+82" className="text-black">🇰🇷 +82</option>
                  <option value="+34" className="text-black">🇪🇸 +34</option>
                  <option value="+39" className="text-black">🇮🇹 +39</option>
                  <option value="+31" className="text-black">🇳🇱 +31</option>
                  <option value="+46" className="text-black">🇸🇪 +46</option>
                  <option value="+41" className="text-black">🇨🇭 +41</option>
                  <option value="+65" className="text-black">🇸🇬 +65</option>
                  <option value="+971" className="text-black">🇦🇪 +971</option>
                  <option value="+966" className="text-black">🇸🇦 +966</option>
                  <option value="+62" className="text-black">🇮🇩 +62</option>
                  <option value="+60" className="text-black">🇲🇾 +60</option>
                  <option value="+63" className="text-black">🇵🇭 +63</option>
                  <option value="+66" className="text-black">🇹🇭 +66</option>
                  <option value="+84" className="text-black">🇻🇳 +84</option>
                  <option value="+92" className="text-black">🇵🇰 +92</option>
                  <option value="+880" className="text-black">🇧🇩 +880</option>
                  <option value="+234" className="text-black">🇳🇬 +234</option>
                  <option value="+20" className="text-black">🇪🇬 +20</option>
                </select>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !phoneNumber}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Next'}
            </button>
            <div id="recaptcha-container"></div>
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-white/40 text-sm">OR</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-black hover:bg-gray-100 font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="w-full max-w-xs space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">Enter 6-digit code</label>
              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500 text-center tracking-[0.5em] font-mono text-lg"
                required
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => setAuthStep('phone')}
              className="w-full text-white/60 hover:text-white text-sm py-2"
            >
              Back to phone number
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#111b21] rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
      
      {/* Call Overlay */}
      <AnimatePresence>
        {callState !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-50 bg-[#0b141a] flex flex-col"
          >
            {/* Video Area */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
              {isVideoCall ? (
                <>
                  {/* Remote Video (Full Screen) */}
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className={`w-full h-full object-cover ${callState !== 'connected' ? 'hidden' : ''}`}
                  />
                  
                  {/* Local Video (PiP) */}
                  <div className="absolute bottom-6 right-6 w-32 h-48 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 z-10">
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse overflow-hidden">
                    {activeChat?.photoURL ? (
                      <img src={activeChat.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle2 className="w-16 h-16 text-green-500" />
                    )}
                  </div>
                  <h2 className="text-3xl text-white font-medium mb-2">
                    {activeChat?.displayName || activeChat?.phoneNumber || 'Unknown'}
                  </h2>
                  <p className="text-white/60 text-lg">
                    {callState === 'calling' ? 'Calling...' : 
                     callState === 'receiving' ? 'Incoming audio call...' : 
                     isAiCall ? 'Listening...' : '00:00'}
                  </p>
                </div>
              )}

              {/* Receiving Call Overlay */}
              {callState === 'receiving' && isVideoCall && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <Video className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-2xl text-white font-medium mb-1">
                    {incomingCall?.peer || 'Someone'}
                  </h2>
                  <p className="text-white/80 mb-8">Incoming video call...</p>
                </div>
              )}
            </div>

            {/* Call Controls */}
            <div className="h-24 bg-[#1f2c34] flex items-center justify-center gap-8 px-6">
              {callState === 'receiving' ? (
                <>
                  <button 
                    onClick={endCall}
                    className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <PhoneOff className="w-6 h-6 text-white" />
                  </button>
                  <button 
                    onClick={answerCall}
                    className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg animate-bounce"
                  >
                    <Phone className="w-6 h-6 text-white" />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  
                  {isVideoCall && (
                    <button 
                      onClick={toggleVideo}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                    >
                      {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                    </button>
                  )}

                  <button 
                    onClick={endCall}
                    className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <PhoneOff className="w-6 h-6 text-white" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar (Contacts) */}
      <div className={`w-full md:w-1/3 border-r border-white/10 flex flex-col bg-[#111b21] ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="h-24 bg-[#202c33] flex items-center justify-between px-4 flex-shrink-0 pt-12">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="text-[#aebac1] hover:text-white transition-colors mr-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 bg-gray-600 rounded-full overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-full h-full text-gray-300" />
              )}
            </div>
            <span className="text-white font-medium truncate max-w-[120px]">
              {user?.displayName || user?.phoneNumber || 'Me'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[#aebac1]">
            <MessageCircle className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
            <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>

        {/* Search */}
        <div className="p-2 bg-[#111b21]">
          <div className="bg-[#202c33] rounded-lg flex items-center px-4 py-2">
            <Search className="w-4 h-4 text-[#aebac1] mr-3" />
            <input 
              type="text" 
              placeholder="Search or start new chat" 
              className="bg-transparent border-none text-white text-sm w-full focus:outline-none placeholder:text-[#aebac1]"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#aebac1] p-6 text-center">
              <p>No contacts found.</p>
              <p className="text-sm mt-2">Other users who sign in will appear here.</p>
            </div>
          ) : (
            contacts.map(contact => (
              <div 
                key={contact.uid}
                onClick={() => setActiveChat(contact)}
                className={`flex items-center px-4 py-3 cursor-pointer hover:bg-[#202c33] transition-colors ${activeChat?.uid === contact.uid ? 'bg-[#2a3942]' : ''}`}
              >
                <div className="w-12 h-12 bg-gray-600 rounded-full overflow-hidden mr-4 flex-shrink-0">
                  {contact.photoURL ? (
                    <img src={contact.photoURL} alt={contact.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-full h-full text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0 border-b border-white/5 pb-3">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-white text-base truncate">
                      {contact.uid === user?.uid ? `${contact.displayName || contact.phoneNumber || 'Unknown'} (You)` : (contact.displayName || contact.phoneNumber || 'Unknown')}
                    </h3>
                    <span className="text-xs text-[#aebac1]">
                      {contact.isOnline ? 'Online' : ''}
                    </span>
                  </div>
                  <p className="text-sm text-[#aebac1] truncate">
                    {contact.uid === user?.uid ? 'Message yourself' : 'Tap to chat'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#0b141a] relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Chat Background Pattern */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'url("https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_DcbOglki.png")' }}></div>

        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-24 bg-[#202c33] flex items-center justify-between px-4 z-10 pt-12">
              <div className="flex items-center gap-3">
                <button 
                  className="md:hidden text-[#aebac1] hover:text-white mr-1"
                  onClick={() => setActiveChat(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-gray-600 rounded-full overflow-hidden">
                  {activeChat.photoURL ? (
                    <img src={activeChat.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-full h-full text-gray-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-white font-medium">{activeChat.displayName || activeChat.phoneNumber || 'Unknown'}</h3>
                  <p className="text-xs text-[#aebac1]">{activeChat.isOnline ? 'Online' : 'Offline'}</p>
                </div>
              </div>
              <div className="flex items-center gap-5 text-[#aebac1]">
                <button onClick={() => startCall(true)} className="hover:text-white transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button onClick={() => startCall(false)} className="hover:text-white transition-colors">
                  <PhoneCall className="w-5 h-5" />
                </button>
                <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10 custom-scrollbar flex flex-col gap-2">
              {messages.map((msg, index) => {
                const isMe = msg.senderId === user?.uid;
                const showTail = index === 0 || messages[index - 1].senderId !== msg.senderId;
                
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${showTail ? 'mt-2' : ''}`}>
                    <div 
                      className={`relative max-w-[85%] md:max-w-[65%] px-3 py-2 text-sm shadow-sm ${
                        isMe 
                          ? 'bg-[#005c4b] text-[#e9edef] rounded-l-lg rounded-br-lg' 
                          : 'bg-[#202c33] text-[#e9edef] rounded-r-lg rounded-bl-lg'
                      } ${showTail && isMe ? 'rounded-tr-none' : ''} ${showTail && !isMe ? 'rounded-tl-none' : ''}`}
                    >
                      {/* Tail SVG (Simplified) */}
                      {showTail && (
                        <div className={`absolute top-0 w-2 h-3 ${isMe ? '-right-2 text-[#005c4b]' : '-left-2 text-[#202c33]'}`}>
                          <svg viewBox="0 0 8 13" width="8" height="13" className="fill-current">
                            {isMe ? (
                              <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
                            ) : (
                              <path d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z" />
                            )}
                          </svg>
                        </div>
                      )}
                      
                      <span className="break-words">{msg.text}</span>
                      
                      <div className="flex items-center justify-end gap-1 mt-1 float-right ml-3">
                        <span className="text-[10px] text-white/60">
                          {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                        {isMe && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Smart Replies */}
              {smartReplies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 justify-end">
                  {smartReplies.map((reply, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => {
                        setNewMessage(reply);
                        // Optional: auto-send
                        // handleSendMessage(new Event('submit') as any);
                      }}
                      className="bg-[#202c33] border border-[#2a3942] text-[#00a884] px-4 py-1.5 rounded-full text-sm font-medium hover:bg-[#2a3942] transition-colors shadow-sm flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      {reply}
                    </motion.button>
                  ))}
                </div>
              )}
              {isGeneratingReplies && (
                <div className="flex justify-end mt-2">
                  <div className="bg-[#202c33] px-4 py-2 rounded-full flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-[#00a884] animate-pulse" />
                    <span className="text-xs text-[#aebac1]">AI is thinking...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-[#202c33] flex items-center px-4 py-3 pb-6 gap-3 z-10">
              <button className="text-[#aebac1] hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path></svg>
              </button>
              <form onSubmit={handleSendMessage} className="flex-1 flex items-center bg-[#2a3942] rounded-lg px-4 py-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message" 
                  className="bg-transparent border-none text-white text-sm w-full focus:outline-none"
                />
              </form>
              {newMessage.trim() ? (
                <button onClick={handleSendMessage} className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center text-white hover:bg-[#008f6f] transition-colors">
                  <Send className="w-5 h-5 ml-1" />
                </button>
              ) : (
                <button className="text-[#aebac1] hover:text-white transition-colors">
                  <Mic className="w-6 h-6" />
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
            <div className="w-80 h-80 mb-8 opacity-50">
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#aebac1] fill-current">
                <path d="M50 0C22.4 0 0 22.4 0 50c0 10.8 3.4 20.8 9.2 29L4 96l17.7-5.1C29.6 96.6 39.5 100 50 100c27.6 0 50-22.4 50-50S77.6 0 50 0zm25.5 71.4c-1.1 3.1-6.4 6-8.9 6.3-2.3.3-5.3.8-17.2-4.1-14.3-5.9-23.7-20.6-24.4-21.6-.7-1-5.8-7.8-5.8-14.9s3.7-10.6 5-12.1c1.3-1.5 2.8-1.9 3.7-1.9s1.9 0 2.7.1c.9.1 2.1-.3 3.2 2.4 1.2 2.9 3.9 9.5 4.3 10.4.4.9.6 1.9.1 3-.5 1.1-.7 1.7-1.5 2.6-.8.9-1.6 2-2.3 2.8-.8.8-1.7 1.7-.7 3.4 1 1.7 4.4 7.2 9.4 11.7 6.4 5.8 11.8 7.6 13.5 8.4 1.7.8 2.7.7 3.7-.4 1-1.1 4.3-5 5.4-6.7 1.1-1.7 2.2-1.4 3.7-.9 1.5.5 9.5 4.5 11.1 5.3 1.6.8 2.7 1.2 3.1 1.9.5.7.5 4.1-.6 7.2z" />
              </svg>
            </div>
            <h1 className="text-3xl text-[#e9edef] font-light mb-4">WhatsApp for Web</h1>
            <p className="text-[#8696a0] max-w-md">Send and receive messages without keeping your phone online. Use WhatsApp on up to 4 linked devices and 1 phone at the same time.</p>
            <div className="mt-10 flex items-center gap-2 text-[#8696a0] text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>End-to-end encrypted</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
