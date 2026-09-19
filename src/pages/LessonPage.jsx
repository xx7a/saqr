import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronLeft, ChevronRight, CheckCircle2, Clock,
  Terminal as TerminalIcon, FlaskConical, Target, Lightbulb,
  StickyNote, Save, AlertCircle, Lock, Play, ExternalLink
} from 'lucide-react';
import Layout from '@/components/Layout';
import VideoPlayer from '@/components/VideoPlayer';
import Terminal from '@/components/Terminal';
import QuizActivity from '@/components/QuizActivity';
import { recomputeTrackProgress, recomputeSpecializationProgress } from '@/lib/progressUtils';
import { EmptyState, SkeletonCard, AnimatedButton } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function LessonPage() {
  const { lessonId } = useParams();
  const { t, lang, dir } = useTranslation();
  const [lesson, setLesson] = useState(null);
  const [allLessons, setAllLessons] = useState([]);
  const [activities, setActivities] = useState([]);
  const [lab, setLab] = useState(null);
  const [labCommands, setLabCommands] = useState([]);
  const [progress, setProgress] = useState(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showLessonList, setShowLessonList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activityCompleted, setActivityCompleted] = useState(false);
  const [labCompleted, setLabCompleted] = useState(false);
  const [lockedPrerequisite, setLockedPrerequisite] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (user && lessonId) loadData();
  }, [user, lessonId]);

  const loadData = async () => {
    try {
      const lessonData = await base44.entities.Lesson.get(lessonId);
      setLesson(lessonData);

      // Get all lessons in this subject for navigation
      const lessonsData = await base44.entities.Lesson.filter({ subject_id: lessonData.subject_id, is_published: true }, 'order', 50);
      setAllLessons(lessonsData || []);

      // Guard: prevent bypassing locked lessons via direct URL
      // Show specific prerequisite info instead of generic redirect
      const currentIndex = lessonsData.findIndex((l) => l.id === lessonId);
      if (currentIndex > 0) {
        const prevLesson = lessonsData[currentIndex - 1];
        const prevProgress = await base44.entities.LessonProgress.filter({ user_id: user.id, lesson_id: prevLesson.id });
        if (!prevProgress?.[0] || prevProgress[0].status !== 'completed') {
          // Fetch subject name for the prerequisite message
          let subjectName = lessonData.subject_name || '';
          if (!subjectName) {
            try {
              const subjectData = await base44.entities.Subject.get(lessonData.subject_id);
              subjectName = subjectData?.name || '';
            } catch {}
          }
          setLockedPrerequisite({
            lessonId: prevLesson.id,
            lessonTitle: prevLesson.title,
            subjectId: lessonData.subject_id,
            subjectName,
          });
          setLoading(false);
          return;
        }
      }

      // Get all activities (quiz questions) for this lesson
      const activitiesData = await base44.entities.LessonActivity.filter({ lesson_id: lessonId }, 'order', 10);
      setActivities(activitiesData || []);

      // Get lab for this lesson (only lesson-tied labs, not independent)
      const labData = await base44.entities.Lab.filter({ lesson_id: lessonId, lab_type: 'lesson' });
      const lessonLab = labData?.[0] || null;
      setLab(lessonLab);

      if (lessonLab) {
        const commands = await base44.entities.LabCommand.filter({ lab_id: lessonLab.id }, 'order', 50);
        setLabCommands(commands || []);
      }

      // Get or create progress
      const progressData = await base44.entities.LessonProgress.filter({ user_id: user.id, lesson_id: lessonId });
      let lp = progressData?.[0];
      if (!lp) {
        lp = await base44.entities.LessonProgress.create({
          user_id: user.id,
          lesson_id: lessonId,
          subject_id: lessonData.subject_id,
          track_id: lessonData.track_id,
          specialization_id: lessonData.specialization_id,
          status: 'in_progress',
          video_position: 0,
          video_completed: false,
          activity_completed: false,
          notes: '',
          last_accessed: new Date().toISOString(),
        });
      } else {
        setNotes(lp.notes || '');
        setActivityCompleted(lp.activity_completed);
        if (lp.status === 'completed') {
          setActivityCompleted(true);
          setLabCompleted(true);
        }
      }
      setProgress(lp);

      // Update last accessed
      if (lp && lp.status !== 'completed') {
        await base44.entities.LessonProgress.update(lp.id, {
          last_accessed: new Date().toISOString(),
          status: lp.status === 'not_started' ? 'in_progress' : lp.status,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoProgress = async (time) => {
    if (!progress) return;
    // Debounce save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await base44.entities.LessonProgress.update(progress.id, {
          video_position: time,
        });
      } catch (e) { console.error(e); }
    }, 5000);
  };

  const handleVideoComplete = async () => {
    if (!progress) return;
    try {
      await base44.entities.LessonProgress.update(progress.id, {
        video_completed: true,
      });
      toast.success(lang === 'ar' ? 'تم تسجيل إكمال المشاهدة' : 'Video completion recorded');
    } catch (e) { console.error(e); }
  };

  const handleNotesChange = (value) => {
    setNotes(value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveNotes(value), 1500);
  };

  const saveNotes = async (value) => {
    if (!progress) return;
    setSavingNotes(true);
    try {
      await base44.entities.LessonProgress.update(progress.id, { notes: value });
    } catch (e) { console.error(e); }
    setSavingNotes(false);
  };

  const handleActivityComplete = async (isCorrect, points) => {
    setActivityCompleted(true);
    if (progress) {
      await base44.entities.LessonProgress.update(progress.id, {
        activity_completed: true,
      });
    }
    // Update user points
    try {
      await base44.auth.updateMe({ total_points: (user.total_points || 0) + points });
    } catch (e) { console.error(e); }
  };

  const handleLabSolve = async (isCorrect, answer) => {
    if (isCorrect) {
      setLabCompleted(true);
      if (progress) {
        await base44.entities.LessonProgress.update(progress.id, {
          activity_completed: true,
        });
      }
      try {
        await base44.auth.updateMe({ total_points: (user.total_points || 0) + (lab?.points || 20) });
      } catch (e) { console.error(e); }
    }
  };

  const completeLesson = async () => {
    if (!progress) return;
    const alreadyCompleted = progress.status === 'completed';
    try {
      if (!alreadyCompleted) {
        await base44.entities.LessonProgress.update(progress.id, {
          status: 'completed',
          completed_date: new Date().toISOString(),
          activity_completed: activityCompleted,
        });
      }

      // Recompute enrollment progress from actual data (deduplicates, clamps 0-100)
      if (lesson.specialization_id) {
        await recomputeSpecializationProgress(user.id, lesson.specialization_id);
      } else {
        await recomputeTrackProgress(user.id, lesson.track_id);
      }

      // Update enrollment metadata (points, time, last position) — only on first completion, foundation only
      if (!alreadyCompleted && !lesson.specialization_id) {
        const enrollments = await base44.entities.TrackEnrollment.filter({ user_id: user.id, track_id: lesson.track_id });
        if (enrollments?.[0]) {
          const enroll = enrollments[0];
          const quizPoints = activities.reduce((sum, a) => sum + (a.points || 10), 0);
          await base44.entities.TrackEnrollment.update(enroll.id, {
            last_lesson_id: lessonId,
            last_subject_id: lesson.subject_id,
            total_points: (enroll.total_points || 0) + quizPoints,
            learning_time_minutes: (enroll.learning_time_minutes || 0) + (lesson.estimated_minutes || 15),
          });
        }
      }

      toast.success(alreadyCompleted ? (lang === 'ar' ? 'الدرس مكتمل بالفعل' : 'Lesson already completed') : (lang === 'ar' ? 'تم إكمال الدرس!' : 'Lesson completed!'));
      const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
      if (currentIndex < allLessons.length - 1) {
        navigate(`/lesson/${allLessons[currentIndex + 1].id}`);
      } else {
        navigate(`/subject/${lesson.subject_id}`);
      }
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ');
    }
  };

  const hasLab = !!lab;
  const hasQuiz = activities.length > 0;
  const alreadyCompleted = progress?.status === 'completed';
  const requirementsMet = (!hasLab || labCompleted) && (!hasQuiz || activityCompleted);
  const canComplete = requirementsMet || alreadyCompleted;

  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-4">
          <SkeletonCard className="h-16" />
          <SkeletonCard className="h-96" />
        </div>
      </Layout>
    );
  }

  if (!lesson) {
    return (
      <Layout role="student">
        <EmptyState icon={AlertCircle} title={lang === 'ar' ? 'الدرس غير موجود' : 'Lesson not found'} message={lang === 'ar' ? 'لم يتم العثور على هذا الدرس' : 'This lesson was not found'} />
      </Layout>
    );
  }

  if (lockedPrerequisite) {
    return (
      <Layout role="student">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{lang === 'ar' ? 'هذا الدرس مقفل' : 'This lesson is locked'}</h2>
            <p className="text-foreground-secondary text-sm mb-4">
              {lang === 'ar' ? 'لبدء هذا الدرس، أكمل الدرس السابق أولاً:' : 'To start this lesson, complete the previous one first:'}
            </p>
            <div className="p-4 rounded-lg bg-card border border-border mb-6">
              <p className="text-sm text-foreground">
                <span className="font-bold">{lockedPrerequisite.lessonTitle}</span>
              </p>
              {lockedPrerequisite.subjectName && (
                <p className="text-xs text-foreground-secondary mt-1">
                  {lang === 'ar' ? 'ضمن مادة' : 'In subject'}: {lockedPrerequisite.subjectName}
                </p>
              )}
            </div>
            <div className="flex justify-center gap-3">
              <Link
                to={`/lesson/${lockedPrerequisite.lessonId}`}
                className="px-5 py-2.5 bg-gradient-primary text-white rounded-lg font-medium flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <Play className="w-4 h-4" /> {lang === 'ar' ? 'الانتقال إلى الدرس المطلوب' : 'Go to required lesson'}
              </Link>
              <Link
                to={`/subject/${lockedPrerequisite.subjectId}`}
                className="px-5 py-2.5 bg-card border border-border text-foreground rounded-lg font-medium hover:border-primary/50 transition-colors"
              >
                {lang === 'ar' ? 'العودة للمادة' : 'Back to subject'}
              </Link>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <Layout role="student">
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Main content */}
        <div className="space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-foreground-secondary">
            <Link to="/dashboard" className="hover:text-foreground">{t('layout.dashboard')}</Link>
            {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Link to={`/subject/${lesson.subject_id}`} className="hover:text-foreground">{t('common.subjects')}</Link>
            {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-foreground truncate">{localized(lesson, 'title', lang)}</span>
          </div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl font-bold text-foreground mb-2">{localized(lesson, 'title', lang)}</h1>
            <p className="text-foreground-secondary">{localized(lesson, 'short_description', lang)}</p>
          </motion.div>

          {/* Video player */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <VideoPlayer
              videoUrl={lesson.video_url}
              initialPosition={progress?.video_position || 0}
              onProgress={handleVideoProgress}
              onComplete={handleVideoComplete}
              completionThreshold={80}
            />
          </motion.div>

          {/* Learning objectives */}
          {lesson.learning_objectives && lesson.learning_objectives.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card-base p-6"
            >
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> {t('lesson.objectives')}
              </h3>
              <ul className="space-y-2">
                {lesson.learning_objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground-secondary">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {obj}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Lesson content */}
          {lesson.content && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-base p-6"
            >
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> {lang === 'ar' ? 'الشرح' : 'Content'}
              </h3>
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-foreground mt-6 mb-3" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold text-foreground mt-5 mb-2 flex items-center gap-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-bold text-primary mt-4 mb-2" {...props} />,
                    h4: ({node, ...props}) => <h4 className="text-base font-bold text-foreground mt-3 mb-1" {...props} />,
                    p: ({node, ...props}) => <p className="text-foreground-secondary leading-relaxed text-sm mb-3" {...props} />,
                    strong: ({node, ...props}) => <strong className="text-foreground font-bold" {...props} />,
                    em: ({node, ...props}) => <em className="text-foreground italic" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pr-5 text-foreground-secondary text-sm mb-3 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pr-5 text-foreground-secondary text-sm mb-3 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="text-foreground-secondary leading-relaxed" {...props} />,
                    code: ({node, ...props}) => <code className="bg-card px-1.5 py-0.5 rounded text-primary terminal-font text-xs" dir="ltr" {...props} />,
                    pre: ({node, ...props}) => <pre className="bg-card p-3 rounded-lg overflow-x-auto my-3 border border-border" dir="ltr" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-r-2 border-primary/40 bg-primary/5 p-3 rounded-lg my-3 text-sm text-foreground" {...props} />,
                    a: ({node, ...props}) => <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                    img: ({node, ...props}) => <img className="rounded-lg max-w-full my-4 border border-border" loading="lazy" {...props} />,
                    hr: ({node, ...props}) => <hr className="border-border my-4" {...props} />,
                    table: ({node, ...props}) => <table className="w-full text-sm border border-border rounded-lg my-3" {...props} />,
                    th: ({node, ...props}) => <th className="p-2 border border-border text-foreground font-bold bg-card" {...props} />,
                    td: ({node, ...props}) => <td className="p-2 border border-border text-foreground-secondary" {...props} />,
                  }}
                >
                  {localized(lesson, 'content', lang) || lesson.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          )}

          {/* Key points */}
          {lesson.key_points && lesson.key_points.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card-base p-6"
            >
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-gold" /> {t('lesson.keyPoints')}
              </h3>
              <ul className="space-y-2">
                {lesson.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-gold shrink-0 mt-0.5">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Glossary */}
          {lesson.glossary && lesson.glossary.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-base p-6"
            >
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-secondary" /> {t('lesson.glossary')}
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {lesson.glossary.map((term, i) => (
                  <div key={i} className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground text-sm">{term.term_ar}</span>
                      <span className="text-xs text-foreground-secondary terminal-font" dir="ltr">{term.term_en}</span>
                    </div>
                    <p className="text-xs text-foreground-secondary">{term.definition}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Sources */}
          {lesson.sources && lesson.sources.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="card-base p-6"
            >
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-primary" /> {t('lesson.sources')}
              </h3>
              <ul className="space-y-2">
                {lesson.sources.map((src, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary shrink-0 mt-0.5">•</span>
                    {src.startsWith('http') ? (
                      <a href={src} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                        {src}
                      </a>
                    ) : (
                      <span className="text-foreground-secondary">{src}</span>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Terminal Lab */}
          {lab && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-5 h-5 text-secondary" />
                <h3 className="text-lg font-bold text-foreground">{localized(lab, 'title', lang)}</h3>
              </div>
              <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
                <p className="text-sm text-foreground mb-2"><span className="font-bold">{t('lab.scenario')}:</span> {localized(lab, 'scenario', lang)}</p>
                <p className="text-sm text-foreground-secondary"><span className="font-bold text-foreground">{t('lab.goal')}:</span> {localized(lab, 'goal', lang)}</p>
              </div>
              <Terminal
                lab={{ ...lab, lab_commands: labCommands }}
                onSolve={handleLabSolve}
                attempts={0}
                maxAttempts={lab.max_attempts || 3}
                hint={lab.hint}
                hintThreshold={2}
              />
            </motion.div>
          )}

          {/* Quiz Activity (3 questions) */}
          {activities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <QuizActivity
                activities={activities}
                lessonId={lessonId}
                userId={user.id}
                onComplete={handleActivityComplete}
              />
            </motion.div>
          )}

          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card-base p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-primary" /> {t('lesson.notes')}
              </h3>
              {savingNotes && <span className="text-xs text-foreground-secondary">{lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</span>}
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder={lang === 'ar' ? 'اكتب ملاحظاتك هنا...' : 'Write your notes here...'}
              rows={4}
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:border-primary/50 outline-none resize-none"
              dir={dir}
            />
          </motion.div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            {prevLesson ? (
              <Link
                to={`/lesson/${prevLesson.id}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-foreground hover:border-primary/50 transition-colors"
              >
                {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />} {t('lesson.previousLesson')}
              </Link>
            ) : <div />}

            {canComplete ? (
              <AnimatedButton onClick={completeLesson} className="flex items-center gap-2">
                {alreadyCompleted ? t('common.continue') : (lang === 'ar' ? 'أكمل ومتابعة' : 'Complete & continue')} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </AnimatedButton>
            ) : (
              <div className="flex flex-col gap-1 text-sm text-warning">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'متطلبات الإكمال:' : 'Completion requirements:'}</span>
                </div>
                {hasLab && !labCompleted && <span className="text-xs pr-6">• {lang === 'ar' ? 'أكمل المختبر العملي' : 'Complete the lab'}</span>}
                {hasQuiz && !activityCompleted && <span className="text-xs pr-6">• {lang === 'ar' ? `أجب على أسئلة التطبيق (${activities.length} أسئلة)` : `Answer the quiz (${activities.length} questions)`}</span>}
                {!hasLab && !hasQuiz && <span className="text-xs pr-6">• {lang === 'ar' ? 'لا توجد متطلبات إضافية' : 'No additional requirements'}</span>}
              </div>
            )}

            {nextLesson && canComplete ? (
              <Link
                to={`/lesson/${nextLesson.id}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-foreground hover:border-primary/50 transition-colors"
              >
                {t('lesson.nextLesson')} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Link>
            ) : <div />}
          </div>
        </div>

        {/* Sidebar - lessons list */}
        <div className="hidden lg:block">
          <div className="card-base p-4 sticky top-8">
            <h3 className="font-bold text-foreground mb-3 text-sm">{lang === 'ar' ? 'دروس المادة' : 'Subject lessons'}</h3>
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {allLessons.map((l, i) => {
                const isCurrent = l.id === lessonId;
                return (
                  <Link
                    key={l.id}
                    to={`/lesson/${l.id}`}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                      isCurrent ? 'bg-primary/10 text-primary border border-primary/30' : 'text-foreground-secondary hover:text-foreground hover:bg-card'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-card flex items-center justify-center text-xs shrink-0">
                      {i + 1}
                    </span>
                    <span className="truncate">{localized(l, 'title', lang)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}