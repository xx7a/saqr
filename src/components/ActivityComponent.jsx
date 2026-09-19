import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, RotateCcw, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { AnimatedButton, SuccessState, ErrorShake } from '@/components/AnimationSystem';

export default function ActivityComponent({ activity, lessonId, userId, onComplete }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [matchPairs, setMatchPairs] = useState({});
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (activity?.activity_type === 'order_steps' && activity.activity_data?.steps) {
      setOrderItems([...activity.activity_data.steps].sort(() => Math.random() - 0.5));
    }
  }, [activity]);

  const checkAnswer = async () => {
    setChecking(true);
    let isCorrect = false;
    let answerValue = '';

    if (activity.activity_type === 'multiple_choice' || activity.activity_type === 'true_false' || activity.activity_type === 'scenario_question' || activity.activity_type === 'choose_decision') {
      answerValue = selectedOption || '';
      isCorrect = selectedOption === activity.correct_answer;
    } else if (activity.activity_type === 'terminal' || activity.activity_type === 'find_error' || activity.activity_type === 'analyze_case') {
      answerValue = userAnswer.trim();
      isCorrect = userAnswer.trim() === activity.correct_answer?.trim();
    } else if (activity.activity_type === 'order_steps') {
      answerValue = orderItems.map((i) => i.id || i).join(',');
      const correctOrder = activity.activity_data?.steps?.map((s) => s.id || s).join(',');
      isCorrect = answerValue === correctOrder;
    } else if (activity.activity_type === 'match_terms') {
      answerValue = JSON.stringify(matchPairs);
      const correct = activity.activity_data?.pairs || [];
      isCorrect = correct.every((p) => matchPairs[p.term] === p.definition);
    } else {
      answerValue = userAnswer;
      isCorrect = userAnswer.trim() === activity.correct_answer?.trim();
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (isCorrect) {
      setResult('correct');
      setCompleted(true);
      // Save attempt
      try {
        await base44.entities.ActivityAttempt.create({
          user_id: userId,
          activity_id: activity.id,
          lesson_id: lessonId,
          attempt_number: newAttempts,
          user_answer: answerValue,
          is_correct: true,
          points_earned: activity.points || 10,
          hint_shown: showHint,
          completed: true,
          attempt_date: new Date().toISOString(),
        });
      } catch (e) {
        console.error(e);
      }
      toast.success('إجابة صحيحة! أحسنت');
      if (onComplete) onComplete(true, activity.points || 10);
    } else {
      setResult('wrong');
      setShake(true);
      setTimeout(() => setShake(false), 400);
      try {
        await base44.entities.ActivityAttempt.create({
          user_id: userId,
          activity_id: activity.id,
          lesson_id: lessonId,
          attempt_number: newAttempts,
          user_answer: answerValue,
          is_correct: false,
          points_earned: 0,
          hint_shown: showHint,
          completed: false,
          attempt_date: new Date().toISOString(),
        });
      } catch (e) {
        console.error(e);
      }
      if (newAttempts >= 2 && activity.hint) {
        setShowHint(true);
      }
      toast.error('إجابة غير صحيحة، حاول مرة أخرى');
    }
    setChecking(false);
  };

  const reset = () => {
    setUserAnswer('');
    setSelectedOption(null);
    setResult(null);
    if (activity.activity_type === 'order_steps' && activity.activity_data?.steps) {
      setOrderItems([...activity.activity_data.steps].sort(() => Math.random() - 0.5));
    }
    setMatchPairs({});
  };

  const moveItem = (index, direction) => {
    const newItems = [...orderItems];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setOrderItems(newItems);
  };

  if (!activity) return null;

  return (
    <div className="card-base p-6" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">{activity.title || 'طبّق ما تعلمته'}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          activity.difficulty === 'easy' ? 'bg-success/10 text-success' :
          activity.difficulty === 'medium' ? 'bg-warning/10 text-warning' :
          'bg-danger/10 text-danger'
        }`}>
          {activity.difficulty === 'easy' ? 'سهل' : activity.difficulty === 'medium' ? 'متوسط' : 'صعب'}
        </span>
      </div>

      {activity.scenario && (
        <div className="p-4 rounded-lg bg-card border border-border mb-4">
          <p className="text-sm text-foreground-secondary leading-relaxed">{activity.scenario}</p>
        </div>
      )}

      {activity.goal && (
        <div className="flex items-start gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-primary text-xs font-bold">!</span>
          </div>
          <p className="text-sm text-foreground"><span className="font-bold">الهدف:</span> {activity.goal}</p>
        </div>
      )}

      {activity.instructions && (
        <p className="text-sm text-foreground-secondary mb-4">{activity.instructions}</p>
      )}

      {/* Activity input based on type */}
      <ErrorShake shake={shake}>
        <div className="space-y-3">
          {(activity.activity_type === 'multiple_choice' || activity.activity_type === 'true_false' || activity.activity_type === 'scenario_question' || activity.activity_type === 'choose_decision') && activity.options && (
            <div className="space-y-2">
              {activity.options.map((opt, i) => (
                <button
                  key={opt.id || i}
                  onClick={() => !completed && setSelectedOption(opt.id || opt.text)}
                  disabled={completed}
                  className={`w-full text-right p-3 rounded-lg border transition-all ${
                    selectedOption === (opt.id || opt.text)
                      ? result === 'correct'
                        ? 'bg-success/10 border-success'
                        : result === 'wrong'
                        ? 'bg-danger/10 border-danger'
                        : 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:border-primary/30'
                  } ${completed ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="text-sm text-foreground">{opt.text}</span>
                </button>
              ))}
            </div>
          )}

          {(activity.activity_type === 'terminal' || activity.activity_type === 'find_error' || activity.activity_type === 'analyze_case' || !activity.activity_type) && (
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={completed}
              placeholder="اكتب إجابتك هنا..."
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
              dir="rtl"
            />
          )}

          {activity.activity_type === 'order_steps' && orderItems.length > 0 && (
            <div className="space-y-2">
              {orderItems.map((item, index) => (
                <div key={item.id || index} className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                  <span className="text-xs text-foreground-secondary w-6">{index + 1}.</span>
                  <span className="flex-1 text-sm text-foreground">{item.text}</span>
                  {!completed && (
                    <div className="flex gap-1">
                      <button onClick={() => moveItem(index, -1)} className="p-1 text-foreground-secondary hover:text-primary">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button onClick={() => moveItem(index, 1)} className="p-1 text-foreground-secondary hover:text-primary">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activity.activity_type === 'match_terms' && activity.activity_data?.pairs && (
            <div className="space-y-2">
              {activity.activity_data.pairs.map((pair, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 p-2 rounded-lg bg-card border border-border text-sm text-foreground">{pair.term}</span>
                  <select
                    value={matchPairs[pair.term] || ''}
                    onChange={(e) => setMatchPairs({ ...matchPairs, [pair.term]: e.target.value })}
                    disabled={completed}
                    className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary/50 outline-none"
                  >
                    <option value="">اختر...</option>
                    {activity.activity_data.definitions.map((def, j) => (
                      <option key={j} value={def}>{def}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </ErrorShake>

      {/* Hint */}
      <AnimatePresence>
        {showHint && !completed && activity.hint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2"
          >
            <Lightbulb className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-warning">{activity.hint}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      {result === 'correct' && (
        <div className="mt-4">
          <SuccessState message="إجابة صحيحة!" />
          {activity.explanation && (
            <p className="text-sm text-foreground-secondary mt-3 p-3 rounded-lg bg-card">{activity.explanation}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        {!completed ? (
          <>
            <AnimatedButton onClick={checkAnswer} loading={checking} disabled={!selectedOption && !userAnswer && orderItems.length === 0 && Object.keys(matchPairs).length === 0}>
              تحقق من الإجابة
            </AnimatedButton>
            <button onClick={reset} className="px-4 py-2.5 text-foreground-secondary hover:text-foreground text-sm flex items-center gap-1">
              <RotateCcw className="w-4 h-4" /> إعادة
            </button>
            <span className="text-xs text-foreground-secondary mr-auto">المحاولات: {attempts}/{activity.max_attempts || 3}</span>
          </>
        ) : (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">تم إكمال التطبيق — +{activity.points || 10} نقطة</span>
          </div>
        )}
      </div>
    </div>
  );
}