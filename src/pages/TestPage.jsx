import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, ChevronLeft, AlertCircle, Award } from 'lucide-react';
import Layout from '@/components/Layout';
import { ProgressAnimation, AnimatedButton, SkeletonCard, EmptyState } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TestPage() {
  const { testId } = useParams();
  const { t, lang, dir } = useTranslation();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && testId) loadData();
  }, [user, testId]);

  const loadData = async () => {
    try {
      const testData = await base44.entities.SubjectTest.get(testId);
      setTest(testData);

      const questionsData = await base44.entities.Question.filter({ test_id: testId }, 'order', 50);
      setQuestions(questionsData || []);

      // Guard: check all lessons in subject are completed
      const lessons = await base44.entities.Lesson.filter({ subject_id: testData.subject_id, is_published: true }, 'order', 50);
      if (lessons && lessons.length > 0) {
        const progress = await base44.entities.LessonProgress.filter({ user_id: user.id, subject_id: testData.subject_id, status: 'completed' });
        const completedIds = new Set(progress.map((p) => p.lesson_id));
        const allCompleted = lessons.every((l) => completedIds.has(l.id));
        if (!allCompleted) {
          toast.error(lang === 'ar' ? 'يجب إكمال جميع الدروس في المادة أولاً' : 'You must complete all lessons in this subject first');
          navigate(`/subject/${testData.subject_id}`);
          return;
        }
      }

      // Guard: check attempts and max_attempts
      const attempts = await base44.entities.TestAttempt.filter({ user_id: user.id, test_id: testId });
      const hasPassed = attempts?.some((a) => a.passed);
      if (hasPassed) {
        toast.info(lang === 'ar' ? 'لقد اجتزت هذا الاختبار بالفعل' : 'You have already passed this test');
        navigate(`/subject/${testData.subject_id}`);
        return;
      }
      const attemptCount = attempts?.length || 0;
      const maxAttempts = testData.max_attempts || 2;
      if (attemptCount >= maxAttempts) {
        toast.error(lang === 'ar' ? 'لقد استنفدت جميع محاولات هذا الاختبار' : 'You have used all attempts for this test');
        navigate(`/subject/${testData.subject_id}`);
        return;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, optionId) => {
    setAnswers({ ...answers, [questionId]: optionId });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let correctCount = 0;
      questions.forEach((q) => {
        const userAnswer = answers[q.id];
        const correctOption = q.options?.find((o) => o.is_correct);
        if (userAnswer === correctOption?.id) correctCount++;
      });

      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 10), 0);
      const earnedPoints = questions.reduce((sum, q) => {
        const userAnswer = answers[q.id];
        const correctOption = q.options?.find((o) => o.is_correct);
        return userAnswer === correctOption?.id ? sum + (q.points || 10) : sum;
      }, 0);

      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const passed = score >= (test.pass_score || 70);

      setResult({ score, passed, correctCount, totalQuestions: questions.length });

      // Calculate attempt number from previous attempts
      const existingAttempts = await base44.entities.TestAttempt.filter({ user_id: user.id, test_id: testId });

      // Save attempt
      await base44.entities.TestAttempt.create({
        user_id: user.id,
        test_id: testId,
        subject_id: test.subject_id,
        track_id: test.track_id,
        attempt_number: (existingAttempts?.length || 0) + 1,
        answers: Object.entries(answers).map(([qid, oid]) => ({ question_id: qid, option_id: oid })),
        score,
        passed,
        completed: true,
        started_date: new Date().toISOString(),
        completed_date: new Date().toISOString(),
      });

      if (passed) {
        toast.success(lang === 'ar' ? `اجتزت الاختبار بنسبة ${score}%` : `You passed the test with ${score}%`);
      } else {
        toast.error(lang === 'ar' ? `لم تجتز الاختبار. النتيجة: ${score}%` : `You did not pass. Score: ${score}%`);
      }
    } catch (e) {
      console.error(e);
      toast.error(t('common.error'));
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <Layout role="student">
        <SkeletonCard className="h-96" />
      </Layout>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <Layout role="student">
        <EmptyState icon={AlertCircle} title={lang === 'ar' ? 'الاختبار غير متاح' : 'Test not available'} message={lang === 'ar' ? 'لا توجد أسئلة في هذا الاختبار' : 'No questions in this test'} />
      </Layout>
    );
  }

  if (result) {
    return (
      <Layout role="student">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-base p-8 text-center"
          >
            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
              result.passed ? 'bg-success/10' : 'bg-danger/10'
            }`}>
              {result.passed ? (
                <CheckCircle2 className="w-12 h-12 text-success" />
              ) : (
                <XCircle className="w-12 h-12 text-danger" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
              {result.passed ? (lang === 'ar' ? 'أحسنت! اجتزت الاختبار' : 'Well done! You passed') : (lang === 'ar' ? 'لم تجتز الاختبار' : 'You did not pass')}
            </h2>
            <p className="text-foreground-secondary mb-6">{lang === 'ar' ? `حصلت على ${result.correctCount} من ${result.totalQuestions} إجابة صحيحة` : `You got ${result.correctCount} of ${result.totalQuestions} correct answers`}</p>

            <div className="text-5xl font-bold mb-2" style={{ color: result.passed ? '#22C55E' : '#EF4444' }}>
              {result.score}%
            </div>
            <p className="text-sm text-foreground-secondary mb-8">{t('subject.passScore')}: {test.pass_score || 70}%</p>

            {!result.passed && (
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 mb-6">
                <p className="text-sm text-warning">{lang === 'ar' ? 'راجع الدروس التالية وحاول مرة أخرى:' : 'Review the following lessons and try again:'}</p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Link
                to={`/subject/${test.subject_id}`}
                className="px-5 py-2.5 bg-gradient-primary text-white rounded-lg font-medium"
              >
                {lang === 'ar' ? 'العودة للمادة' : 'Back to subject'}
              </Link>
              {!result.passed && (
                <button
                  onClick={() => { setResult(null); setAnswers({}); setCurrentQ(0); }}
                  className="px-5 py-2.5 bg-card border border-border text-foreground rounded-lg font-medium"
                >
                  {lang === 'ar' ? 'إعادة الاختبار' : 'Retake test'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  const question = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;

  return (
    <Layout role="student">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="card-base p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">{lang === 'ar' ? test.title : (test.title_en || test.title)}</h1>
              <p className="text-sm text-foreground-secondary">
                {t('subject.passScore')}: {test.pass_score || 70}% • {questions.length} {t('quiz.questions')}
              </p>
            </div>
            <Link to={`/subject/${test.subject_id}`} className="text-sm text-foreground-secondary hover:text-foreground">
              {t('common.cancel')}
            </Link>
          </div>
          <ProgressAnimation percent={progress} />
          <p className="text-xs text-foreground-secondary mt-2">{t('quiz.question')} {currentQ + 1} {t('quiz.of')} {questions.length}</p>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="card-base p-6"
          >
            <h2 className="text-lg font-bold text-foreground mb-6">{question.question_text}</h2>

            <div className="space-y-3">
              {question.options?.map((opt, i) => (
                <button
                  key={opt.id || i}
                  onClick={() => handleAnswer(question.id, opt.id || opt.text)}
                  className={`w-full text-right p-4 rounded-lg border transition-all ${
                    answers[question.id] === (opt.id || opt.text)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      answers[question.id] === (opt.id || opt.text) ? 'border-primary bg-primary' : 'border-border'
                    }`}>
                      {answers[question.id] === (opt.id || opt.text) && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <span className="text-sm text-foreground">{opt.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            className="px-4 py-2.5 bg-card border border-border rounded-lg text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.previous')}
          </button>

          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ(currentQ + 1)}
              disabled={!answers[question.id]}
              className="px-5 py-2.5 bg-gradient-primary text-white rounded-lg font-medium disabled:opacity-50"
            >
              {t('common.next')}
            </button>
          ) : (
            <AnimatedButton onClick={handleSubmit} loading={submitting} disabled={Object.keys(answers).length < questions.length}>
              {lang === 'ar' ? 'تسليم الاختبار' : 'Submit test'}
            </AnimatedButton>
          )}
        </div>

        {/* Question grid */}
        <div className="card-base p-4">
          <div className="flex flex-wrap gap-2">
            {questions.map((q, i) => (
              <button
                key={q.id || i}
                onClick={() => setCurrentQ(i)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                  i === currentQ
                    ? 'bg-primary text-white'
                    : answers[q.id]
                    ? 'bg-success/10 text-success border border-success/30'
                    : 'bg-card text-foreground-secondary border border-border'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}