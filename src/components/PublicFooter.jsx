import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/lib/i18n';

export default function PublicFooter() {
  const [settings, setSettings] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    base44.entities.SiteSettings.list()
      .then((data) => setSettings(data?.[0] || null))
      .catch(() => {});
  }, []);

  const contactEmail = settings?.contact_email || '';
  const footerText = settings?.footer_text || '© 2026 منصة صقر التعليمية. جميع الحقوق محفوظة.';

  return (
    <footer className="border-t border-border bg-background-secondary py-12 px-4 lg:px-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-bold text-foreground block">صقر</span>
                <span className="text-xs text-foreground-secondary">SAQR</span>
              </div>
            </div>
            <p className="text-sm text-foreground-secondary">{t('footer.tagline')}</p>
          </div>
          <nav aria-label={t('footer.platform')}>
            <h2 className="font-medium text-foreground mb-3">{t('footer.platform')}</h2>
            <ul className="space-y-2 text-sm text-foreground-secondary">
              <li><Link to="/tracks" className="hover:text-primary transition-colors">{t('nav.tracks')}</Link></li>
              <li><Link to="/labs" className="hover:text-primary transition-colors">{t('nav.labs')}</Link></li>
              <li><Link to="/leaderboard" className="hover:text-primary transition-colors">{t('nav.leaderboard')}</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">{t('nav.about')}</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">{t('nav.faq')}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t('footer.policies')}>
            <h2 className="font-medium text-foreground mb-3">{t('footer.policies')}</h2>
            <ul className="space-y-2 text-sm text-foreground-secondary">
              <li><Link to="/privacy" className="hover:text-primary transition-colors">{t('footer.privacy')}</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">{t('footer.terms')}</Link></li>
            </ul>
          </nav>
          <div>
            <h2 className="font-medium text-foreground mb-3">{t('footer.contact')}</h2>
            {contactEmail ? (
              <a
                href={`mailto:${contactEmail}`}
                className="text-sm text-foreground-secondary hover:text-primary transition-colors"
              >
                {contactEmail}
              </a>
            ) : (
              <p className="text-sm text-foreground-secondary">{t('footer.contactViaAbout')}</p>
            )}
          </div>
        </div>
        <div className="pt-8 border-t border-border text-center text-sm text-foreground-secondary">
          {footerText}
        </div>
      </div>
    </footer>
  );
}