import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FlaskConical, ChevronLeft, ChevronRight, Terminal, CheckCircle2, Clock,
  Search, FileText, Network, Shield, Fingerprint, Lock, Mail, Filter
} from 'lucide-react';
import Layout from '@/components/Layout';
import { StaggerContainer, StaggerItem, EmptyState, SkeletonCard } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';

const interfaceIcons = {
  terminal: Terminal,
  log_analysis: Search,
  phishing: Mail,
  network_map: Network,
  file_integrity: Fingerprint,
  permissions: Lock,
};

// Interface labels moved inside component for i18n

export default function Labs() {
  const { t, lang, dir } = useTranslation();
  const [labs, setLabs] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterInterface, setFilterInterface] = useState('all');
  const { user } = useAuth();

  const interfaceLabels = {
    terminal: t('lab.terminal'),
    log_analysis: t('lab.logAnalysis'),
    phishing: t('lab.phishing'),
    network_map: t('lab.networkMap'),
    file_integrity: t('lab.fileIntegrity'),
    permissions: t('lab.permissions'),
  };
  const getDifficultyLabel = (level) => level === 'easy' ? t('lab.easy') : level === 'medium' ? t('lab.medium') : t('lab.hard');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [labsData, progressData] = await Promise.all([
        base44.entities.Lab.filter({ lab_type: 'independent', is_published: true }, 'order', 100),
        base44.entities.LabProgress.filter({ user_id: user.id }),
      ]);
      setLabs(labsData || []);
      setProgress(progressData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getLabStatus = (labId) => {
    const p = progress.find((p) => p.lab_id === labId);
    if (p?.status === 'completed') return 'completed';
    if (p?.status === 'in_progress') return 'in_progress';
    return 'not_started';
  };

  const filteredLabs = useMemo(() => {
    return labs.filter((lab) => {
      if (filterLevel !== 'all' && lab.difficulty !== filterLevel) return false;
      if (filterInterface !== 'all' && lab.lab_interface !== filterInterface) return false;
      if (filterStatus !== 'all') {
        const status = getLabStatus(lab.id);
        if (status !== filterStatus) return false;
      }
      return true;
    });
  }, [labs, filterLevel, filterStatus, filterInterface, progress]);

  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-4">
          <SkeletonCard className="h-20" />
          <div className="grid md:grid-cols-2 gap-4">
            <SkeletonCard className="h-40" />
            <SkeletonCard className="h-40" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="student">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary" /> {t('labsPage.title')}
          </h1>
          <p className="text-foreground-secondary text-sm mt-1">
            {t('labsPage.desc')}
          </p>
        </div>

        {/* Info banner */}
        <div className="card-base p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-foreground-secondary">
            <span className="text-primary font-medium">{t('labsPage.notice')}:</span> {t('labsPage.noticeDesc')}
          </p>
        </div>

        {/* Filters */}
        <div className="card-base p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-foreground-secondary" />
            <span className="text-sm font-medium text-foreground">{t('common.filter')}</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {/* Level filter */}
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">{t('labsPage.level')}</label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none"
              >
                <option value="all">{t('common.all')}</option>
                <option value="easy">{t('lab.easy')}</option>
                <option value="medium">{t('lab.medium')}</option>
                <option value="hard">{t('lab.hard')}</option>
              </select>
            </div>
            {/* Interface filter */}
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">{t('labsPage.type')}</label>
              <select
                value={filterInterface}
                onChange={(e) => setFilterInterface(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none"
              >
                <option value="all">{t('common.all')}</option>
                {Object.entries(interfaceLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            {/* Status filter */}
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">{t('common.status')}</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none"
              >
                <option value="all">{t('common.all')}</option>
                <option value="not_started">{t('lab.notStarted')}</option>
                <option value="in_progress">{t('lab.inProgress')}</option>
                <option value="completed">{t('lab.completed')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Labs grid */}
        {filteredLabs.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title={t('labsPage.noLabs')}
            message={labs.length === 0 ? t('labsPage.noLabsYet') : t('labsPage.changeFilters')}
          />
        ) : (
          <StaggerContainer className="grid md:grid-cols-2 gap-4">
            {filteredLabs.map((lab) => {
              const status = getLabStatus(lab.id);
              const Icon = interfaceIcons[lab.lab_interface] || Terminal;
              return (
                <StaggerItem key={lab.id}>
                  <Link to={`/lab/${lab.id}`} className="block h-full">
                    <div className="card-base p-5 h-full flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-secondary" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {status === 'completed' ? (
                            <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs flex items-center gap-1">
                                                           <CheckCircle2 className="w-3 h-3" /> {t('lab.completed')}
                                                         </span>
                                                       ) : status === 'in_progress' ? (
                                                         <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs">{t('lab.inProgress')}</span>
                                                       ) : (
                                                         <span className="px-2 py-0.5 rounded-full bg-card text-foreground-secondary text-xs">{t('lab.notStarted')}</span>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-foreground mb-1">{localized(lab, 'title', lang)}</h3>
                      <p className="text-sm text-foreground-secondary line-clamp-2 flex-1">{localized(lab, 'short_description', lang) || localized(lab, 'scenario', lang)}</p>
                      <div className="flex items-center gap-2 mt-3 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-success/10 text-success">
                                                   {getDifficultyLabel(lab.difficulty)}
                                                 </span>
                                                 <span className="text-foreground-secondary flex items-center gap-1">
                                                   <Clock className="w-3 h-3" /> {lab.estimated_minutes || 15}{lang === 'ar' ? 'د' : 'm'}
                                                 </span>
                                                 <span className="text-foreground-secondary">{interfaceLabels[lab.lab_interface] || t('lab.title')}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-3 text-sm text-primary">
                        {status === 'completed' ? t('lab.review') : status === 'in_progress' ? t('common.continue') : t('lab.start')} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>
    </Layout>
  );
}