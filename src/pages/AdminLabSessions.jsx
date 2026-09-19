import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Monitor, Square, Loader2, Clock, Crosshair, Server, User,
  Activity, RefreshCw
} from 'lucide-react';
import Layout from '@/components/Layout';
import { SkeletonCard } from '@/components/AnimationSystem';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const statusColors = {
  running: 'bg-success/10 text-success',
  preparing: 'bg-warning/10 text-warning',
  stopped: 'bg-card text-foreground-secondary',
  error: 'bg-danger/10 text-danger',
  expired: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
};

export default function AdminLabSessions() {
  const { t, lang, dir } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(null);
  const [filter, setFilter] = useState('active');

  const loadData = async () => {
    try {
      const data = await base44.entities.RealLabSession.list('-started_at', 200);
      setSessions(data || []);
    } catch (e) {
      toast.error(t('labSessions.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleStop = async (sessionId) => {
    if (!confirm(t('labSessions.confirmStop'))) return;
    setStopping(sessionId);
    try {
      await base44.functions.invoke('adminStopLabSession', { session_record_id: sessionId });
      toast.success(t('labSessions.stopped'));
      loadData();
    } catch (e) {
      toast.error(t('labSessions.stopError'));
    } finally {
      setStopping(null);
    }
  };

  const filtered = sessions.filter(s => {
    if (filter === 'active') return s.status === 'running' || s.status === 'preparing';
    if (filter === 'stopped') return s.status === 'stopped' || s.status === 'expired';
    if (filter === 'error') return s.status === 'error';
    return true;
  });

  const formatRemaining = (expiresAt) => {
    if (!expiresAt) return '—';
    const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    if (remaining <= 0) return '0:00';
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatDuration = (startedAt) => {
    if (!startedAt) return '—';
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Layout role="admin">
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-20" />)}
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
              <Monitor className="w-6 h-6 text-primary" /> {t('labSessions.title')}
            </h1>
            <p className="text-foreground-secondary text-sm mt-1">{t('labSessions.desc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none"
            >
              <option value="active">{t('labSessions.active')}</option>
              <option value="stopped">{t('labSessions.stopped')}</option>
              <option value="error">{t('labSessions.error')}</option>
              <option value="all">{t('common.all')}</option>
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
            <Monitor className="w-12 h-12 text-foreground-secondary mx-auto mb-3" />
            <p className="text-foreground-secondary">{t('labSessions.noSessions')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-base p-4"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Server className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground truncate">{s.lab_title || '—'}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || statusColors.stopped}`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-foreground-secondary">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {s.user_id?.slice(-8) || '—'}
                      </span>
                      {s.target_ip && (
                        <span className="flex items-center gap-1 font-mono" dir="ltr">
                          <Crosshair className="w-3 h-3" /> {s.target_ip}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono" dir="ltr">
                        <Server className="w-3 h-3" /> {s.session_id || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDuration(s.started_at)}
                      </span>
                      {(s.status === 'running' || s.status === 'preparing') && s.expires_at && (
                        <span className="flex items-center gap-1 text-warning">
                          <Activity className="w-3 h-3" /> {formatRemaining(s.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  {(s.status === 'running' || s.status === 'preparing') && (
                    <button
                      onClick={() => handleStop(s.id)}
                      disabled={stopping === s.id}
                      className="px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm font-medium hover:bg-danger/20 transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                    >
                      {stopping === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                      {t('labSessions.stop')}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}