import React, { useRef } from 'react';
import { useTheme } from '../ThemeContext';
import { ArrowLeft, Check, Palette, Type, Square, Circle, Layout, Image as ImageIcon, Upload } from 'lucide-react';

export function SettingsApp({ onBack }: { onBack: () => void }) {
  const { 
    primaryColor, setPrimaryColor, 
    fontSize, setFontSize, 
    iconShape, setIconShape, 
    iconSize, setIconSize,
    keyboardLayout, setKeyboardLayout,
    wallpaperUrl, setWallpaperUrl
  } = useTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const { addNode, generateId } = await import('../lib/vfs');
      const id = generateId();
      await addNode({
        id,
        name: file.name,
        type: 'file',
        parentId: 'root',
        data: file,
        mimeType: file.type,
        size: file.size,
        createdAt: Date.now(),
        modifiedAt: Date.now()
      });
      
      localStorage.setItem('wallpaperId', id);
      setWallpaperUrl(URL.createObjectURL(file));
      window.dispatchEvent(new CustomEvent('wallpaper-updated'));
    }
  };

  const colors = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Purple', value: '#a855f7' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#1c1c1e] text-white overflow-y-auto custom-scrollbar">
      <div className="sticky top-0 z-10 bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 pt-10 flex items-center">
        <button onClick={onBack} className="text-[#0a84ff] flex items-center font-medium">
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <h1 className="text-lg font-semibold mx-auto -ml-8">Personalization</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Accent Color */}
        <div className="bg-[#2c2c2e] rounded-xl p-4">
          <div className="flex items-center mb-4 text-white/80">
            <Palette className="w-5 h-5 mr-2" />
            <h2 className="font-medium">Accent Color</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {colors.map(c => (
              <button
                key={c.value}
                onClick={() => setPrimaryColor(c.value)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{ backgroundColor: c.value }}
              >
                {primaryColor === c.value && <Check className="w-5 h-5 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="bg-[#2c2c2e] rounded-xl p-4">
          <div className="flex items-center mb-4 text-white/80">
            <Type className="w-5 h-5 mr-2" />
            <h2 className="font-medium">Font Size</h2>
          </div>
          <div className="flex bg-[#1c1c1e] rounded-lg p-1">
            {(['small', 'medium', 'large'] as const).map(size => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${fontSize === size ? 'bg-[#3a3a3c] text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Icon Shape */}
        <div className="bg-[#2c2c2e] rounded-xl p-4">
          <div className="flex items-center mb-4 text-white/80">
            <Square className="w-5 h-5 mr-2" />
            <h2 className="font-medium">Icon Shape</h2>
          </div>
          <div className="flex bg-[#1c1c1e] rounded-lg p-1">
            {(['circle', 'squircle', 'square'] as const).map(shape => (
              <button
                key={shape}
                onClick={() => setIconShape(shape)}
                className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${iconShape === shape ? 'bg-[#3a3a3c] text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
              >
                {shape}
              </button>
            ))}
          </div>
        </div>

        {/* Icon Size */}
        <div className="bg-[#2c2c2e] rounded-xl p-4">
          <div className="flex items-center mb-4 text-white/80">
            <Circle className="w-5 h-5 mr-2" />
            <h2 className="font-medium">Icon Size</h2>
          </div>
          <div className="flex bg-[#1c1c1e] rounded-lg p-1">
            {(['small', 'medium', 'large'] as const).map(size => (
              <button
                key={size}
                onClick={() => setIconSize(size)}
                className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${iconSize === size ? 'bg-[#3a3a3c] text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Wallpaper */}
        <div className="bg-[#2c2c2e] rounded-xl p-4">
          <div className="flex items-center mb-4 text-white/80">
            <ImageIcon className="w-5 h-5 mr-2" />
            <h2 className="font-medium">Desktop Wallpaper</h2>
          </div>
          <div className="flex flex-col gap-3">
            <div 
              className="w-full h-32 rounded-lg bg-cover bg-center border border-white/10 relative overflow-hidden group"
              style={{ backgroundImage: `url(${wallpaperUrl})` }}
            >
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium flex items-center transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Change Wallpaper
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/50">Custom Image</span>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-[#0a84ff] hover:text-blue-400 font-medium px-3 py-1.5 bg-[#0a84ff]/10 rounded-lg transition-colors"
              >
                Upload
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <div className="flex gap-2 mt-2 overflow-x-auto pb-2 custom-scrollbar">
              {[
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1506744626753-eba7bc3535e7?q=80&w=2564&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2564&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2564&auto=format&fit=crop"
              ].map((url, i) => (
                <button
                  key={i}
                  onClick={() => {
                    localStorage.removeItem('wallpaperId');
                    setWallpaperUrl(url);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg bg-cover bg-center border-2 transition-all ${wallpaperUrl === url ? 'border-[#0a84ff] scale-105' : 'border-transparent hover:border-white/20'}`}
                  style={{ backgroundImage: `url(${url})` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Keyboard Layout */}
        <div className="bg-[#2c2c2e] rounded-xl p-4">
          <div className="flex items-center mb-4 text-white/80">
            <Layout className="w-5 h-5 mr-2" />
            <h2 className="font-medium">Keyboard / Input Layout</h2>
          </div>
          <div className="flex bg-[#1c1c1e] rounded-lg p-1">
            {(['default', 'compact', 'floating'] as const).map(layout => (
              <button
                key={layout}
                onClick={() => setKeyboardLayout(layout)}
                className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${keyboardLayout === layout ? 'bg-[#3a3a3c] text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
              >
                {layout}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-3">
            Changes the padding and layout style of input fields across the OS.
          </p>
        </div>
      </div>
    </div>
  );
}
