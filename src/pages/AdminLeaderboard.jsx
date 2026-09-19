import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, Search, X, Pin, PinOff, Info, UserPlus, RefreshCw, Trash2, Star, UserMinus, RotateCcw } from 'lucide-react';
import Layout from '@/components/Layout';
import { SkeletonCard, AnimatedButton } from '@/components/AnimationSystem';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export default function AdminLeaderboard() {
  const { t, lang, dir } = useTranslation();
  const [top3, setTop3] = useState([]);
  const [pins, setPins] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pinningPosition, setPinningPosition] = useState(null);
  const [saving, setSaving] = useState(false);
  const [excludedUsers, setExcludedUsers] = useState([]);
  const [excludeSearch, setExcludeSearch] = useState('');
  const [showExcludeModal, setShowExcludeModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lbRes, pinsData, usersData] = await Promise.all([
        base44.functions.invoke('getLeaderboard', { top: '3' }),
        base44.entities.LeaderboardPin.list('position', 10).catch(() => []),
        base44.entities.User.list('-created_date', 200),
      ]);
      setTop3(lbRes?.data?.leaderboard || []);
      setPins(pinsData || []);
      setUsers(usersData || []);
      setExcludedUsers((usersData || []).filter((u) => u.excluded_from_leaderboard === true));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getPinForPosition = (pos) => pins.find(p => p.position === pos);

  const pinnedUserIds = pins.filter(p => p.position !== pinningPosition).map(p => p.user_id);

  const filteredUsers = users.filter((u) =>
    u.role !== 'admin' &&
    !u.is_test_account &&
    !pinnedUserIds.includes(u.id) &&
    (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const handlePin = async (userId, userName) => {
    setSaving(true);
    try {
      const existingPin = getPinForPosition(pinningPosition);
      if (existingPin) {
        await base44.entities.LeaderboardPin.delete(existingPin.id);
      }
      await base44.entities.LeaderboardPin.create({
        position: pinningPosition,
        user_id: userId,
        user_name: userName,
      });
      toast.success(t('adminLeaderboard.pinSuccess'));
      setPinningPosition(null);
      setSearch('');
      loadData();
    } catch (e) {
      toast.error(t('adminLeaderboard.pinError'));
    }
    setSaving(false);
  };

  const handleUnpin = async (pos) => {
    if (!confirm(t('adminLeaderboard.confirmUnpin'))) return;
    setSaving(true);
    try {
      const pin = getPinForPosition(pos);
      if (pin) {
        await base44.entities.LeaderboardPin.delete(pin.id);
        toast.success(t('adminLeaderboard.unpinSuccess'));
        loadData();
      }
    } catch (e) {
      toast.error(t('adminLeaderboard.unpinError'));
    }
    setSaving(false);
  };

  const handleExclude = async (userId) => {
    if (!confirm(t('adminLeaderboard.confirmExclude'))) return;
    setSaving(true);
    try {
      // Remove any pin for this user first
      const userPins = pins.filter((p) => p.user_id === userId);
      for (const p of userPins) {
        await base44.entities.LeaderboardPin.delete(p.id);
      }
      await base44.entities.User.update(userId, { excluded_from_leaderboard: true });
      toast.success(t('adminLeaderboard.excludeSuccess'));
      setShowExcludeModal(false);
      setExcludeSearch('');
      loadData();
    } catch (e) {
      toast.error(t('adminLeaderboard.excludeError'));
    }
    setSaving(false);
  };

  const handleRestore = async (userId) => {
    setSaving(true);
    try {
      await base44.entities.User.update(userId, { excluded_from_leaderboard: false });
      toast.success(t('adminLeaderboard.restoreSuccess'));
      loadData();
    } catch (e) {
      toast.error(t('adminLeaderboard.restoreError'));
    }
    setSaving(false);
  };

  const excludableUsers = users.filter(
    (u) =>
      u.role !== 'admin' &&
      !u.is_test_account &&
      u.excluded_from_leaderboard !== true &&
      (u.full_name?.toLowerCase().includes(excludeSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(excludeSearch.toLowerCase()))
  );

  const getDisplayName = (entry) => entry.hide_identity ? t('leaderboard.anonymous') : (entry.display_name || (lang === 'ar' ? 'متصدّر' : 'Leader'));

  const renderAvatar = (entry, size = 'w-12 h-12') => {
    if (entry.hide_identity) {
      return (
        <div className={`${size} rounded-full bg-card border border-border flex items-center justify-center shrink-0`}>
          <Search className="w-1/2 h-1/2 text-foreground-secondary" />
        </div>
      );
    }
    if (entry.avatar_url) {
      return <img src={entry.avatar_url} alt={entry.display_name} className={`${size} rounded-full object-cover shrink-0`} />;
    }
    return (
      <div className={`${size} rounded-full bg-gradient-primary flex items-center justify-center text-white text-lg font-bold shrink-0`}>
        {(entry.display_name || (lang === 'ar' ? 'م' : 'S'))[0]}
      </div>
    );
  };

  const positionStyles = [
    { icon: Crown, badge: 'bg-gold text-background', label: t('leaderboard.gold'), ring: 'border-gold/40' },
    { icon: Medal, badge: 'bg-slate-300 text-slate-900', label: t('leaderboard.silver'), ring: 'border-slate-300/40' },
    { icon: Medal, badge: 'bg-amber-700 text-white', label: t('leaderboard.bronze'), ring: 'border-amber-700/40' },
  ];

  if (loading) {
    return (
      <Layout role="admin">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-32" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold" /> {t('adminLeaderboard.title')}
          </h1>
          <p className="text-foreground-secondary text-sm mt-1">{t('adminLeaderboard.desc')}</p>
        </div>

        {/* Info banner */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground-secondary">{t('adminLeaderboard.pinDescription')}</p>
        </div>

        {/* Add leader button */}
        <button
          onClick={() => setPinningPosition(1)}
          disabled={saving}
          className="px-4 py-2.5 rounded-lg bg-gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> {t('adminLeaderboard.addLeader')}
        </button>

        {/* Top 3 positions */}
        <div className="space-y-3">
          {top3.map((entry, idx) => {
            const pos = idx + 1;
            const pin = getPinForPosition(pos);
            const isPinned = !!pin;
            const style = positionStyles[idx];
            const PosIcon = style.icon;

            return (
              <motion.div
                key={pos}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`card-base p-5 ${isPinned ? 'border-gold/30 bg-gold/5' : ''}`}
              >
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Position badge */}
                  <div className={`w-12 h-12 rounded-full ${style.badge} flex items-center justify-center font-bold text-lg shrink-0`}>
                    <PosIcon className="w-6 h-6" />
                  </div>

                  {/* Avatar */}
                  {renderAvatar(entry)}

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-medium text-foreground-secondary">
                        {t('adminLeaderboard.position')} {pos}
                      </span>
                      {isPinned ? (
                        <span className="px-2 py-0.5 rounded-full bg-gold/10 text-gold text-xs font-medium border border-gold/20 flex items-center gap-1">
                          <Pin className="w-3 h-3" /> {t('adminLeaderboard.pinnedManually')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> {t('adminLeaderboard.autoByPoints')}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-foreground truncate">{getDisplayName(entry)}</p>
                    <p className="text-sm text-gold font-bold">{entry.lab_points} {t('common.points')}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isPinned ? (
                      <>
                        <button
                          onClick={() => setPinningPosition(pos)}
                          disabled={saving}
                          className="px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-medium hover:border-primary/40 transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-4 h-4" /> {t('adminLeaderboard.replaceUser')}
                        </button>
                        <button
                          onClick={() => handleUnpin(pos)}
                          disabled={saving}
                          className="px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm font-medium hover:bg-danger/20 transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" /> {t('adminLeaderboard.removeFromTop3')}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setPinningPosition(pos)}
                        disabled={saving}
                        className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                      >
                        <UserPlus className="w-4 h-4" /> {t('adminLeaderboard.pinUser')}
                      </button>
                    )}
                    <button
                      onClick={() => handleExclude(entry.user_id)}
                      disabled={saving}
                      className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-colors"
                      title={t('adminLeaderboard.excludeFromLeaderboard')}
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {top3.length === 0 && (
            <div className="text-center py-12 text-foreground-secondary text-sm">
              {t('adminLeaderboard.noUsersWithPoints')}
            </div>
          )}
        </div>

        {/* Excluded users section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-danger" /> {t('adminLeaderboard.excludedTitle')}
              </h2>
              <p className="text-foreground-secondary text-sm mt-1">{t('adminLeaderboard.excludedDesc')}</p>
            </div>
            <button
              onClick={() => setShowExcludeModal(true)}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-danger/10 border border-danger/20 text-danger font-medium text-sm hover:bg-danger/20 transition-colors flex items-center gap-2"
            >
              <UserMinus className="w-4 h-4" /> {t('adminLeaderboard.excludeUser')}
            </button>
          </div>

          {excludedUsers.length === 0 ? (
            <div className="card-base p-6 text-center text-foreground-secondary text-sm">
              {t('adminLeaderboard.noExcluded')}
            </div>
          ) : (
            <div className="space-y-2">
              {excludedUsers.map((u) => (
                <div key={u.id} className="card-base p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                    <UserMinus className="w-5 h-5 text-danger" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{u.full_name || u.email || (lang === 'ar' ? 'بدون اسم' : 'No name')}</p>
                    <p className="text-xs text-foreground-secondary truncate">{u.email}</p>
                  </div>
                  <span className="text-sm text-gold font-bold shrink-0">{u.lab_points || 0} {t('adminLeaderboard.pointsLabel')}</span>
                  <button
                    onClick={() => handleRestore(u.id)}
                    disabled={saving}
                    className="px-3 py-2 rounded-lg bg-success/10 border border-success/20 text-success text-sm font-medium hover:bg-success/20 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" /> {t('adminLeaderboard.restore')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pin user modal */}
      <AnimatePresence>
        {pinningPosition && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setPinningPosition(null); setSearch(''); }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
            >
              <div className="card-base p-6 w-full max-w-lg my-8" dir={dir}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">
                    {t('adminLeaderboard.pinToPosition')} {pinningPosition}
                  </h2>
                  <button onClick={() => { setPinningPosition(null); setSearch(''); }} className="p-2 text-foreground-secondary hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Position selector */}
                <div className="mb-4">
                  <label className="text-sm text-foreground-secondary mb-2 block">{t('adminLeaderboard.selectPosition')}</label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((p) => (
                      <button
                        key={p}
                        onClick={() => setPinningPosition(p)}
                        className={`flex-1 py-2.5 rounded-lg border font-medium text-sm transition-colors ${
                          pinningPosition === p
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-card border-border text-foreground hover:border-primary/40'
                        }`}
                      >
                        {t('adminLeaderboard.position')} {p}
                      </button>
                    ))}
                  </div>
                </div>

                {getPinForPosition(pinningPosition) && (
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 mb-4 text-sm text-warning flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    {t('adminLeaderboard.replaceWarning')}
                  </div>
                )}

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="w-4 h-4 text-foreground-secondary absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('adminLeaderboard.searchUser')}
                    className="w-full bg-card border border-border rounded-lg pr-10 pl-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
                  />
                </div>

                {/* User list */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-sm text-foreground-secondary text-center py-4">{t('adminLeaderboard.noUsers')}</p>
                  ) : (
                    filteredUsers.slice(0, 20).map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handlePin(u.id, u.full_name || u.email)}
                        disabled={saving}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors text-right"
                      >
                        <div className="relative shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.full_name} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold">
                              {u.full_name?.[0] || u.email?.[0] || (lang === 'ar' ? 'م' : 'S')}
                            </div>
                          )}
                          {u.avatar_url && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary border-2 border-card flex items-center justify-center">
                              <Star className="w-2 h-2 text-background fill-background" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{u.full_name || (lang === 'ar' ? 'بدون اسم' : 'No name')}</p>
                          <p className="text-xs text-foreground-secondary truncate">{u.email}</p>
                        </div>
                        <div className="text-center shrink-0">
                          <p className="text-sm font-bold text-gold">{u.lab_points || 0}</p>
                          <p className="text-xs text-foreground-secondary">{t('adminLeaderboard.pointsLabel')}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Exclude user modal */}
      <AnimatePresence>
        {showExcludeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowExcludeModal(false); setExcludeSearch(''); }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
            >
              <div className="card-base p-6 w-full max-w-lg my-8" dir={dir}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <UserMinus className="w-5 h-5 text-danger" /> {t('adminLeaderboard.excludeUser')}
                  </h2>
                  <button onClick={() => { setShowExcludeModal(false); setExcludeSearch(''); }} className="p-2 text-foreground-secondary hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 mb-4 text-sm text-danger flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  {t('adminLeaderboard.excludeWarning')}
                </div>

                <div className="relative mb-4">
                  <Search className="w-4 h-4 text-foreground-secondary absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={excludeSearch}
                    onChange={(e) => setExcludeSearch(e.target.value)}
                    placeholder={t('adminLeaderboard.searchUser')}
                    className="w-full bg-card border border-border rounded-lg pr-10 pl-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {excludableUsers.length === 0 ? (
                    <p className="text-sm text-foreground-secondary text-center py-4">{t('adminLeaderboard.noUsers')}</p>
                  ) : (
                    excludableUsers.slice(0, 20).map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleExclude(u.id)}
                        disabled={saving}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-danger/40 transition-colors text-right"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {u.full_name?.[0] || u.email?.[0] || (lang === 'ar' ? 'م' : 'S')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{u.full_name || (lang === 'ar' ? 'بدون اسم' : 'No name')}</p>
                          <p className="text-xs text-foreground-secondary truncate">{u.email}</p>
                        </div>
                        <div className="text-center shrink-0">
                          <p className="text-sm font-bold text-gold">{u.lab_points || 0}</p>
                          <p className="text-xs text-foreground-secondary">{t('adminLeaderboard.pointsLabel')}</p>
                        </div>
                        <UserMinus className="w-4 h-4 text-danger shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}