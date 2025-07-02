import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';

// Type for theme
export type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialTheme = (): ThemeType => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
    }
    const sys = Appearance.getColorScheme();
    return sys === 'dark' ? 'dark' : 'light';
  };

  const [theme, setThemeState] = useState<ThemeType>(getInitialTheme);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('theme', newTheme);
    }
  };

  useEffect(() => {
    // Listen to system changes if not set manually
    const listener = ({ colorScheme }: { colorScheme: ThemeType }) => {
      if (!window.localStorage.getItem('theme')) {
        setThemeState(colorScheme);
      }
    };
    const sub = Appearance.addChangeListener(listener);
    return () => sub.remove();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}; 