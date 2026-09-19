import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award, Clock, Target, Zap, BookOpen, CheckCircle2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { ProgressAnimation, SkeletonCard, EmptyState, AnimatedNumber } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { recomputeTrackProgress } from '@/lib/progressUtils';

export default function Progress() {
  const { t, lang, dir } = useTranslation();
  const [enrollments, setEnrollments] = useState([]);
  const [lessonProgress, setLessonProgress] = useState([]);
  const [testAttempts, setTestAttempts] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [enrollData, progressData, testData, badgeData] = await Promise.all([
        base44.entities.TrackEnrollment.filter({ user_id: user.id }),
        base44.entities.LessonProgress.filter({ user_id: user.id }),
        base44.entities.TestAttempt.filter({ user_id: user.id }, '-completed_date', 20),
        base44.entities.UserBadge.filter({ user_id: user.id }, '-earned_date', 20),
      ]);
      setEnrollments(enrollData || []);
      setLessonProgress(progressData || []);
      setTestAttempts(testData || []);
      setBadges(badgeData || []);

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

  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-4">
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-64" />
        </div>
      </Layout>
    );
  }

  const completedLessons = lessonProgress.filter((p) => p.status === 'completed').length;
  const passedTests = testAttempts.filter((t) => t.passed).length;
  const avgScore = testAttempts.length > 0
    ? Math.round(testAttempts.reduce((sum, t) => sum + (t.score || 0), 0) / testAttempts.length)
    : 0;

  return (
    <Layout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" /> {t('layout.progress')}
          </h1>
          <p className="text-foreground-secondary text-sm mt-1">{lang === 'ar' ? 'متابعة رحلتك التعليمية' : 'Track your learning journey'}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBox icon={CheckCircle2} label={lang === 'ar' ? 'دروس مكتملة' : 'Lessons completed'} value={completedLessons} color="success" />
          <StatBox icon={Target} label={lang === 'ar' ? 'اختبارات مجتازة' : 'Tests passed'} value={passedTests} color="primary" />
          <StatBox icon={Award} label={lang === 'ar' ? 'متوسط الدرجات' : 'Average score'} value={`${avgScore}%`} color="gold" />
          <StatBox icon={Zap} label={lang === 'ar' ? 'النقاط' : 'Points'} value={user?.total_points || 0} color="secondary" />
        </div>

        {/* Track progress */}
        {enrollments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-6"
          >
            <h2 className="text-lg font-bold text-foreground mb-4">{lang === 'ar' ? 'تقدم المسارات' : 'Track progress'}</h2>
            <div className="space-y-4">
              {enrollments.map((enroll) => (
                <div key={enroll.id}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-foreground">{enroll.track_name}</span>
                    <span className="text-primary font-bold">{enroll.progress_percent || 0}%</span>
                  </div>
                  <ProgressAnimation percent={enroll.progress_percent || 0} />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Test results */}
        {testAttempts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-base p-6"
          >
            <h2 className="text-lg font-bold text-foreground mb-4">{lang === 'ar' ? 'آخر نتائج الاختبارات' : 'Recent test results'}</h2>
            <div className="space-y-2">
              {testAttempts.slice(0, 10).map((test) => (
                <div key={test.id} className="flex items-center justify-between p-3 rounded-lg bg-card">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      test.passed ? 'bg-success/10' : 'bg-danger/10'
                    }`}>
                      {test.passed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Target className="w-4 h-4 text-danger" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{lang === 'ar' ? 'اختبار مادة' : 'Subject test'}</p>
                      <p className="text-xs text-foreground-secondary">
                        {new Date(test.completed_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`text-lg font-bold ${test.passed ? 'text-success' : 'text-danger'}`}>{test.score}%</p>
                    <p className="text-xs text-foreground-secondary">{test.passed ? (lang === 'ar' ? 'ناجح' : 'Passed') : (lang === 'ar' ? 'راسب' : 'Failed')}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-base p-6"
          >
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-gold" /> {lang === 'ar' ? 'شاراتي' : 'My badges'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {badges.map((b, i) => (
                <div key={i} className="text-center p-4 rounded-lg bg-gold/5 border border-gold/20">
                  <Award className="w-8 h-8 text-gold mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">{b.badge_name}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {enrollments.length === 0 && testAttempts.length === 0 && badges.length === 0 && (
          <EmptyState icon={BookOpen} title={lang === 'ar' ? 'لا يوجد تقدم بعد' : 'No progress yet'} message={lang === 'ar' ? 'ابدأ التعلم لتتبع تقدمك' : 'Start learning to track your progress'} />
        )}
      </div>
    </Layout>
  );
}

function StatBox({ icon: Icon, label, value, color }) {
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
      <p className="text-2xl font-bold text-foreground">
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </p>
      <p className="text-xs text-foreground-secondary mt-1">{label}</p>
    </div>
  );
}