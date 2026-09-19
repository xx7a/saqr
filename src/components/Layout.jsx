import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, FolderOpen, FlaskConical, ClipboardCheck,
  TrendingUp, Award, Bell, User, Menu, X, LogOut, Shield, ChevronLeft,
  Home, GraduationCap, TerminalSquare, Trophy, ChevronRight, Star, Server,
  Settings, Monitor, ScrollText
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import AdminSidebarNav from '@/components/AdminSidebarNav';

const studentNavKeys = [
  { labelKey: 'layout.dashboard', path: '/dashboard', icon: LayoutDashboard },
  { labelKey: 'layout.tracks', path: '/tracks', icon: BookOpen },
  { labelKey: 'layout.mySubjects', path: '/my-subjects', icon: FolderOpen },
  { labelKey: 'layout.labs', path: '/labs', icon: FlaskConical },
  { labelKey: 'layout.realLabs', path: '/real-labs', icon: Server },
  { labelKey: 'layout.assignments', path: '/assignments', icon: ClipboardCheck },
  { labelKey: 'layout.progress', path: '/progress', icon: TrendingUp },
  { labelKey: 'layout.specializations', path: '/specializations', icon: Shield },
  { labelKey: 'layout.mySpecialization', path: '/my-specialization', icon: Shield },
  { labelKey: 'layout.leaderboard', path: '/leaderboard', icon: Trophy },
  { labelKey: 'layout.certificates', path: '/certificates', icon: Award },
  { labelKey: 'layout.notifications', path: '/notifications', icon: Bell },
  { labelKey: 'layout.profile', path: '/profile', icon: User },
];

const adminNavKeys = [
  { labelKey: 'layout.adminOverview', path: '/admin', icon: LayoutDashboard },
  { labelKey: 'layout.adminCurriculum', path: '/admin/curriculum', icon: BookOpen },
  { labelKey: 'layout.adminTracks', path: '/admin/tracks', icon: BookOpen },
  { labelKey: 'layout.adminSubjects', path: '/admin/subjects', icon: FolderOpen },
  { labelKey: 'layout.adminLessons', path: '/admin/lessons', icon: GraduationCap },
  { labelKey: 'layout.adminActivities', path: '/admin/activities', icon: FlaskConical },
  { labelKey: 'layout.adminLabs', path: '/admin/labs', icon: TerminalSquare },
  { labelKey: 'layout.adminRealLabs', path: '/admin/real-labs', icon: Server },
  { labelKey: 'layout.adminLabSettings', path: '/admin/lab-settings', icon: Settings },
  { labelKey: 'layout.adminLabSessions', path: '/admin/lab-sessions', icon: Monitor },
  { labelKey: 'layout.adminLabLogs', path: '/admin/lab-logs', icon: ScrollText },
  { labelKey: 'layout.adminTests', path: '/admin/tests', icon: ClipboardCheck },
  { labelKey: 'layout.adminAssignments', path: '/admin/assignments', icon: ClipboardCheck },
  { labelKey: 'layout.adminSpecializations', path: '/admin/specializations', icon: Shield },
  { labelKey: 'layout.adminUsers', path: '/admin/users', icon: User },
  { labelKey: 'layout.adminCertificates', path: '/admin/certificates', icon: Award },
  { labelKey: 'layout.adminAnnouncements', path: '/admin/announcements', icon: Bell },
  { labelKey: 'layout.adminSettings', path: '/admin/settings', icon: Shield },
  { labelKey: 'layout.adminLogs', path: '/admin/logs', icon: TrendingUp },
  { labelKey: 'layout.adminPoints', path: '/admin/points', icon: Star },
  { labelKey: 'layout.adminLeaderboard', path: '/admin/leaderboard', icon: Trophy },
];

export default function Layout({ children, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, effectiveRole } = useAuth();
  const { t, lang, dir } = useTranslation();

  // Derive role from auth context (database) — not from a prop or URL.
  const navKeys = (role || effectiveRole) === 'admin' ? adminNavKeys : studentNavKeys;
  const nav = navKeys.map((item) => ({ ...item, label: t(item.labelKey) }));

  const handleLogout = () => {
    logout();
  };

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex" dir={dir}>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={`hidden lg:flex flex-col bg-background-secondary ${dir === 'rtl' ? 'border-l' : 'border-r'} border-border sticky top-0 h-screen`}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 px-4 h-16 border-b border-border">
          <Logo size={40} />
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-foreground">{lang === 'ar' ? 'صقر' : 'SAQR'}</h1>
              <p className="text-xs text-foreground-secondary">{lang === 'ar' ? 'SAQR' : 'صقر'}</p>
            </div>
          )}
        </Link>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {(role || effectiveRole) === 'admin' ? (
            <AdminSidebarNav
              collapsed={sidebarCollapsed}
              onExpandSidebar={() => setSidebarCollapsed(false)}
            />
          ) : (
            nav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ${
                    active
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-foreground-secondary hover:text-foreground hover:bg-card'
                  }`}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              );
            })
          )}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center justify-center h-12 border-t border-border text-foreground-secondary hover:text-foreground transition-colors"
        >
          {dir === 'rtl' ? (
            <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          ) : (
            <ChevronRight className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          )}
        </button>

        {/* User section */}
        <div className="p-3 border-t border-border">
          {!sidebarCollapsed && (
            <div className="mb-2 pb-2 border-b border-border">
              <LanguageSwitcher />
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-card flex items-center justify-center shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user?.full_name || ''} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-foreground-secondary" />
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.full_name || user?.email}</p>
                <button onClick={handleLogout} className="text-xs text-foreground-secondary hover:text-danger flex items-center gap-1 mt-0.5">
                  <LogOut className="w-3 h-3" /> {t('layout.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
            />
            <motion.aside
              initial={{ x: dir === 'rtl' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: dir === 'rtl' ? '100%' : '-100%' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className={`lg:hidden fixed top-0 ${dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'} bottom-0 w-72 bg-background-secondary border-border z-50 flex flex-col`}
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-border">
                <div className="flex items-center gap-3">
                  <Logo size={40} />
                  <h1 className="text-lg font-bold text-foreground">صقر</h1>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 text-foreground-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-2">
                {(role || effectiveRole) === 'admin' ? (
                  <AdminSidebarNav
                    collapsed={false}
                    onNavigate={() => setSidebarOpen(false)}
                  />
                ) : (
                  nav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                          active
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'text-foreground-secondary hover:text-foreground hover:bg-card'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    );
                  })
                )}
              </nav>
              <div className="p-3 border-t border-border space-y-2">
                <LanguageSwitcher />
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-danger text-sm">
                  <LogOut className="w-4 h-4" /> {t('layout.logout')}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-background-secondary border-b border-border sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-foreground-secondary">
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <Logo size={32} rounded="rounded-lg" />
            <span className="font-bold text-foreground">{lang === 'ar' ? 'صقر' : 'SAQR'}</span>
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher compact />
            <Link to="/profile" className="p-2 text-foreground-secondary">
              <User className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}