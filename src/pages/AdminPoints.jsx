import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Search, Plus, Minus, Target, X, Save } from 'lucide-react';
import Layout from '@/components/Layout';
import { SkeletonCard, EmptyState, AnimatedButton } from '@/components/AnimationSystem';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export default function AdminPoints() {
  const { t, lang, dir } = useTranslation();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState('add');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await base44.entities.User.list('-created_date', 200);
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openEditor = (user) => {
    setEditing(user);
    setAction('add');
    setAmount('');
    setShowModal(true);
  };

  const handleSave = async () => {
    const val = parseInt(amount);
    if (isNaN(val) || val < 0) {
      toast.error(lang === 'ar' ? 'أدخل رقمًا صحيحًا' : 'Enter a valid number');
      return;
    }
    setSaving(true);
    try {
      let newPoints;
      if (action === 'add') {
        newPoints = (editing.lab_points || 0) + val;
      } else if (action === 'subtract') {
        newPoints = Math.max(0, (editing.lab_points || 0) - val);
      } else {
        newPoints = val;
      }
      await base44.entities.User.update(editing.id, { lab_points: newPoints });
      toast.success(t('adminPoints.pointsUpdated'));
      setShowModal(false);
      setEditing(null);
      loadUsers();
    } catch (e) {
      toast.error(t('adminPoints.pointsUpdateError'));
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Layout role="admin">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} className="h-16" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-gold" /> {t('adminPoints.title')}
          </h1>
          <p className="text-foreground-secondary text-sm mt-1">{t('adminPoints.desc')}</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-foreground-secondary absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('adminPoints.searchUser')}
            className="bg-card border border-border rounded-lg pr-10 pl-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none w-full"
          />
        </div>

        {/* Users list */}
        {filteredUsers.length === 0 ? (
          <EmptyState icon={Star} title={t('adminPoints.noUsers')} message={t('adminPoints.noUsersDesc')} />
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="card-base p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {u.full_name?.[0] || u.email?.[0] || (lang === 'ar' ? 'م' : 'S')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {u.full_name || (lang === 'ar' ? 'بدون اسم' : 'No name')}
                    {u.role === 'admin' && <span className="text-xs text-secondary mr-2">({lang === 'ar' ? 'مدير' : 'Admin'})</span>}
                  </p>
                  <p className="text-sm text-foreground-secondary truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gold">{u.lab_points || 0}</p>
                    <p className="text-xs text-foreground-secondary">{t('adminPoints.currentPoints')}</p>
                  </div>
                  <AnimatedButton variant="secondary" onClick={() => openEditor(u)}>
                    {t('common.edit')}
                  </AnimatedButton>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {showModal && editing && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
            >
              <div className="card-base p-6 w-full max-w-md my-8" dir={dir}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">{t('adminPoints.selectUser')}</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 text-foreground-secondary hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {editing.full_name?.[0] || editing.email?.[0] || (lang === 'ar' ? 'م' : 'S')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{editing.full_name || (lang === 'ar' ? 'بدون اسم' : 'No name')}</p>
                    <p className="text-sm text-foreground-secondary truncate">{editing.email}</p>
                  </div>
                  <div className="text-center shrink-0">
                    <p className="text-lg font-bold text-gold">{editing.lab_points || 0}</p>
                    <p className="text-xs text-foreground-secondary">{t('adminPoints.currentPoints')}</p>
                  </div>
                </div>

                {/* Action tabs */}
                <div className="flex gap-2 mb-4">
                  {[
                    { key: 'add', label: t('adminPoints.addPoints'), icon: Plus },
                    { key: 'subtract', label: t('adminPoints.subtractPoints'), icon: Minus },
                    { key: 'set', label: t('adminPoints.setPoints'), icon: Target },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAction(opt.key)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                          action === opt.key
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'bg-card border border-border text-foreground-secondary hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Amount input */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t('adminPoints.enterAmount')}</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-lg font-bold focus:border-primary/50 outline-none text-center"
                  />
                  {amount && !isNaN(parseInt(amount)) && (
                    <p className="text-xs text-foreground-secondary mt-2 text-center">
                      {action === 'add' && `${(editing.lab_points || 0) + parseInt(amount)}`}
                      {action === 'subtract' && `${Math.max(0, (editing.lab_points || 0) - parseInt(amount))}`}
                      {action === 'set' && `${parseInt(amount)}`}
                      {' → ' + t('adminPoints.currentPoints')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 text-foreground-secondary hover:text-foreground">
                    {t('common.cancel')}
                  </button>
                  <AnimatedButton onClick={handleSave} loading={saving}>
                    <Save className="w-4 h-4" /> {t('common.save')}
                  </AnimatedButton>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}