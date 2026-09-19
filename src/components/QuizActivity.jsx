import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, RotateCcw, ChevronLeft, Lightbulb, Award } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { AnimatedButton } from '@/components/AnimationSystem';

/**
 * QuizActivity — shows 3 multiple-choice questions one at a time.
 * Pass condition: at least 2/3 correct (Math.ceil(total * 2 / 3)).
 * Retry resets all answers without duplicating completion records.
 *
 * @param {Array} activities — Array of LessonActivity records (multiple_choice type)
 * @param {string} lessonId
 * @param {string} userId
 * @param {Function} onComplete — called once when quiz is passed
 */
export default function QuizActivity({ activities, lessonId, userId, onComplete }) {
  // Normalize and shuffle answer positions once whenever the loaded activities change.
  // This hook must stay before every conditional return so React's hook order is stable.
  const questions = useMemo(() => (activities || [])
    .filter((a) => a && Array.isArray(a.options) && a.options.length > 0)
    .map((activity) => {
      const options = [...activity.options];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      return { ...activity, options };
    }), [activities]);
  const total = questions.length;
  const passThreshold = total > 0 ? Math.ceil(total * 2 / 3) : 1;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { activityId: optionId }
  const [feedbackShown, setFeedbackShown] = useState({}); // { activityId: true }
  const [phase, setPhase] = useState('answering'); // 'answering' | 'results' | 'passed'
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hasPassed, setHasPassed] = useState(false);

  if (total === 0) {
    return (
      <div className="card-base p-6 text-center" dir="rtl">
        <p className="text-foreground-secondary text-sm">لا توجد أسئلة لهذا الدرس بعد.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const selectedAnswer = answers[currentQuestion.id];
  const showFeedback = feedbackShown[currentQuestion.id];

  const isAnswerCorrect = (activity, optionId) => {
    const opt = activity.options.find((o) => (o.id || o.text) === optionId);
    return opt?.is_correct === true;
  };

  const handleSelectAnswer = (optionId) => {
    if (showFeedback) return; // Can't change after confirming
    setAnswers({ ...answers, [currentQuestion.id]: optionId });
  };

  const handleConfirmAnswer = () => {
    if (!selectedAnswer) return;
    setFeedbackShown({ ...feedbackShown, [currentQuestion.id]: true });
  };

  const handleNext = () => {
    if (currentIdx < total - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // All questions answered — calculate score
      let correctCount = 0;
      for (const q of questions) {
        if (isAnswerCorrect(q, answers[q.id])) correctCount++;
      }
      setScore(correctCount);
      setPhase('results');
      if (correctCount >= passThreshold) {
        handlePass(correctCount);
      }
    }
  };

  const handlePass = async (correctCount) => {
    if (hasPassed) return;
    setHasPassed(true);
    setPhase('passed');
    // Save attempts
    setSaving(true);
    try {
      const promises = questions.map((q, i) =>
        base44.entities.ActivityAttempt.create({
          user_id: userId,
          activity_id: q.id,
          lesson_id: lessonId,
          attempt_number: 1,
          user_answer: answers[q.id] || '',
          is_correct: isAnswerCorrect(q, answers[q.id]),
          points_earned: isAnswerCorrect(q, answers[q.id]) ? (q.points || 10) : 0,
          hint_shown: false,
          completed: true,
          attempt_date: new Date().toISOString(),
        }).catch(() => {})
      );
      await Promise.all(promises);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
    const totalPoints = questions.reduce((sum, q) =>
      sum + (isAnswerCorrect(q, answers[q.id]) ? (q.points || 10) : 0), 0);
    if (onComplete) onComplete(true, totalPoints);
    toast.success(`أجبت بشكل صحيح على ${correctCount} من ${total}!`);
  };

  const handleRetry = () => {
    setAnswers({});
    setFeedbackShown({});
    setCurrentIdx(0);
    setScore(0);
    setPhase('answering');
  };

  // === Results screen ===
  if (phase === 'results' || phase === 'passed') {
    const passed = score >= passThreshold;
    return (
      <div className="card-base p-6" dir="rtl">
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 ${
              passed ? 'bg-success/20' : 'bg-danger/20'
            }`}
          >
            {passed ? <Award className="w-8 h-8 text-success" /> : <XCircle className="w-8 h-8 text-danger" />}
          </motion.div>
          <h3 className="text-lg font-bold text-foreground">
            {passed ? 'أحسنت! اجتزت الاختبار' : 'لم تجتز الاختبار'}
          </h3>
          <p className="text-foreground-secondary text-sm mt-1">
            نتيجتك: <span className={`font-bold ${passed ? 'text-success' : 'text-danger'}`}>{score} من {total}</span>
            {passed && <span className="mr-2">• شرط الاجتياز: {passThreshold} من {total}</span>}
          </p>
        </div>

        {/* Per-question review */}
        <div className="space-y-3 mb-6">
          {questions.map((q, i) => {
            const userAnswer = answers[q.id];
            const correct = isAnswerCorrect(q, userAnswer);
            const correctOpt = q.options.find((o) => o.is_correct);
            return (
              <div key={q.id} className={`p-3 rounded-lg border ${correct ? 'bg-success/5 border-success/30' : 'bg-danger/5 border-danger/30'}`}>
                <div className="flex items-start gap-2">
                  {correct ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    {q.question_tag && (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mb-1 ${
                        q.question_tag === 'تحليل' ? 'bg-secondary/10 text-secondary' :
                        q.question_tag === 'تطبيق' ? 'bg-primary/10 text-primary' :
                        'bg-success/10 text-success'
                      }`}>
                        {q.question_tag}
                      </span>
                    )}
                    <p className="text-sm text-foreground font-medium mb-1">{q.title || `السؤال ${i + 1}`}</p>
                    {!correct && (
                      <p className="text-xs text-foreground-secondary">
                        إجابتك: <span className="text-danger">{q.options.find((o) => (o.id || o.text) === userAnswer)?.text || '—'}</span>
                      </p>
                    )}
                    <p className="text-xs text-foreground-secondary">
                      الإجابة الصحيحة: <span className="text-success">{correctOpt?.text || '—'}</span>
                    </p>
                    {q.explanation && (
                      <p className="text-xs text-foreground-secondary mt-1.5 pt-1.5 border-t border-border">{q.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!passed && (
          <div className="flex justify-center">
            <AnimatedButton onClick={handleRetry} loading={saving}>
              <RotateCcw className="w-4 h-4" /> إعادة المحاولة
            </AnimatedButton>
          </div>
        )}
      </div>
    );
  }

  // === Answering phase ===
  const isLastQuestion = currentIdx === total - 1;

  return (
    <div className="card-base p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">طبّق ما تعلمته</h3>
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          السؤال {currentIdx + 1} من {total}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mb-5">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={`h-1.5 rounded-full transition-all ${
              i === currentIdx ? 'w-8 bg-primary' :
              i < currentIdx ? 'w-4 bg-primary/50' : 'w-4 bg-border'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Scenario/context */}
          {currentQuestion.scenario && (
            <div className="p-3 rounded-lg bg-card border border-border mb-4">
              <p className="text-sm text-foreground-secondary leading-relaxed">{currentQuestion.scenario}</p>
            </div>
          )}

          {/* Question tag badge */}
          {currentQuestion.question_tag && (
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-3 ${
              currentQuestion.question_tag === 'تحليل' ? 'bg-secondary/10 text-secondary' :
              currentQuestion.question_tag === 'تطبيق' ? 'bg-primary/10 text-primary' :
              'bg-success/10 text-success'
            }`}>
              {currentQuestion.question_tag}
            </span>
          )}

          {/* Question title */}
          <p className="text-base font-medium text-foreground mb-4 leading-relaxed">
            {currentQuestion.title || `السؤال ${currentIdx + 1}`}
          </p>

          {/* Options */}
          <div className="space-y-2">
            {currentQuestion.options.map((opt, i) => {
              const optId = opt.id || opt.text;
              const isSelected = selectedAnswer === optId;
              const isCorrectOpt = opt.is_correct === true;
              let style = 'bg-card border-border hover:border-primary/30';
              if (showFeedback && isSelected) {
                style = isCorrectOpt ? 'bg-success/10 border-success' : 'bg-danger/10 border-danger';
              } else if (showFeedback && isCorrectOpt) {
                style = 'bg-success/5 border-success/50';
              } else if (isSelected) {
                style = 'bg-primary/10 border-primary';
              }
              return (
                <button
                  key={i}
                  onClick={() => handleSelectAnswer(optId)}
                  disabled={showFeedback}
                  className={`w-full text-right p-3 rounded-lg border transition-all text-sm ${style} ${
                    showFeedback ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">{opt.text}</span>
                    {showFeedback && isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
                    {showFeedback && isSelected && !isCorrectOpt && <XCircle className="w-4 h-4 text-danger shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4"
            >
              <div className={`p-3 rounded-lg flex items-start gap-2 ${
                isAnswerCorrect(currentQuestion, selectedAnswer)
                  ? 'bg-success/10 border border-success/30'
                  : 'bg-danger/10 border border-danger/30'
              }`}>
                {isAnswerCorrect(currentQuestion, selectedAnswer) ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-sm font-medium ${isAnswerCorrect(currentQuestion, selectedAnswer) ? 'text-success' : 'text-danger'}`}>
                    {isAnswerCorrect(currentQuestion, selectedAnswer) ? 'إجابة صحيحة!' : 'إجابة غير صحيحة'}
                  </p>
                  {currentQuestion.explanation && (
                    <p className="text-xs text-foreground-secondary mt-1">{currentQuestion.explanation}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6">
        <span className="text-xs text-foreground-secondary">
          شرط الاجتياز: {passThreshold} من {total}
        </span>
        {!showFeedback ? (
          <AnimatedButton onClick={handleConfirmAnswer} disabled={!selectedAnswer}>
            تأكيد الإجابة
          </AnimatedButton>
        ) : (
          <AnimatedButton onClick={handleNext}>
            {isLastQuestion ? 'عرض النتيجة' : 'السؤال التالي'}
            <ChevronLeft className="w-4 h-4" />
          </AnimatedButton>
        )}
      </div>
    </div>
  );
}