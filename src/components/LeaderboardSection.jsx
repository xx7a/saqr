import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Crown, Medal, ArrowLeft, User, Star, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';

export default function LeaderboardSection() {
  const [top3, setTop3] = useState([]);
  const [loading, setLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const { t, lang, dir } = useTranslation();

  useEffect(() => {
    loadTop3();
  }, []);

  const loadTop3 = async () => {
    try {
      const res = await base44.functions.invoke('getLeaderboard', { top: '3' });
      setTop3(res?.data?.leaderboard || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getInitial = (name) => (name || (lang === 'ar' ? 'م' : 'S'))[0];

  const renderAvatar = (entry, size = 'w-20 h-20') => {
    if (entry.hide_identity) {
      return (
        <div className={`${size} rounded-full bg-card flex items-center justify-center`}>
          <User className="w-1/2 h-1/2 text-foreground-secondary" />
        </div>
      );
    }
    if (entry.avatar_url) {
      return <img src={entry.avatar_url} alt={entry.display_name} className={`${size} rounded-full object-cover`} />;
    }
    return (
      <div className={`${size} rounded-full bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold`}>
        {getInitial(entry.display_name)}
      </div>
    );
  };

  const getDisplayName = (entry) => entry.hide_identity ? t('leaderboard.anonymous') : (entry.display_name || (lang === 'ar' ? 'متصدّر' : 'Leader'));

  // Podium positions config
  const positions = [
    {
      rank: 1,
      icon: Crown,
      ringColor: 'border-gold',
      glowColor: 'shadow-[0_0_30px_rgba(212,168,83,0.25)]',
      badgeBg: 'bg-gold text-background',
      podiumBg: 'from-gold/20 to-gold/5',
      podiumHeight: 'h-28',
      avatarSize: 'w-24 h-24 md:w-28 md:h-28',
      iconColor: 'text-gold',
      label: t('leaderboard.gold'),
      scale: 'md:scale-100',
      marginTop: 'mt-0',
    },
    {
      rank: 2,
      icon: Medal,
      ringColor: 'border-slate-300',
      glowColor: 'shadow-[0_0_20px_rgba(203,213,225,0.15)]',
      badgeBg: 'bg-slate-300 text-slate-900',
      podiumBg: 'from-slate-300/15 to-slate-300/5',
      podiumHeight: 'h-20',
      avatarSize: 'w-20 h-20 md:w-24 md:h-24',
      iconColor: 'text-slate-300',
      label: t('leaderboard.silver'),
      scale: 'md:scale-95',
      marginTop: 'mt-8',
    },
    {
      rank: 3,
      icon: Medal,
      ringColor: 'border-amber-700',
      glowColor: 'shadow-[0_0_18px_rgba(180,83,9,0.15)]',
      badgeBg: 'bg-amber-700 text-white',
      podiumBg: 'from-amber-700/15 to-amber-700/5',
      podiumHeight: 'h-14',
      avatarSize: 'w-16 h-16 md:w-20 md:h-20',
      iconColor: 'text-amber-600',
      label: t('leaderboard.bronze'),
      scale: 'md:scale-90',
      marginTop: 'mt-12',
    },
  ];

  // Get entry for a rank (1, 2, 3)
  const getEntryForRank = (rank) => top3.find(e => e.rank === rank);

  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="h-8 w-48 skeleton rounded-lg mx-auto mb-3" />
            <div className="h-4 w-72 skeleton rounded-lg mx-auto" />
          </div>
          <div className="flex justify-center items-end gap-4 md:gap-8">
            <div className="skeleton rounded-2xl w-24 h-28" />
            <div className="skeleton rounded-2xl w-28 h-36" />
            <div className="skeleton rounded-2xl w-24 h-24" />
          </div>
        </div>
      </section>
    );
  }

  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const backArrow = dir === 'rtl' ? <ArrowLeft className="w-4 h-4 rotate-180" /> : <ArrowLeft className="w-4 h-4" />;

  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 mb-4">
            <Trophy className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-gold">{t('home.leaderboardTitle')}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            {t('home.leaderboardTitle')}
          </h2>
          <p className="text-foreground-secondary text-sm max-w-xl mx-auto">
            {t('home.leaderboardDesc')}
          </p>
        </div>

        {top3.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mx-auto mb-4 border border-border">
              <Trophy className="w-8 h-8 text-foreground-secondary" />
            </div>
            <p className="text-foreground-secondary text-sm mb-6">
              {t('home.beFirst')}
            </p>
            <Link
              to="/tracks"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors duration-180"
            >
              {t('home.startLearning')} {backArrow}
            </Link>
          </div>
        ) : (
          <>
            {/* ===== Podium — Desktop ===== */}
            <div className="hidden md:flex justify-center items-end gap-3 lg:gap-6 mb-8">
              {/* Order: 2nd, 1st, 3rd */}
              {[positions[1], positions[0], positions[2]].map((pos, displayIdx) => {
                const entry = getEntryForRank(pos.rank);
                if (!entry) {
                  return (
                    <div key={pos.rank} className="flex flex-col items-center w-32">
                      <div className="opacity-30">
                        <div className={`w-24 h-24 rounded-full bg-card border-4 ${pos.ringColor} flex items-center justify-center mb-2`}>
                          <Trophy className="w-8 h-8 text-foreground-secondary" />
                        </div>
                      </div>
                      <div className={`w-32 rounded-t-xl bg-gradient-to-b ${pos.podiumBg} border border-border ${pos.podiumHeight} flex items-center justify-center`}>
                        <span className="text-3xl font-bold text-foreground-secondary/30">{pos.rank}</span>
                      </div>
                    </div>
                  );
                }
                const PosIcon = pos.icon;
                const isVerified = !entry.hide_identity && entry.avatar_url;
                return (
                  <motion.div
                    key={entry.user_id || pos.rank}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: displayIdx * 0.12, duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                    className={`flex flex-col items-center ${pos.marginTop} ${pos.scale} group cursor-default`}
                  >
                    {/* Crown/Medal icon */}
                    <div className={`mb-1 ${pos.rank === 1 ? 'animate-fade-in-up' : ''}`}>
                      <PosIcon className={`w-7 h-7 ${pos.iconColor}`} />
                    </div>

                    {/* Rank badge */}
                    <div className={`w-7 h-7 rounded-full ${pos.badgeBg} flex items-center justify-center font-bold text-xs mb-2 z-10 shadow-lg`}>
                      {pos.rank}
                    </div>

                    {/* Avatar with ring */}
                    <div className={`relative rounded-full border-4 ${pos.ringColor} bg-card overflow-hidden ${pos.glowColor} transition-transform duration-200 group-hover:scale-105`}>
                      {renderAvatar(entry, pos.avatarSize)}
                      {/* Verified badge */}
                      {isVerified && (
                        <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                          <Star className="w-3 h-3 text-background fill-background" />
                        </div>
                      )}
                    </div>

                    {/* Name + points */}
                    <div className="mt-3 text-center max-w-[140px]">
                      <p className="font-bold text-foreground text-sm truncate">{getDisplayName(entry)}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span className="text-gold font-bold text-xl">{entry.lab_points}</span>
                        <span className="text-xs text-foreground-secondary">{t('common.points')}</span>
                      </div>
                      <p className="text-xs text-foreground-secondary/70 mt-0.5">{pos.label}</p>
                    </div>

                    {/* Podium base */}
                    <div className={`mt-3 w-32 rounded-t-xl bg-gradient-to-b ${pos.podiumBg} border border-border ${pos.podiumHeight} flex items-center justify-center`}>
                      <span className={`text-4xl font-bold ${pos.rank === 1 ? 'text-gold/40' : 'text-foreground-secondary/20'}`}>{pos.rank}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ===== Podium — Mobile (stacked cards) ===== */}
            <div className="flex md:hidden flex-col gap-3 mb-6">
              {top3.map((entry, idx) => {
                const pos = positions[idx];
                if (!pos) return null;
                const PosIcon = pos.icon;
                const isVerified = !entry.hide_identity && entry.avatar_url;
                return (
                  <motion.div
                    key={entry.user_id || idx}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.35 }}
                    className={`flex items-center gap-4 p-4 rounded-xl bg-card border ${pos.rank === 1 ? 'border-gold/30' : 'border-border'} ${pos.rank === 1 ? 'bg-gold/5' : ''}`}
                  >
                    {/* Rank badge */}
                    <div className={`w-10 h-10 rounded-full ${pos.badgeBg} flex items-center justify-center shrink-0`}>
                      <PosIcon className="w-5 h-5" />
                    </div>

                    {/* Avatar */}
                    <div className={`relative rounded-full border-2 ${pos.ringColor} shrink-0 overflow-hidden`}>
                      {renderAvatar(entry, 'w-14 h-14')}
                      {isVerified && (
                        <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary border-2 border-card flex items-center justify-center">
                          <Star className="w-2.5 h-2.5 text-background fill-background" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">{getDisplayName(entry)}</p>
                      <p className="text-xs text-foreground-secondary/70">{pos.label}</p>
                    </div>

                    {/* Points */}
                    <div className="text-center shrink-0">
                      <p className="text-gold font-bold text-lg">{entry.lab_points}</p>
                      <p className="text-xs text-foreground-secondary">{t('common.points')}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* View full leaderboard button */}
            <div className="text-center">
              <Link
                to="/leaderboard"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-card border border-border text-foreground rounded-lg font-medium text-sm hover:border-gold/40 hover:text-gold transition-colors duration-200"
              >
                <Trophy className="w-4 h-4 text-gold" /> {t('home.viewLeaderboard')} <Arrow className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}