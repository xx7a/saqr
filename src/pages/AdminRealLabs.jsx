import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, Plus, Pencil, Trash2, X, Save, Eye, EyeOff, GripVertical,
  CheckCircle2, AlertCircle, Loader2, Flag, Lock
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const emptyLab = {
  title: '',
  title_en: '',
  short_description: '',
  short_description_en: '',
  scenario: '',
  scenario_en: '',
  goal: '',
  goal_en: '',
  objectives: [],
  instructions: '',
  instructions_en: '',
  skills: [],
  category: 'general',
  difficulty: 'easy',
  estimated_minutes: 45,
  points: 100,
  lab_template_id: '',
  backend_lab_type: '',
  environment_id: '',
  correct_flag: '',
  is_published: false,
  is_enabled: true,
  order: 0,
};

export default function AdminRealLabs() {
  const { t, lang, dir } = useTranslation();
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // lab object or null
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const [objectivesText, setObjectivesText] = useState('');
  const [skillsText, setSkillsText] = useState('');

  const loadData = async () => {
    try {
      const data = await base44.entities.RealLab.list('order', 200);
      setLabs(data || []);
    } catch (e) {
      toast.error(t('realLabsAdmin.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNew = () => {
    setEditing({ ...emptyLab });
    setObjectivesText('');
    setSkillsText('');
    setShowFlag(false);
    setShowForm(true);
  };

  const openEdit = (lab) => {
    setEditing({ ...lab });
    setObjectivesText((lab.objectives || []).join('\n'));
    setSkillsText((lab.skills || []).join(', '));
    setShowFlag(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editing.title.trim()) {
      toast.error(t('realLabsAdmin.titleRequired'));
      return;
    }
    setSaving(true);
    const payload = {
      ...editing,
      objectives: objectivesText.split('\n').map(s => s.trim()).filter(Boolean),
      skills: skillsText.split(',').map(s => s.trim()).filter(Boolean),
    };
    try {
      if (editing.id) {
        await base44.entities.RealLab.update(editing.id, payload);
        toast.success(t('realLabsAdmin.updated'));
      } else {
        await base44.entities.RealLab.create(payload);
        toast.success(t('realLabsAdmin.created'));
      }
      setShowForm(false);
      setEditing(null);
      loadData();
    } catch (e) {
      toast.error(t('realLabsAdmin.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lab) => {
    if (!confirm(t('realLabsAdmin.confirmDelete'))) return;
    try {
      await base44.entities.RealLab.delete(lab.id);
      toast.success(t('realLabsAdmin.deleted'));
      loadData();
    } catch {
      toast.error(t('realLabsAdmin.deleteError'));
    }
  };

  const togglePublish = async (lab) => {
    try {
      await base44.entities.RealLab.update(lab.id, { is_published: !lab.is_published });
      loadData();
    } catch {
      toast.error(t('realLabsAdmin.saveError'));
    }
  };

  const difficultyColors = {
    easy: 'bg-success/10 text-success',
    medium: 'bg-warning/10 text-warning',
    hard: 'bg-danger/10 text-danger',
  };

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Server className="w-6 h-6 text-primary" /> {t('realLabsAdmin.title')}
            </h1>
            <p className="text-foreground-secondary text-sm mt-1">{t('realLabsAdmin.desc')}</p>
          </div>
          <button
            onClick={openNew}
            className="px-4 py-2.5 rounded-lg bg-gradient-primary text-white font-medium text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {t('realLabsAdmin.add')}
          </button>
        </div>

        {/* Security notice */}
        <div className="card-base p-4 bg-warning/5 border-warning/20">
          <p className="text-sm text-foreground-secondary flex items-start gap-2">
            <Lock className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <span>{t('realLabsAdmin.securityNotice')}</span>
          </p>
        </div>

        {/* Labs list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : labs.length === 0 ? (
          <div className="card-base p-12 text-center">
            <Server className="w-12 h-12 text-foreground-secondary mx-auto mb-3" />
            <p className="text-foreground-secondary">{t('realLabsAdmin.noLabs')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {labs.map((lab) => (
              <div key={lab.id} className="card-base p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground truncate">{lab.title}</p>
                    {lab.is_published ? (
                      <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> {t('realLabsAdmin.published')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-card text-foreground-secondary text-xs shrink-0">{t('realLabsAdmin.draft')}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-foreground-secondary">
                    <span className={`px-1.5 py-0.5 rounded ${difficultyColors[lab.difficulty]}`}>{lab.difficulty}</span>
                    {lab.category && <span>{lab.category}</span>}
                    <span>{lab.estimated_minutes || 45} {lang === 'ar' ? 'د' : 'm'}</span>
                    <span className="text-gold flex items-center gap-0.5"><Flag className="w-3 h-3" /> {lab.points || 100}</span>
                    {lab.backend_lab_type && <span className="text-secondary">API: {lab.backend_lab_type}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => togglePublish(lab)}
                    className="p-2 rounded-lg bg-card border border-border text-foreground-secondary hover:text-primary transition-colors"
                    title={lab.is_published ? t('realLabsAdmin.unpublish') : t('realLabsAdmin.publish')}
                  >
                    {lab.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(lab)}
                    className="p-2 rounded-lg bg-card border border-border text-foreground-secondary hover:text-primary transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(lab)}
                    className="p-2 rounded-lg bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === Edit/Create Modal === */}
      <AnimatePresence>
        {showForm && editing && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
            >
              <div className="card-base p-6 w-full max-w-2xl my-8" dir={dir}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-foreground">
                    {editing.id ? t('realLabsAdmin.editTitle') : t('realLabsAdmin.addTitle')}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="p-2 text-foreground-secondary hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                  {/* Title */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.titleAr')} *</label>
                      <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                        className="form-input" dir="rtl" />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.titleEn')}</label>
                      <input value={editing.title_en} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })}
                        className="form-input" dir="ltr" />
                    </div>
                  </div>

                  {/* Short description */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.shortDescAr')}</label>
                      <textarea value={editing.short_description} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })}
                        rows={2} className="form-input" dir="rtl" />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.shortDescEn')}</label>
                      <textarea value={editing.short_description_en} onChange={(e) => setEditing({ ...editing, short_description_en: e.target.value })}
                        rows={2} className="form-input" dir="ltr" />
                    </div>
                  </div>

                  {/* Scenario */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.scenarioAr')}</label>
                      <textarea value={editing.scenario} onChange={(e) => setEditing({ ...editing, scenario: e.target.value })}
                        rows={4} className="form-input" dir="rtl" />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.scenarioEn')}</label>
                      <textarea value={editing.scenario_en} onChange={(e) => setEditing({ ...editing, scenario_en: e.target.value })}
                        rows={4} className="form-input" dir="ltr" />
                    </div>
                  </div>

                  {/* Goal */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.goalAr')}</label>
                      <input value={editing.goal} onChange={(e) => setEditing({ ...editing, goal: e.target.value })}
                        className="form-input" dir="rtl" />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.goalEn')}</label>
                      <input value={editing.goal_en} onChange={(e) => setEditing({ ...editing, goal_en: e.target.value })}
                        className="form-input" dir="ltr" />
                    </div>
                  </div>

                  {/* Objectives */}
                  <div>
                    <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.objectivesHint')}</label>
                    <textarea value={objectivesText} onChange={(e) => setObjectivesText(e.target.value)}
                      rows={3} className="form-input" dir="rtl" placeholder={t('realLabsAdmin.objectivesPlaceholder')} />
                  </div>

                  {/* Instructions */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.instructionsAr')}</label>
                      <textarea value={editing.instructions} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })}
                        rows={3} className="form-input" dir="rtl" />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.instructionsEn')}</label>
                      <textarea value={editing.instructions_en} onChange={(e) => setEditing({ ...editing, instructions_en: e.target.value })}
                        rows={3} className="form-input" dir="ltr" />
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.skillsHint')}</label>
                    <input value={skillsText} onChange={(e) => setSkillsText(e.target.value)}
                      className="form-input" dir="ltr" placeholder="nmap, wireshark, burp suite" />
                  </div>

                  {/* Config grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.difficulty')}</label>
                      <select value={editing.difficulty} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })}
                        className="form-input">
                        <option value="easy">{t('lab.easy')}</option>
                        <option value="medium">{t('lab.medium')}</option>
                        <option value="hard">{t('lab.hard')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.category')}</label>
                      <input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                        className="form-input" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.minutes')}</label>
                      <input type="number" value={editing.estimated_minutes} onChange={(e) => setEditing({ ...editing, estimated_minutes: Number(e.target.value) })}
                        className="form-input" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.points')}</label>
                      <input type="number" value={editing.points} onChange={(e) => setEditing({ ...editing, points: Number(e.target.value) })}
                        className="form-input" dir="ltr" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.labTemplateId')}</label>
                      <input value={editing.lab_template_id} onChange={(e) => setEditing({ ...editing, lab_template_id: e.target.value })}
                        className="form-input font-mono" dir="ltr" placeholder="web-recon-01" />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.backendLabType')}</label>
                      <input value={editing.backend_lab_type} onChange={(e) => setEditing({ ...editing, backend_lab_type: e.target.value })}
                        className="form-input font-mono" dir="ltr" placeholder="web-server-recon" />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabsAdmin.environmentId')}</label>
                      <input value={editing.environment_id} onChange={(e) => setEditing({ ...editing, environment_id: e.target.value })}
                        className="form-input font-mono" dir="ltr" placeholder="(optional)" />
                    </div>
                  </div>

                  {/* Correct Flag — secure field */}
                  <div>
                    <label className="text-xs text-foreground-secondary mb-1 block flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {t('realLabsAdmin.correctFlag')}
                    </label>
                    <div className="relative">
                      <input
                        type={showFlag ? 'text' : 'password'}
                        value={editing.correct_flag}
                        onChange={(e) => setEditing({ ...editing, correct_flag: e.target.value })}
                        className="form-input font-mono pr-10"
                        dir="ltr"
                        placeholder="SAQR{...}"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFlag(!showFlag)}
                        className="absolute top-1/2 -translate-y-1/2 right-2 text-foreground-secondary hover:text-foreground"
                      >
                        {showFlag ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-warning mt-1">{t('realLabsAdmin.flagWarning')}</p>
                  </div>

                  {/* Publish + Enabled */}
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editing.is_published} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                        className="w-4 h-4 rounded border-border" />
                      <span className="text-sm text-foreground">{t('realLabsAdmin.publishOnStart')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editing.is_enabled} onChange={(e) => setEditing({ ...editing, is_enabled: e.target.checked })}
                        className="w-4 h-4 rounded border-border" />
                      <span className="text-sm text-foreground">{t('realLabsAdmin.labEnabled')}</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-border">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm">
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-gradient-primary text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}