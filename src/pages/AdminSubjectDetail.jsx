import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Clock, Plus, Edit2, Trash2, X, Save, Eye, EyeOff,
  ChevronRight, ChevronLeft, FileText, GripVertical, ArrowLeft, Settings
} from 'lucide-react';
import Layout from '@/components/Layout';
import { AnimatedButton, SkeletonCard, EmptyState } from '@/components/AnimationSystem';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import AdminCourseSlides from '@/components/AdminCourseSlides';

export default function AdminSubjectDetail() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { t, lang, dir } = useTranslation();
  const [subject, setSubject] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLesson, setEditingLesson] = useState(null);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [subjectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const subjectData = await base44.entities.Subject.get(subjectId);
      setSubject(subjectData);
      const lessonsData = await base44.entities.Lesson.filter({ subject_id: subjectId }, 'order', 100);
      setLessons(lessonsData || []);
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'فشل تحميل المادة' : 'Failed to load subject');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLesson = async (form) => {
    try {
      const data = {
        ...form,
        subject_id: subjectId,
        subject_name: subject.name,
        track_id: subject.track_id,
        track_name: subject.track_name,
        estimated_minutes: Number(form.estimated_minutes) || 15,
        order: Number(form.order) || (lessons.length + 1),
        sources: form.sources || [],
        is_published: form.is_published !== false,
      };
      if (editingLesson?.id) {
        await base44.entities.Lesson.update(editingLesson.id, data);
        toast.success(lang === 'ar' ? 'تم تحديث الدرس' : 'Lesson updated');
      } else {
        await base44.entities.Lesson.create(data);
        toast.success(lang === 'ar' ? 'تم إضافة الدرس' : 'Lesson added');
      }
      setShowLessonForm(false);
      setEditingLesson(null);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'فشل الحفظ' : 'Failed to save');
    }
  };

  const handleDeleteLesson = async (lesson) => {
    if (!confirm(lang === 'ar' ? `حذف "${lesson.title}"؟ سيُحذف مع أنشطته.` : `Delete "${lesson.title}"? It will be deleted with its activities.`)) return;
    try {
      await base44.entities.Lesson.delete(lesson.id);
      const acts = await base44.entities.LessonActivity.filter({ lesson_id: lesson.id });
      if (acts?.length) await base44.entities.LessonActivity.deleteMany({ lesson_id: lesson.id });
      toast.success(lang === 'ar' ? 'تم حذف الدرس' : 'Lesson deleted');
      loadData();
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  const handleSaveSubject = async (form) => {
    try {
      await base44.entities.Subject.update(subjectId, {
        name: form.name,
        description: form.description,
        estimated_hours: Number(form.estimated_hours) || 0,
        pass_score: Number(form.pass_score) || 70,
        order: Number(form.order) || 0,
        unlock_rule: form.unlock_rule || 'sequential',
        is_published: form.is_published !== false,
      });
      toast.success(lang === 'ar' ? 'تم تحديث المادة' : 'Subject updated');
      setShowSubjectForm(false);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'فشل تحديث المادة' : 'Failed to update subject');
    }
  };

  if (loading) {
    return (
      <Layout role="admin">
        <div className="space-y-4">
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-64" />
        </div>
      </Layout>
    );
  }

  if (!subject) {
    return (
      <Layout role="admin">
        <EmptyState icon={FileText} title={lang === 'ar' ? 'المادة غير موجودة' : 'Subject not found'} />
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <Link to="/admin/subjects" className="hover:text-foreground">{t('layout.adminSubjects')}</Link>
          {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="text-foreground truncate">{subject.name}</span>
        </div>

        {/* Subject header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{subject.name}</h1>
                  {subject.track_name && (
                    <p className="text-sm text-foreground-secondary">{subject.track_name}</p>
                  )}
                </div>
              </div>
              {subject.description && (
                <p className="text-foreground-secondary text-sm mt-3">{subject.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1.5 text-foreground-secondary">
                <BookOpen className="w-4 h-4" /> {lessons.length} {lang === 'ar' ? 'درس' : 'lessons'}
                </span>
                <span className="flex items-center gap-1.5 text-foreground-secondary">
                <Clock className="w-4 h-4" /> {subject.estimated_hours || 0} {lang === 'ar' ? 'ساعة' : 'hours'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${subject.is_published ? 'bg-success/10 text-success' : 'bg-card text-foreground-secondary'}`}>
                {subject.is_published ? (lang === 'ar' ? 'منشور' : 'Published') : (lang === 'ar' ? 'مسودة' : 'Draft')}
                </span>
              </div>
            </div>
            <AnimatedButton variant="secondary" onClick={() => setShowSubjectForm(true)}>
              <Settings className="w-4 h-4" /> {lang === 'ar' ? 'تعديل المادة' : 'Edit subject'}
            </AnimatedButton>
          </div>
        </motion.div>

        {/* Course Slides management */}
        <AdminCourseSlides subjectId={subjectId} subjectName={subject.name} />

        {/* Lessons section */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{lang === 'ar' ? 'الدروس' : 'Lessons'} ({lessons.length})</h2>
          <AnimatedButton onClick={() => { setEditingLesson(null); setShowLessonForm(true); }}>
            <Plus className="w-4 h-4" /> {lang === 'ar' ? 'إضافة درس' : 'Add lesson'}
          </AnimatedButton>
        </div>

        {lessons.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={lang === 'ar' ? 'لا توجد دروس' : 'No lessons'}
            message={lang === 'ar' ? 'ابدأ بإضافة أول درس لهذه المادة' : 'Start by adding the first lesson'}
            action={
              <AnimatedButton onClick={() => { setEditingLesson(null); setShowLessonForm(true); }}>
                <Plus className="w-4 h-4" /> {lang === 'ar' ? 'إضافة درس' : 'Add lesson'}
              </AnimatedButton>
            }
          />
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, i) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card-base p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-sm">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{lesson.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    {lesson.short_description && (
                      <p className="text-sm text-foreground-secondary truncate">{lesson.short_description}</p>
                    )}
                    <span className="flex items-center gap-1 text-xs text-foreground-secondary shrink-0">
                      <Clock className="w-3 h-3" /> {lesson.estimated_minutes || 15} {lang === 'ar' ? 'د' : 'min'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${lesson.is_published ? 'bg-success/10 text-success' : 'bg-card text-foreground-secondary'}`}>
                      {lesson.is_published ? <><Eye className="w-3 h-3 inline" /> {lang === 'ar' ? 'منشور' : 'Published'}</> : <><EyeOff className="w-3 h-3 inline" /> {lang === 'ar' ? 'مسودة' : 'Draft'}</>}
                    </span>
                    {lesson.has_activity && (
                      <span className="text-xs text-secondary shrink-0">+{lang === 'ar' ? 'تطبيق' : 'activity'}</span>
                    )}
                    {lesson.has_lab && (
                      <span className="text-xs text-primary shrink-0">+{lang === 'ar' ? 'مختبر' : 'lab'}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditingLesson(lesson); setShowLessonForm(true); }}
                    className="p-2 text-foreground-secondary hover:text-primary transition-colors"
                    title={lang === 'ar' ? 'تعديل' : 'Edit'}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLesson(lesson)}
                    className="p-2 text-foreground-secondary hover:text-danger transition-colors"
                    title={lang === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Lesson form modal */}
        <AnimatePresence>
          {showLessonForm && (
            <LessonFormModal
              editing={editingLesson}
              nextOrder={lessons.length + 1}
              onSave={handleSaveLesson}
              onClose={() => { setShowLessonForm(false); setEditingLesson(null); }}
            />
          )}
        </AnimatePresence>

        {/* Subject form modal */}
        <AnimatePresence>
          {showSubjectForm && (
            <SubjectFormModal
              subject={subject}
              onSave={handleSaveSubject}
              onClose={() => setShowSubjectForm(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function LessonFormModal({ editing, nextOrder, onSave, onClose }) {
  const { t, lang, dir } = useTranslation();
  const [form, setForm] = useState(() => {
    if (editing) {
      const f = { ...editing };
      if (Array.isArray(f.sources)) f.sources = f.sources.join('\n');
      return f;
    }
    return {
      title: '',
      short_description: '',
      content: '',
      estimated_minutes: 20,
      lesson_type: 'security',
      video_url: '',
      order: nextOrder,
      has_activity: true,
      has_lab: false,
      sources: '',
      is_published: true,
    };
  });

  const update = (key, value) => setForm({ ...form, [key]: value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title?.trim()) { toast.error(lang === 'ar' ? 'العنوان مطلوب' : 'Title is required'); return; }
    const data = { ...form };
    if (typeof data.sources === 'string') {
      data.sources = data.sources.split('\n').map(s => s.trim()).filter(Boolean);
    }
    onSave(data);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      >
        <div className="card-base p-6 w-full max-w-2xl my-8" dir="rtl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">{editing ? (lang === 'ar' ? 'تعديل الدرس' : 'Edit lesson') : (lang === 'ar' ? 'إضافة درس' : 'Add lesson')}</h2>
            <button onClick={onClose} className="p-2 text-foreground-secondary hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label={lang === 'ar' ? 'عنوان الدرس' : 'Lesson title'} required>
              <input
                value={form.title || ''} onChange={(e) => update('title', e.target.value)}
                className="form-input"
                placeholder={lang === 'ar' ? 'مثال: مقدمة في الأمن السيبراني' : 'Example: Intro to Cybersecurity'}
              />
            </FormField>
            <FormField label={lang === 'ar' ? 'وصف مختصر' : 'Short description'}>
              <input
                value={form.short_description || ''} onChange={(e) => update('short_description', e.target.value)}
                className="form-input"
                placeholder={lang === 'ar' ? 'وصف قصير يظهر في القائمة' : 'Short description shown in the list'}
              />
            </FormField>
            <FormField label={lang === 'ar' ? 'المحتوى (Markdown)' : 'Content (Markdown)'}>
              <textarea
                value={form.content || ''} onChange={(e) => update('content', e.target.value)}
                rows={8}
                className="form-input resize-y font-mono text-sm"
                dir={dir}
                placeholder="## Title&#10;&#10;Content..."
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={lang === 'ar' ? 'المدة (دقيقة)' : 'Duration (min)'}>
                <input
                  type="number" value={form.estimated_minutes || 15}
                  onChange={(e) => update('estimated_minutes', e.target.value)}
                  className="form-input"
                />
              </FormField>
              <FormField label={lang === 'ar' ? 'نوع الدرس' : 'Lesson type'}>
                <select value={form.lesson_type || 'security'} onChange={(e) => update('lesson_type', e.target.value)} className="form-input">
                  <option value="theory">{lang === 'ar' ? 'نظري' : 'Theory'}</option>
                  <option value="tool">{lang === 'ar' ? 'أداة' : 'Tool'}</option>
                  <option value="network">{lang === 'ar' ? 'شبكات' : 'Network'}</option>
                  <option value="os">{lang === 'ar' ? 'أنظمة تشغيل' : 'OS'}</option>
                  <option value="programming">{lang === 'ar' ? 'برمجة' : 'Programming'}</option>
                  <option value="security">{lang === 'ar' ? 'أمن سيبراني' : 'Security'}</option>
                  <option value="lab">{lang === 'ar' ? 'مختبر' : 'Lab'}</option>
                </select>
              </FormField>
            </div>
            <FormField label={lang === 'ar' ? 'رابط الفيديو' : 'Video URL'}>
              <input
                value={form.video_url || ''} onChange={(e) => update('video_url', e.target.value)}
                className="form-input"
                dir="ltr"
                placeholder="https://..."
              />
            </FormField>
            <FormField label={lang === 'ar' ? 'مصادر موثوقة (كل مصدر في سطر)' : 'Trusted sources (one per line)'}>
              <textarea
                value={form.sources || ''} onChange={(e) => update('sources', e.target.value)}
                rows={2}
                className="form-input resize-y text-sm"
                dir="ltr"
                placeholder="NIST — ...&#10;OWASP — ..."
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={lang === 'ar' ? 'الترتيب' : 'Order'}>
                <input
                  type="number" value={form.order || 1}
                  onChange={(e) => update('order', e.target.value)}
                  className="form-input"
                />
              </FormField>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox" checked={form.has_activity !== false}
                    onChange={(e) => update('has_activity', e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  {lang === 'ar' ? 'يحتوي على تطبيق' : 'Has activity'}
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox" checked={form.has_lab === true}
                    onChange={(e) => update('has_lab', e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  {lang === 'ar' ? 'يحتوي على مختبر' : 'Has lab'}
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox" checked={form.is_published !== false}
                onChange={(e) => update('is_published', e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              {lang === 'ar' ? 'منشور (مرئي للطلاب)' : 'Published (visible to students)'}
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-foreground-secondary hover:text-foreground">
                {t('common.cancel')}
              </button>
              <AnimatedButton type="submit">
                <Save className="w-4 h-4" /> {lang === 'ar' ? 'حفظ' : 'Save'}
              </AnimatedButton>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}

function SubjectFormModal({ subject, onSave, onClose }) {
  const { t, lang, dir } = useTranslation();
  const [form, setForm] = useState({
    name: subject.name || '',
    description: subject.description || '',
    estimated_hours: subject.estimated_hours || 0,
    pass_score: subject.pass_score || 70,
    order: subject.order || 0,
    unlock_rule: subject.unlock_rule || 'sequential',
    is_published: subject.is_published !== false,
  });

  const update = (key, value) => setForm({ ...form, [key]: value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error(lang === 'ar' ? 'اسم المادة مطلوب' : 'Subject name is required'); return; }
    onSave(form);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      >
        <div className="card-base p-6 w-full max-w-lg my-8" dir="rtl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">{lang === 'ar' ? 'تعديل المادة' : 'Edit subject'}</h2>
            <button onClick={onClose} className="p-2 text-foreground-secondary hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label={lang === 'ar' ? 'اسم المادة' : 'Subject name'} required>
              <input
                value={form.name} onChange={(e) => update('name', e.target.value)}
                className="form-input"
              />
            </FormField>
            <FormField label={lang === 'ar' ? 'الوصف' : 'Description'}>
              <textarea
                value={form.description} onChange={(e) => update('description', e.target.value)}
                rows={3}
                className="form-input resize-y"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={lang === 'ar' ? 'الساعات التقديرية' : 'Estimated hours'}>
                <input
                  type="number" value={form.estimated_hours}
                  onChange={(e) => update('estimated_hours', e.target.value)}
                  className="form-input"
                />
              </FormField>
              <FormField label={lang === 'ar' ? 'درجة النجاح (%)' : 'Pass score (%)'}>
                <input
                  type="number" value={form.pass_score}
                  onChange={(e) => update('pass_score', e.target.value)}
                  className="form-input"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={lang === 'ar' ? 'الترتيب' : 'Order'}>
                <input
                  type="number" value={form.order}
                  onChange={(e) => update('order', e.target.value)}
                  className="form-input"
                />
              </FormField>
              <FormField label={lang === 'ar' ? 'قاعدة الفتح' : 'Unlock rule'}>
                <select value={form.unlock_rule} onChange={(e) => update('unlock_rule', e.target.value)} className="form-input">
                  <option value="sequential">{lang === 'ar' ? 'تسلسلي' : 'Sequential'}</option>
                  <option value="free">{lang === 'ar' ? 'حر' : 'Free'}</option>
                </select>
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox" checked={form.is_published}
                onChange={(e) => update('is_published', e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              {lang === 'ar' ? 'منشور' : 'Published'}
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-foreground-secondary hover:text-foreground">
                {t('common.cancel')}
              </button>
              <AnimatedButton type="submit">
                <Save className="w-4 h-4" /> {lang === 'ar' ? 'حفظ' : 'Save'}
              </AnimatedButton>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}