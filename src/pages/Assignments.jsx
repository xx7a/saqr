import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, ChevronLeft, Clock, CheckCircle2, FileText, Upload, Link as LinkIcon } from 'lucide-react';
import Layout from '@/components/Layout';
import { StaggerContainer, StaggerItem, EmptyState, SkeletonCard, AnimatedButton } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Assignments() {
  const { t, lang, dir } = useTranslation();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSub, setEditingSub] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [assignData, subData] = await Promise.all([
        base44.entities.Assignment.filter({ is_published: true }, '-created_date', 50),
        base44.entities.Submission.filter({ user_id: user.id }),
      ]);
      setAssignments(assignData || []);
      setSubmissions(subData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (assignment, content, fileUrl, linkUrl) => {
    try {
      const existing = submissions.find((s) => s.assignment_id === assignment.id);
      if (existing) {
        await base44.entities.Submission.update(existing.id, {
          content, file_url: fileUrl, link_url: linkUrl,
          status: 'submitted',
          submitted_date: new Date().toISOString(),
        });
      } else {
        await base44.entities.Submission.create({
          assignment_id: assignment.id,
          assignment_title: assignment.title,
          user_id: user.id,
          user_name: user.full_name || user.email,
          content, file_url: fileUrl, link_url: linkUrl,
          status: 'submitted',
          submitted_date: new Date().toISOString(),
        });
      }
      toast.success(t('assignmentsPage.submitSuccess'));
      setEditingSub(null);
      loadData();
    } catch (e) {
      toast.error(t('assignmentsPage.submitError'));
    }
  };

  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-24" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" /> {t('assignmentsPage.title')}
          </h1>
          <p className="text-foreground-secondary text-sm mt-1">{t('assignmentsPage.desc')}</p>
        </div>

        {assignments.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title={t('assignmentsPage.noAssignments')} message={t('assignmentsPage.noAssignmentsDesc')} />
        ) : (
          <StaggerContainer className="space-y-4">
            {assignments.map((assign) => {
              const submission = submissions.find((s) => s.assignment_id === assign.id);
              return (
                <StaggerItem key={assign.id}>
                  <div className="card-base p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">{localized(assign, 'title', lang)}</h3>
                          <p className="text-sm text-foreground-secondary">{localized(assign, 'description', lang)}</p>
                        </div>
                      </div>
                      {submission && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          submission.status === 'graded' ? 'bg-success/10 text-success' :
                          submission.status === 'submitted' ? 'bg-primary/10 text-primary' :
                          'bg-card text-foreground-secondary'
                        }`}>
                          {submission.status === 'graded' ? t('assignmentsPage.graded') : submission.status === 'submitted' ? t('assignmentsPage.submitted') : t('assignmentsPage.draftStatus')}
                        </span>
                      )}
                    </div>

                    {assign.due_date && (
                      <div className="flex items-center gap-1 text-xs text-foreground-secondary mb-3">
                        <Clock className="w-3.5 h-3.5" />
                        {t('assignmentsPage.dueDate')}: {new Date(assign.due_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                      </div>
                    )}

                    {submission?.status === 'graded' && (
                      <div className="p-3 rounded-lg bg-success/10 border border-success/30 mb-3">
                        <p className="text-sm text-foreground">
                          <span className="font-bold text-success">{t('assignmentsPage.gradeLabel')}:</span> {submission.grade}/{assign.max_points || 100}
                        </p>
                        {submission.feedback && (
                          <p className="text-sm text-foreground-secondary mt-1">{submission.feedback}</p>
                        )}
                      </div>
                    )}

                    <AnimatedButton onClick={() => setEditingSub({ assignment: assign, submission })} className="text-sm">
                      {submission?.status === 'submitted' ? t('assignmentsPage.editSubmission') : t('assignmentsPage.submitAssignment')}
                    </AnimatedButton>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>

      {editingSub && (
        <SubmissionModal
          assignment={editingSub.assignment}
          submission={editingSub.submission}
          onSubmit={handleSubmit}
          onClose={() => setEditingSub(null)}
        />
      )}
    </Layout>
  );
}

function SubmissionModal({ assignment, submission, onSubmit, onClose }) {
  const { t, lang, dir } = useTranslation();
  const [content, setContent] = useState(submission?.content || '');
  const [fileUrl, setFileUrl] = useState(submission?.file_url || '');
  const [linkUrl, setLinkUrl] = useState(submission?.link_url || '');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background-secondary border border-border rounded-2xl p-6 max-w-lg w-full"
        dir={dir}
      >
        <h2 className="text-xl font-bold text-foreground mb-4">{localized(assignment, 'title', lang)}</h2>
        <p className="text-sm text-foreground-secondary mb-4">{localized(assignment, 'instructions', lang)}</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('assignmentsPage.textAnswer')}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder={t('assignmentsPage.textAnswerPlaceholder')}
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('assignmentsPage.fileUrl')}</label>
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('assignmentsPage.externalUrl')}</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2.5 bg-card border border-border text-foreground rounded-lg text-sm">{t('common.cancel')}</button>
          <AnimatedButton onClick={() => onSubmit(assignment, content, fileUrl, linkUrl)}>{t('assignmentsPage.submit')}</AnimatedButton>
        </div>
      </motion.div>
    </motion.div>
  );
}