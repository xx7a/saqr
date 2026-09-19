import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Maximize2, Trash2, RotateCcw, TerminalSquare } from 'lucide-react';

export default function Terminal({ lab, onSolve, attempts = 0, maxAttempts = 3, hint = '', hintThreshold = 2 }) {
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [attemptCount, setAttemptCount] = useState(attempts);
  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  // Build command map from lab commands
  const commandMap = React.useMemo(() => {
    const map = {};
    if (lab?.lab_commands) {
      lab.lab_commands.forEach((cmd) => {
        map[cmd.command] = cmd.output;
      });
    }
    return map;
  }, [lab]);

  useEffect(() => {
    // Initial welcome
    setLines([
      { type: 'system', text: 'SAQR Terminal — بيئة محاكاة آمنة' },
      { type: 'system', text: 'اكتب help لعرض الأوامر المتاحة، أو ابدأ بقراءة التعليمات.' },
      { type: 'blank', text: '' },
    ]);
  }, [lab]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    if (attemptCount >= hintThreshold && hint) {
      setShowHint(true);
    }
  }, [attemptCount, hint, hintThreshold]);

  const focusInput = () => inputRef.current?.focus();

  const processCommand = useCallback((cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory((h) => [...h, trimmed]);
    setHistoryIndex(-1);

    // Add command line to output
    setLines((l) => [...l, { type: 'command', text: trimmed }]);

    // Built-in commands
    if (trimmed === 'clear') {
      setLines([]);
      return;
    }
    if (trimmed === 'reset') {
      setLines([
        { type: 'system', text: 'SAQR Terminal — تمت إعادة المختبر' },
        { type: 'system', text: 'اكتب help لعرض الأوامر المتاحة.' },
        { type: 'blank', text: '' },
      ]);
      setSolved(false);
      setAttemptCount(0);
      setShowHint(false);
      return;
    }
    if (trimmed === 'help') {
      setLines((l) => [...l, { type: 'output', text: 'Available commands:\n  help       Show available commands\n  pwd        Print current directory\n  ls         List files\n  cat        Display file contents\n  grep       Search inside a file\n  clear      Clear terminal\n  reset      Restart lab\n  submit     Submit your answer (submit <answer>)' }]);
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

    // Check partial matches (e.g., "cat auth.log" might be a key)
    const keys = Object.keys(commandMap);
    for (const key of keys) {
      if (trimmed === key) {
        setLines((l) => [...l, { type: 'output', text: commandMap[key] }]);
        return;
      }
    }

    // Unknown command
    setLines((l) => [...l, { type: 'error', text: `command not found: ${trimmed}\nاستخدم help لعرض الأوامر المتاحة.` }]);
  }, [commandMap, lab]);

  const checkAnswer = (answer) => {
    const correct = lab?.correct_flag?.trim();
    if (answer === correct) {
      setSolved(true);
      setLines((l) => [...l, { type: 'success', text: lab?.success_message || 'أحسنت! الإجابة صحيحة.' }]);
      if (onSolve) onSolve(true, answer);
    } else {
      const newCount = attemptCount + 1;
      setAttemptCount(newCount);
      setLines((l) => [...l, { type: 'error', text: `إجابة غير صحيحة: ${answer}\nالمحاولات المتبقية: ${Math.max(maxAttempts - newCount, 0)}` }]);
      if (onSolve) onSolve(false, answer);
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
    <motion.div
      animate={solved ? { boxShadow: '0 0 20px rgba(34, 197, 94, 0.35)' } : { boxShadow: '0 0 0px rgba(34, 197, 94, 0)' }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
      className="rounded-xl overflow-hidden border border-border bg-[#030507]"
      dir="ltr"
    >
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0A0E14] border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-danger" />
          <div className="w-3 h-3 rounded-full bg-warning" />
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="ml-3 text-xs text-foreground-secondary terminal-font">SAQR Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLines([])}
            className="p-1.5 rounded hover:bg-card text-foreground-secondary hover:text-foreground transition-colors"
            title="مسح"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setLines([{ type: 'system', text: 'SAQR Terminal — تمت إعادة المختبر' }, { type: 'blank', text: '' }]);
              setSolved(false);
              setAttemptCount(0);
              setShowHint(false);
            }}
            className="p-1.5 rounded hover:bg-card text-foreground-secondary hover:text-foreground transition-colors"
            title="إعادة"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal output */}
      <div
        ref={outputRef}
        onClick={focusInput}
        className="p-4 h-80 overflow-y-auto cursor-text"
      >
        {lines.map((line, idx) => renderLine(line, idx))}
        {/* Input line */}
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
          <div className="terminal-font text-sm text-success mt-2 cursor-blink">▊</div>
        )}
      </div>

      {/* Hint */}
      <AnimatePresence>
        {showHint && !solved && hint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-warning/10 border-t border-warning/30"
            dir="rtl"
          >
            <p className="text-sm text-warning flex items-center gap-2">
              <span className="font-bold">تلميح:</span> {hint}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer submission bar */}
      {!solved && (
        <div className="px-4 py-3 bg-[#0A0E14] border-t border-border flex items-center gap-2" dir="rtl">
          <input
            type="text"
            placeholder="أدخل الإجابة أو استخدم submit <answer>"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                checkAnswer(e.target.value);
                e.target.value = '';
              }
            }}
            className="flex-1 bg-[#030507] text-foreground terminal-font text-sm px-3 py-2 rounded-lg border border-border focus:border-primary/50 outline-none"
            dir="ltr"
          />
          <span className="text-xs text-foreground-secondary terminal-font whitespace-nowrap">
            attempts: {attemptCount}/{maxAttempts}
          </span>
        </div>
      )}
    </motion.div>
  );
}