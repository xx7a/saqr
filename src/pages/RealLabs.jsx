import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Server, ChevronLeft, ChevronRight, CheckCircle2, Clock,
  Lock, Filter, Zap, Crosshair, Eye, Flag
} from 'lucide-react';
import Layout from '@/components/Layout';
import { StaggerContainer, StaggerItem, EmptyState, SkeletonCard } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';

const difficultyColors = {
  easy: 'bg-success/10 text-success',
  medium: 'bg-warning/10 text-warning',
  hard: 'bg-danger/10 text-danger',
};

export default function RealLabs() {
  const { t, lang, dir } = useTranslation();
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [labsData, compData, sessData] = await Promise.all([
        base44.entities.RealLab.filter({ is_published: true }, 'order', 100),
        base44.entities.RealLabCompletion.filter({ user_id: user.id }),
        base44.entities.RealLabSession.filter({ user_id: user.id }),
      ]);
      setLabs(labsData || []);
      setCompletions(compData || []);
      setActiveSessions((sessData || []).filter(s => s.status === 'running' || s.status === 'preparing'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getLabStatus = (labId) => {
    if (completions.some(c => c.lab_id === labId)) return 'completed';
    if (activeSessions.some(s => s.lab_id === labId)) return 'in_progress';
    return 'not_started';
  };

  const categories = useMemo(() => {
    const set = new Set(labs.map(l => l.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [labs]);

  const filteredLabs = useMemo(() => {
    return labs.filter((lab) => {
      if (filterLevel !== 'all' && lab.difficulty !== filterLevel) return false;
      if (filterCategory !== 'all' && lab.category !== filterCategory) return false;
      return true;
    });
  }, [labs, filterLevel, filterCategory]);

  const getDifficultyLabel = (level) =>
    level === 'easy' ? t('lab.easy') : level === 'medium' ? t('lab.medium') : t('lab.hard');

  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-4">
          <SkeletonCard className="h-20" />
          <div className="grid md:grid-cols-2 gap-4">
            <SkeletonCard className="h-44" />
            <SkeletonCard className="h-44" />
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
            <Server className="w-6 h-6 text-primary" /> {t('realLabs.title')}
          </h1>
          <p className="text-foreground-secondary text-sm mt-1">{t('realLabs.desc')}</p>
        </div>

        {/* Info banner */}
        <div className="card-base p-4 bg-secondary/5 border-secondary/20">
          <p className="text-sm text-foreground-secondary flex items-start gap-2">
            <Zap className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
            <span><span className="text-secondary font-medium">{t('realLabs.notice')}:</span> {t('realLabs.noticeDesc')}</span>
          </p>
        </div>

        {/* Filters */}
        <div className="card-base p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-foreground-secondary" />
            <span className="text-sm font-medium text-foreground">{t('common.filter')}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
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
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">{t('realLabs.category')}</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? t('common.all') : c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Labs grid */}
        {filteredLabs.length === 0 ? (
          <EmptyState
            icon={Server}
            title={t('realLabs.noLabs')}
            message={t('realLabs.noLabsDesc')}
          />
        ) : (
          <StaggerContainer className="grid md:grid-cols-2 gap-4">
            {filteredLabs.map((lab) => {
              const status = getLabStatus(lab.id);
              const isActive = status === 'in_progress';
              return (
                <StaggerItem key={lab.id}>
                  <Link to={`/real-lab/${lab.id}`} className="block h-full">
                    <div className="card-base p-5 h-full flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Server className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {status === 'completed' ? (
                            <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {t('lab.completed')}
                            </span>
                          ) : isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" /> {t('realLabs.active')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-card text-foreground-secondary text-xs">{t('realLabs.available')}</span>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-foreground mb-1">{localized(lab, 'title', lang)}</h3>
                      <p className="text-sm text-foreground-secondary line-clamp-2 flex-1">
                        {localized(lab, 'short_description', lang) || localized(lab, 'scenario', lang)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${difficultyColors[lab.difficulty] || difficultyColors.easy}`}>
                          {getDifficultyLabel(lab.difficulty)}
                        </span>
                        {lab.category && (
                          <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">{lab.category}</span>
                        )}
                        <span className="text-foreground-secondary flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {lab.estimated_minutes || 45} {lang === 'ar' ? 'د' : 'm'}
                        </span>
                        <span className="text-gold flex items-center gap-1 font-medium">
                          <Flag className="w-3 h-3" /> {lab.points || 100}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-3 text-sm text-primary">
                        {status === 'completed' ? t('lab.review') : isActive ? t('realLabs.resume') : t('realLabs.start')}
                        {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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