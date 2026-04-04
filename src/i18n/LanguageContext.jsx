"use client";
import { createContext, useState, useContext, useEffect } from 'react';
import { translations, defaultLanguage } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(defaultLanguage);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gigshield_language');
      if (saved) setLanguage(saved);
    }
  }, []);

  const toggleLanguage = () => {
    const next = language === 'en' ? 'hi' : 'en';
    setLanguage(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gigshield_language', next);
    }
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language] || translations[defaultLanguage];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || translations[defaultLanguage]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return a no-op fallback so components don't crash if used outside provider
    return {
      language: 'en',
      toggleLanguage: () => {},
      t: (key) => key,
    };
  }
  return context;
}