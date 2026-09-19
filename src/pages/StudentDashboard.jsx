import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, BookOpen, Clock, FlaskConical, Lock, CheckCircle2,
  Play, ChevronLeft, ChevronRight, TrendingUp, Award, Bell, User, Target, Zap
} from 'lucide-react';
import Layout from '@/components/Layout';
import { StaggerContainer, StaggerItem, ProgressAnimation, EmptyState, SkeletonCard, AnimatedNumber } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { recomputeTrackProgress } from '@/lib/progressUtils';

export default function StudentDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [recentLessons, setRecentLessons] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [badges, setBadges] = useState([]);
  const [specEnrollment, setSpecEnrollment] = useState(null);
  const [trackData, setTrackData] = useState(null);
  const [specData, setSpecData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t, lang, dir } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [enrollData, notifData, badgeData, specEnrollData] = await Promise.all([
        base44.entities.TrackEnrollment.filter({ user_id: user.id }).catch(() => []),
        base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 5).catch(() => []),
        base44.entities.UserBadge.filter({ user_id: user.id }, '-earned_date', 10).catch(() => []),
        base44.entities.SpecializationEnrollment.filter({ user_id: user.id }).catch(() => []),
      ]);
      setEnrollments(enrollData || []);
      setNotifications(notifData || []);
      setBadges(badgeData || []);
      setSpecEnrollment(specEnrollData?.[0] || null);

      // Fetch track and specialization data for localized names
      if (enrollData?.[0]?.track_id) {
        try {
          const td = await base44.entities.Track.get(enrollData[0].track_id);
          setTrackData(td);
        } catch {}
      }
      if (specEnrollData?.[0]?.specialization_id) {
        try {
          const sd = await base44.entities.Specialization.get(specEnrollData[0].specialization_id);
          setSpecData(sd);
        } catch {}
      }

      // Recompute and fix stale progress for each enrollment
      if (enrollData && enrollData.length > 0) {
        const recomputed = await Promise.all(
          enrollData.map(async (enroll) => {
            try {
              const result = await recomputeTrackProgress(user.id, enroll.track_id);
              return { ...enroll, progress_percent: result.percent, status: result.isComplete ? 'completed' : 'active' };
            } catch { return enroll; }
          })
        );
        setEnrollments(recomputed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentEnrollment = enrollments[0];

  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-6">
          <SkeletonCard className="h-32" />
          <div className="grid md:grid-cols-3 gap-4">
            <SkeletonCard className="h-24" />
            <SkeletonCard className="h-24" />
            <SkeletonCard className="h-24" />
          </div>
          <SkeletonCard className="h-64" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="student">
      <div className="space-y-6">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {t('dashboard.welcome')}, {user?.full_name || user?.email?.split('@')[0]} 👋
              </h1>
              <p className="text-foreground-secondary text-sm">
                {currentEnrollment ? t('dashboard.continueLearning') : t('dashboard.startLearning')}
              </p>
            </div>
            {currentEnrollment ? (
              <Link
                to="/my-subjects"
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors duration-180 flex items-center gap-2"
              >
                {t('dashboard.continueLearning')} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Link>
                ) : (
                <Link
                to="/tracks"
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors duration-180 flex items-center gap-2"
                >
                {t('dashboard.startLearning')} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Link>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StaggerItem>
            <StatCard icon={TrendingUp} label={t('dashboard.yourProgress')} value={`${currentEnrollment?.progress_percent || 0}%`} color="primary" />
          </StaggerItem>
          <StaggerItem>
            <StatCard icon={Zap} label={t('dashboard.totalPoints')} value={user?.total_points || 0} color="gold" />
          </StaggerItem>
          <StaggerItem>
            <StatCard icon={Award} label={t('dashboard.yourBadges')} value={badges.length} color="secondary" />
          </StaggerItem>
          <StaggerItem>
            <StatCard icon={Clock} label={lang === 'ar' ? 'وقت التعلم' : 'Learning time'} value={`${Math.floor((currentEnrollment?.learning_time_minutes || 0) / 60)}${lang === 'ar' ? 'س' : 'h'}`} color="success" />
          </StaggerItem>
        </StaggerContainer>

        {/* Current specialization */}
        {specEnrollment && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-secondary flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{specData ? (lang === 'ar' ? specData.name_ar : (specData.name_en || specData.name_ar)) : specEnrollment.specialization_name}</h3>
                  <p className="text-sm text-foreground-secondary">{t('dashboard.specializationStatus')}</p>
                </div>
              </div>
              <Link
                to={`/specialization/${specEnrollment.specialization_id}`}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors duration-180 flex items-center gap-2"
              >
                {t('dashboard.continueLearning')} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Link>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-foreground-secondary">{t('subject.progress')}</span>
                <span className="font-bold text-primary">{specEnrollment.progress_percent || 0}%</span>
              </div>
              <ProgressAnimation percent={specEnrollment.progress_percent || 0} />
            </div>
          </motion.div>
        )}

        {/* Current track + notifications */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Current track */}
          <div className="lg:col-span-2 space-y-6">
            {currentEnrollment ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-base p-6"
              >
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> {t('dashboard.currentTrack')}
                </h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{trackData ? localized(trackData, 'name', lang) : currentEnrollment.track_name}</h3>
                    <p className="text-sm text-foreground-secondary">{lang === 'ar' ? 'آخر زيارة:' : 'Last visit:'} {new Date(currentEnrollment.enrolled_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-foreground-secondary">{t('subject.progress')}</span>
                    <span className="font-bold text-primary">{currentEnrollment.progress_percent || 0}%</span>
                  </div>
                  <ProgressAnimation percent={currentEnrollment.progress_percent || 0} />
                </div>
                <Link
                  to="/my-subjects"
                  className="block w-full text-center py-2.5 bg-card border border-border text-foreground rounded-lg font-medium hover:border-primary/40 transition-colors duration-180"
                >
                  {t('layout.mySubjects')}
                </Link>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-base p-6"
              >
                <h2 className="text-lg font-bold text-foreground mb-4">{t('dashboard.startLearning')}</h2>
                <p className="text-foreground-secondary text-sm mb-4">{t('dashboard.noEnrollment')} {t('dashboard.exploreTracks')}</p>
                <Link
                  to="/tracks"
                  className="block w-full text-center py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors duration-180"
                >
                  {t('dashboard.exploreTracks')}
                </Link>
              </motion.div>
            )}

            {/* Badges */}
            {badges.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-base p-6"
              >
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-gold" /> {t('dashboard.yourBadges')}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {badges.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/10 border border-gold/30">
                      <Award className="w-4 h-4 text-gold" />
                      <span className="text-sm text-foreground">{b.badge_name}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-6"
          >
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" /> {t('layout.notifications')}
            </h2>
            {notifications.length === 0 ? (
              <p className="text-sm text-foreground-secondary text-center py-8">{t('dashboard.noNotifications')}</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n, i) => (
                  <div key={n.id || i} className={`p-3 rounded-lg border ${n.is_read ? 'bg-card border-border' : 'bg-primary/5 border-primary/20'}`}>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-foreground-secondary mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    primary: 'text-primary bg-primary/10',
    gold: 'text-gold bg-gold/10',
    secondary: 'text-secondary bg-secondary/10',
    success: 'text-success bg-success/10',
  };
  return (
    <div className="card-base p-4">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-foreground">{typeof value === 'number' ? <AnimatedNumber value={value} /> : value}</p>
      <p className="text-xs text-foreground-secondary mt-1">{label}</p>
    </div>
  );
}