import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from './supabase';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  backgroundImageUrl: string | null;
  setBackgroundImagePath: (path: string | null) => void;
  refreshBackgroundImage: (path?: string | null) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  backgroundPath
}: {
  children: ReactNode;
  backgroundPath?: string | null;
}) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundImagePath, setBackgroundImagePath] = useState<string | null>(backgroundPath || null);

  // Use ref to track the latest path for async operations
  const pathRef = useRef<string | null>(backgroundPath || null);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Update ref when state changes
  useEffect(() => {
    pathRef.current = backgroundImagePath;
  }, [backgroundImagePath]);

  // Fetch signed URL for background image
  // Accepts optional path parameter to avoid stale closure issues
  const refreshBackgroundImage = useCallback(async (overridePath?: string | null) => {
    const pathToUse = overridePath !== undefined ? overridePath : pathRef.current;
    console.log('[Theme] refreshBackgroundImage called with path:', pathToUse);

    if (pathToUse) {
      try {
        const { data: signedUrlData, error } = await supabase.storage
          .from('profile-images')
          .createSignedUrl(pathToUse, 3600);

        if (error) {
          console.error('[Theme] Error fetching signed URL:', error);
          return;
        }

        if (signedUrlData?.signedUrl) {
          console.log('[Theme] Got signed URL, setting backgroundImageUrl');
          setBackgroundImageUrl(signedUrlData.signedUrl);
        }
      } catch (err) {
        console.error('[Theme] Error in refreshBackgroundImage:', err);
      }
    } else {
      console.log('[Theme] No path, setting backgroundImageUrl to null');
      setBackgroundImageUrl(null);
    }
  }, []);

  // Update background when path changes
  useEffect(() => {
    if (backgroundImagePath !== undefined) {
      refreshBackgroundImage(backgroundImagePath);
    }
  }, [backgroundImagePath, refreshBackgroundImage]);

  // Update path when external backgroundPath prop changes
  useEffect(() => {
    if (backgroundPath !== undefined && backgroundPath !== backgroundImagePath) {
      setBackgroundImagePath(backgroundPath);
      pathRef.current = backgroundPath;
    }
  }, [backgroundPath]);

  // Custom setter that also updates the ref immediately
  const setBackgroundImagePathWithRef = useCallback((path: string | null) => {
    pathRef.current = path;
    setBackgroundImagePath(path);
  }, []);

  return (
    <ThemeContext.Provider value={{
      isDarkMode,
      toggleTheme,
      backgroundImageUrl,
      setBackgroundImagePath: setBackgroundImagePathWithRef,
      refreshBackgroundImage,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
