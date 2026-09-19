import React from "react";
import { Shield, Terminal, FlaskConical, Award } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  const { t, lang, dir } = useTranslation();

  return (
    <div className="min-h-screen flex bg-background" dir={dir}>
      {/* Branding panel - desktop only */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-background-secondary via-background to-background-secondary items-center justify-center p-12">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

        {/* Language switcher */}
        <div className="absolute top-6 right-6 z-10">
          <LanguageSwitcher />
        </div>

        <div className="relative max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-primary mb-6 glow-primary">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">{lang === 'ar' ? 'صقر' : 'SAQR'}</h1>
          <p className="text-foreground-secondary text-lg leading-relaxed mb-8">
            {t('auth.platformTagline')}
          </p>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-xl bg-card/50 border border-border">
              <Terminal className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-foreground-secondary">{t('auth.interactiveSimulation')}</p>
            </div>
            <div className="p-4 rounded-xl bg-card/50 border border-border">
              <FlaskConical className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-foreground-secondary">{t('auth.safeLabs')}</p>
            </div>
            <div className="p-4 rounded-xl bg-card/50 border border-border">
              <Award className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-foreground-secondary">{t('auth.verifiedCerts')}</p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-foreground-secondary">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            {t('auth.securePlatform')}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-12 relative">
        {/* Language switcher - visible on all screens */}
        <div className="absolute top-6 right-6 z-10">
          <LanguageSwitcher compact />
        </div>

        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4 glow-primary">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{lang === 'ar' ? 'صقر' : 'SAQR'}</h1>
            <p className="text-sm text-foreground-secondary mt-1">{t('auth.mobileTagline')}</p>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              {Icon && <Icon className="w-6 h-6 text-primary" />}
            </div>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-foreground-secondary mt-2 text-sm">{subtitle}</p>}
          </div>

          <div className="bg-card rounded-2xl border border-border p-8">
            {children}
          </div>

          {footer && (
            <p className="text-center text-sm text-foreground-secondary mt-6">{footer}</p>
          )}
        </div>
      </div>
    </div>
  );
}