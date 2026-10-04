import React, { createContext, useContext, useState, useEffect } from 'react';

type FontSize = 'small' | 'medium' | 'large';
type IconShape = 'circle' | 'squircle' | 'square';
type IconSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  iconShape: IconShape;
  setIconShape: (shape: IconShape) => void;
  iconSize: IconSize;
  setIconSize: (size: IconSize) => void;
  keyboardLayout: string;
  setKeyboardLayout: (layout: string) => void;
  wallpaperUrl: string;
  setWallpaperUrl: (url: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('primaryColor') || '#6366f1');
  const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem('fontSize') as FontSize) || 'medium');
  const [iconShape, setIconShape] = useState<IconShape>(() => (localStorage.getItem('iconShape') as IconShape) || 'squircle');
  const [iconSize, setIconSize] = useState<IconSize>(() => (localStorage.getItem('iconSize') as IconSize) || 'medium');
  const [keyboardLayout, setKeyboardLayout] = useState(() => localStorage.getItem('keyboardLayout') || 'default');
  const [wallpaperUrl, setWallpaperUrl] = useState(() => {
    const url = localStorage.getItem('wallpaperUrl');
    if (url && url.startsWith('blob:')) {
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';
    }
    return url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';
  });

  useEffect(() => {
    try {
      localStorage.setItem('primaryColor', primaryColor);
      localStorage.setItem('fontSize', fontSize);
      localStorage.setItem('iconShape', iconShape);
      localStorage.setItem('iconSize', iconSize);
      localStorage.setItem('keyboardLayout', keyboardLayout);
      localStorage.setItem('wallpaperUrl', wallpaperUrl);
    } catch (e) {
      console.warn("Failed to save theme settings to localStorage", e);
    }
    
    // Apply font size to root
    const root = document.documentElement;
    if (fontSize === 'small') root.style.fontSize = '14px';
    else if (fontSize === 'large') root.style.fontSize = '18px';
    else root.style.fontSize = '16px';
    
    // Apply primary color to root as a CSS variable
    root.style.setProperty('--primary-color', primaryColor);
  }, [primaryColor, fontSize, iconShape, iconSize, keyboardLayout, wallpaperUrl]);

  return (
    <ThemeContext.Provider value={{ 
      primaryColor, setPrimaryColor, 
      fontSize, setFontSize, 
      iconShape, setIconShape, 
      iconSize, setIconSize,
      keyboardLayout, setKeyboardLayout,
      wallpaperUrl, setWallpaperUrl
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
