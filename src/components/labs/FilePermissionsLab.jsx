import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Lock, Shield, FileText } from 'lucide-react';

export default function FilePermissionsLab({ lab, completedTasks, onTaskComplete }) {
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});

  const data = lab.lab_data || {};
  const files = data.files || [];
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

  const getPermissionLabel = (perm) => {
    if (perm === '777') return { label: 'كامل (خطير)', badgeClass: 'bg-danger/10 text-danger' };
    if (perm === '755') return { label: 'قراءة/تنفيذ للجميع', badgeClass: 'bg-warning/10 text-warning' };
    if (perm === '644') return { label: 'قراءة للجميع', badgeClass: 'bg-primary/10 text-primary' };
    if (perm === '600') return { label: 'مالك فقط', badgeClass: 'bg-success/10 text-success' };
    if (perm === '640') return { label: 'مالك ومجموعة', badgeClass: 'bg-success/10 text-success' };
    return { label: perm, badgeClass: 'bg-card text-foreground-secondary' };
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="card-base p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground">
              <span className="font-bold">مبدأ أقل صلاحية:</span> أعطِ كل ملف أقل صلاحيات يحتاجها للعمل فقط.
            </p>
            <p className="text-xs text-foreground-secondary mt-1">
              الصلاحيات ثلاث أرقام: الأول للمالك، الثاني للمجموعة، الثالث للآخرين.
              <br />
              7 = قراءة+كتابة+تنفيذ (rwx) | 6 = قراءة+كتابة (rw) | 5 = قراءة+تنفيذ (rx) | 4 = قراءة فقط (r)
            </p>
          </div>
        </div>
      </div>

      {/* Files with permissions */}
      <div className="card-base overflow-hidden">
        <div className="px-4 py-2.5 bg-card border-b border-border flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">ملفات وصلاحيات الوصول</span>
        </div>
        <div className="divide-y divide-border">
          {files.map((file, i) => {
            const permInfo = getPermissionLabel(file.permissions);
            return (
              <div key={i} className="p-4 flex items-center gap-4">
                <FileText className="w-5 h-5 text-foreground-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-foreground terminal-font text-sm" dir="ltr">{file.name}</span>
                  <p className="text-xs text-foreground-secondary mt-0.5">{file.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="terminal-font text-sm text-foreground" dir="ltr">{file.permissions}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${permInfo.badgeClass}`}>
                    {permInfo.label}
                  </span>
                </div>
              </div>
            );
          })}
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-2 ${
                    result.isCorrect ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  }`}
                >
                  {result.isCorrect ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
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