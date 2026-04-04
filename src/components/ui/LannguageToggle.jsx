"use client";
import { useLanguage } from "@/i18n/LanguageContext";

export default function LanguageToggle({ style = {} }) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      title={language === 'en' ? 'Switch to Hindi' : 'Switch to English'}
      style={{
        padding: "4px 10px",
        borderRadius: 7,
        border: "1px solid rgba(255,255,255,0.2)",
        background: "transparent",
        color: "rgba(255,255,255,0.85)",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        letterSpacing: "0.04em",
        display: "flex",
        alignItems: "center",
        gap: 4,
        ...style,
      }}
    >
      {language === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 ENG'}
    </button>
  );
}