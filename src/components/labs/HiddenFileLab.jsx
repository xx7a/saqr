import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Trash2, RotateCcw, TerminalSquare, CheckCircle2 } from 'lucide-react';

export default function HiddenFileLab({ lab, commands, completedTasks, onTaskComplete }) {
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [solved, setSolved] = useState(false);
  const inputRef = useRef(null);
  const outputRef = useRef(null);

  // Build command map from lab commands
  const commandMap = React.useMemo(() => {
    const map = {};
    if (commands) {
      commands.forEach((cmd) => {
        map[cmd.command] = cmd.output;
      });
    }
    return map;
  }, [commands]);

  useEffect(() => {
    setLines([
      { type: 'system', text: 'SAQR Terminal — محاكاة تعليمية آمنة' },
      { type: 'system', text: 'اكتب help لعرض الأوامر المتاحة.' },
      { type: 'blank', text: '' },
    ]);
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  const focusInput = () => inputRef.current?.focus();

  const processCommand = useCallback((cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory((h) => [...h, trimmed]);
    setHistoryIndex(-1);
    setLines((l) => [...l, { type: 'command', text: trimmed }]);

    if (trimmed === 'clear') {
      setLines([]);
      return;
    }
    if (trimmed === 'help') {
      setLines((l) => [...l, { type: 'output', text: 'Available commands:\n  help       Show available commands\n  pwd        Print current directory\n  ls         List files\n  ls -a      List all files (including hidden)\n  cd         Change directory\n  cat        Display file contents\n  grep       Search inside a file\n  clear      Clear terminal\n  submit     Submit your answer (submit <answer>)' }]);
      return;
    }

    // Check if it's a submit command
    if (trimmed.startsWith('submit ')) {
      const answer = trimmed.substring(7).trim();
      checkAnswer(answer);
      return;
    }

    // Check lab commands
    if (commandMap[trimmed]) {
      setLines((l) => [...l, { type: 'output', text: commandMap[trimmed] }]);
      return;
    }

    // Unknown command
    setLines((l) => [...l, { type: 'error', text: `command not found: ${trimmed}\nاستخدم help لعرض الأوامر المتاحة.` }]);
  }, [commandMap]);

  const checkAnswer = (answer) => {
    const tasks = lab.tasks || [];
    const flagTask = tasks.find((t) => t.id === 'find_flag') || tasks[0];
    if (!flagTask) return;

    const acceptValues = (flagTask.accept_values || [flagTask.answer]).map((v) => v.trim());
    const isCorrect = acceptValues.some((v) => v === answer);

    if (isCorrect) {
      setSolved(true);
      setLines((l) => [...l, { type: 'success', text: lab.success_message || 'أحسنت! وجدت العلم الصحيح.' }]);
      onTaskComplete(flagTask.id, true, flagTask.points || 20);
    } else {
      setLines((l) => [...l, { type: 'error', text: `إجابة غير صحيحة: ${answer}\nتابع البحث في الملفات.` }]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    processCommand(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(historyIndex - 1, 0);
      if (history[newIndex]) {
        setInput(history[newIndex]);
        setHistoryIndex(newIndex);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= history.length) {
        setInput('');
        setHistoryIndex(-1);
      } else {
        setInput(history[newIndex]);
        setHistoryIndex(newIndex);
      }
    }
  };

  const renderLine = (line, idx) => {
    if (line.type === 'blank') return <div key={idx} className="h-3" />;
    if (line.type === 'command') {
      return (
        <div key={idx} className="terminal-font text-sm leading-relaxed term-line-in" dir="ltr">
          <span className="text-success">student@saqr</span>
          <span className="text-foreground-secondary">:</span>
          <span className="text-primary">~</span>
          <span className="text-foreground-secondary">$ </span>
          <span className="text-foreground">{line.text}</span>
        </div>
      );
    }
    const colorClass = {
      system: 'text-foreground-secondary',
      output: 'text-foreground',
      error: 'text-danger',
      success: 'text-success',
    }[line.type] || 'text-foreground';
    const animClass = line.type === 'error' ? 'error-shake' : 'term-line-in';
    return (
      <div key={idx} className={`terminal-font text-sm leading-relaxed whitespace-pre-wrap ${colorClass} ${animClass}`} dir="ltr">
        {line.text}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="card-base p-4 bg-primary/5 border-primary/20">
        <h4 className="text-sm font-bold text-foreground mb-1">المهمة</h4>
        <p className="text-sm text-foreground-secondary">
          استخدم أوامر الطرفية للتنقل في المجلدات والعثور على ملف مخفي يحتوي على علم (Flag).
          ابدأ بـ <code className="text-primary terminal-font" dir="ltr">ls -a</code> لعرض الملفات المخفية،
          ثم اقرأ محتوى الملف بـ <code className="text-primary terminal-font" dir="ltr">cat</code>.
          عند العثور على العلم، اكتب <code className="text-primary terminal-font" dir="ltr">submit FLAG_VALUE</code>.
        </p>
      </div>

      <motion.div
        animate={solved ? { boxShadow: '0 0 20px rgba(34, 197, 94, 0.35)' } : { boxShadow: '0 0 0px rgba(34, 197, 94, 0)' }}
        className="rounded-xl overflow-hidden border border-border bg-[#030507]"
        dir="ltr"
      >
        {/* Terminal header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0A0E14] border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger" />
            <div className="w-3 h-3 rounded-full bg-warning" />
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="ml-3 text-xs text-foreground-secondary terminal-font">SAQR Terminal — محاكاة تعليمية</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLines([])}
              className="p-1.5 rounded hover:bg-card text-foreground-secondary hover:text-foreground transition-colors"
              title="مسح"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal output */}
        <div ref={outputRef} onClick={focusInput} className="p-4 h-80 overflow-y-auto cursor-text">
          {lines.map((line, idx) => renderLine(line, idx))}
          {!solved && (
            <form onSubmit={handleSubmit} className="flex items-center terminal-font text-sm leading-relaxed" dir="ltr">
              <span className="text-success">student@saqr</span>
              <span className="text-foreground-secondary">:</span>
              <span className="text-primary">~</span>
              <span className="text-foreground-secondary">$&nbsp;</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                spellCheck="false"
                className="flex-1 bg-transparent text-foreground terminal-font outline-none border-none"
                autoFocus
              />
            </form>
          )}
          {solved && (
            <div className="terminal-font text-sm text-success mt-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> تم حل المختبر!
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}