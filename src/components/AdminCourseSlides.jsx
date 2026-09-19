import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Trash2, Loader2, FileStack, Plus, X, Save, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr, lang) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function AdminCourseSlides({ subjectId, subjectName }) {
  const { lang } = useTranslation();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (subjectId) loadResources();
  }, [subjectId]);

  const loadResources = async () => {
    try {
      const data = await base44.entities.CourseResource.filter({
        course_id: subjectId,
        resource_type: 'slides',
      }, 'order', 50);
      setResources(data || []);
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'فشل تحميل السلايدات' : 'Failed to load slides');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resource) => {
    if (!confirm(lang === 'ar' ? `حذف "${resource.title}"؟` : `Delete "${resource.title}"?`)) return;
    setDeletingId(resource.id);
    try {
      await base44.entities.CourseResource.delete(resource.id);
      toast.success(lang === 'ar' ? 'تم حذف السلايدات' : 'Slides deleted');
      loadResources();
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileStack className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {lang === 'ar' ? 'سلايدات المادة' : 'Course Slides'}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 rounded-lg bg-gradient-primary text-white text-sm font-medium flex items-center gap-1.5 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" /> {lang === 'ar' ? 'إضافة سلايدات' : 'Add slides'}
        </button>
      </div>

      {loading ? (
        <div className="card-base p-6">
          <div className="h-20 bg-card rounded animate-pulse" />
        </div>
      ) : resources.length === 0 ? (
        <div className="card-base p-6 text-center">
          <FileText className="w-10 h-10 text-foreground-secondary mx-auto mb-2" />
          <p className="text-foreground-secondary text-sm">
            {lang === 'ar' ? 'لا توجد سلايدات لهذه المادة بعد' : 'No slides for this subject yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-base p-4 flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-danger" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate">{resource.title}</h3>
                {resource.description && (
                  <p className="text-sm text-foreground-secondary mt-0.5 truncate">{resource.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-foreground-secondary">
                  <span className="px-1.5 py-0.5 rounded bg-danger/10 text-danger font-medium">PDF</span>
                  <span className="truncate max-w-[180px]" dir="ltr">{resource.file_name}</span>
                  <span>{formatFileSize(resource.file_size)}</span>
                  {resource.version && <span dir="ltr">v{resource.version}</span>}
                  <span>{formatDate(resource.updated_date, lang)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setEditing(resource); setShowForm(true); }}
                  className="p-2 text-foreground-secondary hover:text-primary transition-colors"
                  title={lang === 'ar' ? 'استبدال / تعديل' : 'Replace / Edit'}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(resource)}
                  disabled={deletingId === resource.id}
                  className="p-2 text-foreground-secondary hover:text-danger transition-colors"
                  title={lang === 'ar' ? 'حذف' : 'Delete'}
                >
                  {deletingId === resource.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <SlidesFormModal
            subjectId={subjectId}
            subjectName={subjectName}
            editing={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSaved={() => { setShowForm(false); setEditing(null); loadResources(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SlidesFormModal({ subjectId, subjectName, editing, onClose, onSaved }) {
  const { lang, dir } = useTranslation();
  const [form, setForm] = useState({
    title: editing?.title || '',
    description: editing?.description || '',
    version: editing?.version || '1.0',
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      toast.error(lang === 'ar' ? 'يجب أن يكون الملف بصيغة PDF' : 'File must be PDF');
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      toast.error(lang === 'ar' ? 'اسم السلايدات مطلوب' : 'Title is required');
      return;
    }
    if (!editing && !file) {
      toast.error(lang === 'ar' ? 'يجب اختيار ملف PDF' : 'Please select a PDF file');
      return;
    }
    setUploading(true);
    try {
      let fileUrl = editing?.file_url || '';
      let fileName = editing?.file_name || '';
      let fileSize = editing?.file_size || 0;

      if (file) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        fileUrl = file_url;
        fileName = file.name;
        fileSize = file.size;
      }

      const payload = {
        course_id: subjectId,
        course_name: subjectName || '',
        title: form.title.trim(),
        description: form.description?.trim() || '',
        file_url: fileUrl,
        file_name: fileName,
        file_type: 'pdf',
        file_size: fileSize,
        page_count: editing?.page_count || 0,
        resource_type: 'slides',
        version: form.version?.trim() || '1.0',
        is_published: true,
        order: editing?.order || 0,
      };

      if (editing?.id) {
        await base44.entities.CourseResource.update(editing.id, payload);
        toast.success(lang === 'ar' ? 'تم تحديث السلايدات' : 'Slides updated');
      } else {
        await base44.entities.CourseResource.create(payload);
        toast.success(lang === 'ar' ? 'تم رفع السلايدات' : 'Slides uploaded');
      }
      onSaved();
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'فشل حفظ السلايدات' : 'Failed to save slides');
    } finally {
      setUploading(false);
    }
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
        <div className="card-base p-6 w-full max-w-lg my-8" dir={dir}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">
              {editing ? (lang === 'ar' ? 'تعديل السلايدات' : 'Edit slides') : (lang === 'ar' ? 'إضافة سلايدات' : 'Add slides')}
            </h2>
            <button onClick={onClose} className="p-2 text-foreground-secondary hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {lang === 'ar' ? 'اسم السلايدات' : 'Slides title'} <span className="text-danger">*</span>
              </label>
              <input
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="form-input"
                placeholder={lang === 'ar' ? 'مثال: سلايدات أساسيات الشبكات' : 'Example: Networking Basics Slides'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {lang === 'ar' ? 'وصف مختصر (اختياري)' : 'Short description (optional)'}
              </label>
              <textarea
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="form-input resize-y"
                placeholder={lang === 'ar' ? 'راجع أهم مفاهيم المادة من خلال السلايدات' : 'Review key concepts through the slides'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {lang === 'ar' ? 'رقم الإصدار (اختياري)' : 'Version (optional)'}
              </label>
              <input
                value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="form-input"
                dir="ltr"
                placeholder="1.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {lang === 'ar' ? 'ملف PDF' : 'PDF file'} {!editing && <span className="text-danger">*</span>}
              </label>
              {editing?.file_name && !file && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border mb-2">
                  <FileText className="w-5 h-5 text-danger shrink-0" />
                  <span className="text-sm text-foreground-secondary truncate flex-1" dir="ltr">{editing.file_name}</span>
                  <span className="text-xs text-foreground-secondary">{formatFileSize(editing.file_size)}</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-sm text-foreground-secondary hover:text-foreground"
              >
                {file ? (
                  <><FileText className="w-5 h-5 text-primary" /> <span className="text-foreground truncate" dir="ltr">{file.name}</span></>
                ) : editing ? (
                  <><Upload className="w-5 h-5" /> {lang === 'ar' ? 'استبدال الملف' : 'Replace file'}</>
                ) : (
                  <><Upload className="w-5 h-5" /> {lang === 'ar' ? 'اختر ملف PDF' : 'Choose PDF file'}</>
                )}
              </button>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-foreground-secondary hover:text-foreground">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-5 py-2.5 rounded-lg bg-gradient-primary text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {uploading ? (lang === 'ar' ? 'جارٍ الرفع...' : 'Uploading...') : (lang === 'ar' ? 'حفظ' : 'Save')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}