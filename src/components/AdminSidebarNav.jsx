import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, FolderOpen, FlaskConical, ClipboardCheck,
  TrendingUp, Award, Bell, User, Shield, GraduationCap, TerminalSquare,
  Trophy, Star, Server, Settings, Monitor, ScrollText, ChevronDown, Users,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const adminNavGroups = [
  {
    key: 'overview',
    type: 'item',
    labelKey: 'layout.adminOverview',
    path: '/admin',
    icon: LayoutDashboard,
  },
  {
    key: 'content',
    type: 'group',
    labelKey: 'layout.adminGroupContent',
    icon: BookOpen,
    children: [
      { labelKey: 'layout.adminCurriculum', path: '/admin/curriculum', icon: BookOpen },
      { labelKey: 'layout.adminTracks', path: '/admin/tracks', icon: BookOpen },
      { labelKey: 'layout.adminSubjects', path: '/admin/subjects', icon: FolderOpen },
      { labelKey: 'layout.adminLessons', path: '/admin/lessons', icon: GraduationCap },
    ],
  },
  {
    key: 'training',
    type: 'group',
    labelKey: 'layout.adminGroupTraining',
    icon: FlaskConical,
    children: [
      { labelKey: 'layout.adminActivities', path: '/admin/activities', icon: FlaskConical },
      { labelKey: 'layout.adminLabs', path: '/admin/labs', icon: TerminalSquare },
      { labelKey: 'layout.adminRealLabs', path: '/admin/real-labs', icon: Server },
      { labelKey: 'layout.adminLabSettings', path: '/admin/lab-settings', icon: Settings },
      { labelKey: 'layout.adminLabSessions', path: '/admin/lab-sessions', icon: Monitor },
      { labelKey: 'layout.adminLabLogs', path: '/admin/lab-logs', icon: ScrollText },
    ],
  },
  {
    key: 'assessment',
    type: 'group',
    labelKey: 'layout.adminGroupAssessment',
    icon: ClipboardCheck,
    children: [
      { labelKey: 'layout.adminTests', path: '/admin/tests', icon: ClipboardCheck },
      { labelKey: 'layout.adminAssignments', path: '/admin/assignments', icon: ClipboardCheck },
    ],
  },
  {
    key: 'users',
    type: 'group',
    labelKey: 'layout.adminGroupUsers',
    icon: Users,
    children: [
      { labelKey: 'layout.adminUsers', path: '/admin/users', icon: User },
      { labelKey: 'layout.adminCertificates', path: '/admin/certificates', icon: Award },
      { labelKey: 'layout.adminSpecializations', path: '/admin/specializations', icon: Shield },
      { labelKey: 'layout.adminPoints', path: '/admin/points', icon: Star },
      { labelKey: 'layout.adminLeaderboard', path: '/admin/leaderboard', icon: Trophy },
    ],
  },
  {
    key: 'platform',
    type: 'group',
    labelKey: 'layout.adminGroupPlatform',
    icon: Settings,
    children: [
      { labelKey: 'layout.adminAnnouncements', path: '/admin/announcements', icon: Bell },
      { labelKey: 'layout.adminSettings', path: '/admin/settings', icon: Shield },
      { labelKey: 'layout.adminLogs', path: '/admin/logs', icon: TrendingUp },
    ],
  },
];

export default function AdminSidebarNav({ collapsed, onExpandSidebar, onNavigate }) {
  const location = useLocation();
  const { t, dir } = useTranslation();
  const [expanded, setExpanded] = useState({});

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  // Auto-expand the group containing the current page
  useEffect(() => {
    adminNavGroups.forEach((group) => {
      if (group.type === 'group') {
        const hasActiveChild = group.children.some((child) => isActive(child.path));
        if (hasActiveChild) {
          setExpanded((prev) => ({ ...prev, [group.key]: true }));
        }
      }
    });
  }, [location.pathname]);

  const toggleGroup = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Collapsed (icon-only) mode
  if (collapsed) {
    return (
      <>
        {adminNavGroups.map((item) => {
          const Icon = item.icon;
          if (item.type === 'item') {
            const active = isActive(item.path);
            return (
              <Link
                key={item.key}
                to={item.path}
                onClick={onNavigate}
                title={t(item.labelKey)}
                className={`flex items-center justify-center px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ${
                  active
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-foreground-secondary hover:text-foreground hover:bg-card'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
              </Link>
            );
          }
          const hasActiveChild = item.children.some((c) => isActive(c.path));
          return (
            <button
              key={item.key}
              onClick={() => { if (onExpandSidebar) onExpandSidebar(); toggleGroup(item.key); }}
              title={t(item.labelKey)}
              className={`flex items-center justify-center px-3 py-2.5 rounded-lg mb-1 w-full transition-all duration-200 ${
                hasActiveChild
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-card'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
            </button>
          );
        })}
      </>
    );
  }

  // Expanded mode with collapsible groups
  return (
    <>
      {adminNavGroups.map((item) => {
        if (item.type === 'item') {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ${
                active
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-card'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">{t(item.labelKey)}</span>
            </Link>
          );
        }

        const Icon = item.icon;
        const isOpen = !!expanded[item.key];
        const hasActiveChild = item.children.some((c) => isActive(c.path));
        return (
          <div key={item.key} className="mb-1">
            <button
              onClick={() => toggleGroup(item.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200 ${
                hasActiveChild
                  ? 'text-primary'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-card'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium flex-1 text-start">{t(item.labelKey)}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${isOpen ? '' : dir === 'rtl' ? 'rotate-90' : '-rotate-90'}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 space-y-0.5">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isActive(child.path);
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onNavigate}
                          className={`flex items-center gap-3 ps-8 pe-3 py-2 rounded-lg transition-all duration-200 ${
                            active
                              ? 'bg-primary/10 text-primary border border-primary/30'
                              : 'text-foreground-secondary hover:text-foreground hover:bg-card'
                          }`}
                        >
                          <ChildIcon className="w-4 h-4 shrink-0" />
                          <span className="text-sm">{t(child.labelKey)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );
}