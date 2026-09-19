import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn } from 'lucide-react';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';

export default function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onEscape = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [mobileOpen]);

  const navLinks = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.tracks'), path: '/tracks' },
    { label: t('nav.labs'), path: '/labs' },
    { label: t('nav.leaderboard'), path: '/leaderboard' },
    { label: t('nav.about'), path: '/about' },
    { label: t('nav.faq'), path: '/faq' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path.startsWith('/#')) return false;
    return location.pathname.startsWith(path.split('#')[0]);
  };

  const dashboardPath = user?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || mobileOpen ? 'bg-background-secondary/90 backdrop-blur-md border-b border-border' : 'bg-transparent'
        }`}
        dir="rtl"
      >
        <nav className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <Logo size={40} className="glow-primary" />
            <div>
              <span className="text-lg font-bold text-foreground leading-none block">صقر</span>
              <span className="text-[10px] text-foreground-secondary tracking-wider">SAQR</span>
            </div>
          </Link>

          {/* Desktop nav with animated underline */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                data-active={isActive(link.path)}
                className={`nav-underline px-4 py-2 text-sm transition-colors rounded-lg hover:bg-card/50 ${
                  isActive(link.path) ? 'text-primary' : 'text-foreground-secondary hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Link
                to={dashboardPath}
                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium btn-press"
              >
                {t('nav.dashboard')}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-foreground-secondary hover:text-foreground transition-colors flex items-center gap-2 text-sm"
                >
                  <LogIn className="w-4 h-4" /> {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium btn-press"
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button — animated hamburger to X */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={mobileOpen}
            className="lg:hidden p-2 text-foreground hover:bg-card rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 relative z-[60]"
          >
            <div className="w-6 h-5 flex flex-col justify-center items-center">
              <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-[3px]' : ''}`} />
              <span className={`block w-5 h-0.5 bg-current transition-all duration-300 my-1 ${mobileOpen ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[3px]' : ''}`} />
            </div>
          </button>
        </nav>
      </header>

      {/* Mobile menu — slide from right (RTL) with overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="lg:hidden fixed top-16 right-0 bottom-0 w-72 max-w-[85vw] bg-background-secondary border-l border-border z-50 flex flex-col"
              dir="rtl"
            >
              <div className="px-4 py-4 space-y-1 flex-1 overflow-y-auto">
                <div className="px-2 pb-2 mb-2 border-b border-border">
                  <LanguageSwitcher />
                </div>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-2.5 rounded-lg transition-colors ${
                      isActive(link.path) ? 'bg-primary/10 text-primary' : 'text-foreground-secondary hover:text-foreground hover:bg-card'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-3 border-t border-border space-y-2">
                  {isAuthenticated ? (
                    <Link
                      to={dashboardPath}
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-center text-sm font-medium"
                    >
                      {t('nav.dashboard')}
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setMobileOpen(false)}
                        className="block px-4 py-2.5 text-foreground text-center border border-border rounded-lg text-sm"
                      >
                        {t('nav.login')}
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setMobileOpen(false)}
                        className="block px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-center text-sm font-medium"
                      >
                        {t('nav.register')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}