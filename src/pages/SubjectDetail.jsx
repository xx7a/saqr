import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Clock, FlaskConical, Lock, CheckCircle2, Play,
  ChevronLeft, AlertCircle, FileText, Terminal, ChevronRight
} from 'lucide-react';
import Layout from '@/components/Layout';
import { StaggerContainer, StaggerItem, ProgressAnimation, EmptyState, SkeletonCard } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { computeProgress } from '@/lib/progressUtils';
import { toast } from 'sonner';
import CourseSlidesSection from '@/components/CourseSlidesSection';

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const { t, lang, dir } = useTranslation();
  const [subject, setSubject] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [test, setTest] = useState(null);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && subjectId) loadData();
  }, [user, subjectId]);

  const loadData = async () => {
    try {
      const subjectData = await base44.entities.Subject.get(subjectId);
      setSubject(subjectData);

      // Guard: prevent bypassing locked subjects via direct URL
      if (subjectData.unlock_rule !== 'free') {
        const subjectFilter = subjectData.specialization_id
          ? { specialization_id: subjectData.specialization_id, is_published: true }
          : { track_id: subjectData.track_id, is_published: true };
        const allSubjects = await base44.entities.Subject.filter(subjectFilter, 'order', 50);
        const subjectIndex = allSubjects.findIndex((s) => s.id === subjectId);
        if (subjectIndex > 0) {
          const prevSubject = allSubjects[subjectIndex - 1];
          const prevLessons = await base44.entities.Lesson.filter({ subject_id: prevSubject.id, is_published: true }, 'order', 50);
          const prevProgress = await base44.entities.LessonProgress.filter({ user_id: user.id, subject_id: prevSubject.id, status: 'completed' });
          const prevCompletedIds = new Set(prevProgress.map((p) => p.lesson_id));
          const prevLessonsDone = prevLessons.every((l) => prevCompletedIds.has(l.id));

          let prevTestPassed = true;
          const prevTest = await base44.entities.SubjectTest.filter({ subject_id: prevSubject.id, is_published: true });
          if (prevTest && prevTest.length > 0) {
            const prevAttempts = await base44.entities.TestAttempt.filter({ user_id: user.id, test_id: prevTest[0].id, passed: true });
            prevTestPassed = prevAttempts && prevAttempts.length > 0;
          }

          if (!prevLessonsDone || !prevTestPassed) {
            toast.error(lang === 'ar' ? 'يجب إكمال المادة السابقة واجتياز اختبارها أولاً' : 'You must complete the previous subject and pass its test first');
            navigate(subjectData.specialization_id ? `/specialization/${subjectData.specialization_id}` : `/my-subjects/${subjectData.track_id}`);
            return;
          }
        }
      }

      const lessonsData = await base44.entities.Lesson.filter({ subject_id: subjectId, is_published: true }, 'order', 50);
      setLessons(lessonsData || []);

      const testData = await base44.entities.SubjectTest.filter({ subject_id: subjectId, is_published: true });
      setTest(testData?.[0] || null);

      const progressData = await base44.entities.LessonProgress.filter({ user_id: user.id, subject_id: subjectId });
      setProgress(progressData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getLessonStatus = (lesson, index) => {
    const lp = progress.find((p) => p.lesson_id === lesson.id);
    if (lp?.status === 'completed') return 'completed';
    if (lp?.status === 'in_progress') return 'in_progress';

    // First lesson is always available
    if (index === 0) return 'available';

    // Check if previous lesson is completed
    const prevLesson = lessons[index - 1];
    const prevProgress = progress.find((p) => p.lesson_id === prevLesson.id);
    if (prevProgress?.status === 'completed') return 'available';

    return 'locked';
  };

  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-4">
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-96" />
        </div>
      </Layout>
    );
  }

  if (!subject) {
    return (
      <Layout role="student">
        <EmptyState icon={AlertCircle} title={lang === 'ar' ? 'المادة غير موجودة' : 'Subject not found'} message={lang === 'ar' ? 'لم يتم العثور على هذه المادة' : 'This subject was not found'} />
      </Layout>
    );
  }

  const { completed: completedLessons, total: totalLessons, percent, isComplete } = computeProgress(lessons, progress);

  return (
    <Layout role="student">
      <div className="space-y-6">
        {/* Breadcrumb + header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <div className="flex items-center gap-2 text-sm text-foreground-secondary mb-3">
            <Link to="/dashboard" className="hover:text-foreground">{t('layout.dashboard')}</Link>
            {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Link to={subject.specialization_id ? `/specialization/${subject.specialization_id}` : `/my-subjects/${subject.track_id}`} className="hover:text-foreground">{t('common.subjects')}</Link>
            {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-foreground">{localized(subject, 'name', lang)}</span>
          </div>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{localized(subject, 'name', lang)}</h1>
                <p className="text-foreground-secondary text-sm mt-1 max-w-2xl">{localized(subject, 'description', lang)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-card">
              <p className="text-2xl font-bold text-primary">{totalLessons}</p>
              <p className="text-xs text-foreground-secondary">{t('common.lessons')}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card">
              <p className="text-2xl font-bold text-primary">{subject.estimated_hours || 0}{lang === 'ar' ? 'س' : 'h'}</p>
              <p className="text-xs text-foreground-secondary">{lang === 'ar' ? 'مدة تقديرية' : 'Estimated'}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card">
              <p className="text-2xl font-bold text-success">{Math.round(percent)}%</p>
              <p className="text-xs text-foreground-secondary">{t('common.completed')}</p>
            </div>
          </div>

          <div className="mt-4">
            <ProgressAnimation percent={percent} />
          </div>
        </motion.div>

        {/* Course Slides — available to any student with subject access, no progress requirement */}
        <CourseSlidesSection subjectId={subjectId} subjectName={localized(subject, 'name', lang)} />

        {/* Lessons list */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">{t('common.lessons')}</h2>
          {lessons.length === 0 ? (
            <EmptyState icon={BookOpen} title={lang === 'ar' ? 'لا توجد دروس' : 'No lessons'} message={lang === 'ar' ? 'سيتم إضافة الدروس قريبًا' : 'Lessons will be added soon'} />
          ) : (
            <StaggerContainer className="space-y-3">
              {lessons.map((lesson, index) => {
                const status = getLessonStatus(lesson, index);
                const lp = progress.find((p) => p.lesson_id === lesson.id);
                const isLocked = status === 'locked';
                const isCompleted = status === 'completed';

                return (
                  <StaggerItem key={lesson.id}>
                    <div
                      className={`card-base p-4 flex items-center gap-4 ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => {
                        if (!isLocked) navigate(`/lesson/${lesson.id}`);
                      }}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isCompleted ? 'bg-success/10' : isLocked ? 'bg-card' : 'bg-primary/10'
                      }`}>
                        {isLocked ? (
                          <Lock className="w-5 h-5 text-foreground-secondary" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <Play className="w-5 h-5 text-primary" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-foreground-secondary">{lang === 'ar' ? 'الدرس' : 'Lesson'} {index + 1}</span>
                          {lesson.has_lab && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-medium flex items-center gap-1">
                              <Terminal className="w-3 h-3" /> {t('lab.title')}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-foreground truncate">{localized(lesson, 'title', lang)}</h3>
                        <p className="text-sm text-foreground-secondary truncate">{localized(lesson, 'short_description', lang)}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-foreground-secondary hidden sm:flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {lesson.estimated_minutes || 15}{lang === 'ar' ? 'د' : 'm'}
                                                   </span>
                                                   {!isLocked && (dir === 'rtl' ? <ChevronLeft className="w-5 h-5 text-foreground-secondary" /> : <ChevronRight className="w-5 h-5 text-foreground-secondary" />)}
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>

        {/* Final test */}
        {test && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground">{test.title || (lang === 'ar' ? 'الاختبار النهائي للمادة' : 'Final subject test')}</h3>
                <p className="text-sm text-foreground-secondary">
                  {t('subject.passScore')}: {test.pass_score || 70}% • {t('subject.attempts')}: {test.max_attempts || 2}
                </p>
              </div>
              {isComplete ? (
                <Link
                  to={`/test/${test.id}`}
                  className="px-5 py-2.5 bg-gradient-primary text-white rounded-lg font-medium hover:scale-105 transition-transform"
                >
                  {t('subject.startTest')}
                </Link>
              ) : (
                <span className="px-5 py-2.5 bg-card border border-border text-foreground-secondary rounded-lg font-medium cursor-not-allowed flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> {t('common.locked')}
                </span>
              )}
            </div>
            {!isComplete && (
              <p className="text-xs text-foreground-secondary mt-3 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {t('subject.testLocked')}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}