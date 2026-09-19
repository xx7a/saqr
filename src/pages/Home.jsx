import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Shield, BookOpen, FlaskConical, Terminal, ArrowLeft,
  Play, CheckCircle2, Target, Clock,
  Trophy, GraduationCap, Sparkles
} from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import LeaderboardSection from '@/components/LeaderboardSection';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { usePageMeta } from '@/hooks/usePageMeta';
import { base44 } from '@/api/base44Client';

export default function Home() {
  const [tracks, setTracks] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();
  const { t, lang } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  usePageMeta(
    lang === 'ar' ? 'منصة صقر | تعلم الأمن السيبراني بالعربية' : 'SAQR | Learn cybersecurity in Arabic',
    lang === 'ar'
      ? 'منصة عربية تفاعلية لتعليم الأمن السيبراني والمجالات التقنية، تجمع بين الشرح النظري والمختبرات العملية الآمنة.'
      : 'An interactive Arabic platform for cybersecurity education, combining theoretical lessons with safe hands-on labs.'
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tracksData, specsData] = await Promise.all([
        base44.entities.Track.list('order', 20).catch(() => []),
        base44.entities.Specialization.list('order', 20).catch(() => []),
      ]);
      setTracks(tracksData || []);
      setSpecializations(specsData || []);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const journey = [
    { icon: BookOpen, title: t('home.step1Title'), desc: t('home.step1Desc') },
    { icon: Target, title: t('home.step2Title'), desc: t('home.step2Desc') },
    { icon: FlaskConical, title: t('home.step3Title'), desc: t('home.step3Desc') },
  ];

  const reveal = (delay = 0) => ({
    initial: prefersReducedMotion ? false : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1], delay },
  });

  const ctaTarget = isAuthenticated ? (user?.role === 'admin' ? '/admin' : '/dashboard') : '/register';
  const ctaLabel = isAuthenticated ? t('home.continueJourney') : t('home.startJourney');

  return (
    <div className="min-h-screen bg-background" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <PublicNavbar />

      {/* ===== Hero ===== */}
      <section className="relative pt-28 pb-16 px-4 lg:px-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 border border-primary/20 mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">{t('home.badge')}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-5">
              {t('home.heroTitle')}
              <span className="block text-gradient mt-1">{t('home.heroTitleHighlight')}</span>
            </h1>

            <p className="text-base md:text-lg text-foreground-secondary mb-8 leading-relaxed max-w-2xl mx-auto">
              {t('home.heroDesc')}
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                to={ctaTarget}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors duration-180 flex items-center gap-2"
              >
                {ctaLabel} <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link
                to="/tracks"
                className="px-6 py-3 bg-card border border-border text-foreground rounded-xl font-medium hover:border-primary/40 transition-colors duration-180"
              >
                {t('home.exploreTracks')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Platform Preview ===== */}
      <section className="px-4 lg:px-8 pb-16">
        <motion.div {...reveal(0.05)} className="max-w-5xl mx-auto">
          <PlatformPreview t={t} lang={lang} />
        </motion.div>
      </section>

      {/* ===== Journey (3 steps) ===== */}
      <section className="py-16 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div {...reveal()} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{t('home.journeyTitle')}</h2>
            <p className="text-foreground-secondary">{t('home.journeyDesc')}</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {journey.map((step, i) => (
              <motion.div key={i} {...reveal(i * 0.05)} className="card-base p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground-secondary">
                    {lang === 'ar' ? `الخطوة ${i + 1}` : `Step ${i + 1}`}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-foreground-secondary leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Tracks & Specializations ===== */}
      <section className="py-16 px-4 lg:px-8 bg-background-secondary/40">
        <div className="max-w-6xl mx-auto">
          <motion.div {...reveal()} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{t('home.tracksSection')}</h2>
            <p className="text-foreground-secondary">{t('home.tracksSectionDesc')}</p>
          </motion.div>

          {/* Foundation track */}
          <motion.div {...reveal(0.05)} className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">{t('home.foundationStage')}</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {(tracks.length > 0 ? tracks.filter((tr) => tr.track_type !== 'specialization') : [
                { name: lang === 'ar' ? 'الأمن السيبراني' : 'Cybersecurity', name_en: 'Cybersecurity', description: lang === 'ar' ? 'تعلّم أساسيات الحاسب والشبكات والأنظمة والبرمجة، ثم اختر تخصصك السيبراني.' : 'Learn computing, networks, systems, and programming fundamentals, then choose your cyber specialization.', availability_status: 'available', estimated_hours: 120 },
              ]).map((track, i) => (
                <TrackCard key={i} track={track} t={t} lang={lang} />
              ))}
            </div>
          </motion.div>

          {/* Specializations */}
          <motion.div {...reveal(0.1)}>
            <div className="flex items-center gap-2 mb-4 mt-8">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">{t('home.specializationBranches')}</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {specializations.length > 0 ? specializations.map((spec, i) => (
                <SpecCard key={spec.id || i} spec={spec} t={t} lang={lang} />
              )) : (
                <p className="text-sm text-foreground-secondary">
                  {lang === 'ar' ? 'سيتم إضافة التخصصات قريبًا.' : 'Specializations will be added soon.'}
                </p>
              )}
              {specializations.length > 0 && !specializations.some((s) => (s.name_ar || '').includes('ذكاء') || (s.name_en || '').toLowerCase().includes('ai')) && (
                <div className="card-base p-5 opacity-60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-foreground-secondary" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium border border-warning/20">{t('home.comingSoonBadge')}</span>
                  </div>
                  <h4 className="font-bold text-foreground mb-1">
                    {lang === 'ar' ? 'الذكاء الاصطناعي' : 'Artificial Intelligence'}
                  </h4>
                  <p className="text-xs text-foreground-secondary">
                    {lang === 'ar' ? 'تخصص قيد التطوير' : 'Specialization in development'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Labs ===== */}
      <section className="py-16 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div {...reveal()}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 border border-primary/20 mb-4">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-xs text-primary font-medium">{t('home.labsBadge')}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{t('home.labsTitle')}</h2>
              <p className="text-foreground-secondary mb-6 leading-relaxed">{t('home.labsDesc')}</p>
              <Link
                to="/labs"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-foreground rounded-lg font-medium text-sm hover:border-primary/40 transition-colors duration-180"
              >
                {t('home.exploreLabs')} <ArrowLeft className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div {...reveal(0.1)}>
              <TerminalPreview t={t} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== Leaderboard ===== */}
      <LeaderboardSection />

      {/* ===== Final CTA ===== */}
      <section className="py-16 px-4 lg:px-8 bg-background-secondary/40">
        <motion.div {...reveal()} className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{t('home.finalCtaTitle')}</h2>
          <p className="text-foreground-secondary mb-6">{t('home.finalCtaDesc')}</p>
          <Link
            to={ctaTarget}
            className="inline-flex items-center gap-2 px-7 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors duration-180"
          >
            {ctaLabel} <ArrowLeft className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      <PublicFooter />
    </div>
  );
}

