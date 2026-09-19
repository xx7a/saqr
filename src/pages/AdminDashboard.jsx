import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, BookOpen, Award, TrendingUp, FlaskConical,
  Shield, FileText, Bell, Settings, ChevronLeft, Activity
} from 'lucide-react';
import Layout from '@/components/Layout';
import { StaggerContainer, StaggerItem, AnimatedNumber, SkeletonCard } from '@/components/AnimationSystem';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/lib/i18n';

export default function AdminDashboard() {
  const { t, lang, dir } = useTranslation();
  const [stats, setStats] = useState({ students: 0, lessons: 0, labs: 0, certificates: 0, tracks: 0, subjects: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [users, tracks, subjects, lessons, labs, certs] = await Promise.all([
        base44.entities.User.list('-created_date', 10).catch(() => []),
        base44.entities.Track.list().catch(() => []),
        base44.entities.Subject.list().catch(() => []),
        base44.entities.Lesson.list().catch(() => []),
        base44.entities.Lab.list().catch(() => []),
        base44.entities.Certificate.list().catch(() => []),
      ]);

      setStats({
        students: users?.length || 0,
        tracks: tracks?.length || 0,
        subjects: subjects?.length || 0,
        lessons: lessons?.length || 0,
        labs: labs?.length || 0,
        certificates: certs?.length || 0,
      });
      setRecentUsers(users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { icon: Users, label: lang === 'ar' ? 'الطلاب' : 'Students', value: stats.students, color: 'primary', link: '/admin/users' },
    { icon: BookOpen, label: lang === 'ar' ? 'المسارات' : 'Tracks', value: stats.tracks, color: 'secondary', link: '/admin/tracks' },
    { icon: FileText, label: lang === 'ar' ? 'المواد' : 'Subjects', value: stats.subjects, color: 'primary', link: '/admin/subjects' },
    { icon: BookOpen, label: lang === 'ar' ? 'الدروس' : 'Lessons', value: stats.lessons, color: 'secondary', link: '/admin/lessons' },
    { icon: FlaskConical, label: lang === 'ar' ? 'المختبرات' : 'Labs', value: stats.labs, color: 'primary', link: '/admin/labs' },
    { icon: Award, label: lang === 'ar' ? 'الشهادات' : 'Certificates', value: stats.certificates, color: 'gold', link: '/admin/certificates' },
  ];

  const quickLinks = [
    { label: t('admin.curriculum'), path: '/admin/curriculum', icon: BookOpen },
    { label: t('layout.adminTracks'), path: '/admin/tracks', icon: BookOpen },
    { label: t('layout.adminSubjects'), path: '/admin/subjects', icon: FileText },
    { label: t('layout.adminLessons'), path: '/admin/lessons', icon: BookOpen },
    { label: t('layout.adminActivities'), path: '/admin/activities', icon: FlaskConical },
    { label: t('layout.adminLabs'), path: '/admin/labs', icon: FlaskConical },
    { label: t('layout.adminUsers'), path: '/admin/users', icon: Users },
    { label: t('layout.adminAnnouncements'), path: '/admin/announcements', icon: Bell },
    { label: t('layout.adminSettings'), path: '/admin/settings', icon: Settings },
  ];

  if (loading) {
    return (
      <Layout role="admin">
        <div className="space-y-6">
          <SkeletonCard className="h-20" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} className="h-24" />)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('layout.adminOverview')}</h1>
          <p className="text-foreground-secondary text-sm">{lang === 'ar' ? 'إحصائيات وبيانات المنصة' : 'Platform statistics and data'}</p>
        </motion.div>

        {/* Stats */}
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((s, i) => (
            <StaggerItem key={i}>
              <Link to={s.link} className="block">
                <div className="card-base p-5 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      s.color === 'primary' ? 'bg-primary/10 text-primary' :
                      s.color === 'secondary' ? 'bg-secondary/10 text-secondary' :
                      'bg-gold/10 text-gold'
                    }`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <ChevronLeft className="w-4 h-4 text-foreground-secondary" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    <AnimatedNumber value={s.value} />
                  </p>
                  <p className="text-sm text-foreground-secondary mt-1">{s.label}</p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Quick links */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">{lang === 'ar' ? 'روابط سريعة' : 'Quick links'}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickLinks.map((link, i) => (
              <Link
                key={i}
                to={link.path}
                className="card-base p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
              >
                <link.icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="card-base p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> {t('admin.recentUsers')}
          </h2>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-foreground-secondary text-center py-8">{lang === 'ar' ? 'لا يوجد مستخدمون' : 'No users'}</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold">
                      {u.full_name?.[0] || u.email?.[0] || 'م'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.full_name || u.email}</p>
                      <p className="text-xs text-foreground-secondary">{u.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-secondary/10 text-secondary' :
                    u.role === 'instructor' ? 'bg-primary/10 text-primary' :
                    'bg-card text-foreground-secondary border border-border'
                  }`}>
                    {u.role === 'admin' ? (lang === 'ar' ? 'مدير' : 'Admin') : u.role === 'instructor' ? (lang === 'ar' ? 'مدرب' : 'Instructor') : (lang === 'ar' ? 'طالب' : 'Student')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}