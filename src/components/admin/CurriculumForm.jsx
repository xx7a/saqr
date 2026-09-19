import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { AnimatedButton } from '@/components/AnimationSystem';
import AdminCourseSlides from '@/components/AdminCourseSlides';

export default function CurriculumForm({ type, editing, parentId, tracks, specializations, subjects, tab, onSave, onClose }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (editing) {
      const f = { ...editing };
      if (type === 'lesson' && Array.isArray(f.sources)) {
        f.sources = f.sources.join('\n');
      }
      setForm(f);
    } else {
      // Defaults for new items
      const defaults = {};
      if (type === 'subject' && parentId) {
        if (tab === 'foundation') {
          defaults.track_id = parentId;
          defaults.is_published = true;
          defaults.unlock_rule = 'sequential';
          defaults.pass_score = 70;
        } else {
          defaults.specialization_id = parentId;
          defaults.is_published = true;
        }
      }
      if (type === 'lesson') {
        defaults.is_published = true;
        defaults.has_activity = true;
        defaults.estimated_minutes = 15;
      }
      if (type === 'track') {
        defaults.track_type = 'foundation';
        defaults.availability_status = 'available';
      }
      if (type === 'specialization') {
        defaults.availability_status = 'available';
      }
      setForm(defaults);
    }
  }, [editing, type, parentId, tab]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(type, form, parentId);
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const fields = getFieldDefs(type, tracks, specializations, subjects, tab);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background-secondary border border-border rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {editing ? 'تعديل' : 'إضافة'} {typeLabels[type]}
          </h2>
          <button onClick={onClose} className="p-2 text-foreground-secondary hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {field.label} {field.required && <span className="text-danger">*</span>}
              </label>
              {field.type === 'text' && (
                <input
                  type="text"
                  value={form[field.key] || ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  required={field.required}
                  className="form-input"
                />
              )}
              {field.type === 'textarea' && (
                <textarea
                  value={form[field.key] || ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  rows={field.large ? 10 : 3}
                  className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none resize-none"
                />
              )}
              {field.type === 'number' && (
                <input
                  type="number"
                  value={form[field.key] ?? 0}
                  onChange={(e) => setField(field.key, parseInt(e.target.value) || 0)}
                  className="form-input"
                />
              )}
              {field.type === 'select' && (
                <select
                  value={form[field.key] || ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  required={field.required}
                  className="form-input"
                >
                  <option value="">اختر...</option>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              {field.type === 'checkbox' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[field.key] || false}
                    onChange={(e) => setField(field.key, e.target.checked)}
                    className="w-5 h-5 accent-primary"
                  />
                  <span className="text-sm text-foreground-secondary">{field.checkboxLabel || ''}</span>
                </label>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-card border border-border text-foreground rounded-lg text-sm"
            >
              إلغاء
            </button>
            <AnimatedButton type="submit">
              <Save className="w-4 h-4" /> حفظ
            </AnimatedButton>
          </div>
        </form>

        {/* Course Slides management — only when editing an existing subject */}
        {type === 'subject' && editing?.id && (
          <div className="mt-6 pt-6 border-t border-border">
            <AdminCourseSlides subjectId={editing.id} subjectName={editing.name} />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

const typeLabels = {
  track: 'مسار',
  subject: 'مادة',
  lesson: 'درس',
  specialization: 'تخصص',
};

function getFieldDefs(type, tracks, specializations, subjects, tab) {
  const defs = {
    track: [
      { key: 'name', label: 'اسم المسار', type: 'text', required: true },
      { key: 'description', label: 'الوصف', type: 'textarea' },
      { key: 'availability_status', label: 'الحالة', type: 'select', options: [
        { value: 'available', label: 'متاح' },
        { value: 'coming_soon', label: 'قريبًا' },
        { value: 'hidden', label: 'مخفي' },
      ]},
      { key: 'estimated_hours', label: 'الساعات التقديرية', type: 'number' },
      { key: 'order', label: 'الترتيب', type: 'number' },
      { key: 'track_type', label: 'نوع المسار', type: 'select', options: [
        { value: 'foundation', label: 'تأسيسي' },
        { value: 'specialization', label: 'تخصص' },
      ]},
    ],
    specialization: [
      { key: 'name_ar', label: 'الاسم بالعربية', type: 'text', required: true },
      { key: 'name_en', label: 'الاسم بالإنجليزية', type: 'text' },
      { key: 'description', label: 'الوصف', type: 'textarea' },
      { key: 'work_nature', label: 'طبيعة العمل', type: 'textarea' },
      { key: 'difficulty', label: 'الصعوبة', type: 'select', options: [
        { value: 'beginner', label: 'مبتدئ' },
        { value: 'intermediate', label: 'متوسط' },
        { value: 'advanced', label: 'متقدم' },
      ]},
      { key: 'availability_status', label: 'الحالة', type: 'select', options: [
        { value: 'available', label: 'متاح' },
        { value: 'coming_soon', label: 'قريبًا' },
      ]},
      { key: 'estimated_hours', label: 'الساعات التقديرية', type: 'number' },
      { key: 'order', label: 'الترتيب', type: 'number' },
    ],
    subject: [
      // track_id or specialization_id is auto-set by parent, but show for editing
      ...(tab === 'foundation'
        ? [{ key: 'track_id', label: 'المسار', type: 'select', options: tracks.map((t) => ({ value: t.id, label: t.name })), required: true }]
        : [{ key: 'specialization_id', label: 'التخصص', type: 'select', options: specializations.map((s) => ({ value: s.id, label: s.name_ar })), required: true }]
      ),
      { key: 'name', label: 'اسم المادة', type: 'text', required: true },
      { key: 'description', label: 'الوصف', type: 'textarea' },
      { key: 'estimated_hours', label: 'الساعات التقديرية', type: 'number' },
      { key: 'pass_score', label: 'درجة النجاح (%)', type: 'number' },
      { key: 'order', label: 'الترتيب', type: 'number' },
      { key: 'unlock_rule', label: 'قاعدة الفتح', type: 'select', options: [
        { value: 'sequential', label: 'تسلسلي' },
        { value: 'free', label: 'حر' },
      ]},
      { key: 'is_published', label: 'منشور', type: 'checkbox', checkboxLabel: 'المادة ظاهرة للطلاب' },
    ],
    lesson: [
      { key: 'subject_id', label: 'المادة', type: 'select', options: subjects.map((s) => ({ value: s.id, label: s.name })), required: true },
      { key: 'title', label: 'عنوان الدرس', type: 'text', required: true },
      { key: 'short_description', label: 'وصف مختصر', type: 'text' },
      { key: 'content', label: 'المحتوى (Markdown)', type: 'textarea', large: true },
      { key: 'estimated_minutes', label: 'المدة (دقيقة)', type: 'number' },
      { key: 'lesson_type', label: 'نوع الدرس', type: 'select', options: [
        { value: 'theory', label: 'نظري' },
        { value: 'tool', label: 'أداة' },
        { value: 'network', label: 'شبكات' },
        { value: 'os', label: 'أنظمة تشغيل' },
        { value: 'programming', label: 'برمجة' },
        { value: 'security', label: 'أمن سيبراني' },
        { value: 'lab', label: 'مختبر' },
      ]},
      { key: 'video_url', label: 'رابط الفيديو', type: 'text' },
      { key: 'order', label: 'الترتيب', type: 'number' },
      { key: 'has_activity', label: 'يحتوي على تطبيق', type: 'checkbox', checkboxLabel: 'درس به نشاط تفاعلي' },
      { key: 'has_lab', label: 'يحتوي على مختبر', type: 'checkbox', checkboxLabel: 'درس به مختبر عملي' },
      { key: 'sources', label: 'مصادر موثوقة (كل مصدر في سطر)', type: 'textarea' },
      { key: 'is_published', label: 'منشور', type: 'checkbox', checkboxLabel: 'الدرس ظاهر للطلاب' },
    ],
  };
  return defs[type] || [];
}