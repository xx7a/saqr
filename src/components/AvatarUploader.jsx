import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Save, X, Trash2, ZoomIn, AlertCircle, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const OUTPUT_SIZE = 512;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AvatarUploader({ currentAvatar, displayName, onSaved }) {
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState('idle'); // idle | editing | saving
  const [imageSrc, setImageSrc] = useState(null);
  const [imageObj, setImageObj] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 }); // 0-1 center
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [posStart, setPosStart] = useState({ x: 0.5, y: 0.5 });
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    // Client-side pre-validation (server validates again)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('صيغة غير مدعومة — JPG أو PNG أو WebP فقط');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('حجم الصورة يتجاوز 5 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImageObj(img);
        setImageSrc(ev.target.result);
        setZoom(1);
        setPosition({ x: 0.5, y: 0.5 });
        setMode('editing');
      };
      img.onerror = () => setError('تعذّر قراءة الصورة — ملف غير صالح');
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // Drag to reposition
  const handlePointerDown = (e) => {
    if (mode !== 'editing') return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPosStart(position);
  };

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStart.x) / rect.width;
    const dy = (e.clientY - dragStart.y) / rect.height;
    // Adjust position inversely (dragging right moves image left in the frame)
    const newX = Math.max(0, Math.min(1, posStart.x - dx));
    const newY = Math.max(0, Math.min(1, posStart.y - dy));
    setPosition({ x: newX, y: newY });
  }, [dragging, dragStart, posStart]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      return () => {
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('mouseup', handlePointerUp);
      };
    }
  }, [dragging, handlePointerMove, handlePointerUp]);

  // Render cropped image to canvas at 512x512, return base64 (no EXIF — canvas redraw strips it)
  const getCroppedBase64 = () => {
    if (!imageObj) return null;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    // Source crop: center on position, scaled by zoom
    const imgW = imageObj.width;
    const imgH = imageObj.height;
    const side = Math.min(imgW, imgH) / zoom;
    const sx = (imgW - side) * position.x;
    const sy = (imgH - side) * position.y;

    ctx.drawImage(imageObj, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Export as JPEG (smaller, no EXIF since canvas redraw)
    return {
      base64: canvas.toDataURL('image/jpeg', 0.9).split(',')[1],
      content_type: 'image/jpeg',
    };
  };

  const handleSave = async () => {
    setError('');
    const cropped = getCroppedBase64();
    if (!cropped) {
      setError('تعذّر معالجة الصورة');
      return;
    }
    setMode('saving');
    try {
      const res = await base44.functions.invoke('uploadAvatar', {
        image_base64: cropped.base64,
        content_type: cropped.content_type,
      });
      if (res?.avatar_url) {
        toast.success('تم حفظ الصورة بنجاح');
        setMode('idle');
        setImageSrc(null);
        setImageObj(null);
        if (refreshUser) await refreshUser();
        if (onSaved) onSaved(res.avatar_url);
      } else if (res?.error) {
        setError(res.error);
        setMode('editing');
      }
    } catch (e) {
      setError('تعذّر رفع الصورة — حاول مرة أخرى');
      setMode('editing');
    }
  };

  const handleRemove = async () => {
    setError('');
    setMode('saving');
    try {
      const res = await base44.functions.invoke('uploadAvatar', { remove: true });
      if (res?.removed) {
        toast.success('تمت إزالة الصورة');
        setMode('idle');
        if (refreshUser) await refreshUser();
        if (onSaved) onSaved('');
      } else if (res?.error) {
        setError(res.error);
        setMode('idle');
      }
    } catch (e) {
      setError('تعذّر إزالة الصورة');
      setMode('idle');
    }
  };

  const handleCancel = () => {
    setMode('idle');
    setImageSrc(null);
    setImageObj(null);
    setError('');
  };

  const initial = (displayName || 'ط')[0];

  return (
    <div className="space-y-4">
      {/* Current avatar display */}
      {mode === 'idle' && (
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {currentAvatar ? (
              <img src={currentAvatar} alt="صورة الحساب" className="w-full h-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-foreground text-sm font-medium hover:border-primary/50 transition-colors"
            >
              <Camera className="w-4 h-4" /> تغيير الصورة
            </button>
            {currentAvatar && (
              <button
                onClick={handleRemove}
                disabled={mode === 'saving'}
                className="inline-flex items-center gap-2 px-4 py-2 text-danger text-sm hover:underline transition-colors"
              >
                <Trash2 className="w-4 h-4" /> إزالة الصورة
              </button>
            )}
          </div>
        </div>
      )}

      {/* Editing mode — crop with circular preview */}
      <AnimatePresence>
        {mode === 'editing' && imageSrc && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-col items-center gap-4">
              {/* Circular crop preview */}
              <div
                ref={previewRef}
                onPointerDown={handlePointerDown}
                className="relative w-56 h-56 rounded-full overflow-hidden border-2 border-primary/30 cursor-move bg-card"
                style={{ touchAction: 'none' }}
              >
                <img
                  src={imageSrc}
                  alt="معاينة"
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                  style={{
                    objectPosition: `${position.x * 100}% ${position.y * 100}%`,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center',
                  }}
                  draggable={false}
                />
                {/* Crop guide overlay */}
                <div className="absolute inset-0 rounded-full border-4 border-white/20 pointer-events-none" />
              </div>

              <p className="text-xs text-foreground-secondary text-center">
                اسحب لتحريك الصورة، استخدم شريط التكبير للضبط
              </p>

              {/* Zoom slider */}
              <div className="w-full max-w-xs flex items-center gap-3">
                <ZoomIn className="w-4 h-4 text-foreground-secondary shrink-0" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-xs text-foreground-secondary w-10 text-left terminal-font">{zoom.toFixed(1)}x</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-foreground text-sm hover:border-border/70 transition-colors"
                >
                  <X className="w-4 h-4" /> إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={mode === 'saving'}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-primary text-white rounded-lg text-sm font-medium hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> حفظ الصورة
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saving spinner */}
      {mode === 'saving' && (
        <div className="flex items-center gap-3 text-foreground-secondary text-sm">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          جارٍ الحفظ...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}