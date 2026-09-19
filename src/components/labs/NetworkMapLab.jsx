import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Server, Router, Network, Monitor } from 'lucide-react';

const deviceIcons = {
  computer: Monitor,
  router: Router,
  switch: Network,
  server: Server,
};

export default function NetworkMapLab({ lab, completedTasks, onTaskComplete }) {
  const [matches, setMatches] = useState({});
  const [results, setResults] = useState({});

  const data = lab.lab_data || {};
  const devices = data.devices || [];
  const tasks = lab.tasks || [];

  const handleMatch = (deviceId, functionId, task) => {
    setMatches((m) => ({ ...m, [deviceId]: functionId }));

    const isCorrect = task.answer === functionId;
    setResults((r) => ({ ...r, [task.id]: { isCorrect } }));

    if (isCorrect) {
      onTaskComplete(task.id, true, task.points || 10);
    }
  };

  // Group tasks by device
  const tasksByDevice = {};
  tasks.forEach((t) => {
    if (t.id?.startsWith('device_')) {
      const deviceId = t.id.replace('device_', '');
      tasksByDevice[deviceId] = t;
    }
  });

  return (
    <div className="space-y-4">
      {/* Network diagram */}
      <div className="card-base p-6">
        <h4 className="text-sm font-bold text-foreground mb-4 text-center">خريطة الشبكة التدريبية</h4>
        <div className="flex flex-col items-center gap-4">
          {/* Internet */}
          <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary">
            🌐 الإنترنت
          </div>
          <div className="w-px h-6 bg-border" />

          {/* Router */}
          {devices.filter((d) => d.type === 'router').map((d) => (
            <div key={d.id} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Router className="w-7 h-7 text-secondary" />
              </div>
              <span className="text-xs text-foreground">{d.name}</span>
            </div>
          ))}
          <div className="w-px h-6 bg-border" />

          {/* Switch */}
          {devices.filter((d) => d.type === 'switch').map((d) => (
            <div key={d.id} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Network className="w-7 h-7 text-secondary" />
              </div>
              <span className="text-xs text-foreground">{d.name}</span>
            </div>
          ))}

          {/* Bottom row: computer + server */}
          <div className="flex items-start justify-center gap-12 w-full">
            {devices.filter((d) => d.type === 'computer' || d.type === 'server').map((d) => {
              const Icon = deviceIcons[d.type] || Monitor;
              return (
                <div key={d.id} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <span className="text-xs text-foreground">{d.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scan output */}
      {data.scan_output && (
        <div className="card-base overflow-hidden">
          <div className="px-4 py-2.5 bg-[#0A0E14] border-b border-border">
            <span className="text-sm font-medium text-foreground">مخرجات الفحص الجاهزة</span>
          </div>
          <div className="p-4 bg-[#030507]" dir="ltr">
            {data.scan_output.map((line, i) => (
              <div key={i} className="terminal-font text-xs leading-relaxed text-foreground-secondary whitespace-pre-wrap">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device function matching */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-foreground">حدد وظيفة كل جهاز:</h4>
        {devices.map((device) => {
          const task = tasksByDevice[device.id];
          if (!task) return null;
          const isDone = completedTasks.includes(task.id);
          const result = results[task.id];
          const options = data.functions || [];

          return (
            <div key={device.id} className="card-base p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-foreground text-sm">{device.name}</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-success" />}
              </div>
              <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleMatch(device.id, opt.id, task)}
                    disabled={isDone}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                      matches[device.id] === opt.id
                        ? result?.isCorrect
                          ? 'bg-success/10 text-success border border-success/30'
                          : 'bg-danger/10 text-danger border border-danger/30'
                        : 'bg-card border border-border text-foreground-secondary hover:border-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {result && !isDone && !result.isCorrect && (
                <p className="mt-2 text-xs text-danger flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> إجابة خاطئة، حاول مرة أخرى.
                </p>
              )}
              {isDone && task.explanation && (
                <p className="mt-2 text-xs text-foreground-secondary">
                  <span className="text-primary font-medium">التفسير: </span>{task.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}