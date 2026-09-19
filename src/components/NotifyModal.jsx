import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotifyModal({ open, onClose, trackName }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-warning" />
              </div>
              <button
                onClick={onClose}
                aria-label="إغلاق النافذة"
                className="p-2 text-foreground-secondary hover:text-foreground hover:bg-card-hover rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">سجّل اهتمامك بالمسار</h3>
            <p className="text-sm text-foreground-secondary mb-6 leading-relaxed">
              سجّل دخولك أو أنشئ حسابًا لنتمكن من إشعارك عند إطلاق مسار «{trackName}».
            </p>
            <div className="space-y-3">
              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-primary text-white rounded-lg font-medium hover:scale-[1.02] transition-transform focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <LogIn className="w-4 h-4" /> تسجيل الدخول
              </Link>
              <Link
                to="/register"
                className="w-full flex items-center justify-center gap-2 py-3 bg-card border border-border text-foreground rounded-lg font-medium hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <UserPlus className="w-4 h-4" /> إنشاء حساب
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}