import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function PhishingDetectorLab({ lab, completedTasks, onTaskComplete }) {
  const [classifications, setClassifications] = useState({});
  const [results, setResults] = useState({});

  const data = lab.lab_data || {};
  const emails = data.emails || [];
  const tasks = lab.tasks || [];

  const classify = (emailId, classification, task) => {
    setClassifications((c) => ({ ...c, [emailId]: classification }));

    const expected = (task.answer || '').trim().toLowerCase();
    const isCorrect = classification === expected;

    setResults((r) => ({ ...r, [task.id]: { isCorrect, classification } }));

    if (isCorrect) {
      onTaskComplete(task.id, true, task.points || 10);
    }
  };

  return (
    <div className="space-y-4">
      {/* Emails */}
      <div className="space-y-3">
        {emails.map((email, idx) => {
          const task = tasks[idx];
          if (!task) return null;
          const isDone = completedTasks.includes(task.id);
          const selected = classifications[email.id];
          const result = results[task.id];

          return (
            <div key={email.id} className="card-base overflow-hidden">
              {/* Email header */}
              <div className="px-4 py-3 bg-card border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-foreground-secondary" />
                  <span className="text-xs text-foreground-secondary terminal-font" dir="ltr">من: {email.from}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground-secondary">إلى:</span>
                  <span className="text-xs text-foreground terminal-font" dir="ltr">{email.to}</span>
                </div>
                <h4 className="text-sm font-bold text-foreground mt-2">{email.subject}</h4>
              </div>

              {/* Email body */}
              <div className="p-4">
                <p className="text-sm text-foreground-secondary leading-relaxed whitespace-pre-wrap">{email.body}</p>
                {email.links && email.links.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {email.links.map((link, i) => (
                      <div key={i} className="text-xs text-primary terminal-font break-all" dir="ltr">
                        🔗 {link} <span className="text-foreground-secondary">(محاكاة — لا يفتح موقعًا حقيقيًا)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Classification buttons */}
              <div className="px-4 py-3 bg-card border-t border-border">
                <p className="text-xs text-foreground-secondary mb-2">صنّف هذه الرسالة:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => classify(email.id, 'phishing', task)}
                    disabled={isDone}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      selected === 'phishing'
                        ? result?.isCorrect
                          ? 'bg-success/10 text-success border border-success/30'
                          : 'bg-danger/10 text-danger border border-danger/30'
                        : 'bg-card border border-border text-foreground hover:border-danger/50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" /> تصيّد مشبوه
                  </button>
                  <button
                    onClick={() => classify(email.id, 'legitimate', task)}
                    disabled={isDone}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      selected === 'legitimate'
                        ? result?.isCorrect
                          ? 'bg-success/10 text-success border border-success/30'
                          : 'bg-danger/10 text-danger border border-danger/30'
                        : 'bg-card border border-border text-foreground hover:border-success/50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />&nbsp;رسالة طبيعية
                  </button>
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
                    <span>{result.isCorrect ? 'تصنيف صحيح!' : 'تصنيف خاطئ، حاول مرة أخرى.'}</span>
                  </motion.div>
                )}
                {isDone && task.explanation && (
                  <div className="mt-2 p-2 rounded-lg bg-primary/5 text-xs text-foreground-secondary">
                    <span className="text-primary font-medium">التفسير: </span>{task.explanation}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}