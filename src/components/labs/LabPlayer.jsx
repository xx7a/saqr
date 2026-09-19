import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Clock, Target, Lightbulb, CheckCircle2, Circle,
  RotateCcw, ArrowRight, Award, AlertCircle, BookOpen, ChevronRight, ChevronLeft
} from 'lucide-react';
import Layout from '@/components/Layout';
import { RippleButton, EmptyState, SkeletonCard } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

import LogInvestigatorLab from '@/components/labs/LogInvestigatorLab';
import PhishingDetectorLab from '@/components/labs/PhishingDetectorLab';
import HiddenFileLab from '@/components/labs/HiddenFileLab';
import NetworkMapLab from '@/components/labs/NetworkMapLab';
import FileIntegrityLab from '@/components/labs/FileIntegrityLab';
import FilePermissionsLab from '@/components/labs/FilePermissionsLab';

const interfaceComponents = {
  log_analysis: LogInvestigatorLab,
  phishing: PhishingDetectorLab,
  terminal: HiddenFileLab,
  network_map: NetworkMapLab,
  file_integrity: FileIntegrityLab,
  permissions: FilePermissionsLab,
};

export default function LabPlayer() {
  const { labId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang, dir } = useTranslation();
  const [lab, setLab] = useState(null);
  const [commands, setCommands] = useState([]);
  const [progress, setProgress] = useState(null);
  const [prerequisiteLessons, setPrerequisiteLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [awardedPoints, setAwardedPoints] = useState(0);

  useEffect(() => {
    if (user && labId) loadData();
  }, [user, labId]);

  const loadData = async () => {
    try {
      const labData = await base44.entities.Lab.get(labId);
      if (!labData) {
        setLoading(false);
        return;
      }
      // Only independent labs are playable here
      if (labData.lab_type !== 'independent') {
        toast.error(lang === 'ar' ? 'هذا المختبر غير متاح هنا' : 'This lab is not available here');
        navigate('/labs');
        return;
      }
      setLab(labData);

      // Load terminal commands if needed
      if (labData.lab_interface === 'terminal') {
        const cmds = await base44.entities.LabCommand.filter({ lab_id: labId }, 'order', 100);
        setCommands(cmds || []);
      }

      // Load prerequisite lesson names (suggested, not required)
      if (labData.prerequisite_lesson_ids && labData.prerequisite_lesson_ids.length > 0) {
        const lessons = await Promise.all(
          labData.prerequisite_lesson_ids.map((id) =>
            base44.entities.Lesson.get(id).catch(() => null)
          )
        );
        setPrerequisiteLessons(lessons.filter(Boolean));
      }

      // Load or create progress
      const progressData = await base44.entities.LabProgress.filter({ user_id: user.id, lab_id: labId });
      let lp = progressData?.[0];
      if (!lp) {
        lp = await base44.entities.LabProgress.create({
          user_id: user.id,
          lab_id: labId,
          status: 'in_progress',
          completed_tasks: [],
          points_earned: 0,
          attempts: 0,
          hints_used: 0,
          started_date: new Date().toISOString(),
          last_accessed: new Date().toISOString(),
        });
      } else {
        setCompletedTasks(lp.completed_tasks || []);
        setHintsRevealed(lp.hints_used || 0);
        if (lp.status === 'completed') {
          setShowCompletion(true);
        }
        // Update last accessed
        await base44.entities.LabProgress.update(lp.id, {
          last_accessed: new Date().toISOString(),
        });
      }
      setProgress(lp);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = useCallback(async (taskId, isCorrect, points) => {
    if (!isCorrect || completedTasks.includes(taskId)) return;

    const newCompleted = [...completedTasks, taskId];
    setCompletedTasks(newCompleted);

    // Update progress
    if (progress) {
      const allTasksDone = newCompleted.length >= (lab.tasks?.length || 0);
      const updateData = {
        completed_tasks: newCompleted,
        points_earned: (progress.points_earned || 0) + (points || 0),
        status: allTasksDone ? 'completed' : 'in_progress',
      };
      if (allTasksDone) {
        updateData.completed_date = new Date().toISOString();
      }
      await base44.entities.LabProgress.update(progress.id, updateData);
      if (allTasksDone) {
        setShowCompletion(true);
        toast.success(lang === 'ar' ? 'أكملت جميع مهام المختبر!' : 'You completed all lab tasks!');
        // Award competition points (server-side verified, idempotent)
        try {
          const rewardRes = await base44.functions.invoke('awardLabPoints', { lab_id: lab.id });
          if (rewardRes?.awarded) {
            setAwardedPoints(rewardRes.points);
            toast.success(`+${rewardRes.points} ${lang === 'ar' ? 'نقطة مختبر!' : 'lab points!'}`);
          } else if (rewardRes?.already_awarded) {
            setAwardedPoints(rewardRes.points);
          }
        } catch (e) {
          // Silent fail — points are server-verified, no need to block UX
          console.error('awardLabPoints failed:', e);
        }
      }
    }
  }, [completedTasks, progress, lab]);

  const handleHintReveal = async () => {
    if (hintsRevealed >= (lab.hints?.length || 0)) return;
    const newCount = hintsRevealed + 1;
    setHintsRevealed(newCount);
    if (progress) {
      await base44.entities.LabProgress.update(progress.id, { hints_used: newCount });
    }
  };

  const handleReset = async () => {
    setCompletedTasks([]);
    setHintsRevealed(0);
    setShowCompletion(false);
    setAwardedPoints(0);
    setResetKey((k) => k + 1);
    if (progress) {
      await base44.entities.LabProgress.update(progress.id, {
        completed_tasks: [],
        hints_used: 0,
        status: 'in_progress',
        completed_date: null,
        points_earned: 0,
      });
    }
    toast.info(lang === 'ar' ? 'تم إعادة ضبط المختبر' : 'Lab reset');
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

  if (!lab) {
    return (
      <Layout role="student">
        <EmptyState icon={AlertCircle} title={lang === 'ar' ? 'المختبر غير موجود' : 'Lab not found'} message={lang === 'ar' ? 'لم يتم العثور على هذا المختبر' : 'This lab was not found'} />
      </Layout>
    );
  }

  const InterfaceComponent = interfaceComponents[lab.lab_interface];
  const allTasks = lab.tasks || [];
  const totalTasks = allTasks.length;
  const doneCount = completedTasks.length;
  const allDone = doneCount >= totalTasks && totalTasks > 0;

  return (
    <Layout role="student">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <Link to="/dashboard" className="hover:text-foreground">{t('layout.dashboard')}</Link>
          {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Link to="/labs" className="hover:text-foreground">{t('layout.labs')}</Link>
          {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="text-foreground truncate">{localized(lab, 'title', lang)}</span>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <FlaskConical className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{localized(lab, 'title', lang)}</h1>
                <p className="text-sm text-foreground-secondary mt-1">{localized(lab, 'short_description', lang)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium">{lab.difficulty === 'easy' ? t('lab.easy') : lab.difficulty === 'medium' ? t('lab.medium') : t('lab.hard')}</span>
              <span className="px-3 py-1 rounded-full bg-card text-foreground-secondary text-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {lab.estimated_minutes || 15} {t('common.minutes')}
              </span>
            </div>
          </div>

          {/* Simulation notice */}
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground-secondary">
              <span className="text-primary font-medium">{lang === 'ar' ? 'محاكاة تعليمية:' : 'Educational simulation:'}</span> {lang === 'ar' ? 'هذه بيئة محاكاة آمنة داخل المتصفح. لا يتم تشغيل أنظمة أو شبكات حقيقية، ولا تنفذ الأوامر على خوادم المنصة أو ملفاتك الحقيقية.' : 'This is a safe browser-based simulation. No real systems or networks are running, and commands do not execute on platform servers or your real files.'}
            </p>
          </div>

          {/* Objectives */}
          {lab.objectives && lab.objectives.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> {t('lab.objectives')}
              </h3>
              <ul className="space-y-1">
                {lab.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground-secondary">
                    <CheckCircle2 className="w-4 h-4 text-primary/50 shrink-0 mt-0.5" /> {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested prerequisites (optional, not blocking) */}
          {prerequisiteLessons.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gold" /> {lang === 'ar' ? 'معرفة مقترحة قبل البدء (اختياري)' : 'Suggested prerequisites (optional)'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {prerequisiteLessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    to={`/lesson/${lesson.id}`}
                    className="px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-foreground-secondary hover:border-primary/50 hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {localized(lesson, 'title', lang)} {dir === 'rtl' ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Intro */}
        {lab.intro && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card-base p-6"
          >
            <h3 className="font-bold text-foreground mb-2">{lang === 'ar' ? 'مقدمة' : 'Introduction'}</h3>
            <p className="text-sm text-foreground-secondary leading-relaxed">{localized(lab, 'intro', lang)}</p>
          </motion.div>
        )}

        {/* Tasks progress */}
        <div className="card-base p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">{t('lab.tasks')}</h3>
            <span className="text-xs text-foreground-secondary">{doneCount} / {totalTasks}</span>
          </div>
          <div className="w-full h-2 bg-card rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0}%` }}
              transition={{ duration: 0.4 }}
              className="h-full bg-gradient-primary rounded-full"
            />
          </div>
          <div className="mt-3 space-y-1">
            {allTasks.map((task, i) => {
              const isDone = completedTasks.includes(task.id);
              return (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-foreground-secondary/40 shrink-0" />
                  )}
                  <span className={isDone ? 'text-success' : 'text-foreground-secondary'}>
                    {i + 1}. {lang === 'ar' ? task.title : (task.title_en || task.title)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lab interface */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {InterfaceComponent ? (
            <InterfaceComponent
              key={resetKey}
              lab={lab}
              commands={commands}
              completedTasks={completedTasks}
              onTaskComplete={handleTaskComplete}
            />
          ) : (
            <div className="card-base p-6 text-center text-foreground-secondary">
              {lang === 'ar' ? 'نوع الواجهة غير مدعوم' : 'Unsupported interface type'}: {lab.lab_interface}
            </div>
          )}
        </motion.div>

        {/* Hints */}
        {lab.hints && lab.hints.length > 0 && !allDone && (
          <div className="card-base p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-gold" /> {t('lab.hint')}
              </h3>
              {hintsRevealed < lab.hints.length && (
                <button
                  onClick={handleHintReveal}
                  className="text-xs text-primary hover:underline"
                >
                  {t('lab.showHint')} ({hintsRevealed}/{lab.hints.length})
                </button>
              )}
            </div>
            <div className="space-y-2">
              {lab.hints.slice(0, hintsRevealed).map((hint, i) => (
                <div key={i} className="p-3 rounded-lg bg-gold/5 border border-gold/20">
                  <p className="text-sm text-foreground">
                    <span className="text-gold font-medium">{lang === 'ar' ? 'تلميح' : 'Hint'} {i + 1}:</span> {hint}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset button */}
        <div className="flex justify-center">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground-secondary hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> {t('lab.reset')}
          </button>
        </div>

        {/* Completion screen */}
        <AnimatePresence>
          {showCompletion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-base p-8 text-center border-success/30"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"
              >
                <Award className="w-8 h-8 text-success" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-2">{t('lab.successMessage')}</h2>
              <p className="text-foreground-secondary text-sm mb-4">
                {lang === 'ar' ? 'لقد أتقنت المهارات التالية:' : 'You have mastered the following skills:'}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {lab.objectives?.map((obj, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-success/10 text-success text-xs">
                    {obj}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gold mb-6">
                {awardedPoints > 0 ? `+${awardedPoints} ${lang === 'ar' ? 'نقطة مختبر مكتسبة' : 'lab points earned'}` : (lang === 'ar' ? 'أكملت المختبر بنجاح' : 'Lab completed successfully')}
              </p>
              <div className="flex justify-center gap-3">
                <Link to="/labs" className="px-5 py-2.5 bg-card border border-border rounded-lg text-foreground hover:border-primary/50 transition-colors text-sm">
                  {lang === 'ar' ? 'العودة للمختبرات' : 'Back to labs'}
                </Link>
                <RippleButton onClick={() => navigate('/labs')} variant="primary" className="text-sm">
                  {lang === 'ar' ? 'استكشاف مختبرات أخرى' : 'Explore more labs'}
                </RippleButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}