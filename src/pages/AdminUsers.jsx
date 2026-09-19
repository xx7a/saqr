import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Shield, UserCircle, Trash2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { SkeletonCard, EmptyState, AnimatedButton } from '@/components/AnimationSystem';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';

export default function AdminUsers() {
  const { t, lang, dir } = useTranslation();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await base44.entities.User.list('-created_date', 100);
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await base44.functions.invoke('updateUserRole', { targetUserId: userId, newRole });
      if (res?.data?.success) {
        toast.success(lang === 'ar' ? 'تم تحديث الدور' : 'Role updated');
        loadUsers();
      } else {
        toast.error(res?.data?.error || (lang === 'ar' ? 'لا يمكنك تغيير دور المستخدم' : 'You cannot change this user\'s role'));
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || (lang === 'ar' ? 'لا يمكنك تغيير دور المستخدم' : 'You cannot change this user\'s role');
      toast.error(msg);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('layout.adminUsers')}</h1>
            <p className="text-foreground-secondary text-sm mt-1">{users.length} {lang === 'ar' ? 'مستخدم' : 'users'}</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-foreground-secondary absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search') + '...'}
              className="bg-card border border-border rounded-lg pr-10 pl-4 py-2 text-foreground text-sm focus:border-primary/50 outline-none w-64"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState icon={Users} title={lang === 'ar' ? 'لا يوجد مستخدمون' : 'No users'} message={lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results'} />
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
                  <p className="font-medium text-foreground truncate">{u.full_name || (lang === 'ar' ? 'بدون اسم' : 'No name')}</p>
                  <p className="text-sm text-foreground-secondary truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.id === currentUser?.id ? (
                    <span className="px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs font-medium">
                      {lang === 'ar' ? 'أنت (مدير)' : 'You (Admin)'}
                    </span>
                    ) : u.role === 'admin' ? (
                    <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                      {lang === 'ar' ? 'مدير' : 'Admin'}
                    </span>
                    ) : (
                    <select
                      value={u.role || 'student'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-card border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:border-primary/50 outline-none"
                    >
                      <option value="student">{lang === 'ar' ? 'طالب' : 'Student'}</option>
                      <option value="admin">{lang === 'ar' ? 'مدير' : 'Admin'}</option>
                    </select>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}