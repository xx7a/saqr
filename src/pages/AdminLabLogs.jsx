import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ScrollText, RefreshCw, CheckCircle2, AlertCircle, Clock,
  Play, Square, Flag, Wifi, Server
} from 'lucide-react';
import Layout from '@/components/Layout';
import { SkeletonCard } from '@/components/AnimationSystem';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';

const operationIcons = {
  start: Play,
  stop: Square,
  status: RefreshCw,
  submit_flag: Flag,
  test_connection: Wifi,
  test_start: Play,
  test_stop: Square,
  expire: Clock,
};

export default function AdminLabLogs() {
  const { t, lang, dir } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadData = async () => {
    try {
      const data = await base44.entities.LabLog.list('-created_date', 200);
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = logs.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'success') return l.status === 'success';
    if (filter === 'failed') return l.status === 'failed';
    return l.operation === filter;
  });

  if (loading) {
    return (
      <Layout role="admin">
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-16" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ScrollText className="w-6 h-6 text-primary" /> {t('labLogs.title')}
            </h1>
            <p className="text-foreground-secondary text-sm mt-1">{t('labLogs.desc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none"
            >
              <option value="all">{t('common.all')}</option>
              <option value="success">{t('labLogs.success')}</option>
              <option value="failed">{t('labLogs.failed')}</option>
              <option value="start">{t('labLogs.startOps')}</option>
              <option value="stop">{t('labLogs.stopOps')}</option>
              <option value="test_connection">{t('labLogs.testConnOps')}</option>
            </select>
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-card border border-border text-foreground-secondary hover:text-primary transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card-base p-12 text-center">
            <ScrollText className="w-12 h-12 text-foreground-secondary mx-auto mb-3" />
            <p className="text-foreground-secondary">{t('labLogs.noLogs')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => {
              const Icon = operationIcons[log.operation] || Server;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`card-base p-3 ${log.status === 'failed' ? 'border-danger/20' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${log.status === 'success' ? 'bg-success/10' : 'bg-danger/10'}`}>
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-danger" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className="w-3.5 h-3.5 text-foreground-secondary" />
                        <span className="text-sm font-medium text-foreground">{log.operation}</span>
                        {log.http_status ? (
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${log.http_status >= 200 && log.http_status < 300 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`} dir="ltr">
                            {log.http_status}
                          </span>
                        ) : null}
                        {log.duration_ms != null && (
                          <span className="text-xs text-foreground-secondary font-mono" dir="ltr">{log.duration_ms}ms</span>
                        )}
                        <span className="text-xs text-foreground-secondary">
                          {new Date(log.created_date).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                        </span>
                      </div>
                      {(log.user_name || log.lab_title) && (
                        <p className="text-xs text-foreground-secondary mt-1">
                          {log.user_name && <span>{log.user_name}</span>}
                          {log.user_name && log.lab_title && <span> · </span>}
                          {log.lab_title && <span>{log.lab_title}</span>}
                          {log.session_id && <span className="font-mono" dir="ltr"> · {log.session_id}</span>}
                        </p>
                      )}
                      {log.error_message && (
                        <p className="text-xs text-danger mt-1 font-mono break-all" dir="ltr">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}