// ===== Platform Preview =====
function PlatformPreview({ t, lang }) {
  return (
    <div className="relative">
      <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-2xl glow-primary" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-background-secondary border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-danger/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-3 py-0.5 rounded bg-card text-xs text-foreground-secondary terminal-font" dir="ltr">saqr5.com/dashboard</div>
          </div>
        </div>
        <div className="p-6 bg-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{t('home.dashboardPreviewTitle')}</p>
              <p className="text-xs text-foreground-secondary">{t('home.dashboardPreviewDesc')}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: t('home.statLessons'), value: '12', icon: BookOpen },
              { label: t('home.statLabs'), value: '5', icon: FlaskConical },
              { label: t('home.statPoints'), value: '350', icon: Trophy },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-lg bg-background-secondary border border-border">
                <s.icon className="w-4 h-4 text-primary mb-1.5" />
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-foreground-secondary">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {(lang === 'ar'
              ? ['أساسيات الشبكات', 'أنظمة التشغيل', 'مقدمة في الأمن السيبراني']
              : ['Network Fundamentals', 'Operating Systems', 'Intro to Cybersecurity']
            ).map((title, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background-secondary border border-border">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${i < 2 ? 'bg-success/10' : 'bg-primary/10'}`}>
                  {i < 2 ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Play className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{title}</p>
                  <div className="h-1 bg-border rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${i < 2 ? 100 : 45}%` }} />
                  </div>
                </div>
                <span className="text-[10px] text-foreground-secondary">
                  {i < 2 ? (lang === 'ar' ? 'مكتمل' : 'Done') : '45%'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Side previews — desktop only */}
      <div className="hidden lg:block absolute -right-6 top-12 w-44 rotate-6 opacity-50 pointer-events-none">
        <div className="rounded-xl overflow-hidden border border-border bg-card shadow-xl" dir="ltr">
          <div className="px-3 py-2 bg-background-secondary border-b border-border flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-danger/50" />
            <div className="w-2 h-2 rounded-full bg-warning/50" />
            <div className="w-2 h-2 rounded-full bg-success/50" />
          </div>
          <div className="p-3 space-y-1 terminal-font text-[10px]" dir="ltr">
            <div><span className="text-success">student@saqr</span><span className="text-foreground-secondary">:</span><span className="text-primary">~</span><span className="text-foreground-secondary">$ </span><span className="text-foreground">ls -la</span></div>
            <div className="text-foreground-secondary">drwxr-xr-x home</div>
            <div className="text-foreground-secondary">-rw-r--r-- auth.log</div>
            <div><span className="text-success">student@saqr</span><span className="text-foreground-secondary">:</span><span className="text-primary">~</span><span className="text-foreground-secondary">$ </span><span className="cursor-blink text-primary">▊</span></div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute -left-6 top-20 -rotate-6 opacity-50 pointer-events-none">
        <div className="rounded-xl overflow-hidden border border-border bg-card shadow-xl" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="px-3 py-2 bg-background-secondary border-b border-border">
            <p className="text-[10px] font-medium text-foreground">{t('compass.title')}</p>
          </div>
          <div className="p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                <Target className="w-3 h-3 text-primary" />
              </div>
              <div className="h-1.5 w-20 bg-border rounded-full"><div className="h-full w-3/4 bg-primary rounded-full" /></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-card flex items-center justify-center">
                <Shield className="w-3 h-3 text-foreground-secondary" />
              </div>
              <div className="h-1.5 w-20 bg-border rounded-full"><div className="h-full w-1/2 bg-foreground-secondary/50 rounded-full" /></div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-foreground-secondary mt-4">{t('home.previewLabel')}</p>
    </div>
  );
}

// ===== Terminal Preview =====
function TerminalPreview({ t }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#06090B] shadow-xl" dir="ltr">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0A0E12] border-b border-border">
        <div className="w-3 h-3 rounded-full bg-danger/60" />
        <div className="w-3 h-3 rounded-full bg-warning/60" />
        <div className="w-3 h-3 rounded-full bg-success/60" />
        <span className="ml-3 text-xs text-foreground-secondary terminal-font">{t('home.terminalLabel')}</span>
      </div>
      <div className="p-4 space-y-1 terminal-font text-sm" dir="ltr">
        <div><span className="text-success">student@saqr</span><span className="text-foreground-secondary">:</span><span className="text-primary">~</span><span className="text-foreground-secondary">$ </span><span className="text-foreground">cat auth.log</span></div>
        <div className="text-foreground-secondary">Sep 14 09:14:21 sshd: Failed password from 10.10.20.55</div>
        <div className="text-foreground-secondary">Sep 14 09:14:29 sshd: Failed password from 10.10.20.55</div>
        <div className="text-foreground-secondary">Sep 14 09:14:37 sshd: Failed password from 10.10.20.55</div>
        <div><span className="text-success">student@saqr</span><span className="text-foreground-secondary">:</span><span className="text-primary">~</span><span className="text-foreground-secondary">$ </span><span className="text-foreground">grep "Failed" auth.log</span></div>
        <div className="text-foreground">3 failed attempts from 10.10.20.55</div>
        <div><span className="text-success">student@saqr</span><span className="text-foreground-secondary">:</span><span className="text-primary">~</span><span className="text-foreground-secondary">$ </span><span className="text-foreground">submit 10.10.20.55</span></div>
        <div className="text-success">✓ {t('lab.correct')}</div>
        <div><span className="text-success">student@saqr</span><span className="text-foreground-secondary">:</span><span className="text-primary">~</span><span className="text-foreground-secondary">$ </span><span className="cursor-blink text-primary">▊</span></div>
      </div>
    </div>
  );
}

