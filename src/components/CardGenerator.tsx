import React, { useState } from 'react';
import { CreditCard, Copy, RefreshCw, ShieldCheck, AlertCircle, Check, Lock, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CardInfo {
  id: string;
  number: string;
  type: string;
  expiry: string;
  cvv: string;
  name: string;
}

const CARD_TYPES = [
  { id: 'visa', name: 'Visa', prefix: '4', length: 16 },
  { id: 'mastercard', name: 'Mastercard', prefix: '5', length: 16 },
  { id: 'amex', name: 'American Express', prefix: '37', length: 15 },
  { id: 'discover', name: 'Discover', prefix: '6011', length: 16 },
];

const NAMES = [
  '꧁Rᴀʙʙʏ Eғᴛʏ꧂', 'JOHN DOE', 'JANE SMITH', 'ALEX JOHNSON', 'SAM WILSON'
];

export function CardGenerator({ isVpnConnected }: { isVpnConnected?: boolean }) {
  const [generatedCards, setGeneratedCards] = useState<CardInfo[]>([]);
  const [selectedType, setSelectedType] = useState('visa');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedState, setCopiedState] = useState<{ index: number, field: string } | null>(null);

  // 3D Secure State
  const [show3DS, setShow3DS] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'success' | 'failure' | null>(null);
  const [currentCard, setCurrentCard] = useState<CardInfo | null>(null);

  const generateLuhn = (number: string) => {
    let sum = 0;
    let shouldDouble = true;
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number.charAt(i));
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return (10 - (sum % 10)) % 10;
  };

  const generateCard = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const type = CARD_TYPES.find(t => t.id === selectedType)!;
      let number = type.prefix;
      while (number.length < type.length - 1) {
        number += Math.floor(Math.random() * 10);
      }
      number += generateLuhn(number);

      const month = Math.floor(Math.random() * 12) + 1;
      const year = new Date().getFullYear() + Math.floor(Math.random() * 5) + 1;
      const expiry = `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
      const cvv = Math.floor(Math.random() * (type.id === 'amex' ? 9000 : 900)) + (type.id === 'amex' ? 1000 : 100);
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];

      const newCard: CardInfo = {
        id: Math.random().toString(36).substring(2, 9),
        number: type.id === 'amex' 
          ? number.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3')
          : number.match(/.{1,4}/g)?.join(' ') || number,
        type: type.name,
        expiry,
        cvv: cvv.toString(),
        name
      };

      setGeneratedCards(prev => [newCard, ...prev].slice(0, 5));
      setIsGenerating(false);
      
      // Trigger 3D Secure verification flow
      setCurrentCard(newCard);
      setShow3DS(true);
      setVerificationCode('');
      setVerificationResult(null);
    }, 800);
  };

  const handleVerify3DS = () => {
    if (!verificationCode) return;
    
    setIsVerifying(true);
    setVerificationResult(null);
    
    setTimeout(() => {
      setIsVerifying(false);
      // Simulate success if code is '123456', else random success/failure
      if (verificationCode === '123456') {
        setVerificationResult('success');
      } else {
        setVerificationResult(Math.random() > 0.5 ? 'success' : 'failure');
      }
      
      // Auto-close on success after a delay
      if (verificationCode === '123456' || Math.random() > 0.5) {
        setTimeout(() => {
          setShow3DS(false);
        }, 2000);
      }
    }, 1500);
  };

  const copyToClipboard = async (text: string, index: number, field: string) => {
    const cleanText = text.replace(/\s/g, '');
    try {
      await navigator.clipboard.writeText(cleanText);
      setCopiedState({ index, field });
      setTimeout(() => setCopiedState(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = cleanText;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedState({ index, field });
        setTimeout(() => setCopiedState(null), 2000);
      } catch (e) {
        console.error('Fallback copy failed', e);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-12 pt-14 pb-24 relative z-10 text-white">
      <div className="max-w-2xl mx-auto space-y-8 pb-32">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 glass-card rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CreditCard className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">꧁Rᴀʙʙʏ Eғᴛʏ꧂ Card Generator</h1>
          <p className="text-white/60">Generate valid-format test credit card numbers for development and testing purposes.</p>
        </div>

        <div className={`glass-card p-6 rounded-3xl border transition-all duration-500 ${isVpnConnected ? 'border-green-500/30 ring-1 ring-green-500/20' : 'border-white/10'} space-y-6`}>
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Select Card Network</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CARD_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center space-y-2 ${
                    selectedType === type.id 
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10' 
                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-xs font-bold">{type.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/70 leading-relaxed">
              <span className="font-bold text-amber-400 block mb-1">Disclaimer:</span>
              These cards are for <span className="text-white font-bold">Testing & Development</span> purposes only. They do not contain funds and cannot be used for actual purchases.
            </p>
          </div>

          <button
            onClick={generateCard}
            disabled={isGenerating}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            <span>{isGenerating ? 'Generating...' : 'Generate Test Card'}</span>
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white/90 px-2 tracking-tight">Generated Cards</h2>
          <AnimatePresence mode="popLayout">
            {generatedCards.length === 0 ? (
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-12 rounded-3xl border border-white/5 text-center text-white/30"
              >
                No cards generated yet.
              </motion.div>
            ) : (
              generatedCards.map((card, idx) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card liquid-glass p-6 rounded-3xl border border-white/10 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <CreditCard className="w-24 h-24" />
                  </div>
                  
                  <div className="relative z-10 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Network</p>
                        <p className="text-lg font-bold text-emerald-400">{card.type}</p>
                      </div>
                      <div className="flex items-center space-x-2 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Valid Format</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Card Number</p>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-mono font-bold tracking-[0.2em] text-white">{card.number}</p>
                        <button 
                          onClick={() => copyToClipboard(card.number, idx, 'number')}
                          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
                        >
                          {copiedState?.index === idx && copiedState?.field === 'number' ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Expiry</p>
                        <div className="flex items-center space-x-2">
                          <p className="font-mono font-bold">{card.expiry}</p>
                          <button 
                            onClick={() => copyToClipboard(card.expiry, idx, 'expiry')}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
                          >
                            {copiedState?.index === idx && copiedState?.field === 'expiry' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">CVV</p>
                        <div className="flex items-center space-x-2">
                          <p className="font-mono font-bold">{card.cvv}</p>
                          <button 
                            onClick={() => copyToClipboard(card.cvv, idx, 'cvv')}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
                          >
                            {copiedState?.index === idx && copiedState?.field === 'cvv' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Cardholder</p>
                        <p className="font-bold truncate">{card.name}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3D Secure Modal */}
      <AnimatePresence>
        {show3DS && currentCard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShow3DS(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm glass-panel liquid-glass z-50 rounded-3xl border border-white/10 overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="font-semibold text-lg flex items-center space-x-2 text-white">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  <span>3D Secure Verification</span>
                </h3>
                <button 
                  onClick={() => setShow3DS(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-white/80">
                    A verification code has been sent to your registered mobile device.
                  </p>
                  <p className="text-xs text-white/50">
                    Card ending in: <span className="font-mono text-white">{currentCard.number.slice(-4)}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Verification Code</label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-center tracking-[0.5em] font-mono text-lg"
                      maxLength={6}
                    />
                    <p className="text-[10px] text-white/40 mt-2 text-center">Hint: Try '123456' for guaranteed success</p>
                  </div>

                  <button
                    onClick={handleVerify3DS}
                    disabled={isVerifying || verificationCode.length < 6}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-white"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Submit</span>
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {verificationResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-4 rounded-xl flex items-center space-x-3 ${
                        verificationResult === 'success' 
                          ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-200' 
                          : 'bg-red-500/20 border border-red-500/30 text-red-200'
                      }`}
                    >
                      {verificationResult === 'success' ? (
                        <Check className="w-5 h-5 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                      )}
                      <p className="text-sm font-medium">
                        {verificationResult === 'success' 
                          ? 'Verification successful! Your card is ready.' 
                          : 'Verification failed. Please try again.'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
