import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, ArrowRight, ArrowLeft, Clock, Crosshair, Flag, Zap,
  StopCircle, ExternalLink, CheckCircle2, AlertCircle, Loader2,
  Target, ListChecks, Monitor, ShieldAlert
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const difficultyColors = {
  easy: 'bg-success/10 text-success',
  medium: 'bg-warning/10 text-warning',
  hard: 'bg-danger/10 text-danger',
};

function formatTime(seconds) {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RealLabPlayer() {
  const { labId } = useParams();
  const navigate = useNavigate();
  const { t, lang, dir } = useTranslation();
  const { user } = useAuth();

  const [lab, setLab] = useState(null);
  const [session, setSession] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flagValue, setFlagValue] = useState('');
  const [submitResult, setSubmitResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);
  const [pollInterval, setPollInterval] = useState(15);
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const apiOfflineToastRef = useRef(false);

  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const loadLab = useCallback(async () => {
    try {
      const [labData, compData, sessData] = await Promise.all([
        base44.entities.RealLab.get(labId),
        base44.entities.RealLabCompletion.filter({ user_id: user.id, lab_id: labId }),
        base44.entities.RealLabSession.filter({ user_id: user.id, lab_id: labId }),
      ]);
      setLab(labData);
      setCompletion(compData?.[0] || null);
      const active = (sessData || []).find(s => s.status === 'running' || s.status === 'preparing');
      setSession(active || null);
      setIframeFailed(false);
    } catch (e) {
      console.error(e);
      toast.error(t('realLabs.loadError'));
    } finally {
      setLoading(false);
    }
  }, [labId, user, t]);

  useEffect(() => {
    if (user) loadLab();
  }, [user, loadLab]);

  // Timer countdown
  useEffect(() => {
    if (!session || (session.status !== 'running' && session.status !== 'preparing')) {
      setTimeLeft(0);
      return;
    }
    const update = () => {
      const expires = new Date(session.expires_at).getTime();
      const remaining = Math.floor((expires - Date.now()) / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleExpire();
      }
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => clearInterval(timerRef.current);
  }, [session]);

  // Poll status while running
  useEffect(() => {
    if (!session || (session.status !== 'running' && session.status !== 'preparing')) return;
    const poll = async () => {
      try {
        setSyncing(true);
        const res = await base44.functions.invoke('getRealLabStatus', { session_record_id: session.id });
        const s = res.data?.session;
        if (s) {
          setSession(s);
          if (s.status === 'expired' || s.status === 'stopped' || s.status === 'error') {
            // Session ended externally — refresh completion
            const comp = await base44.entities.RealLabCompletion.filter({ user_id: user.id, lab_id: labId });
            setCompletion(comp?.[0] || null);
          }
        }
        if (res.data?.api_offline && !apiOfflineToastRef.current) {
          toast.error(t('realLabs.apiOffline'));
          apiOfflineToastRef.current = true;
        } else if (!res.data?.api_offline) {
          apiOfflineToastRef.current = false;
        }
      } catch {
        // silent
      } finally {
        setSyncing(false);
      }
    };
    pollRef.current = setInterval(poll, pollInterval * 1000);
    return () => clearInterval(pollRef.current);
  }, [session?.id, session?.status, pollInterval]);

  const handleStart = async () => {
    setStarting(true);
    setSubmitResult(null);
    try {
      const res = await base44.functions.invoke('startRealLab', { lab_id: labId });
      if (res.data?.session) {
        setSession(res.data.session);
        if (res.data.poll_interval_seconds) setPollInterval(res.data.poll_interval_seconds);
        setIframeFailed(false);
        toast.success(t('realLabs.started'));
      } else if (res.data?.active_lab_id) {
        toast.error(t('realLabs.activeElsewhere'));
        navigate(`/real-lab/${res.data.active_lab_id}`);
      } else {
        toast.error(res.data?.error || t('realLabs.startError'));
      }
    } catch (e) {
      toast.error(t('realLabs.startError'));
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!session) return;
    if (!confirm(t('realLabs.confirmStop'))) return;
    setStopping(true);
    try {
      await base44.functions.invoke('stopRealLab', { session_record_id: session.id });
      setSession(null);
      setTimeLeft(0);
      toast.success(t('realLabs.stopped'));
    } catch (e) {
      toast.error(t('realLabs.stopError'));
    } finally {
      setStopping(false);
    }
  };

  const handleExpire = async () => {
    if (!session) return;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await base44.functions.invoke('stopRealLab', { session_record_id: session.id });
    } catch {
      // best effort
    }
    setSession(null);
    toast.error(t('realLabs.expired'));
  };

  const handleSubmitFlag = async () => {
    if (!flagValue.trim()) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await base44.functions.invoke('submitRealLabFlag', { lab_id: labId, flag: flagValue.trim() });
      const d = res.data;
      if (d?.error) {
        // Connection error — don't count as wrong, allow retry.
        toast.error(t('realLabs.submitError'));
      } else if (d?.correct) {
        setSubmitResult({ correct: true, points: d.points_awarded, already: d.already_completed });
        setCompletion({ lab_id: labId, points_awarded: d.points_awarded });
        toast.success(d.already_completed ? t('realLabs.alreadyCompleted') : t('realLabs.flagCorrect'));
        // Do NOT stop the lab — user stays in Kali until they press "Stop Lab".
      } else {
        setSubmitResult({ correct: false });
        toast.error(t('realLabs.flagWrong'));
      }
    } catch (e) {
      // Network/timeout error — don't count as wrong.
      toast.error(t('realLabs.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout role="student">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!lab) {
    return (
      <Layout role="student">
        <div className="text-center py-24">
          <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
          <p className="text-foreground-secondary">{t('realLabs.notFound')}</p>
          <Link to="/real-labs" className="text-primary text-sm mt-4 inline-block">{t('realLabs.backToList')}</Link>
        </div>
      </Layout>
    );
  }

  const isCompleted = !!completion;
  const isRunning = session && (session.status === 'running' || session.status === 'preparing');
  const isPreparing = session && session.status === 'preparing';

  return (
    <Layout role="student">
      <div className="space-y-4">
        {/* Back link */}
        <Link to="/real-labs" className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-primary transition-colors">
          {dir === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {t('realLabs.backToList')}
        </Link>

        {/* === DETAIL / PRE-START VIEW === */}
        {!isRunning && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Header */}
            <div className="card-base p-6">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Server className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{localized(lab, 'title', lang)}</h1>
                    {lab.category && <span className="text-xs text-secondary">{lab.category}</span>}
                  </div>
                </div>
                {isCompleted && (
                  <span className="px-3 py-1 rounded-full bg-success/10 text-success text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {t('lab.completed')}
                  </span>
                )}
              </div>
              <p className="text-foreground-secondary text-sm">{localized(lab, 'short_description', lang)}</p>
              <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                <span className={`px-2.5 py-1 rounded-full ${difficultyColors[lab.difficulty] || difficultyColors.easy}`}>
                  {lab.difficulty === 'easy' ? t('lab.easy') : lab.difficulty === 'medium' ? t('lab.medium') : t('lab.hard')}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-card border border-border text-foreground-secondary flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {lab.estimated_minutes || 45} {lang === 'ar' ? 'دقيقة' : 'min'}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-gold/10 text-gold flex items-center gap-1 font-medium">
                  <Flag className="w-3 h-3" /> {lab.points || 100} {t('realLabs.points')}
                </span>
              </div>
            </div>

            {/* Scenario */}
            <div className="card-base p-6">
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-3">
                <Crosshair className="w-5 h-5 text-primary" /> {t('realLabs.scenario')}
              </h2>
              <p className="text-foreground-secondary text-sm leading-relaxed whitespace-pre-wrap">
                {localized(lab, 'scenario', lang)}
              </p>
            </div>

            {/* Goal + Objectives */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card-base p-6">
                <h2 className="font-bold text-foreground flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-primary" /> {t('realLabs.goal')}
                </h2>
                <p className="text-foreground-secondary text-sm leading-relaxed">{localized(lab, 'goal', lang)}</p>
              </div>
              <div className="card-base p-6">
                <h2 className="font-bold text-foreground flex items-center gap-2 mb-3">
                  <ListChecks className="w-5 h-5 text-primary" /> {t('realLabs.objectives')}
                </h2>
                {(lab.objectives || []).length === 0 ? (
                  <p className="text-foreground-secondary text-sm">—</p>
                ) : (
                  <ul className="space-y-2">
                    {(lab.objectives || []).map((obj, i) => (
                      <li key={i} className="text-sm text-foreground-secondary flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Skills + Instructions */}
            <div className="card-base p-6">
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-primary" /> {t('realLabs.skills')}
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {(lab.skills || []).map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-xs">{s}</span>
                ))}
                {(lab.skills || []).length === 0 && <span className="text-sm text-foreground-secondary">—</span>}
              </div>
              {localized(lab, 'instructions', lang) && (
                <>
                  <h3 className="font-medium text-foreground mb-2 text-sm">{t('realLabs.instructions')}</h3>
                  <p className="text-foreground-secondary text-sm leading-relaxed whitespace-pre-wrap">
                    {localized(lab, 'instructions', lang)}
                  </p>
                </>
              )}
            </div>

            {/* Start button */}
            <div className="card-base p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-foreground-secondary">
                {isCompleted
                  ? t('realLabs.completedHint')
                  : t('realLabs.startHint')}
              </div>
              <button
                onClick={handleStart}
                disabled={starting}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {starting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {t('realLabs.preparing')}</>
                ) : (
                  <><Server className="w-5 h-5" /> {t('realLabs.startLab')}</>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* === PREPARING OVERLAY === */}
        <AnimatePresence>
          {isPreparing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center"
            >
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-foreground font-medium text-lg">{t('realLabs.preparing')}</p>
                <p className="text-foreground-secondary text-sm mt-1">{t('realLabs.preparingDesc')}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === RUNNING LAB INTERFACE === */}
        {isRunning && !isPreparing && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Top bar: status + timer + stop */}
            <div className="card-base p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                <span className="font-bold text-foreground">{localized(lab, 'title', lang)}</span>
                {syncing && <Loader2 className="w-3.5 h-3.5 text-foreground-secondary animate-spin" />}
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold ${timeLeft < 300 ? 'bg-danger/10 text-danger' : 'bg-card border border-border text-foreground'}`}>
                  <Clock className="w-4 h-4" />
                  {formatTime(timeLeft)}
                </div>
                <button
                  onClick={handleStop}
                  disabled={stopping}
                  className="px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm font-medium hover:bg-danger/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {stopping ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
                  {t('realLabs.stopLab')}
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              {/* Kali Desktop — main area */}
              <div className="lg:col-span-2">
                <div className="card-base p-4 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-foreground flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-primary" /> {t('realLabs.kaliDesktop')}
                    </h2>
                  </div>
                  <div className="flex-1 min-h-[400px] rounded-lg overflow-hidden bg-background-secondary border border-border relative">
                    {session.desktop_url && !iframeFailed ? (
                      <>
                        <iframe
                          src={session.desktop_url}
                          className="w-full h-full min-h-[400px]"
                          title="Kali Desktop"
                          allow="clipboard-read; clipboard-write; fullscreen"
                          onError={() => setIframeFailed(true)}
                        />
                        <a
                          href={session.desktop_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-background/90 border border-border text-foreground text-xs flex items-center gap-1.5 hover:border-primary/50 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> {t('realLabs.openDesktop')}
                        </a>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <Monitor className="w-12 h-12 text-foreground-secondary mb-3" />
                        <p className="text-foreground-secondary text-sm mb-4">
                          {iframeFailed ? t('realLabs.iframeBlocked') : t('realLabs.noDesktopUrl')}
                        </p>
                        {session.desktop_url && (
                          <a
                            href={session.desktop_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-lg bg-gradient-primary text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-4 h-4" /> {t('realLabs.openDesktop')}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar: target, scenario, objectives, submit flag */}
              <div className="space-y-4">
                {/* Target IP */}
                <div className="card-base p-4">
                  <h3 className="text-xs text-foreground-secondary mb-2 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5" /> {t('realLabs.targetIp')}
                  </h3>
                  <p className="font-mono text-lg font-bold text-primary" dir="ltr">
                    {session.target_ip || '—'}
                  </p>
                </div>

                {/* Status */}
                <div className="card-base p-4">
                  <h3 className="text-xs text-foreground-secondary mb-2">{t('common.status')}</h3>
                  <span className="px-2.5 py-1 rounded-full bg-success/10 text-success text-sm flex items-center gap-1.5 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    {session.status === 'running' ? t('realLabs.statusRunning') : t('realLabs.statusPreparing')}
                  </span>
                </div>

                {/* Objectives */}
                <div className="card-base p-4">
                  <h3 className="text-xs text-foreground-secondary mb-2 flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" /> {t('realLabs.objectives')}
                  </h3>
                  <ul className="space-y-1.5">
                    {(lab.objectives || []).map((obj, i) => (
                      <li key={i} className="text-xs text-foreground-secondary flex items-start gap-1.5">
                        <span className="text-primary">•</span>{obj}
                      </li>
                    ))}
                    {(lab.objectives || []).length === 0 && <li className="text-xs text-foreground-secondary">—</li>}
                  </ul>
                </div>

                {/* Submit Flag */}
                <div className="card-base p-4">
                  <h3 className="text-xs text-foreground-secondary mb-2 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5" /> {t('realLabs.submitFlag')}
                  </h3>
                  {isCompleted ? (
                    <div className="flex items-center gap-2 text-success text-sm py-2">
                      <CheckCircle2 className="w-4 h-4" /> {t('realLabs.alreadyCompleted')}
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={flagValue}
                        onChange={(e) => setFlagValue(e.target.value)}
                        placeholder={t('realLabs.flagPlaceholder')}
                        dir="ltr"
                        className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm font-mono focus:border-primary/50 outline-none mb-2"
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitFlag()}
                      />
                      <button
                        onClick={handleSubmitFlag}
                        disabled={submitting || !flagValue.trim()}
                        className="w-full px-3 py-2 rounded-lg bg-gradient-primary text-white text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                        {t('realLabs.submit')}
                      </button>
                      {submitResult?.correct === true && (
                        <div className="mt-2 flex items-center gap-2 text-success text-xs">
                          <CheckCircle2 className="w-4 h-4" /> +{submitResult.points} {t('realLabs.points')}
                        </div>
                      )}
                      {submitResult?.correct === false && (
                        <div className="mt-2 flex items-center gap-2 text-danger text-xs">
                          <ShieldAlert className="w-4 h-4" /> {t('realLabs.flagWrong')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}