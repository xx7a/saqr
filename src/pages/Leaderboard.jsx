import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Crown, Medal, FlaskConical, ChevronRight, ChevronLeft, User, TrendingUp } from 'lucide-react';
import Layout from '@/components/Layout';
import { EmptyState, SkeletonCard, RippleButton } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';

const PAGE_SIZE = 20;

export default function Leaderboard() {
  const { t, lang, dir } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [myRank, setMyRank] = useState(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const offset = page * PAGE_SIZE;
      const params = { limit: PAGE_SIZE, offset };
      if (user?.id) params.current_user_id = user.id;
      const res = await base44.functions.invoke('getLeaderboard', params);
      setEntries(res?.data?.leaderboard || []);
      setTotal(res?.data?.total || 0);
      setMyRank(res?.data?.current_user_rank || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const renderAvatar = (entry, size = 'w-10 h-10') => {
    if (entry.hide_identity) {
      return (
        <div className={`${size} rounded-full bg-card border border-border flex items-center justify-center`}>
          <User className="w-1/2 h-1/2 text-foreground-secondary" />
        </div>
      );
    }
    if (entry.avatar_url) {
      return <img src={entry.avatar_url} alt={entry.display_name} className={`${size} rounded-full object-cover`} />;
    }
    return (
      <div className={`${size} rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold`}>
        {(entry.display_name || (lang === 'ar' ? 'م' : 'S'))[0]}
      </div>
    );
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return { bg: 'bg-gold/10', border: 'border-gold/30', badge: 'bg-gold text-background', icon: Crown };
    if (rank === 2) return { bg: 'bg-slate-300/10', border: 'border-slate-300/30', badge: 'bg-slate-300 text-slate-900', icon: Medal };
    if (rank === 3) return { bg: 'bg-amber-700/10', border: 'border-amber-700/30', badge: 'bg-amber-700 text-white', icon: Medal };
    return { bg: 'bg-card', border: 'border-border', badge: 'bg-card text-foreground-secondary border border-border', icon: null };
  };

  if (loading && page === 0) {
    return (
      <Layout role="student">
        <div className="space-y-4">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-96" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="student">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3">
            <Trophy className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-primary">{t('leaderboard.title')}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('leaderboard.heading')}</h1>
          <p className="text-foreground-secondary text-sm">
            {t('leaderboard.description')}
          </p>
        </motion.div>

        {/* My rank card */}
        {user && user.role === 'student' && myRank && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card-base p-4 ${myRank.rank ? 'border-primary/30' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                {myRank.hide_identity ? (
                  <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center">
                    <User className="w-6 h-6 text-foreground-secondary" />
                  </div>
                ) : myRank.avatar_url ? (
                  <img src={myRank.avatar_url} alt={myRank.display_name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                    {(myRank.display_name || (lang === 'ar' ? 'ط' : 'S'))[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground-secondary mb-0.5">{t('leaderboard.yourRank')}</p>
                {myRank.rank ? (
                  <p className="font-bold text-foreground">
                    {t('leaderboard.rank')} <span className="text-primary">#{myRank.rank}</span>
                    <span className="text-foreground-secondary font-normal text-sm mr-2">— {myRank.lab_points} {t('leaderboard.points')} · {myRank.labs_completed} {t('leaderboard.labs')}</span>
                  </p>
                ) : (
                  <p className="text-sm text-foreground-secondary">{t('leaderboard.noRank')}</p>
                )}
              </div>
              {!myRank.rank && (
                <Link
                  to="/labs"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
                >
                  <FlaskConical className="w-4 h-4" /> {t('leaderboard.startLab')}
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Leaderboard list */}
        {entries.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={t('leaderboard.empty')}
            message={t('leaderboard.emptyMsg')}
            action={
              <Link to="/labs" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                <FlaskConical className="w-4 h-4" /> {t('leaderboard.exploreLabs')} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const style = getRankStyle(entry.rank);
              const Icon = style.icon;
              const isMe = user && entry.user_id === user.id;
              return (
                <motion.div
                  key={entry.user_id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${style.bg} ${style.border} ${isMe ? 'ring-2 ring-primary/40' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full ${style.badge} flex items-center justify-center font-bold text-sm shrink-0`}>
                    {Icon ? <Icon className="w-4 h-4" /> : entry.rank}
                  </div>
                  <div className="shrink-0">
                    {renderAvatar(entry, 'w-10 h-10')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">
                      {entry.hide_identity ? t('leaderboard.anonymous') : entry.display_name}
                      {isMe && <span className="text-primary text-xs mr-2">({t('leaderboard.you')})</span>}
                    </p>
                    <p className="text-xs text-foreground-secondary flex items-center gap-1">
                      <FlaskConical className="w-3 h-3" /> {entry.labs_completed} {t('leaderboard.labsCompleted')}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-bold text-gold text-lg">{entry.lab_points}</p>
                    <p className="text-xs text-foreground-secondary">{t('leaderboard.points')}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0 || loading}
              className="p-2 rounded-lg bg-card border border-border text-foreground-secondary hover:text-foreground disabled:opacity-40 transition-colors"
            >
              {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <span className="text-sm text-foreground-secondary px-3">
              {t('leaderboard.page')} {page + 1} {t('leaderboard.of')} {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="p-2 rounded-lg bg-card border border-border text-foreground-secondary hover:text-foreground disabled:opacity-40 transition-colors"
            >
              {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}