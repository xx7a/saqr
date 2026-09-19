import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle,
  RefreshCw, Award, TrendingUp, BookOpen, Sparkles, Lock
} from 'lucide-react';
import Layout from '@/components/Layout';
import { ProgressAnimation, EmptyState, SkeletonCard } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const STORAGE_KEY = 'saqr_compass_answers';

export default function CompassQuiz() {
  const { user } = useAuth();
  const { t, lang, dir } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [existingAttempt, setExistingAttempt] = useState(null);
  const [phase, setPhase] = useState('intro'); // intro | quiz | results
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [error, setError] = useState(false);
  const reqRef = useRef(0);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Load answers from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAnswers(JSON.parse(saved));
    } catch {}
  }, []);

  // Save answers to localStorage on change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    }
  }, [answers]);

  const loadData = async () => {
    const reqId = ++reqRef.current;
    setLoading(true);
    setError(false);
    try {
      // Check eligibility (server-side)
      const eligRes = await base44.functions.invoke('checkSpecializationEligibility', {});
      const eligData = eligRes?.data || eligRes;
      if (reqRef.current !== reqId) return;

      if (!eligData.eligible) {
        setEligible(false);
        setLoading(false);
        return;
      }
      setEligible(true);

      // Load questions and existing attempt in parallel
      const [qData, attemptData] = await Promise.all([
        base44.entities.CompassQuestion.filter({ is_published: true }, 'order', 100),
        base44.entities.CompassAttempt.filter({ user_id: user.id, status: 'submitted' }),
      ]);
      if (reqRef.current !== reqId) return;

      setQuestions(qData || []);

      if (attemptData && attemptData.length > 0) {
        setExistingAttempt(attemptData[0]);
        // Reconstruct results from existing attempt
        const savedResults = {
          attempt_id: attemptData[0].id,
          scores: attemptData[0].scores_by_spec || [],
          recommendation: attemptData[0].recommended_spec_id
            ? {
                tied: false,
                recommended_spec_id: attemptData[0].recommended_spec_id,
                recommended_spec_name: attemptData[0].recommended_spec_name,
              }
            : attemptData[0].tied_spec_ids?.length > 0
            ? {
                tied: true,
                tied_spec_ids: attemptData[0].tied_spec_ids,
                tied_spec_names: attemptData[0].tied_spec_names,
              }
            : null,
          is_weak: attemptData[0].is_weak || false,
          total_questions: (attemptData[0].question_snapshot || []).length,
          total_correct: (attemptData[0].answers || []).filter(a => a.is_correct).length,
        };
        setResults(savedResults);
        setPhase('results');
      }
    } catch (e) {
      if (reqRef.current !== reqId) return;
      console.error(e);
      setError(true);
    } finally {
      if (reqRef.current === reqId) setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId, optionId) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      setShowSubmitConfirm(true);
      return;
    }
    await doSubmit();
  };

  const doSubmit = async () => {
    setShowSubmitConfirm(false);
    setSubmitting(true);
    try {
      const answerArray = questions.map(q => ({
        question_id: q.id,
        selected_option_id: answers[q.id],
      }));
      const res = await base44.functions.invoke('submitCompassAttempt', { answers: answerArray });
      const data = res?.data || res;
      if (data.error) {
        toast.error(data.error);
        if (data.totalMissing !== undefined) {
          navigate('/specializations');
        }
        return;
      }
      setResults(data);
      setPhase('results');
      localStorage.removeItem(STORAGE_KEY);
      toast.success(lang === 'ar' ? 'تم حساب نتائج البوصلة' : 'Compass results calculated');
    } catch (e) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء إرسال الإجابات' : 'An error occurred while submitting answers');
    } finally {
      setSubmitting(false);
    }
  };

  const retakeQuiz = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setAnswers({});
    setResults(null);
    setExistingAttempt(null);
    setPhase('intro');
    setCurrentIdx(0);
  };

  // === Loading ===
  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-4">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-96" />
        </div>
      </Layout>
    );
  }

  // === Not eligible ===
  if (!eligible) {
    return (
      <Layout role="student">
        <EmptyState
          icon={Lock}
          title={lang === 'ar' ? 'البوصلة غير متاحة' : 'Compass not available'}
          message={lang === 'ar' ? 'يجب إكمال جميع متطلبات المسار التأسيسي أولاً قبل الوصول إلى بوصلة صقر.' : 'You must complete all foundation track requirements before accessing the SAQR Compass.'}
          action={
            <Link to="/specializations" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
              {lang === 'ar' ? 'العودة للتخصصات' : 'Back to specializations'} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Link>
          }
        />
      </Layout>
    );
  }

  // === Error ===
  if (error) {
    return (
      <Layout role="student">
        <EmptyState
          icon={AlertCircle}
          title={lang === 'ar' ? 'تعذّر تحميل البوصلة' : 'Could not load compass'}
          message={lang === 'ar' ? 'حدث خطأ أثناء تحميل أسئلة البوصلة. يرجى إعادة المحاولة.' : 'An error occurred while loading compass questions. Please try again.'}
          action={
            <button onClick={loadData} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium inline-flex items-center gap-2 hover:bg-primary/90 transition-colors">
              <RefreshCw className="w-4 h-4" /> {t('common.retry')}
            </button>
          }
        />
      </Layout>
    );
  }

  // === No questions ===
  if (questions.length === 0 && phase !== 'results') {
    return (
      <Layout role="student">
        <EmptyState
          icon={Compass}
          title={lang === 'ar' ? 'البوصلة قيد الإعداد' : 'Compass under preparation'}
          message={lang === 'ar' ? 'سيتم إضافة أسئلة البوصلة قريبًا. تابعنا للإعلانات.' : 'Compass questions will be added soon. Stay tuned for updates.'}
          action={
            <Link to="/specializations" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
              {lang === 'ar' ? 'عرض التخصصات' : 'View specializations'} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Link>
          }
        />
      </Layout>
    );
  }

  // === Results ===
  if (phase === 'results' && results) {
    return (
      <Layout role="student">
        <ResultsView results={results} onRetake={retakeQuiz} />
      </Layout>
    );
  }

  // === Intro ===
  if (phase === 'intro') {
    return (
      <Layout role="student">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-8"
          >
            <div className="flex items-center gap-2 text-sm text-foreground-secondary mb-4">
              <Link to="/dashboard" className="hover:text-foreground">{t('layout.dashboard')}</Link>
              {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Link to="/specializations" className="hover:text-foreground">{t('layout.specializations')}</Link>
              {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="text-foreground">{t('compass.title')}</span>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6">
              <Compass className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-foreground text-center mb-3">{t('compass.title')}</h1>
            <p className="text-foreground-secondary text-center text-sm leading-relaxed mb-6">
              {lang === 'ar' ? `اختبار توجيهي يساعدك على اكتشاف المجال الذي كان أداؤك فيه أقوى بناءً على معرفتك بالأساسيات. يتضمن ${questions.length} أسئلة موزعة على التخصصات المتاحة، ويستغرق حوالي 10 دقائق.` : `A guided test that helps you discover the field where you performed best based on your foundation knowledge. It includes ${questions.length} questions across available specializations and takes about 10 minutes.`}
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-card">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{lang === 'ar' ? 'أسئلة من الأساسيات' : 'Foundation questions'}</p>
                  <p className="text-xs text-foreground-secondary">{lang === 'ar' ? 'جميع الأسئلة قابلة للإجابة من معرفتك بالمسار التأسيسي' : 'All questions can be answered from your foundation track knowledge'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-card">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{lang === 'ar' ? 'توجيه اختياري' : 'Optional guidance'}</p>
                  <p className="text-xs text-foreground-secondary">{lang === 'ar' ? 'النتيجة توصية فقط — اختيار التخصص وتأكيد التسجيل بيدك' : 'The result is a recommendation only — choosing and confirming enrollment is up to you'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-card">
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{lang === 'ar' ? 'لا تؤثر على تقدمك' : 'Does not affect your progress'}</p>
                  <p className="text-xs text-foreground-secondary">{lang === 'ar' ? 'نتائج البوصلة لا تزيد تقدم المسار ولا تدخل في درجات الدروس' : 'Compass results do not increase track progress or affect lesson grades'}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setPhase('quiz')}
              className="w-full py-3 bg-gradient-primary text-white rounded-lg font-medium hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              {t('compass.start')} {dir === 'rtl' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // === Quiz ===
  const currentQuestion = questions[currentIdx];
  const answeredCount = questions.filter(q => answers[q.id]).length;
  const progressPercent = (answeredCount / questions.length) * 100;

  return (
    <Layout role="student">
      <div className="max-w-2xl mx-auto">
        {/* Progress header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">{t('compass.title')}</span>
            </div>
            <span className="text-sm text-foreground-secondary">
              {t('compass.question')} {currentIdx + 1} {t('compass.of')} {questions.length}
            </span>
          </div>
          <ProgressAnimation percent={progressPercent} />
          <p className="text-xs text-foreground-secondary mt-2">
            {lang === 'ar' ? `تمت الإجابة على ${answeredCount} من ${questions.length}` : `Answered ${answeredCount} of ${questions.length}`}
          </p>
        </motion.div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="card-base p-6"
          >
            <div className="mb-2">
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {currentQuestion.question_type === 'concept' ? (lang === 'ar' ? 'مفهوم' : 'Concept') : currentQuestion.question_type === 'analysis' ? (lang === 'ar' ? 'تحليل' : 'Analysis') : (lang === 'ar' ? 'موقف عملي' : 'Practical')}
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-6 leading-relaxed">
              {currentQuestion.question}
            </h2>

            <div className="space-y-3">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectAnswer(currentQuestion.id, opt.id)}
                    className={`w-full text-right p-4 rounded-lg border transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-card border-border text-foreground-secondary hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-primary bg-primary' : 'border-border'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <span className="text-sm">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
            className="px-4 py-2.5 bg-card border border-border text-foreground rounded-lg font-medium hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />} {t('common.previous')}
          </button>

          {currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
              className="px-5 py-2.5 bg-gradient-primary text-white rounded-lg font-medium hover:scale-[1.02] transition-transform flex items-center gap-2"
            >
              {t('common.next')} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2.5 bg-gradient-primary text-white rounded-lg font-medium hover:scale-[1.02] transition-transform flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {lang === 'ar' ? 'جارٍ الحساب...' : 'Calculating...'}
                  </>
                  ) : (
                  <>
                  <CheckCircle2 className="w-4 h-4" /> {t('compass.submit')}
                </>
              )}
            </button>
          )}
        </div>

        {/* Question dots */}
        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
          {questions.map((q, i) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = i === currentIdx;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-primary text-white'
                    : isAnswered
                    ? 'bg-primary/20 text-primary'
                    : 'bg-card border border-border text-foreground-secondary hover:border-primary/50'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit confirmation modal */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubmitConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md"
            >
              <div className="card-base p-6">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-warning" />
                </div>
                <h3 className="text-lg font-bold text-foreground text-center mb-2">{lang === 'ar' ? 'أسئلة بدون إجابة' : 'Unanswered questions'}</h3>
                <p className="text-sm text-foreground-secondary text-center mb-6">
                  {lang === 'ar' ? `لديك ${questions.filter(q => !answers[q.id]).length} أسئلة بدون إجابة. هل تريد التسليم بدون الإجابة عليها؟` : `You have ${questions.filter(q => !answers[q.id]).length} unanswered questions. Do you want to submit without answering them?`}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    className="flex-1 py-2.5 bg-card border border-border text-foreground rounded-lg font-medium hover:border-primary/50 transition-colors"
                  >
                    {lang === 'ar' ? 'العودة للأسئلة' : 'Back to questions'}
                  </button>
                  <button
                    onClick={doSubmit}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    {lang === 'ar' ? 'تسليم نهائي' : 'Submit final'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}

// === Results View Component ===
function ResultsView({ results, onRetake }) {
  const { t, lang, dir } = useTranslation();
  const { scores, recommendation, is_weak, total_questions, total_correct } = results;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-base p-6"
      >
        <div className="flex items-center gap-2 text-sm text-foreground-secondary mb-4">
          <Link to="/dashboard" className="hover:text-foreground">{t('layout.dashboard')}</Link>
          {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Link to="/specializations" className="hover:text-foreground">{t('layout.specializations')}</Link>
          {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="text-foreground">{t('compass.result')}</span>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
          <Compass className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-2">{lang === 'ar' ? 'نتيجة بوصلة صقر' : 'SAQR Compass Result'}</h1>
        <p className="text-foreground-secondary text-center text-sm mb-6">
          {lang === 'ar' ? `أجبت بشكل صحيح على ${total_correct} من ${total_questions} أسئلة` : `You answered ${total_correct} of ${total_questions} questions correctly`}
        </p>

        {/* Recommendation */}
        {is_weak ? (
          <div className="p-5 rounded-lg bg-warning/10 border border-warning/30 text-center">
            <AlertCircle className="w-8 h-8 text-warning mx-auto mb-3" />
            <p className="text-foreground font-medium mb-2">{lang === 'ar' ? 'نتائجك في جميع المجالات متقاربة وضعيفة' : 'Your results across all fields are close and weak'}</p>
            <p className="text-sm text-foreground-secondary">
              {lang === 'ar' ? 'نقترح مراجعة الأساسيات ومراجعة دروس المسار التأسيسي قبل اختيار التخصص. النتيجة تعكس معرفتك الحالية، وليست حكمًا نهائيًا على ميولك أو قدراتك المهنية.' : 'We suggest reviewing the fundamentals and revisiting the foundation track lessons before choosing a specialization. The result reflects your current knowledge, not a final judgment of your inclinations or professional abilities.'}
            </p>
          </div>
        ) : recommendation?.tied ? (
          <div className="p-5 rounded-lg bg-secondary/10 border border-secondary/30 text-center">
            <Award className="w-8 h-8 text-secondary mx-auto mb-3" />
            <p className="text-foreground font-medium mb-2">{lang === 'ar' ? 'تعادل بين تخصصين' : 'Tie between specializations'}</p>
            <p className="text-sm text-foreground-secondary mb-3">
              {lang === 'ar' ? 'بناءً على إجاباتك، كان أداؤك متقاربًا في المجالات التالية:' : 'Based on your answers, your performance was close in the following fields:'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {recommendation.tied_spec_names.map((name, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-secondary/20 text-secondary text-sm font-medium">
                  {name}
                </span>
              ))}
            </div>
            <p className="text-xs text-foreground-secondary mt-4">
              {lang === 'ar' ? 'النتيجة تعكس معرفتك الحالية، وليست حكمًا نهائيًا على ميولك أو قدراتك المهنية.' : 'The result reflects your current knowledge, not a final judgment of your inclinations or professional abilities.'}
            </p>
          </div>
        ) : recommendation ? (
          <div className="p-5 rounded-lg bg-success/10 border border-success/30 text-center">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <p className="text-foreground font-medium mb-2">
               {lang === 'ar' ? `بناءً على إجاباتك، كان أداؤك الأقوى في مجال (${recommendation.recommended_spec_name})، لذلك نقترح استكشاف هذا التخصص` : `Based on your answers, your strongest performance was in (${recommendation.recommended_spec_name}), so we suggest exploring this specialization`}
             </p>
             <p className="text-xs text-foreground-secondary mt-3">
               {lang === 'ar' ? 'النتيجة تعكس معرفتك الحالية، وليست حكمًا نهائيًا على ميولك أو قدراتك المهنية.' : 'The result reflects your current knowledge, not a final judgment of your inclinations or professional abilities.'}
             </p>
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {!is_weak && recommendation && !recommendation.tied && (
            <Link
              to={`/specializations`}
              className="flex-1 py-2.5 bg-gradient-primary text-white rounded-lg font-medium hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              {lang === 'ar' ? 'استكشف التخصص المقترح' : 'Explore recommended specialization'} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Link>
          )}
          <Link
            to="/specializations"
            className="flex-1 py-2.5 bg-card border border-border text-foreground rounded-lg font-medium hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
          >
            {lang === 'ar' ? 'عرض جميع التخصصات' : 'View all specializations'}
          </Link>
          <button
            onClick={onRetake}
            className="py-2.5 px-4 bg-card border border-border text-foreground-secondary rounded-lg font-medium hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> {t('compass.retake')}
          </button>
        </div>
      </motion.div>

      {/* Scores breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-base p-6"
      >
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-gold" /> {lang === 'ar' ? 'نتائج المجالات' : 'Field scores'}
        </h2>
        <div className="space-y-4">
          {(scores || []).sort((a, b) => b.percent - a.percent).map((s, i) => (
            <div key={s.specialization_id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {i === 0 && !is_weak && (
                    <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-medium">{lang === 'ar' ? 'الأقوى' : 'Strongest'}</span>
                  )}
                  <span className="text-sm font-medium text-foreground">{s.specialization_name}</span>
                </div>
                <span className="text-sm font-bold text-primary">
                  {s.correct}/{s.total} ({s.percent}%)
                </span>
              </div>
              <ProgressAnimation percent={s.percent} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}