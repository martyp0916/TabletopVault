import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const THEME_STORAGE_KEY = '@tabletopvault_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
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
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundImagePath, setBackgroundImagePath] = useState<string | null>(backgroundPath || null);

  // Get system color scheme
  const systemColorScheme = useColorScheme();

  // Compute isDarkMode based on themeMode and system preference
  const isDarkMode = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  // Use ref to track the latest path for async operations
  const pathRef = useRef<string | null>(backgroundPath || null);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          // Support legacy 'dark'/'light' values and new 'system' value
          if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
            setThemeModeState(savedTheme as ThemeMode);
          }
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setThemeLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }, []);

  const toggleTheme = async () => {
    // Toggle cycles through: light -> dark -> system -> light
    const nextMode: ThemeMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
    await setThemeMode(nextMode);
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
      themeMode,
      setThemeMode,
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
