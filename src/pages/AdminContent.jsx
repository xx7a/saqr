import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, X, BookOpen, FileText, ChevronLeft,
  Save, Eye, EyeOff, GripVertical, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AnimatedButton, SkeletonCard, EmptyState } from '@/components/AnimationSystem';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import CertificateTemplate from '@/components/CertificateTemplate';

export default function AdminContent({ type = 'tracks' }) {
  const { t, lang, dir } = useTranslation();
  const [items, setItems] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingCert, setViewingCert] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [type]);

  const loadData = async () => {
    setLoading(true);
    try {
      const entityMap = {
        tracks: 'Track', subjects: 'Subject', lessons: 'Lesson',
        activities: 'LessonActivity', labs: 'Lab', tests: 'SubjectTest',
        assignments: 'Assignment', specializations: 'Specialization',
        certificates: 'Certificate', logs: 'ActivityLog',
      };
      const entityName = entityMap[type];
      if (entityName) {
        const data = await base44.entities[entityName].list('-created_date', 50);
        setItems(data || []);
      }
      // Load related data for forms
      if (type === 'subjects' || type === 'lessons' || type === 'activities' || type === 'labs' || type === 'tests') {
        const tracksData = await base44.entities.Track.list();
        setTracks(tracksData || []);
        const subjectsData = await base44.entities.Subject.list();
        setSubjects(subjectsData || []);
      }
      if (type === 'labs' || type === 'activities' || type === 'tests') {
        const lessonsData = await base44.entities.Lesson.list('-created_date', 200);
        setLessons(lessonsData || []);
      }
      if (type === 'certificates') {
        const [usersData, tracksData] = await Promise.all([
          base44.entities.User.list(),
          base44.entities.Track.list(),
        ]);
        setUsers(usersData || []);
        setTracks(tracksData || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) return;
    try {
      const entityMap = {
        tracks: 'Track', subjects: 'Subject', lessons: 'Lesson',
        activities: 'LessonActivity', labs: 'Lab', tests: 'SubjectTest',
        assignments: 'Assignment', specializations: 'Specialization',
        certificates: 'Certificate', logs: 'ActivityLog',
      };
      await base44.entities[entityMap[type]].delete(id);
      toast.success(lang === 'ar' ? 'تم الحذف' : 'Deleted');
      loadData();
    } catch (e) {
      toast.error(t('common.error'));
    }
  };

  const handleSave = async (data) => {
    try {
      const entityMap = {
        tracks: 'Track', subjects: 'Subject', lessons: 'Lesson',
        activities: 'LessonActivity', labs: 'Lab', tests: 'SubjectTest',
        assignments: 'Assignment', specializations: 'Specialization',
        certificates: 'Certificate', logs: 'ActivityLog',
      };
      // Auto-set track_name for subjects
      if (type === 'subjects' && data.track_id) {
        const track = tracks.find((t) => t.id === data.track_id);
        if (track) data.track_name = track.name;
      }
      // Auto-set subject_name and track_id for lessons
      if (type === 'lessons' && data.subject_id) {
        const subject = subjects.find((s) => s.id === data.subject_id);
        if (subject) {
          data.subject_name = subject.name;
          data.track_id = subject.track_id;
        }
      }
      // Convert sources textarea to array for lessons
      if (type === 'lessons' && typeof data.sources === 'string') {
        data.sources = data.sources.split('\n').map(s => s.trim()).filter(Boolean);
      }
      // Auto-fill certificate fields
      if (type === 'certificates') {
        if (data.user_id) {
          const u = users.find((usr) => usr.id === data.user_id);
          if (u) data.user_name = u.full_name || u.email;
        }
        if (data.track_id) {
          const t = tracks.find((tr) => tr.id === data.track_id);
          if (t) data.track_name = t.name;
        }
        if (!data.verification_code) {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let code = 'SAQR-';
          for (let s = 0; s < 3; s++) {
            for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
            if (s < 2) code += '-';
          }
          data.verification_code = code;
        }
        if (!data.issue_date) {
          data.issue_date = new Date().toISOString();
        }
        data.is_valid = true;
      }
      if (editing?.id) {
        await base44.entities[entityMap[type]].update(editing.id, data);
        toast.success(lang === 'ar' ? 'تم التحديث' : 'Updated');
      } else {
        await base44.entities[entityMap[type]].create(data);
        toast.success(lang === 'ar' ? 'تمت الإضافة' : 'Added');
      }
      setShowForm(false);
      setEditing(null);
      loadData();
    } catch (e) {
      toast.error(t('common.error'));
    }
  };

  const titles = {
    tracks: t('layout.adminTracks'),
    subjects: t('layout.adminSubjects'),
    lessons: t('layout.adminLessons'),
    activities: t('layout.adminActivities'),
    labs: t('layout.adminLabs'),
    tests: t('layout.adminTests'),
    assignments: t('layout.adminAssignments'),
    specializations: t('layout.adminSpecializations'),
    certificates: t('layout.adminCertificates'),
    logs: lang === 'ar' ? 'سجل النشاط' : 'Activity log',
  };

  if (loading) {
    return (
      <Layout role="admin">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-20" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{titles[type]}</h1>
            <p className="text-foreground-secondary text-sm mt-1">{items.length} {lang === 'ar' ? 'عنصر' : 'items'}</p>
          </div>
          <AnimatedButton onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> {lang === 'ar' ? 'إضافة جديد' : 'Add new'}
          </AnimatedButton>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={type === 'tracks' ? BookOpen : type === 'subjects' ? FileText : BookOpen}
            title={lang === 'ar' ? 'لا توجد عناصر' : 'No items'}
            message={lang === 'ar' ? 'ابدأ بإضافة عنصر جديد' : 'Start by adding a new item'}
          />
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card-base p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {type === 'tracks' ? <BookOpen className="w-5 h-5 text-primary" /> :
                   type === 'subjects' ? <FileText className="w-5 h-5 text-primary" /> :
                   <BookOpen className="w-5 h-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {type === 'certificates' ? `${item.user_name} — ${item.track_name || item.specialization_name || ''}` : (item.name || item.title)}
                  </h3>
                  <p className="text-sm text-foreground-secondary truncate">
                    {type === 'certificates' ? (item.verification_code || '') : (item.description || item.short_description || '')}
                  </p>
                  {type === 'tracks' && (
                    <span className={`text-xs ${item.availability_status === 'available' ? 'text-success' : 'text-warning'}`}>
                      {item.availability_status === 'available' ? (lang === 'ar' ? 'متاح' : 'Available') : (lang === 'ar' ? 'قريبًا' : 'Coming soon')}
                    </span>
                  )}
                  {type === 'subjects' && item.track_name && (
                    <span className="text-xs text-foreground-secondary">{item.track_name}</span>
                  )}
                  {type === 'lessons' && item.subject_name && (
                    <span className="text-xs text-foreground-secondary">{item.subject_name}</span>
                  )}
                  {type === 'labs' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.lab_type === 'independent' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                      {item.lab_type === 'independent' ? (lang === 'ar' ? 'مختبر مستقل' : 'Independent lab') : (lang === 'ar' ? 'تطبيق درس' : 'Lesson lab')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {type === 'subjects' && (
                    <button
                      onClick={() => navigate(`/admin/subject/${item.id}`)}
                      className="p-2 text-foreground-secondary hover:text-primary transition-colors"
                      title={lang === 'ar' ? 'دخول المادة وإدارة دروسها' : 'Open subject and manage lessons'}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  {type === 'lessons' && (
                    <span className={`px-2 py-1 rounded text-xs ${item.is_published ? 'bg-success/10 text-success' : 'bg-card text-foreground-secondary'}`}>
                      {item.is_published ? <Eye className="w-3 h-3 inline" /> : <EyeOff className="w-3 h-3 inline" />}
                    </span>
                  )}
                  {type === 'certificates' && (
                    <button
                      onClick={() => setViewingCert(item)}
                      className="p-2 text-foreground-secondary hover:text-primary transition-colors"
                      title={lang === 'ar' ? 'عرض الشهادة' : 'View certificate'}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => { setEditing(item); setShowForm(true); }}
                    className="p-2 text-foreground-secondary hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-foreground-secondary hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <ContentForm
            type={type}
            editing={editing}
            tracks={tracks}
            subjects={subjects}
            lessons={lessons}
            users={users}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>

      {/* Certificate view modal */}
      <AnimatePresence>
        {viewingCert && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingCert(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-background-secondary border border-border rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto" dir={dir}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">{lang === 'ar' ? 'معاينة الشهادة' : 'Certificate preview'}</h2>
                  <button onClick={() => setViewingCert(null)} className="p-2 text-foreground-secondary hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <CertificateTemplate certificate={viewingCert} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}

function ContentForm({ type, editing, tracks, subjects, lessons, users, onSave, onClose }) {
  const { t, lang, dir } = useTranslation();
  const [form, setForm] = useState(editing || {});

  useEffect(() => {
    if (editing) {
      const form = { ...editing };
      if (type === 'lessons' && Array.isArray(form.sources)) {
        form.sources = form.sources.join('\n');
      }
      setForm(form);
    } else {
      setForm({});
    }
  }, [editing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const fieldDefs = {
    tracks: [
      { key: 'name', label: lang === 'ar' ? 'اسم المسار' : 'Track name', type: 'text', required: true },
      { key: 'description', label: lang === 'ar' ? 'الوصف' : 'Description', type: 'textarea' },
      { key: 'availability_status', label: lang === 'ar' ? 'الحالة' : 'Status', type: 'select', options: [
        { value: 'available', label: lang === 'ar' ? 'متاح' : 'Available' },
        { value: 'coming_soon', label: lang === 'ar' ? 'قريبًا' : 'Coming soon' },
        { value: 'hidden', label: lang === 'ar' ? 'مخفي' : 'Hidden' },
      ]},
      { key: 'estimated_hours', label: lang === 'ar' ? 'الساعات التقديرية' : 'Estimated hours', type: 'number' },
      { key: 'order', label: lang === 'ar' ? 'الترتيب' : 'Order', type: 'number' },
      { key: 'track_type', label: lang === 'ar' ? 'نوع المسار' : 'Track type', type: 'select', options: [
        { value: 'foundation', label: lang === 'ar' ? 'تأسيسي' : 'Foundation' },
        { value: 'specialization', label: lang === 'ar' ? 'تخصص' : 'Specialization' },
      ]},
    ],
    subjects: [
      { key: 'track_id', label: lang === 'ar' ? 'المسار' : 'Track', type: 'select', options: tracks.map(t => ({ value: t.id, label: t.name })), required: true },
      { key: 'name', label: lang === 'ar' ? 'اسم المادة' : 'Subject name', type: 'text', required: true },
      { key: 'description', label: lang === 'ar' ? 'الوصف' : 'Description', type: 'textarea' },
      { key: 'estimated_hours', label: lang === 'ar' ? 'الساعات التقديرية' : 'Estimated hours', type: 'number' },
      { key: 'pass_score', label: lang === 'ar' ? 'درجة النجاح (%)' : 'Pass score (%)', type: 'number' },
      { key: 'order', label: lang === 'ar' ? 'الترتيب' : 'Order', type: 'number' },
      { key: 'unlock_rule', label: lang === 'ar' ? 'قاعدة الفتح' : 'Unlock rule', type: 'select', options: [
        { value: 'sequential', label: lang === 'ar' ? 'تسلسلي' : 'Sequential' },
        { value: 'free', label: lang === 'ar' ? 'حر' : 'Free' },
      ]},
      { key: 'is_published', label: lang === 'ar' ? 'منشور' : 'Published', type: 'checkbox' },
    ],
    lessons: [
      { key: 'subject_id', label: lang === 'ar' ? 'المادة' : 'Subject', type: 'select', options: subjects.map(s => ({ value: s.id, label: s.name })), required: true },
      { key: 'title', label: lang === 'ar' ? 'عنوان الدرس' : 'Lesson title', type: 'text', required: true },
      { key: 'short_description', label: lang === 'ar' ? 'وصف مختصر' : 'Short description', type: 'text' },
      { key: 'content', label: lang === 'ar' ? 'المحتوى' : 'Content', type: 'textarea', large: true },
      { key: 'estimated_minutes', label: lang === 'ar' ? 'المدة (دقيقة)' : 'Duration (min)', type: 'number' },
      { key: 'lesson_type', label: lang === 'ar' ? 'نوع الدرس' : 'Lesson type', type: 'select', options: [
        { value: 'theory', label: lang === 'ar' ? 'نظري' : 'Theory' },
        { value: 'tool', label: lang === 'ar' ? 'أداة' : 'Tool' },
        { value: 'network', label: lang === 'ar' ? 'شبكات' : 'Network' },
        { value: 'os', label: lang === 'ar' ? 'أنظمة تشغيل' : 'OS' },
        { value: 'programming', label: lang === 'ar' ? 'برمجة' : 'Programming' },
        { value: 'security', label: lang === 'ar' ? 'أمن سيبراني' : 'Security' },
        { value: 'lab', label: lang === 'ar' ? 'مختبر' : 'Lab' },
      ]},
      { key: 'video_url', label: lang === 'ar' ? 'رابط الفيديو' : 'Video URL', type: 'text' },
      { key: 'order', label: lang === 'ar' ? 'الترتيب' : 'Order', type: 'number' },
      { key: 'has_activity', label: lang === 'ar' ? 'يحتوي على تطبيق' : 'Has activity', type: 'checkbox' },
      { key: 'has_lab', label: lang === 'ar' ? 'يحتوي على مختبر' : 'Has lab', type: 'checkbox' },
      { key: 'sources', label: lang === 'ar' ? 'مصادر موثوقة (كل مصدر في سطر)' : 'Trusted sources (one per line)', type: 'textarea' },
      { key: 'is_published', label: lang === 'ar' ? 'منشور' : 'Published', type: 'checkbox' },
    ],
    specializations: [
      { key: 'name_ar', label: lang === 'ar' ? 'الاسم بالعربية' : 'Arabic name', type: 'text', required: true },
      { key: 'name_en', label: lang === 'ar' ? 'الاسم بالإنجليزية' : 'English name', type: 'text' },
      { key: 'description', label: lang === 'ar' ? 'الوصف' : 'Description', type: 'textarea' },
      { key: 'work_nature', label: lang === 'ar' ? 'طبيعة العمل' : 'Work nature', type: 'textarea' },
      { key: 'difficulty', label: lang === 'ar' ? 'الصعوبة' : 'Difficulty', type: 'select', options: [
        { value: 'beginner', label: lang === 'ar' ? 'مبتدئ' : 'Beginner' },
        { value: 'intermediate', label: lang === 'ar' ? 'متوسط' : 'Intermediate' },
        { value: 'advanced', label: lang === 'ar' ? 'متقدم' : 'Advanced' },
      ]},
      { key: 'availability_status', label: lang === 'ar' ? 'الحالة' : 'Status', type: 'select', options: [
        { value: 'available', label: lang === 'ar' ? 'متاح' : 'Available' },
        { value: 'coming_soon', label: lang === 'ar' ? 'قريبًا' : 'Coming soon' },
      ]},
      { key: 'estimated_hours', label: lang === 'ar' ? 'الساعات التقديرية' : 'Estimated hours', type: 'number' },
      { key: 'order', label: lang === 'ar' ? 'الترتيب' : 'Order', type: 'number' },
    ],
    assignments: [
      { key: 'title', label: lang === 'ar' ? 'العنوان' : 'Title', type: 'text', required: true },
      { key: 'description', label: lang === 'ar' ? 'الوصف' : 'Description', type: 'textarea' },
      { key: 'instructions', label: lang === 'ar' ? 'التعليمات' : 'Instructions', type: 'textarea' },
      { key: 'max_points', label: lang === 'ar' ? 'أقصى درجة' : 'Max points', type: 'number' },
      { key: 'is_published', label: lang === 'ar' ? 'منشور' : 'Published', type: 'checkbox' },
    ],
    labs: [
      { key: 'lab_type', label: lang === 'ar' ? 'نوع المختبر' : 'Lab type', type: 'select', options: [
        { value: 'lesson', label: lang === 'ar' ? 'تطبيق درس (مرتبط بدرس)' : 'Lesson lab (linked to a lesson)' },
        { value: 'independent', label: lang === 'ar' ? 'مختبر مستقل (تحدي إضافي)' : 'Independent lab (extra challenge)' },
      ], required: true },
      { key: 'lesson_id', label: lang === 'ar' ? 'الدرس المرتبط (لتطبيق الدرس فقط)' : 'Linked lesson (lesson labs only)', type: 'select', options: lessons.map(l => ({ value: l.id, label: l.title })) },
      { key: 'title', label: lang === 'ar' ? 'العنوان' : 'Title', type: 'text', required: true },
      { key: 'short_description', label: lang === 'ar' ? 'وصف مختصر' : 'Short description', type: 'text' },
      { key: 'lab_interface', label: lang === 'ar' ? 'نوع الواجهة' : 'Interface type', type: 'select', options: [
        { value: 'terminal', label: lang === 'ar' ? 'طرفية محاكاة' : 'Terminal' },
        { value: 'log_analysis', label: lang === 'ar' ? 'تحليل سجلات' : 'Log analysis' },
        { value: 'phishing', label: lang === 'ar' ? 'كشف تصيّد' : 'Phishing detection' },
        { value: 'network_map', label: lang === 'ar' ? 'خريطة شبكة' : 'Network map' },
        { value: 'file_integrity', label: lang === 'ar' ? 'سلامة ملفات' : 'File integrity' },
        { value: 'permissions', label: lang === 'ar' ? 'صلاحيات ملفات' : 'File permissions' },
      ]},
      { key: 'scenario', label: lang === 'ar' ? 'السيناريو' : 'Scenario', type: 'textarea' },
      { key: 'goal', label: lang === 'ar' ? 'الهدف' : 'Goal', type: 'text' },
      { key: 'intro', label: lang === 'ar' ? 'المقدمة' : 'Intro', type: 'textarea' },
      { key: 'correct_flag', label: lang === 'ar' ? 'العلم/الإجابة الصحيحة (للطرفية)' : 'Correct flag/answer (terminal)', type: 'text' },
      { key: 'hint', label: lang === 'ar' ? 'التلميح' : 'Hint', type: 'text' },
      { key: 'success_message', label: lang === 'ar' ? 'رسالة النجاح' : 'Success message', type: 'textarea' },
      { key: 'difficulty', label: lang === 'ar' ? 'المستوى' : 'Difficulty', type: 'select', options: [
        { value: 'easy', label: lang === 'ar' ? 'مبتدئ' : 'Easy' },
        { value: 'medium', label: lang === 'ar' ? 'متوسط' : 'Medium' },
        { value: 'hard', label: lang === 'ar' ? 'متقدم' : 'Hard' },
      ]},
      { key: 'estimated_minutes', label: lang === 'ar' ? 'المدة (دقيقة)' : 'Duration (min)', type: 'number' },
      { key: 'points', label: lang === 'ar' ? 'النقاط' : 'Points', type: 'number' },
      { key: 'order', label: lang === 'ar' ? 'الترتيب' : 'Order', type: 'number' },
      { key: 'is_published', label: lang === 'ar' ? 'منشور' : 'Published', type: 'checkbox' },
    ],
    tests: [
      { key: 'title', label: lang === 'ar' ? 'العنوان' : 'Title', type: 'text', required: true },
      { key: 'description', label: lang === 'ar' ? 'الوصف' : 'Description', type: 'textarea' },
      { key: 'pass_score', label: lang === 'ar' ? 'درجة النجاح (%)' : 'Pass score (%)', type: 'number' },
      { key: 'max_attempts', label: lang === 'ar' ? 'المحاولات' : 'Max attempts', type: 'number' },
      { key: 'is_published', label: lang === 'ar' ? 'منشور' : 'Published', type: 'checkbox' },
    ],
    activities: [
      { key: 'title', label: lang === 'ar' ? 'العنوان' : 'Title', type: 'text', required: true },
      { key: 'scenario', label: lang === 'ar' ? 'السيناريو' : 'Scenario', type: 'textarea' },
      { key: 'goal', label: lang === 'ar' ? 'الهدف' : 'Goal', type: 'text' },
      { key: 'correct_answer', label: lang === 'ar' ? 'الإجابة الصحيحة' : 'Correct answer', type: 'text' },
      { key: 'hint', label: lang === 'ar' ? 'التلميح' : 'Hint', type: 'text' },
      { key: 'points', label: lang === 'ar' ? 'النقاط' : 'Points', type: 'number' },
    ],
    certificates: [
      { key: 'user_id', label: lang === 'ar' ? 'الطالب' : 'Student', type: 'select', options: (users || []).map(u => ({ value: u.id, label: u.full_name || u.email })), required: true },
      { key: 'certificate_type', label: lang === 'ar' ? 'النوع' : 'Type', type: 'select', options: [
        { value: 'foundation', label: lang === 'ar' ? 'تأسيسي' : 'Foundation' },
        { value: 'specialization', label: lang === 'ar' ? 'تخصص' : 'Specialization' },
      ]},
      { key: 'track_id', label: lang === 'ar' ? 'المسار' : 'Track', type: 'select', options: (tracks || []).map(t => ({ value: t.id, label: t.name })) },
    ],
    logs: [],
  };

  const fields = fieldDefs[type] || [];

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
        dir={dir}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {editing ? (lang === 'ar' ? 'تعديل' : 'Edit') : (lang === 'ar' ? 'إضافة' : 'Add')} {type === 'tracks' ? (lang === 'ar' ? 'مسار' : 'track') : type === 'subjects' ? (lang === 'ar' ? 'مادة' : 'subject') : type === 'certificates' ? (lang === 'ar' ? 'شهادة' : 'certificate') : type === 'specializations' ? (lang === 'ar' ? 'تخصص' : 'specialization') : (lang === 'ar' ? 'درس' : 'lesson')}
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
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  required={field.required}
                  className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
                />
              )}
              {field.type === 'textarea' && (
                <textarea
                  value={form[field.key] || ''}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  rows={field.large ? 10 : 3}
                  className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none resize-none"
                />
              )}
              {field.type === 'number' && (
                <input
                  type="number"
                  value={form[field.key] || 0}
                  onChange={(e) => setForm({ ...form, [field.key]: parseInt(e.target.value) || 0 })}
                  className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
                />
              )}
              {field.type === 'select' && (
                <select
                  value={form[field.key] || ''}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  required={field.required}
                  className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
                >
                  <option value="">{lang === 'ar' ? 'اختر...' : 'Select...'}</option>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              {field.type === 'checkbox' && (
                <input
                  type="checkbox"
                  checked={form[field.key] || false}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })}
                  className="w-5 h-5 accent-primary"
                />
              )}
            </div>
          ))}

          {/* For subjects: set track_name automatically */}
          {type === 'subjects' && form.track_id && (
            <input type="hidden" value={tracks.find(t => t.id === form.track_id)?.name || ''} onChange={() => {}} />
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-card border border-border text-foreground rounded-lg text-sm"
            >
              {t('common.cancel')}
            </button>
            <AnimatedButton type="submit">
              <Save className="w-4 h-4" /> {lang === 'ar' ? 'حفظ' : 'Save'}
            </AnimatedButton>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}