import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Edit2, Trash2, X, Save, Send } from 'lucide-react';
import Layout from '@/components/Layout';
import { AnimatedButton, SkeletonCard, EmptyState } from '@/components/AnimationSystem';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export default function AdminAnnouncements() {
  const { t, lang, dir } = useTranslation();
  const [announcements, setAnnouncements] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [annData, usersData] = await Promise.all([
        base44.entities.Announcement.list('-created_date', 50),
        base44.entities.User.list('-created_date', 200),
      ]);
      setAnnouncements(annData || []);
      setUsers(usersData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editing?.id) {
        await base44.entities.Announcement.update(editing.id, data);
        toast.success(lang === 'ar' ? 'تم التحديث' : 'Updated');
      } else {
        const created = await base44.entities.Announcement.create({
          ...data,
          created_date: new Date().toISOString(),
        });

        // Send notifications to target users
        const targetUsers = data.target_audience === 'all'
          ? users
          : users.filter((u) => u.role === data.target_audience);

        if (targetUsers.length > 0 && targetUsers.length <= 100) {
          await base44.entities.Notification.bulkCreate(
            targetUsers.map((u) => ({
              user_id: u.id,
              title: data.title,
              message: data.message,
              type: 'announcement',
              is_read: false,
              created_date: new Date().toISOString(),
            }))
          );
          toast.success(lang === 'ar' ? `تم إرسال الإشعار إلى ${targetUsers.length} مستخدم` : `Notification sent to ${targetUsers.length} users`);
        }

        toast.success(lang === 'ar' ? 'تمت الإضافة' : 'Added');
      }
      setShowForm(false);
      setEditing(null);
      loadData();
    } catch (e) {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) return;
    try {
      await base44.entities.Announcement.delete(id);
      toast.success(lang === 'ar' ? 'تم الحذف' : 'Deleted');
      loadData();
    } catch (e) {
      toast.error(t('common.error'));
    }
  };

  if (loading) {
    return (
      <Layout role="admin">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-20" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" /> {t('layout.adminAnnouncements')}
            </h1>
            <p className="text-foreground-secondary text-sm mt-1">{announcements.length} {lang === 'ar' ? 'إعلان' : 'announcements'}</p>
          </div>
          <AnimatedButton onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> {lang === 'ar' ? 'إعلان جديد' : 'New announcement'}
          </AnimatedButton>
        </div>

        {announcements.length === 0 ? (
          <EmptyState icon={Bell} title={lang === 'ar' ? 'لا توجد إعلانات' : 'No announcements'} message={lang === 'ar' ? 'ابدأ بإضافة إعلان جديد' : 'Start by adding a new announcement'} />
        ) : (
          <div className="space-y-3">
            {announcements.map((ann, i) => (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card-base p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{ann.title}</h3>
                    <p className="text-sm text-foreground-secondary mt-1">{ann.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-foreground-secondary">
                      <span>{lang === 'ar' ? 'الجمهور' : 'Audience'}: {ann.target_audience === 'all' ? (lang === 'ar' ? 'الجميع' : 'All') : ann.target_audience === 'students' ? (lang === 'ar' ? 'الطلاب' : 'Students') : ann.target_audience === 'instructors' ? (lang === 'ar' ? 'المدربون' : 'Instructors') : (lang === 'ar' ? 'المديرون' : 'Admins')}</span>
                      <span>•</span>
                      <span>{new Date(ann.created_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditing(ann); setShowForm(true); }} className="p-2 text-foreground-secondary hover:text-primary">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(ann.id)} className="p-2 text-foreground-secondary hover:text-danger">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <AnnouncementForm
            editing={editing}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

function AnnouncementForm({ editing, onSave, onClose }) {
  const { t, lang, dir } = useTranslation();
  const [form, setForm] = useState(editing || {
    title: '',
    message: '',
    target_audience: 'all',
    is_published: true,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background-secondary border border-border rounded-2xl p-6 max-w-lg w-full"
        dir={dir}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">{editing ? (lang === 'ar' ? 'تعديل إعلان' : 'Edit announcement') : (lang === 'ar' ? 'إعلان جديد' : 'New announcement')}</h2>
          <button onClick={onClose} className="p-2 text-foreground-secondary hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('admin.title')}</label>
            <input
              type="text"
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{lang === 'ar' ? 'الرسالة' : 'Message'}</label>
            <textarea
              value={form.message || ''}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{lang === 'ar' ? 'الجمهور المستهدف' : 'Target audience'}</label>
            <select
              value={form.target_audience || 'all'}
              onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
            >
              <option value="all">{lang === 'ar' ? 'الجميع' : 'All'}</option>
              <option value="students">{lang === 'ar' ? 'الطلاب' : 'Students'}</option>
              <option value="instructors">{lang === 'ar' ? 'المدربون' : 'Instructors'}</option>
              <option value="admins">{lang === 'ar' ? 'المديرون' : 'Admins'}</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2.5 bg-card border border-border text-foreground rounded-lg text-sm">{t('common.cancel')}</button>
          <AnimatedButton onClick={() => onSave(form)}>
            <Save className="w-4 h-4" /> {lang === 'ar' ? 'حفظ وإرسال' : 'Save & send'}
          </AnimatedButton>
        </div>
      </motion.div>
    </motion.div>
  );
}