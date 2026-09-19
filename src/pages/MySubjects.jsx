import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, BookOpen, Clock, FlaskConical, Lock, CheckCircle2,
  Play, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import Layout from '@/components/Layout';
import { StaggerContainer, StaggerItem, ProgressAnimation, EmptyState, SkeletonCard } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { computeProgress, groupLessonsBySubject, recomputeTrackProgress } from '@/lib/progressUtils';

export default function MySubjects() {
  const { trackId } = useParams();
  const { t, lang, dir } = useTranslation();
  const [subjects, setSubjects] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [progress, setProgress] = useState([]);
  const [lessonsBySubject, setLessonsBySubject] = useState({});
  const [trackLessons, setTrackLessons] = useState([]);
  const [tests, setTests] = useState([]);
  const [passedTests, setPassedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) loadData();
  }, [user, trackId]);

  const loadData = async () => {
    try {
      // Resolve the student's active track when /my-subjects is opened without an id.
      const enrollments = trackId
        ? await base44.entities.TrackEnrollment.filter({ user_id: user.id, track_id: trackId })
        : await base44.entities.TrackEnrollment.filter({ user_id: user.id });
      const enroll = enrollments?.[0];

      if (!enroll) {
        navigate('/tracks', { replace: true });
        return;
      }

      const activeTrackId = trackId || enroll.track_id;
      if (!trackId) {
        navigate(`/my-subjects/${activeTrackId}`, { replace: true });
        return;
      }
      setEnrollment(enroll);

      // Fetch subjects, all track lessons, progress, and tests in parallel.
      // SubjectTest may legitimately be empty on migrated Base44 content.
      const [subjectsData, trackLessonsData, progressData, testsData, passedData] = await Promise.all([
        base44.entities.Subject.filter({ track_id: activeTrackId, is_published: true }, 'order', 50),
        base44.entities.Lesson.filter({ track_id: activeTrackId, is_published: true }, 'order', 200),
        base44.entities.LessonProgress.filter({ user_id: user.id, track_id: activeTrackId }),
        base44.entities.SubjectTest.filter({ track_id: activeTrackId, is_published: true }).catch(() => []),
        base44.entities.TestAttempt.filter({ user_id: user.id, track_id: activeTrackId, passed: true }).catch(() => []),
      ]);

      setSubjects(subjectsData || []);
      setTrackLessons(trackLessonsData || []);
      setProgress(progressData || []);
      setLessonsBySubject(groupLessonsBySubject(trackLessonsData));
      setTests(testsData || []);
      setPassedTests(passedData || []);

      // Recompute and sync enrollment progress (fixes stale 111% bug)
      const recomputed = await recomputeTrackProgress(user.id, trackId);
      if (recomputed.percent !== enroll.progress_percent) {
        setEnrollment({ ...enroll, progress_percent: recomputed.percent, status: recomputed.isComplete ? 'completed' : 'active' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectStatus = (subject, index) => {
    const subjectLessons = lessonsBySubject[subject.id] || [];
    const subjectProgress = progress.filter((p) => p.subject_id === subject.id);
    const { completed, total, isComplete } = computeProgress(subjectLessons, subjectProgress);

    if (total > 0 && isComplete) return 'completed';
    if (completed > 0 || subjectProgress.some((p) => p.status === 'in_progress')) return 'in_progress';

    // Sequential unlock: first subject is available, rest need previous completion
    if (index === 0) return 'available';
    if (subject.unlock_rule === 'free') return 'available';

    const prevSubject = subjects[index - 1];
    const prevLessons = lessonsBySubject[prevSubject.id] || [];
    const prevProgress = progress.filter((p) => p.subject_id === prevSubject.id);
    const prevResult = computeProgress(prevLessons, prevProgress);
    const prevLessonsDone = prevResult.total > 0 && prevResult.isComplete;

    // Previous subject must have all lessons completed AND test passed (if test exists)
    const prevHasTest = tests.some((t) => t.subject_id === prevSubject.id);
    const prevTestPassed = passedTests.some((a) => a.subject_id === prevSubject.id);

    if (prevLessonsDone && (!prevHasTest || prevTestPassed)) return 'available';

    return 'locked';
  };

  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-4">
          <SkeletonCard className="h-20" />
          <div className="grid md:grid-cols-2 gap-4">
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-48" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="student">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <div className="flex items-center gap-2 text-sm text-foreground-secondary mb-2">
            <Link to="/dashboard" className="hover:text-foreground">{t('layout.dashboard')}</Link>
            {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span>{t('layout.mySubjects')}</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{enrollment?.track_name || t('common.tracks')}</h1>
                <p className="text-foreground-secondary text-sm">{t('mySubjectsPage.foundationSubjects')}</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-sm text-foreground-secondary">{t('mySubjectsPage.progressPercent')}</p>
              <p className="text-2xl font-bold text-primary">{enrollment?.progress_percent || 0}%</p>
            </div>
          </div>
          <div className="mt-4">
            <ProgressAnimation percent={enrollment?.progress_percent || 0} />
          </div>
        </motion.div>

        {/* Subjects */}
        {subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t('mySubjectsPage.noSubjects')}
            message={t('mySubjectsPage.noSubjectsDesc')}
          />
        ) : (
          <StaggerContainer className="grid md:grid-cols-2 gap-4">
            {subjects.map((subject, index) => {
              const status = getSubjectStatus(subject, index);
              const subjectLessons = lessonsBySubject[subject.id] || [];
              const subjectProgress = progress.filter((p) => p.subject_id === subject.id);
              const { completed, total, percent } = computeProgress(subjectLessons, subjectProgress);

              return (
                <StaggerItem key={subject.id}>
                  <SubjectCard
                    subject={subject}
                    status={status}
                    percent={percent}
                    completedCount={completed}
                    totalLessons={total}
                    index={index}
                    trackId={trackId}
                  />
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>
    </Layout>
  );
}

function SubjectCard({ subject, status, percent, completedCount, totalLessons, index, trackId }) {
  const { t, lang, dir } = useTranslation();
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';

  return (
    <div className={`card-base p-5 h-full ${isLocked ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isCompleted ? 'bg-success/10' : isLocked ? 'bg-card' : 'bg-primary/10'
          }`}>
            {isLocked ? (
              <Lock className="w-6 h-6 text-foreground-secondary" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-6 h-6 text-success" />
            ) : (
              <BookOpen className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <span className="text-xs text-foreground-secondary">{t('mySubjectsPage.subjectNum')} {index + 1}</span>
            <h3 className="font-bold text-foreground">{localized(subject, 'name', lang)}</h3>
          </div>
        </div>
        {isCompleted && (
          <span className="px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">{t('mySubjectsPage.completedBadge')}</span>
        )}
      </div>

      <p className="text-sm text-foreground-secondary leading-relaxed mb-4 line-clamp-2">{localized(subject, 'description', lang)}</p>

      <div className="flex items-center gap-4 text-xs text-foreground-secondary mb-4">
        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {totalLessons} {t('common.lessons')}</span>
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {subject.estimated_hours || 0}{lang === 'ar' ? 'س' : 'h'}</span>
      </div>

      {!isLocked && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-foreground-secondary">{t('mySubjectsPage.completedOf')} {completedCount} / {totalLessons} {t('common.lessons')}</span>
            <span className="font-bold text-primary">{percent}%</span>
          </div>
          <ProgressAnimation percent={percent} />
        </div>
      )}

      {isLocked ? (
        <div className="flex items-center gap-2 text-sm text-foreground-secondary py-2.5 px-4 bg-card rounded-lg border border-border">
          <AlertCircle className="w-4 h-4" />
          {t('mySubjectsPage.unlockReq')}
        </div>
      ) : (
        <Link
          to={`/subject/${subject.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-primary text-white rounded-lg font-medium hover:scale-[1.02] transition-transform"
        >
          {isCompleted ? t('subject.reviewSubject') : completedCount > 0 ? t('subject.continueSubject') : t('subject.startSubject')}
          {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Link>
      )}
    </div>
  );
}