import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Loader2, FileStack } from 'lucide-react';
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

export default function CourseSlidesSection({ subjectId, subjectName }) {
  const { lang } = useTranslation();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (!subjectId) return;
    loadResources();
  }, [subjectId]);

  const loadResources = async () => {
    try {
      const data = await base44.entities.CourseResource.filter({
        course_id: subjectId,
        resource_type: 'slides',
        is_published: true,
      }, 'order', 50);
      setResources(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resource) => {
    setDownloadingId(resource.id);
    try {
      const res = await fetch(resource.file_url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.file_name || `${resource.title || 'slides'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'تعذّر تحميل الملف' : 'Failed to download file');
      window.open(resource.file_url, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card-base p-6">
        <div className="h-6 w-40 bg-card rounded mb-4 animate-pulse" />
        <div className="h-20 bg-card rounded animate-pulse" />
      </div>
    );
  }

  // Hide section entirely when no slides available
  if (resources.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-base p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileStack className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {lang === 'ar' ? 'سلايدات المادة' : 'Course Slides'}
        </h2>
      </div>

      <div className="space-y-3">
        {resources.map((resource, i) => (
          <motion.div
            key={resource.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-danger" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{resource.title}</h3>
              {subjectName && (
                <p className="text-xs text-foreground-secondary mt-0.5 truncate">{subjectName}</p>
              )}
              {resource.description && (
                <p className="text-sm text-foreground-secondary mt-1 line-clamp-2">{resource.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-foreground-secondary">
                <span className="px-1.5 py-0.5 rounded bg-danger/10 text-danger font-medium">PDF</span>
                {resource.page_count > 0 && (
                  <span>{resource.page_count} {lang === 'ar' ? 'صفحة' : 'pages'}</span>
                )}
                <span>{formatFileSize(resource.file_size)}</span>
                <span>{formatDate(resource.updated_date, lang)}</span>
                {resource.version && <span dir="ltr">v{resource.version}</span>}
              </div>
            </div>
            <button
              onClick={() => handleDownload(resource)}
              disabled={downloadingId === resource.id}
              className="shrink-0 px-4 py-2.5 rounded-lg bg-gradient-primary text-white text-sm font-medium flex items-center gap-1.5 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {downloadingId === resource.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{lang === 'ar' ? 'تحميل السلايدات' : 'Download'}</span>
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}