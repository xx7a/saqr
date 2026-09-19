import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Check } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang } = useTranslation();
  const [open, setOpen] = useState(false);

  const options = [
    { value: 'ar', label: 'العربية', labelEn: 'Arabic' },
    { value: 'en', label: 'English', labelEn: 'English' },
  ];

  const current = options.find((o) => o.value === lang);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground hover:bg-card transition-colors duration-180"
        aria-label="Language / اللغة"
      >
        <Languages className="w-4 h-4" />
        {!compact && <span className="font-medium">{current?.label || 'العربية'}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1 end-0 w-36 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setLang(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                  lang === opt.value ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-card-hover'
                }`}
              >
                <span>{opt.label}</span>
                {lang === opt.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}