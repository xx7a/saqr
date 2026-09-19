import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Save, Loader2, Wifi, WifiOff, Play, Square, Clock,
  CheckCircle2, AlertCircle, Lock, Key, ToggleLeft, ToggleRight,
  Server, Activity, Zap, ShieldCheck, RefreshCw
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AdminLabSettings() {
  const { t, lang, dir } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testingStart, setTestingStart] = useState(false);
  const [testStartResult, setTestStartResult] = useState(null);

  const loadData = async () => {
    try {
      const res = await base44.functions.invoke('getLabSettings', {});
      setSettings(res.data?.settings || null);
    } catch (e) {
      toast.error(t('labSettings.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('updateLabSettings', { settings });
      setSettings(res.data?.settings || settings);
      toast.success(t('labSettings.saved'));
    } catch (e) {
      toast.error(t('labSettings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('testLabConnection', {});
      setTestResult(res.data);
      if (res.data?.connected) {
        toast.success(t('labSettings.connectionOk'));
      } else {
        toast.error(t('labSettings.connectionFailed'));
      }
      loadData();
    } catch (e) {
      toast.error(t('labSettings.connectionFailed'));
    } finally {
      setTesting(false);
    }
  };

  const handleTestStart = async () => {
    setTestingStart(true);
    setTestStartResult(null);
    try {
      const res = await base44.functions.invoke('testStartLab', { template_id: 'test-lab' });
      setTestStartResult(res.data);
      if (res.data?.success) {
        toast.success(t('labSettings.testStartOk'));
      } else {
        toast.error(res.data?.error || t('labSettings.testStartFailed'));
      }
    } catch (e) {
      toast.error(t('labSettings.testStartFailed'));
    } finally {
      setTestingStart(false);
    }
  };

  const handleStopTest = async (sessionId) => {
    try {
      await base44.functions.invoke('stopTestLab', { session_id: sessionId });
      setTestStartResult(null);
      toast.success(t('labSettings.testStopped'));
    } catch (e) {
      toast.error(t('labSettings.testStopError'));
    }
  };

  const update = (field, value) => setSettings({ ...settings, [field]: value });

  if (loading) {
    return (
      <Layout role="admin">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  const Arrow = dir === 'rtl' ? '←' : '→';

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" /> {t('labSettings.title')}
          </h1>
          <p className="text-foreground-secondary text-sm mt-1">{t('labSettings.desc')}</p>
        </div>

        {/* Connection Status Banner */}
        <div className={`card-base p-4 ${settings?.last_connection_status === 'connected' ? 'border-success/30 bg-success/5' : settings?.last_connection_status === 'failed' ? 'border-danger/30 bg-danger/5' : ''}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {settings?.last_connection_status === 'connected' ? (
                <Wifi className="w-5 h-5 text-success" />
              ) : settings?.last_connection_status === 'failed' ? (
                <WifiOff className="w-5 h-5 text-danger" />
              ) : (
                <Activity className="w-5 h-5 text-foreground-secondary" />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {settings?.last_connection_status === 'connected' ? t('labSettings.apiOnline') :
                   settings?.last_connection_status === 'failed' ? t('labSettings.apiOffline') :
                   t('labSettings.apiUnknown')}
                </p>
                {settings?.last_connection_test && (
                  <p className="text-xs text-foreground-secondary">
                    {new Date(settings.last_connection_test).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    {settings.last_connection_response_time ? ` · ${settings.last_connection_response_time}ms` : ''}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {t('labSettings.testConnection')}
            </button>
          </div>
          {testResult && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pt-3 border-t border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-foreground-secondary">{t('labSettings.status')}</p>
                  <p className={`font-medium ${testResult.connected ? 'text-success' : 'text-danger'}`}>
                    {testResult.connected ? t('labSettings.connected') : t('labSettings.failed')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-secondary">{t('labSettings.httpStatus')}</p>
                  <p className="font-mono text-foreground">{testResult.http_status || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-secondary">{t('labSettings.responseTime')}</p>
                  <p className="font-mono text-foreground">{testResult.response_time_ms}ms</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-secondary">{t('labSettings.baseUrl')}</p>
                  <p className="font-mono text-xs text-foreground truncate" dir="ltr">{testResult.base_url}</p>
                </div>
              </div>
              {testResult.error && (
                <p className="text-xs text-danger mt-2 font-mono" dir="ltr">{testResult.error}</p>
              )}
            </motion.div>
          )}
        </div>

        {/* API Settings */}
        <div className="card-base p-5">
          <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-primary" /> {t('labSettings.apiConfig')}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.baseUrl')}</label>
              <input
                value={settings?.api_base_url || ''}
                onChange={(e) => update('api_base_url', e.target.value)}
                className="form-input font-mono" dir="ltr"
                placeholder="https://labs.saqr5.com"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.startEndpoint')}</label>
                <input value={settings?.start_endpoint || ''} onChange={(e) => update('start_endpoint', e.target.value)}
                  className="form-input font-mono" dir="ltr" placeholder="/start-lab" />
              </div>
              <div>
                <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.statusEndpoint')}</label>
                <input value={settings?.status_endpoint_template || ''} onChange={(e) => update('status_endpoint_template', e.target.value)}
                  className="form-input font-mono" dir="ltr" placeholder="/lab/{session_id}" />
              </div>
              <div>
                <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.stopEndpoint')}</label>
                <input value={settings?.stop_endpoint_template || ''} onChange={(e) => update('stop_endpoint_template', e.target.value)}
                  className="form-input font-mono" dir="ltr" placeholder="/lab/{session_id}" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.labProvider')}</label>
                <input value={settings?.lab_provider || ''} onChange={(e) => update('lab_provider', e.target.value)}
                  className="form-input" dir="ltr" placeholder="SAQR Lab API" />
              </div>
              <div>
                <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.environmentType')}</label>
                <select value={settings?.environment_type || 'development'} onChange={(e) => update('environment_type', e.target.value)}
                  className="form-input">
                  <option value="production">{t('labSettings.envProduction')}</option>
                  <option value="staging">{t('labSettings.envStaging')}</option>
                  <option value="development">{t('labSettings.envDevelopment')}</option>
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.desktopGateway')}</label>
                <input value={settings?.desktop_gateway_url || ''} onChange={(e) => update('desktop_gateway_url', e.target.value)}
                  className="form-input font-mono" dir="ltr" placeholder="(optional)" />
              </div>
              <div>
                <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.proxySettings')}</label>
                <input value={settings?.proxy_settings || ''} onChange={(e) => update('proxy_settings', e.target.value)}
                  className="form-input" dir="ltr" placeholder="(optional)" />
              </div>
            </div>
          </div>
        </div>

        {/* API Key Section */}
        <div className="card-base p-5">
          <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-primary" /> {t('labSettings.apiKeyManagement')}
          </h2>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
            <Lock className="w-5 h-5 text-foreground-secondary shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground font-medium">
                {settings?.api_key_configured ? t('labSettings.apiKeySet') : t('labSettings.apiKeyNotSet')}
              </p>
              <p className="text-xs text-foreground-secondary mt-0.5">
                {settings?.api_key_configured ? '••••••••••••••••' : t('labSettings.apiKeyMissingDesc')}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${settings?.api_key_configured ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {settings?.api_key_configured ? t('labSettings.configured') : t('labSettings.notConfigured')}
            </span>
          </div>
          <p className="text-xs text-foreground-secondary mt-3 flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
            {t('labSettings.apiKeySecretNote')}
          </p>
        </div>

        {/* General Settings */}
        <div className="card-base p-5">
          <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary" /> {t('labSettings.generalSettings')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.timeoutSeconds')}</label>
              <input type="number" value={settings?.timeout_seconds ?? 30} onChange={(e) => update('timeout_seconds', Number(e.target.value))}
                className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.maxConcurrent')}</label>
              <input type="number" value={settings?.max_concurrent_labs ?? 10} onChange={(e) => update('max_concurrent_labs', Number(e.target.value))}
                className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.maxPerUser')}</label>
              <input type="number" value={settings?.max_labs_per_user ?? 1} onChange={(e) => update('max_labs_per_user', Number(e.target.value))}
                className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.defaultDuration')}</label>
              <input type="number" value={settings?.default_lab_duration ?? 45} onChange={(e) => update('default_lab_duration', Number(e.target.value))}
                className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.statusCheckInterval')}</label>
              <input type="number" value={settings?.status_check_interval_seconds ?? 15} onChange={(e) => update('status_check_interval_seconds', Number(e.target.value))}
                className="form-input" dir="ltr" />
            </div>
          </div>
          {/* Toggles */}
          <div className="space-y-2">
            <ToggleRow label={t('labSettings.labsEnabled')} value={settings?.labs_enabled} onChange={(v) => update('labs_enabled', v)} />
            <ToggleRow label={t('labSettings.allowMultipleLabs')} value={settings?.allow_multiple_labs} onChange={(v) => update('allow_multiple_labs', v)} />
            <ToggleRow label={t('labSettings.allowStop')} value={settings?.allow_stop} onChange={(v) => update('allow_stop', v)} />
            <ToggleRow label={t('labSettings.allowReset')} value={settings?.allow_reset} onChange={(v) => update('allow_reset', v)} />
            <ToggleRow label={t('labSettings.showTimer')} value={settings?.show_timer} onChange={(v) => update('show_timer', v)} />
            <ToggleRow label={t('labSettings.showTargetIp')} value={settings?.show_target_ip} onChange={(v) => update('show_target_ip', v)} />
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="card-base p-5">
          <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-warning" /> {t('labSettings.maintenanceMode')}
          </h2>
          <ToggleRow label={t('labSettings.enableMaintenance')} value={settings?.maintenance_mode} onChange={(v) => update('maintenance_mode', v)} />
          {settings?.maintenance_mode && (
            <div className="mt-3">
              <label className="text-xs text-foreground-secondary mb-1 block">{t('labSettings.maintenanceMessage')}</label>
              <input value={settings?.maintenance_message || ''} onChange={(e) => update('maintenance_message', e.target.value)}
                className="form-input" dir="rtl" />
            </div>
          )}
        </div>

        {/* Test Start Lab */}
        <div className="card-base p-5">
          <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <Play className="w-5 h-5 text-primary" /> {t('labSettings.testStartLab')}
          </h2>
          <p className="text-sm text-foreground-secondary mb-3">{t('labSettings.testStartLabDesc')}</p>
          <button
            onClick={handleTestStart}
            disabled={testingStart}
            className="px-4 py-2 rounded-lg bg-gradient-primary text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {testingStart ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {t('labSettings.testStartLab')}
          </button>
          {testStartResult?.success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 rounded-lg bg-success/5 border border-success/20 space-y-2">
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> {t('labSettings.testStartOk')}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-foreground-secondary">session_id:</span> <span className="font-mono text-foreground" dir="ltr">{testStartResult.session_id}</span></div>
                <div><span className="text-foreground-secondary">status:</span> <span className="font-mono text-foreground" dir="ltr">{testStartResult.status}</span></div>
                <div><span className="text-foreground-secondary">target_ip:</span> <span className="font-mono text-foreground" dir="ltr">{testStartResult.target_ip}</span></div>
                <div><span className="text-foreground-secondary">desktop_url:</span> <span className="font-mono text-xs text-foreground truncate" dir="ltr">{testStartResult.desktop_url}</span></div>
              </div>
              <button
                onClick={() => handleStopTest(testStartResult.session_id)}
                className="px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm font-medium hover:bg-danger/20 transition-colors flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5" /> {t('labSettings.stopTestSession')}
              </button>
            </motion.div>
          )}
          {testStartResult && !testStartResult.success && (
            <div className="mt-4 p-4 rounded-lg bg-danger/5 border border-danger/20">
              <p className="text-danger text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {testStartResult.error}
              </p>
              {testStartResult.details && (
                <pre className="text-xs text-foreground-secondary mt-2 p-2 bg-card rounded overflow-x-auto" dir="ltr">
                  {JSON.stringify(testStartResult.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-gradient-primary text-white font-medium flex items-center gap-2 disabled:opacity-50 shadow-lg"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {t('common.save')}
          </button>
        </div>
      </div>
    </Layout>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between p-3 rounded-lg bg-card border border-border cursor-pointer hover:border-primary/30 transition-colors">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-border'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'left-0.5' : 'right-0.5'}`} />
      </button>
    </label>
  );
}