// ===== Track Card =====
function TrackCard({ track, t, lang }) {
  const isAvailable = track.availability_status === 'available';
  const name = localized(track, 'name', lang);
  const description = localized(track, 'description', lang);
  return (
    <div className={`card-base p-5 ${!isAvailable ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        {isAvailable ? (
          <span className="px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">{t('home.availableNow')}</span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium border border-warning/20">{t('home.comingSoonBadge')}</span>
        )}
      </div>
      <h4 className="text-lg font-bold text-foreground mb-1.5">{name}</h4>
      <p className="text-sm text-foreground-secondary leading-relaxed mb-3">{description}</p>
      <div className="flex items-center gap-3 text-xs text-foreground-secondary mb-4">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {track.estimated_hours || 100} {t('common.hours')}</span>
      </div>
      {isAvailable ? (
        <Link to="/tracks" className="block w-full text-center py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors duration-180">
          {t('home.exploreTrack')}
        </Link>
      ) : (
        <div className="block w-full text-center py-2.5 bg-card border border-border text-foreground-secondary rounded-lg font-medium text-sm">
          {t('home.inDevelopment')}
        </div>
      )}
    </div>
  );
}

// ===== Specialization Card =====
function SpecCard({ spec, t, lang }) {
  const isAvailable = spec.availability_status === 'available';
  const name = lang === 'ar' ? (spec.name_ar || '') : (spec.name_en || spec.name_ar || '');
  const description = localized(spec, 'description', lang);
  return (
    <div className={`card-base p-5 ${!isAvailable ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        {isAvailable ? (
          <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">{t('common.available')}</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium border border-warning/20">{t('home.comingSoonBadge')}</span>
        )}
      </div>
      <h4 className="font-bold text-foreground mb-1">{name}</h4>
      <p className="text-xs text-foreground-secondary line-clamp-2">{description}</p>
    </div>
  );
}