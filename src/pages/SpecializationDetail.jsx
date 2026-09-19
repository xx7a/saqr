import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, BookOpen, Clock, Lock, CheckCircle2, Play, ChevronLeft, ChevronRight,
  AlertCircle, RefreshCw, FileText, Target, Briefcase, Wrench,
  TrendingUp, Award
} from 'lucide-react';
import Layout from '@/components/Layout';
import { StaggerContainer, StaggerItem, ProgressAnimation, EmptyState, SkeletonCard } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { computeProgress, recomputeSpecializationProgress } from '@/lib/progressUtils';
import { toast } from 'sonner';

// Module-level cache for specialization data, keyed by userId:specId (or 'my').
// Cleared automatically on page reload (logout does a hard redirect).
const specDataCache = new Map();

export default function SpecializationDetail() {
  const { specId } = useParams();
  const { t, lang, dir } = useTranslation();
  const [specialization, setSpecialization] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [noEnrollment, setNoEnrollment] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [issuingCert, setIssuingCert] = useState(false);
  const { user } = useAuth();
  const requestRef = useRef(0);

  useEffect(() => {
    if (user) loadData();
  }, [user, specId]);

  const loadData = async () => {
    const requestId = ++requestRef.current;
    const cacheKey = `${user.id}:${specId || 'my'}`;
    const cached = specDataCache.get(cacheKey);

    if (cached) {
      // Show cached data immediately, refresh in background
      if (cached.noEnrollment) {
        setNoEnrollment(true);
      } else {
        setSpecialization(cached.specialization);
        setEnrollment(cached.enrollment);
        setSubjects(cached.subjects);
        setAllLessons(cached.allLessons);
        setProgress(cached.progress);
        setNoEnrollment(false);
      }
      setLoading(false);
      setError(false);
    } else {
      // No cache — single connected loading state
      setLoading(true);
      setError(false);
      setNoEnrollment(false);
    }

    try {
      let activeSpecId = specId;
      let activeEnrollment = null;

      // If no specId in URL, load user's active enrollment (no redirect — single load)
      if (!activeSpecId) {
        const enrollments = await base44.entities.SpecializationEnrollment.filter({ user_id: user.id });
        if (requestRef.current !== requestId) return; // stale request

        if (!enrollments || enrollments.length === 0) {
          if (requestRef.current === requestId) {
            setNoEnrollment(true);
            setLoading(false);
            specDataCache.set(cacheKey, { noEnrollment: true });
          }
          return;
        }
        activeSpecId = enrollments[0].specialization_id;
        activeEnrollment = enrollments[0];
      }

      // Load all data in parallel for a single, connected loading state
      const [specData, enrollData, subjectsData, lessonsData, progressData] = await Promise.all([
        base44.entities.Specialization.get(activeSpecId),
        activeEnrollment ? Promise.resolve([activeEnrollment]) : base44.entities.SpecializationEnrollment.filter({
          user_id: user.id,
          specialization_id: activeSpecId,
        }),
        base44.entities.Subject.filter({ specialization_id: activeSpecId, is_published: true }, 'order', 50),
        base44.entities.Lesson.filter({ specialization_id: activeSpecId, is_published: true }, 'order', 200),
        base44.entities.LessonProgress.filter({ user_id: user.id, specialization_id: activeSpecId }),
      ]);

      if (requestRef.current !== requestId) return; // stale request

      if (!specData) {
        if (requestRef.current === requestId) {
          setError(true);
          setLoading(false);
        }
        return;
      }

      // Update cache
      specDataCache.set(cacheKey, {
        specialization: specData,
        enrollment: enrollData?.[0] || null,
        subjects: subjectsData || [],
        allLessons: lessonsData || [],
        progress: progressData || [],
      });

      setSpecialization(specData);
      setEnrollment(enrollData?.[0] || null);
      setSubjects(subjectsData || []);
      setAllLessons(lessonsData || []);
      setProgress(progressData || []);
      setNoEnrollment(false);
      setError(false);

      // Check if certificate already exists
      try {
        const certs = await base44.entities.Certificate.filter({ user_id: user.id, specialization_id: activeSpecId });
        if (certs && certs.length > 0) setCertificate(certs[0]);
      } catch {}

      // Recompute enrollment progress in background (non-blocking)
      recomputeSpecializationProgress(user.id, activeSpecId).catch(() => {});
    } catch (e) {
      if (requestRef.current !== requestId) return; // stale request
      console.error(e);
      if (!cached) setError(true); // keep cached data on background refresh error
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-4">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-96" />
        </div>
      </Layout>
    );
  }

  if (noEnrollment) {
    return (
      <Layout role="student">
        <EmptyState
          icon={Shield}
          title={lang === 'ar' ? 'لم تسجل في تخصص بعد' : 'Not enrolled in a specialization'}
          message={lang === 'ar' ? 'أكمل متطلبات المسار التأسيسي ثم اختر التخصص المناسب لك.' : 'Complete the foundation track requirements then choose a specialization.'}
          action={
            <Link to="/specializations" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
              {t('dashboard.exploreSpecializations')} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Link>
          }
        />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout role="student">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{lang === 'ar' ? 'تعذّر تحميل التخصص' : 'Could not load specialization'}</h2>
            <p className="text-foreground-secondary text-sm mb-6">{lang === 'ar' ? 'حدث خطأ أثناء تحميل منهج التخصص. يرجى إعادة المحاولة.' : 'An error occurred while loading the specialization curriculum. Please try again.'}</p>
            <button
              onClick={loadData}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium inline-flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> {t('common.retry')}
            </button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (!specialization) {
    return (
      <Layout role="student">
        <EmptyState icon={AlertCircle} title={lang === 'ar' ? 'التخصص غير موجود' : 'Specialization not found'} message={lang === 'ar' ? 'لم يتم العثور على هذا التخصص' : 'This specialization was not found'} />
      </Layout>
    );
  }

  // Compute real counts from actual data
  const realSubjectCount = subjects.length;
  const realLessonCount = allLessons.length;
  const overallProgress = computeProgress(allLessons, progress);
  const isEnrolled = !!enrollment;

  // Group lessons by subject
  const lessonsBySubject = {};
  for (const l of allLessons) {
    if (!lessonsBySubject[l.subject_id]) lessonsBySubject[l.subject_id] = [];
    lessonsBySubject[l.subject_id].push(l);
  }

  // Find first incomplete lesson for "continue" button
  const firstIncompleteLesson = allLessons.find((l) => {
    const lp = progress.find((p) => p.lesson_id === l.id);
    return lp?.status !== 'completed';
  });

  // Find last accessed lesson
  const lastAccessedLesson = allLessons
    .map((l) => ({ ...l, lp: progress.find((p) => p.lesson_id === l.id) }))
    .filter((l) => l.lp?.last_accessed)
    .sort((a, b) => new Date(b.lp.last_accessed) - new Date(a.lp.last_accessed))[0];

  const hasStarted = progress.some((p) => p.status === 'completed' || p.status === 'in_progress');

  const handleGetCertificate = async () => {
    if (!specialization) return;
    setIssuingCert(true);
    try {
      const res = await base44.functions.invoke('issueCertificate', { specialization_id: specialization.id });
      if (res?.certificate) {
        setCertificate(res.certificate);
        toast.success(res.already_exists ? (lang === 'ar' ? 'شهادتك جاهزة بالفعل' : 'Your certificate is ready') : (lang === 'ar' ? 'تم إصدار شهادتك بنجاح!' : 'Certificate issued successfully!'));
      } else if (res?.error) {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error(lang === 'ar' ? 'تعذّر إصدار الشهادة — تأكد من إكمال جميع الدروس والاختبارات' : 'Could not issue certificate — make sure all lessons and tests are completed');
    } finally {
      setIssuingCert(false);
    }
  };

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
            <Link to="/specializations" className="hover:text-foreground">{t('layout.specializations')}</Link>
            {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-foreground">{lang === 'ar' ? specialization.name_ar : (specialization.name_en || specialization.name_ar)}</span>
          </div>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{lang === 'ar' ? specialization.name_ar : (specialization.name_en || specialization.name_ar)}</h1>
                <p className="text-xs text-foreground-secondary terminal-font mb-1" dir="ltr">{specialization.name_en || specialization.name_ar}</p>
                <p className="text-foreground-secondary text-sm max-w-2xl">{localized(specialization, 'description', lang)}</p>
              </div>
            </div>
            {isEnrolled && (
              <span className="px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium border border-success/30 flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-4 h-4" /> {lang === 'ar' ? 'مسجل' : 'Enrolled'}
              </span>
            )}
          </div>

          {/* Real stats from actual data */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-card">
              <p className="text-2xl font-bold text-primary">{realSubjectCount}</p>
              <p className="text-xs text-foreground-secondary">{t('common.subjects')}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card">
              <p className="text-2xl font-bold text-primary">{realLessonCount}</p>
              <p className="text-xs text-foreground-secondary">{t('common.lessons')}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card">
              <p className="text-2xl font-bold text-primary">{specialization.estimated_hours || 0}{lang === 'ar' ? 'س' : 'h'}</p>
              <p className="text-xs text-foreground-secondary">{lang === 'ar' ? 'مدة تقديرية' : 'Estimated'}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card">
              <p className="text-2xl font-bold text-success">{Math.round(overallProgress.percent)}%</p>
              <p className="text-xs text-foreground-secondary">{t('common.completed')}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground-secondary">{lang === 'ar' ? 'تقدمك في التخصص' : 'Your specialization progress'}</span>
              <span className="font-bold text-primary">{overallProgress.completed} / {overallProgress.total} {t('common.lessons')}</span>
            </div>
            <ProgressAnimation percent={overallProgress.percent} />
          </div>

          {/* Continue / Start button */}
          {isEnrolled && firstIncompleteLesson && (
            <div className="mt-4">
              <Link
                to={`/lesson/${firstIncompleteLesson.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-primary text-white rounded-lg font-medium hover:scale-[1.02] transition-transform"
              >
                {hasStarted ? <><Play className="w-4 h-4" /> {t('dashboard.continueLearning')}</> : <><Play className="w-4 h-4" /> {t('dashboard.startLearning')}</>}
                {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Link>
            </div>
          )}
          {isEnrolled && !firstIncompleteLesson && realLessonCount > 0 && (
            <div className="mt-4">
              {certificate ? (
                <Link
                  to="/certificates"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-background rounded-lg font-medium hover:scale-[1.02] transition-transform"
                >
                  <Award className="w-4 h-4" /> {lang === 'ar' ? 'شهادتك جاهزة — عرض وتحميل PDF' : 'Your certificate is ready — view & download PDF'}
                </Link>
              ) : (
                <button
                  onClick={handleGetCertificate}
                  disabled={issuingCert}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-primary text-white rounded-lg font-medium hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {issuingCert ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {lang === 'ar' ? 'جارٍ إصدار الشهادة...' : 'Issuing certificate...'}</>
                  ) : (
                    <><Award className="w-4 h-4" /> {lang === 'ar' ? 'احصل على شهادة إكمال التخصص' : 'Get your completion certificate'}</>
                  )}
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Skills / Tools / Jobs */}
        {(specialization.skills?.length > 0 || specialization.tools?.length > 0 || specialization.related_jobs?.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-6"
          >
            <div className="grid sm:grid-cols-3 gap-6">
              {specialization.skills?.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><Target className="w-4 h-4 text-primary" /> {lang === 'ar' ? 'المهارات' : 'Skills'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {specialization.skills.map((s, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-primary/10 text-primary text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {specialization.tools?.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><Wrench className="w-4 h-4 text-secondary" /> {lang === 'ar' ? 'الأدوات' : 'Tools'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {specialization.tools.map((t, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-secondary/10 text-secondary text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {specialization.related_jobs?.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-gold" /> {lang === 'ar' ? 'الوظائف' : 'Jobs'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {specialization.related_jobs.map((j, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-card text-foreground-secondary text-xs">{j}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Subjects list */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">{lang === 'ar' ? 'مواد التخصص' : 'Specialization subjects'}</h2>
          {realSubjectCount === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={lang === 'ar' ? 'لا توجد مواد منشورة بعد' : 'No subjects published yet'}
              message={lang === 'ar' ? 'سيتم إضافة مواد هذا التخصص قريبًا. تابعنا للإعلانات.' : 'Subjects for this specialization will be added soon.'}
            />
          ) : (
            <StaggerContainer className="space-y-4">
              {subjects.map((subject, index) => {
                const subjectLessons = lessonsBySubject[subject.id] || [];
                const subjectProgress = progress.filter((p) => p.subject_id === subject.id);
                const subjResult = computeProgress(subjectLessons, subjectProgress);
                const isComplete = subjResult.isComplete;
                const hasProgress = subjResult.completed > 0;
                const firstLesson = subjectLessons[0];
                const nextLesson = subjectLessons.find((l) => {
                  const lp = subjectProgress.find((p) => p.lesson_id === l.id);
                  return lp?.status !== 'completed';
                });

                return (
                  <StaggerItem key={subject.id}>
                    <div className="card-base p-5">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          isComplete ? 'bg-success/10' : hasProgress ? 'bg-primary/10' : 'bg-card'
                        }`}>
                          {isComplete ? (
                            <CheckCircle2 className="w-6 h-6 text-success" />
                          ) : (
                            <BookOpen className="w-6 h-6 text-primary" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-foreground-secondary">{t('mySubjectsPage.subjectNum')} {index + 1}</span>
                            {isComplete && (
                              <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-medium">{t('mySubjectsPage.completedBadge')}</span>
                            )}
                          </div>
                          <h3 className="font-bold text-foreground mb-1">{localized(subject, 'name', lang)}</h3>
                          <p className="text-sm text-foreground-secondary mb-3 line-clamp-2">{localized(subject, 'description', lang)}</p>

                          <div className="flex items-center gap-4 text-xs text-foreground-secondary mb-3">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" /> {subjectLessons.length} {t('common.lessons')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {subject.estimated_hours || 0}{lang === 'ar' ? 'س' : 'h'}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5" /> {Math.round(subjResult.percent)}%
                            </span>
                          </div>

                          <div className="mb-4">
                            <ProgressAnimation percent={subjResult.percent} />
                          </div>

                          <div className="flex gap-2">
                            {firstLesson && (
                              <Link
                                to={`/subject/${subject.id}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-card border border-border text-foreground rounded-lg text-sm font-medium hover:border-primary/50 transition-colors"
                              >
                                {isComplete ? t('subject.reviewSubject') : hasProgress ? t('subject.continueSubject') : t('subject.startSubject')}
                                {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </Link>
                            )}
                            {hasProgress && !isComplete && nextLesson && (
                              <Link
                                to={`/lesson/${nextLesson.id}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-primary text-white rounded-lg text-sm font-medium hover:scale-[1.02] transition-transform"
                              >
                                <Play className="w-4 h-4" /> {lang === 'ar' ? 'متابعة آخر درس' : 'Continue last lesson'}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>
      </div>
    </Layout>
  );
}