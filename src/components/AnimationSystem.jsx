import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

// Motion tokens
export const motionTokens = {
  duration: { fast: 0.15, normal: 0.25, slow: 0.35 },
  ease: [0.4, 0, 0.2, 1],
  stagger: 0.05,
};

// Page transition wrapper
export function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger container
export function StaggerContainer({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: motionTokens.stagger, delayChildren: delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger item
export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: motionTokens.duration.normal, ease: motionTokens.ease } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated card with hover
export function AnimatedCard({ children, className = '', onClick, hover = true }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, transition: { duration: motionTokens.duration.fast } } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated button
export function AnimatedButton({ children, onClick, className = '', disabled, loading, type = 'button', variant = 'primary' }) {
  const variants = {
    primary: 'bg-gradient-primary text-white hover:glow-primary',
    secondary: 'bg-card border border-border text-foreground hover:border-primary/50',
    ghost: 'text-foreground-secondary hover:text-foreground hover:bg-card',
    gold: 'bg-gold text-background hover:glow-gold',
  };
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
}

// Progress bar animation
export function ProgressAnimation({ percent, className = '', color = 'primary' }) {
  const colors = {
    primary: 'from-primary to-secondary',
    gold: 'from-gold to-amber-400',
    success: 'from-success to-emerald-400',
  };
  return (
    <div className={`w-full h-2 bg-card rounded-full overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(percent, 100)}%` }}
        transition={{ duration: 0.6, ease: motionTokens.ease }}
        className={`h-full bg-gradient-to-r ${colors[color]} rounded-full`}
      />
    </div>
  );
}

// Success state with checkmark
export function SuccessState({ message, className = '' }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.ease }}
      className={`flex items-center gap-3 ${className}`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center"
      >
        <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
      <span className="text-success font-medium">{message}</span>
    </motion.div>
  );
}

// Error shake
export function ErrorShake({ children, shake, className = '' }) {
  return (
    <motion.div
      animate={shake ? { x: [0, -8, 8, -4, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Fade in on mount
export function FadeIn({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: motionTokens.duration.normal, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Number counter animation
export function AnimatedNumber({ value, className = '', duration = 0.8 }) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const valueRef = React.useRef(0);

  React.useEffect(() => {
    const start = valueRef.current;
    const end = value;
    if (start === end) return;
    
    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const current = Math.floor(start + (end - start) * progress);
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(animate);
      else valueRef.current = end;
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span className={className}>{displayValue.toLocaleString('ar-EG')}</span>;
}

// Skeleton loader
export function SkeletonCard({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function SkeletonList({ count = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

// Empty state
export function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4 border border-border">
          <Icon className="w-8 h-8 text-foreground-secondary" />
        </div>
      )}
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      {message && <p className="text-foreground-secondary text-sm max-w-md mb-6">{message}</p>}
      {action}
    </motion.div>
  );
}

// === Extended Animation Components ===

// RippleButton — button with ripple, loading, success/error states
export function RippleButton({ children, onClick, className = '', disabled, loading, type = 'button', variant = 'primary', ...props }) {
  const [ripples, setRipples] = useState([]);
  const prefersReducedMotion = useReducedMotion();

  const handleClick = (e) => {
    if (disabled || loading) return;
    if (!prefersReducedMotion) {
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const id = Date.now() + Math.random();
      setRipples((r) => [...r, { x, y, size, id }]);
      setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600);
    }
    onClick?.(e);
  };

  const variants = {
    primary: 'bg-gradient-primary text-white hover:shadow-lg hover:shadow-primary/20',
    secondary: 'bg-card border border-border text-foreground hover:border-primary/50',
    ghost: 'text-foreground-secondary hover:text-foreground hover:bg-card',
    gold: 'bg-gold text-background hover:shadow-lg hover:shadow-gold/20',
  };

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { y: -2 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      className={`relative overflow-hidden btn-press px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
      {!prefersReducedMotion && ripples.map((r) => (
        <span
          key={r.id}
          className="ripple-circle"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
    </motion.button>
  );
}

// ScrollReveal — once-only scroll-triggered reveal
export function ScrollReveal({ children, className = '', delay = 0, y = 16 }) {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// NavItem — animated underline nav link
export function NavItem({ to, children, active, onClick, className = '' }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      data-active={active}
      className={`nav-underline px-4 py-2 text-sm transition-colors rounded-lg hover:bg-card/50 ${
        active ? 'text-primary' : 'text-foreground-secondary hover:text-foreground'
      } ${className}`}
    >
      {children}
    </Link>
  );
}

// NavigationProgress — top loading bar on route change
export function NavigationProgress() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (prefersReducedMotion) return null;

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          style={{ transformOrigin: 'right' }}
          className="fixed top-0 right-0 left-0 h-0.5 bg-gradient-primary z-[100]"
        />
      )}
    </AnimatePresence>
  );
}

// ModalTransition — modal/dialog wrapper with fade + scale
export function ModalTransition({ isOpen, onClose, children, className = '', closeOnBackdrop = true }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={`relative z-50 ${className}`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Toast helper (uses sonner)
export { AnimatePresence };