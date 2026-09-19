import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Search } from 'lucide-react';

export default function LogInvestigatorLab({ lab, completedTasks, onTaskComplete }) {
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});

  const data = lab.lab_data || {};
  const logLines = data.log_lines || [];
  const tasks = lab.tasks || [];

  const checkAnswer = (task) => {
    const userAnswer = (answers[task.id] || '').trim();
    if (!userAnswer) return;

    const acceptValues = (task.accept_values || [task.answer]).map((v) => v.trim().toLowerCase());
    const isCorrect = acceptValues.some((v) => v === userAnswer.toLowerCase());

    setResults((r) => ({ ...r, [task.id]: { isCorrect, userAnswer } }));

    if (isCorrect) {
      onTaskComplete(task.id, true, task.points || 10);
    }
  };

  return (
    <div className="space-y-4">
      {/* Log display */}
      <div className="card-base overflow-hidden">
        <div className="px-4 py-2.5 bg-[#0A0E14] border-b border-border flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">سجل الدخول التدريبي</span>
          <span className="text-xs text-foreground-secondary mr-auto terminal-font">auth.log</span>
        </div>
        <div className="p-4 bg-[#030507] max-h-72 overflow-y-auto" dir="ltr">
          {logLines.map((line, i) => (
            <div
              key={i}
              className={`terminal-font text-xs leading-relaxed whitespace-pre-wrap ${
                line.includes('Failed') || line.includes('FAILED') || line.includes('Invalid')
                  ? 'text-danger'
                  : line.includes('Accepted') || line.includes('session opened')
                  ? 'text-success'
                  : 'text-foreground-secondary'
              }`}
            >
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.map((task, i) => {
          const isDone = completedTasks.includes(task.id);
          const result = results[task.id];
          return (
            <div key={task.id} className="card-base p-4">
              <div className="flex items-start gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 font-bold">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-foreground">{task.title}</h4>
                  <p className="text-xs text-foreground-secondary mt-1">{task.description}</p>
                </div>
                {isDone && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="text"
                  value={answers[task.id] || ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [task.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && checkAnswer(task)}
                  disabled={isDone}
                  placeholder="أدخل إجابتك..."
                  className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none disabled:opacity-50"
                  dir="ltr"
                />
                {!isDone && (
                  <button
                    onClick={() => checkAnswer(task)}
                    disabled={!answers[task.id]}
                    className="px-4 py-2 bg-gradient-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    تحقق
                  </button>
                )}
              </div>
              {result && !isDone && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-2 ${
                    result.isCorrect ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  }`}
                >
                  {result.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{result.isCorrect ? 'إجابة صحيحة!' : 'إجابة غير صحيحة، حاول مرة أخرى.'}</span>
                </motion.div>
              )}
              {isDone && task.explanation && (
                <div className="mt-2 p-2 rounded-lg bg-primary/5 text-xs text-foreground-secondary">
                  <span className="text-primary font-medium">التفسير: </span>{task.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}