import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronLeft, Search, Eye, EyeOff,
  ArrowUp, ArrowDown, BookOpen, FileText, GraduationCap, Shield,
  FlaskConical, X, Save, RefreshCw, AlertCircle
} from 'lucide-react';
import Layout from '@/components/Layout';
import { AnimatedButton, SkeletonCard, EmptyState } from '@/components/AnimationSystem';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import CurriculumForm from '@/components/admin/CurriculumForm';

const ENTITY_MAP = {
  track: 'Track',
  subject: 'Subject',
  lesson: 'Lesson',
  specialization: 'Specialization',
};

export default function AdminCurriculum() {
  const { t, lang, dir } = useTranslation();
  const [tab, setTab] = useState('foundation'); // 'foundation' | 'specialization'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [expanded, setExpanded] = useState({}); // { [id]: true }
  const [editing, setEditing] = useState(null); // { type, item }
  const [showForm, setShowForm] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tracksData, specsData, subjectsData, lessonsData] = await Promise.all([
        base44.entities.Track.list('order', 100).catch(() => []),
        base44.entities.Specialization.list('order', 100).catch(() => []),
        base44.entities.Subject.list('order', 200).catch(() => []),
        base44.entities.Lesson.list('order', 500).catch(() => []),
      ]);
      setTracks(tracksData || []);
      setSpecializations(specsData || []);
      setSubjects(subjectsData || []);
      setLessons(lessonsData || []);
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'تعذّر تحميل المنهج' : 'Failed to load curriculum');
    } finally {
      setLoading(false);
    }
  };

  // Filter by search
  const matchesSearch = (text) => {
    if (!search.trim()) return true;
    return (text || '').toLowerCase().includes(search.toLowerCase().trim());
  };

  // Foundation tab: tracks (foundation type) → subjects → lessons
  const foundationTracks = useMemo(() => {
    return tracks
      .filter((t) => t.track_type !== 'specialization')
      .filter((t) => {
        if (!search.trim()) return true;
        // Show track if it matches, or any of its subjects/lessons match
        if (matchesSearch(t.name)) return true;
        const subjMatch = subjects.some((s) => s.track_id === t.id && matchesSearch(s.name));
        if (subjMatch) return true;
        const lessonMatch = lessons.some((l) => {
          const subj = subjects.find((s) => s.id === l.subject_id);
          return subj?.track_id === t.id && matchesSearch(l.title);
        });
        return lessonMatch;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [tracks, subjects, lessons, search]);

  // Specialization tab: specializations → subjects → lessons
  const specializationList = useMemo(() => {
    return specializations
      .filter((spec) => {
        if (!search.trim()) return true;
        if (matchesSearch(spec.name_ar)) return true;
        const subjMatch = subjects.some((s) => s.specialization_id === spec.id && matchesSearch(s.name));
        if (subjMatch) return true;
        const lessonMatch = lessons.some((l) => {
          const subj = subjects.find((s) => s.id === l.subject_id);
          return subj?.specialization_id === spec.id && matchesSearch(l.title);
        });
        return lessonMatch;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [specializations, subjects, lessons, search]);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (type, item) => {
    const labels = { track: lang === 'ar' ? 'المسار' : 'track', subject: lang === 'ar' ? 'المادة' : 'subject', lesson: lang === 'ar' ? 'الدرس' : 'lesson', specialization: lang === 'ar' ? 'التخصص' : 'specialization' };
    if (!confirm(lang === 'ar' ? `هل أنت متأكد من حذف ${labels[type]}: "${item.name || item.title || item.name_ar}"؟` : `Are you sure you want to delete ${labels[type]}: "${item.name || item.title || item.name_ar}"?`)) return;
    try {
      await base44.entities[ENTITY_MAP[type]].delete(item.id);
      toast.success(lang === 'ar' ? 'تم الحذف' : 'Deleted');
      loadData();
    } catch (e) {
      toast.error(lang === 'ar' ? 'تعذّر الحذف — قد يكون هناك عناصر مرتبطة' : 'Failed to delete — there may be linked items');
    }
  };

  const handleTogglePublish = async (type, item) => {
    try {
      const newVal = !item.is_published;
      await base44.entities[ENTITY_MAP[type]].update(item.id, { is_published: newVal });
      toast.success(newVal ? (lang === 'ar' ? 'تم النشر' : 'Published') : (lang === 'ar' ? 'تم إخفاء العنصر' : 'Hidden'));
      loadData();
    } catch (e) {
      toast.error(lang === 'ar' ? 'تعذّر التحديث' : 'Failed to update');
    }
  };

  const handleReorder = async (type, items, currentIndex, direction) => {
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const current = items[currentIndex];
    const target = items[newIndex];
    setSavingOrder(true);
    try {
      await base44.entities[ENTITY_MAP[type]].bulkUpdate([
        { id: current.id, order: target.order },
        { id: target.id, order: current.order },
      ]);
      loadData();
    } catch (e) {
      toast.error(lang === 'ar' ? 'تعذّر إعادة الترتيب' : 'Failed to reorder');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleSaveForm = async (type, data, parentId) => {
    try {
      // Auto-fill parent names
      if (type === 'subject' && parentId) {
        if (tab === 'foundation') {
          const track = tracks.find((t) => t.id === parentId);
          if (track) {
            data.track_id = parentId;
            data.track_name = track.name;
          }
        } else {
          const spec = specializations.find((s) => s.id === parentId);
          if (spec) {
            data.specialization_id = parentId;
            data.specialization_name = spec.name_ar;
          }
        }
      }
      if (type === 'lesson' && data.subject_id) {
        const subj = subjects.find((s) => s.id === data.subject_id);
        if (subj) {
          data.subject_name = subj.name;
          data.track_id = subj.track_id;
          data.specialization_id = subj.specialization_id;
        }
      }
      if (type === 'lesson' && Array.isArray(data.sources)) {
        // keep as array
      } else if (type === 'lesson' && typeof data.sources === 'string') {
        data.sources = data.sources.split('\n').map((s) => s.trim()).filter(Boolean);
      }

      if (editing?.item?.id) {
        await base44.entities[ENTITY_MAP[type]].update(editing.item.id, data);
        toast.success(lang === 'ar' ? 'تم التحديث' : 'Updated');
      } else {
        await base44.entities[ENTITY_MAP[type]].create(data);
        toast.success(lang === 'ar' ? 'تمت الإضافة' : 'Added');
      }
      setShowForm(false);
      setEditing(null);
      loadData();
    } catch (e) {
      toast.error(lang === 'ar' ? 'تعذّر الحفظ' : 'Failed to save');
    }
  };

  const openAdd = (type, parentId = null) => {
    setEditing({ type, item: null, parentId });
    setShowForm(true);
  };

  const openEdit = (type, item) => {
    setEditing({ type, item, parentId: null });
    setShowForm(true);
  };

  // Get subjects for a parent (track or specialization)
  const getSubjects = (parentId) => {
    if (tab === 'foundation') {
      return subjects
        .filter((s) => s.track_id === parentId)
        .filter((s) => !search.trim() || matchesSearch(s.name) || lessons.some((l) => l.subject_id === s.id && matchesSearch(l.title)))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return subjects
      .filter((s) => s.specialization_id === parentId)
      .filter((s) => !search.trim() || matchesSearch(s.name) || lessons.some((l) => l.subject_id === s.id && matchesSearch(l.title)))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  // Get lessons for a subject
  const getLessons = (subjectId) => {
    return lessons
      .filter((l) => l.subject_id === subjectId)
      .filter((l) => !search.trim() || matchesSearch(l.title))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  if (loading) {
    return (
      <Layout role="admin">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} className="h-20" />)}
        </div>
      </Layout>
    );
  }

  const topLevel = tab === 'foundation' ? foundationTracks : specializationList;
  const topLevelLabel = tab === 'foundation' ? (lang === 'ar' ? 'مسار' : 'track') : (lang === 'ar' ? 'تخصص' : 'specialization');

  return (
    <Layout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('admin.curriculum')}</h1>
            <p className="text-foreground-secondary text-sm mt-1">
              {lang === 'ar' ? 'تنظيم المسارات والمواد والدروس في مكان واحد' : 'Organize tracks, subjects, and lessons in one place'}
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={savingOrder}
            className="p-2.5 bg-card border border-border rounded-lg text-foreground-secondary hover:text-primary transition-colors"
            title={lang === 'ar' ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${savingOrder ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setTab('foundation')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'foundation'
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-secondary hover:text-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4 inline ml-2" /> {lang === 'ar' ? 'المنهج التأسيسي' : 'Foundation curriculum'}
          </button>
          <button
            onClick={() => setTab('specialization')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'specialization'
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-secondary hover:text-foreground'
            }`}
          >
            <Shield className="w-4 h-4 inline ml-2" /> {lang === 'ar' ? 'منهج التخصصات' : 'Specialization curriculum'}
          </button>
        </div>

        {/* Search + Add top-level */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${lang === 'ar' ? 'ابحث في' : 'Search'} ${tab === 'foundation' ? (lang === 'ar' ? 'المسارات والمواد والدروس' : 'tracks, subjects, and lessons') : (lang === 'ar' ? 'التخصصات والمواد والدروس' : 'specializations, subjects, and lessons')}...`}
              className="w-full bg-card border border-border rounded-lg pr-10 pl-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
            />
          </div>
          <AnimatedButton onClick={() => openAdd(tab === 'foundation' ? 'track' : 'specialization')}>
            <Plus className="w-4 h-4" /> {lang === 'ar' ? 'إضافة' : 'Add'} {topLevelLabel}
          </AnimatedButton>
        </div>

        {/* Tree */}
        {topLevel.length === 0 ? (
          <EmptyState
            icon={tab === 'foundation' ? BookOpen : Shield}
            title={search.trim() ? (lang === 'ar' ? 'لا توجد نتائج' : 'No results') : (lang === 'ar' ? `لا توجد ${tab === 'foundation' ? 'مسارات' : 'تخصصات'} بعد` : `No ${tab === 'foundation' ? 'tracks' : 'specializations'} yet`)}
            message={search.trim() ? (lang === 'ar' ? 'جرّب كلمة بحث أخرى' : 'Try a different search term') : (lang === 'ar' ? `ابدأ بإضافة ${topLevelLabel} جديد` : `Start by adding a new ${topLevelLabel}`)}
          />
        ) : (
          <div className="space-y-3">
            {topLevel.map((item, idx) => {
              const itemId = item.id;
              const isExpanded = expanded[itemId] || !!search.trim();
              const itemSubjects = getSubjects(itemId);
              const itemLabel = item.name || item.name_ar;
              const itemIcon = tab === 'foundation' ? BookOpen : Shield;

              return (
                <motion.div
                  key={itemId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="card-base overflow-hidden"
                >
                  {/* Level 1: Track/Specialization */}
                  <div className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => toggleExpand(itemId)}
                      className="p-1 text-foreground-secondary hover:text-foreground transition-colors"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                    </button>
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {itemIcon && <itemIcon className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{itemLabel}</h3>
                      <p className="text-xs text-foreground-secondary truncate">
                        {item.description || item.short_description || ''}
                      </p>
                    </div>
                    <span className="text-xs text-foreground-secondary shrink-0">{itemSubjects.length} {lang === 'ar' ? 'مادة' : 'subjects'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {tab === 'specialization' && (
                        <Link
                          to={`/specialization/${item.id}/final-exam?preview=1`}
                          className="px-3 py-1.5 me-1 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                          title={lang === 'ar' ? 'تجربة الاختبار النهائي مباشرة' : 'Preview final exam directly'}
                        >
                          {lang === 'ar' ? 'معاينة الاختبار النهائي' : 'Preview final exam'}
                        </Link>
                      )}
                      <button
                        onClick={() => handleReorder(tab === 'foundation' ? 'track' : 'specialization', topLevel, idx, -1)}
                        disabled={idx === 0 || savingOrder}
                        className="p-1.5 text-foreground-secondary hover:text-primary disabled:opacity-30 transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleReorder(tab === 'foundation' ? 'track' : 'specialization', topLevel, idx, 1)}
                        disabled={idx === topLevel.length - 1 || savingOrder}
                        className="p-1.5 text-foreground-secondary hover:text-primary disabled:opacity-30 transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openAdd('subject', itemId)}
                        className="p-1.5 text-foreground-secondary hover:text-success transition-colors"
                        title={lang === 'ar' ? 'إضافة مادة' : 'Add subject'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(tab === 'foundation' ? 'track' : 'specialization', item)}
                        className="p-1.5 text-foreground-secondary hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tab === 'foundation' ? 'track' : 'specialization', item)}
                        className="p-1.5 text-foreground-secondary hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Level 2: Subjects */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        {itemSubjects.length === 0 ? (
                          <div className="pr-12 pb-4">
                            <p className="text-xs text-foreground-secondary py-2">{lang === 'ar' ? 'لا توجد مواد —' : 'No subjects —'}</p>
                          </div>
                        ) : (
                          <div className="pr-8 pb-2 space-y-1">
                            {itemSubjects.map((subj, sIdx) => {
                              const subjExpanded = expanded[subj.id] || !!search.trim();
                              const subjLessons = getLessons(subj.id);
                              return (
                                <div key={subj.id} className="rounded-lg bg-card/50">
                                  <div className="flex items-center gap-3 p-3">
                                    <button
                                      onClick={() => toggleExpand(subj.id)}
                                      className="p-1 text-foreground-secondary hover:text-foreground transition-colors"
                                    >
                                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${subjExpanded ? '' : '-rotate-90'}`} />
                                    </button>
                                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4 text-secondary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-medium text-foreground truncate">{subj.name}</h4>
                                      <p className="text-xs text-foreground-secondary truncate">{subj.description || ''}</p>
                                    </div>
                                    <span className="text-xs text-foreground-secondary shrink-0">{subjLessons.length} {lang === 'ar' ? 'درس' : 'lessons'}</span>
                                    {subj.is_published !== undefined && (
                                      <button
                                        onClick={() => handleTogglePublish('subject', subj)}
                                        className={`p-1.5 rounded transition-colors ${subj.is_published ? 'text-success' : 'text-foreground-secondary hover:text-foreground'}`}
                                        title={subj.is_published ? (lang === 'ar' ? 'منشور' : 'Published') : (lang === 'ar' ? 'مسودة' : 'Draft')}
                                      >
                                        {subj.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleReorder('subject', itemSubjects, sIdx, -1)}
                                      disabled={sIdx === 0 || savingOrder}
                                      className="p-1 text-foreground-secondary hover:text-primary disabled:opacity-30 transition-colors"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleReorder('subject', itemSubjects, sIdx, 1)}
                                      disabled={sIdx === itemSubjects.length - 1 || savingOrder}
                                      className="p-1 text-foreground-secondary hover:text-primary disabled:opacity-30 transition-colors"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => openAdd('lesson', subj.id)}
                                      className="p-1 text-foreground-secondary hover:text-success transition-colors"
                                      title={lang === 'ar' ? 'إضافة درس' : 'Add lesson'}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => openEdit('subject', subj)}
                                      className="p-1 text-foreground-secondary hover:text-primary transition-colors"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete('subject', subj)}
                                      className="p-1 text-foreground-secondary hover:text-danger transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Level 3: Lessons */}
                                  <AnimatePresence>
                                    {subjExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                      >
                                        {subjLessons.length === 0 ? (
                                          <p className="text-xs text-foreground-secondary pr-12 py-2">{lang === 'ar' ? 'لا توجد دروس' : 'No lessons'}</p>
                                        ) : (
                                          <div className="pr-10 pb-2 space-y-0.5">
                                            {subjLessons.map((lesson, lIdx) => (
                                              <div
                                                key={lesson.id}
                                                className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-card transition-colors group"
                                              >
                                                <div className="w-7 h-7 rounded-md bg-card flex items-center justify-center shrink-0">
                                                  <GraduationCap className="w-3.5 h-3.5 text-foreground-secondary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm text-foreground truncate">{lesson.title}</p>
                                                  {lesson.short_description && (
                                                    <p className="text-xs text-foreground-secondary truncate">{lesson.short_description}</p>
                                                  )}
                                                </div>
                                                {lesson.has_lab && (
                                                  <FlaskConical className="w-3.5 h-3.5 text-secondary shrink-0" />
                                                )}
                                                <button
                                                  onClick={() => handleTogglePublish('lesson', lesson)}
                                                  className={`p-1 rounded transition-colors ${lesson.is_published ? 'text-success' : 'text-foreground-secondary hover:text-foreground'}`}
                                                  title={lesson.is_published ? (lang === 'ar' ? 'منشور' : 'Published') : (lang === 'ar' ? 'مسودة' : 'Draft')}
                                                >
                                                  {lesson.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                </button>
                                                <button
                                                  onClick={() => handleReorder('lesson', subjLessons, lIdx, -1)}
                                                  disabled={lIdx === 0 || savingOrder}
                                                  className="p-1 text-foreground-secondary hover:text-primary disabled:opacity-30 transition-colors"
                                                >
                                                  <ArrowUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() => handleReorder('lesson', subjLessons, lIdx, 1)}
                                                  disabled={lIdx === subjLessons.length - 1 || savingOrder}
                                                  className="p-1 text-foreground-secondary hover:text-primary disabled:opacity-30 transition-colors"
                                                >
                                                  <ArrowDown className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() => openEdit('lesson', lesson)}
                                                  className="p-1 text-foreground-secondary hover:text-primary transition-colors"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => handleDelete('lesson', lesson)}
                                                  className="p-1 text-foreground-secondary hover:text-danger transition-colors"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && editing && (
          <CurriculumForm
            type={editing.type}
            editing={editing.item}
            parentId={editing.parentId}
            tracks={tracks}
            specializations={specializations}
            subjects={subjects}
            tab={tab}
            onSave={handleSaveForm}
            onClose={() => { setShowForm(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}