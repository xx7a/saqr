import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '@/components/Layout';
import { EmptyState, SkeletonCard } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';

export default function Notifications() {
  const { t, lang, dir } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const data = await base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 50);
      setNotifications(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await base44.entities.Notification.update(id, { is_read: true });
      loadData();
    } catch (e) { console.error(e); }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.is_read);
      for (const n of unread) {
        await base44.entities.Notification.update(n.id, { is_read: true });
      }
      loadData();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-16" />)}
        </div>
      </Layout>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Layout role="student">
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" /> {t('layout.notifications')}
            </h1>
            <p className="text-foreground-secondary text-sm mt-1">
              {unreadCount > 0 ? `${unreadCount} ${lang === 'ar' ? 'إشعار غير مقروء' : 'unread notifications'}` : (lang === 'ar' ? 'لا توجد إشعارات غير مقروءة' : 'No unread notifications')}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-card border border-border text-foreground rounded-lg text-sm flex items-center gap-2 hover:border-primary/50 transition-colors"
            >
              <CheckCheck className="w-4 h-4" /> {lang === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all as read'}
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title={lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications'} message={lang === 'ar' ? 'ستظهر إشعاراتك هنا' : 'Your notifications will appear here'} />
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`card-base p-4 ${!n.is_read ? 'border-primary/30 bg-primary/5' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    n.is_read ? 'bg-card' : 'bg-primary/10'
                  }`}>
                    <Bell className={`w-4 h-4 ${n.is_read ? 'text-foreground-secondary' : 'text-primary'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="text-sm text-foreground-secondary mt-1">{n.message}</p>
                    <p className="text-xs text-foreground-secondary mt-2">
                      {new Date(n.created_date).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      {lang === 'ar' ? 'تعليم كمقروء' : 'Mark as read'}
                    </button>
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