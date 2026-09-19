import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Maximize, SkipForward, SkipBack,
  VideoOff, AlertCircle, Loader2, RotateCcw
} from 'lucide-react';

// === URL type detection ===

function getYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/v\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getVimeoId(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function isDirectVideo(url) {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0].split('#')[0];
  return /\.(mp4|webm|ogg|ogv|mov|m4v|mkv)$/i.test(clean);
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url || '');
}

// === Component ===

export default function VideoPlayer({ videoUrl, initialPosition = 0, onProgress, onComplete, completionThreshold = 80 }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition || 0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [showCompleteNotice, setShowCompleteNotice] = useState(false);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const controlsTimeoutRef = useRef(null);

  const ytId = getYouTubeId(videoUrl);
  const vimeoId = !ytId ? getVimeoId(videoUrl) : null;
  const isDirect = isDirectVideo(videoUrl);
  const isEmbed = !!(ytId || vimeoId);

  // === No URL state ===
  if (!videoUrl) {
    return (
      <div className="aspect-video rounded-xl bg-card border border-border flex flex-col items-center justify-center gap-3">
        <VideoOff className="w-12 h-12 text-foreground-secondary" />
        <p className="text-foreground-secondary text-sm">الفيديو سيُضاف لاحقًا</p>
        <p className="text-foreground-secondary text-xs">يمكنك متابعة الدرس من المحتوى النصي أدناه</p>
      </div>
    );
  }

  // === Invalid URL state (not a video file, not YouTube/Vimeo, or not HTTP) ===
  if (!isHttpUrl(videoUrl)) {
    return (
      <div className="aspect-video rounded-xl bg-card border border-danger/30 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-danger" />
        <p className="text-foreground text-sm font-medium">رابط الفيديو غير صالح</p>
        <p className="text-foreground-secondary text-xs">يجب أن يبدأ الرابط بـ http:// أو https://</p>
      </div>
    );
  }

  if (!isDirect && !isEmbed) {
    return (
      <div className="aspect-video rounded-xl bg-card border border-danger/30 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-danger" />
        <p className="text-foreground text-sm font-medium">تعذر تشغيل الفيديو</p>
        <p className="text-foreground-secondary text-xs max-w-md">
          الرابط المُدخل ليس ملف فيديو مباشر ولا رابط YouTube/Vimeo مدعوم.
          تأكد من إدخال رابط مباشر لملف فيديو (mp4, webm) أو رابط YouTube.
        </p>
        <p className="text-foreground-secondary text-[10px] terminal-font mt-1" dir="ltr">{videoUrl}</p>
      </div>
    );
  }

  // === YouTube / Vimeo embed ===
  if (isEmbed) {
    const embedSrc = ytId
      ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1${initialPosition ? `&start=${Math.floor(initialPosition)}` : ''}`
      : `https://player.vimeo.com/video/${vimeoId}`;
    return (
      <div className="aspect-video rounded-xl overflow-hidden bg-black border border-border" dir="ltr">
        <iframe
          src={embedSrc}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="فيديو الدرس"
        />
      </div>
    );
  }

  // === Direct video file ===
  return (
    <DirectVideoPlayer
      key={retryKey}
      videoUrl={videoUrl}
      videoRef={videoRef}
      initialPosition={initialPosition}
      isPlaying={isPlaying}
      setIsPlaying={setIsPlaying}
      currentTime={currentTime}
      setCurrentTime={setCurrentTime}
      duration={duration}
      setDuration={setDuration}
      volume={volume}
      setVolume={setVolume}
      muted={muted}
      setMuted={setMuted}
      showControls={showControls}
      setShowControls={setShowControls}
      completed={completed}
      setCompleted={setCompleted}
      showCompleteNotice={showCompleteNotice}
      setShowCompleteNotice={setShowCompleteNotice}
      status={status}
      setStatus={setStatus}
      errorMsg={errorMsg}
      setErrorMsg={setErrorMsg}
      onProgress={onProgress}
      onComplete={onComplete}
      completionThreshold={completionThreshold}
      onRetry={() => { setStatus('loading'); setErrorMsg(''); setRetryKey((k) => k + 1); }}
    />
  );
}

// === Direct video player with full controls and error handling ===

function DirectVideoPlayer(props) {
  const {
    videoUrl, videoRef, initialPosition, isPlaying, setIsPlaying,
    currentTime, setCurrentTime, duration, setDuration, volume, setVolume,
    muted, setMuted, showControls, setShowControls, completed, setCompleted,
    showCompleteNotice, setShowCompleteNotice, status, setStatus, errorMsg, setErrorMsg,
    onProgress, onComplete, completionThreshold, onRetry,
  } = props;

  useEffect(() => {
    if (videoRef.current && initialPosition) {
      try { videoRef.current.currentTime = initialPosition; } catch {}
    }
  }, [initialPosition]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    if (onProgress) onProgress(time);

    const pct = duration > 0 ? (time / duration) * 100 : 0;
    if (pct >= completionThreshold && !completed) {
      setCompleted(true);
      setShowCompleteNotice(true);
      if (onComplete) onComplete(true);
      setTimeout(() => setShowCompleteNotice(false), 3000);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setStatus('ready');
      if (initialPosition) {
        try { videoRef.current.currentTime = initialPosition; } catch {}
      }
    }
  };

  const handleError = (e) => {
    setStatus('error');
    const err = videoRef.current?.error;
    let msg = 'تعذر تحميل الفيديو. تحقق من الرابط أو أعد المحاولة.';
    if (err) {
      switch (err.code) {
        case 1: msg = 'تم إيقاف التحميل.'; break;
        case 2: msg = 'خطأ في الشبكة أثناء تحميل الفيديو.'; break;
        case 3: msg = 'فشل فك ترميز الفيديو. قد يكون الملف تالفًا أو بصيغة غير مدعومة.'; break;
        case 4: msg = 'الفيديو غير مدعوم أو الرابط غير صالح.'; break;
      }
    }
    setErrorMsg(msg);
  };

  const handleSeek = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    videoRef.current.currentTime = pct * duration;
  };

  const skipTime = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setMuted(vol === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen?.();
    }
  };

  const handleMouseEnter = () => setShowControls(true);
  const handleMouseLeave = () => { if (isPlaying) setShowControls(false); };
  const handleContextMenu = (e) => e.preventDefault();

  // === Error state ===
  if (status === 'error') {
    return (
      <div className="aspect-video rounded-xl bg-card border border-danger/30 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-danger" />
        <div>
          <p className="text-foreground text-sm font-medium mb-1">تعذر تشغيل الفيديو</p>
          <p className="text-foreground-secondary text-xs">{errorMsg}</p>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-foreground text-sm hover:border-primary/50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> إعادة المحاولة
        </button>
        <p className="text-foreground-secondary text-[10px] terminal-font" dir="ltr">{videoUrl}</p>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-video rounded-xl overflow-hidden bg-black group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      dir="ltr"
    >
      <video
        ref={videoRef}
        src={videoUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setStatus('loading')}
        onCanPlay={() => setStatus('ready')}
        onContextMenu={handleContextMenu}
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        className="w-full h-full object-contain"
      />

      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-white/80 text-sm">جارٍ تحميل الفيديو...</p>
        </div>
      )}

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && status !== 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-between pointer-events-none"
          >
            <div className="h-20 bg-gradient-to-b from-black/60 to-transparent" />
            <div className="bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-auto">
              {/* Progress bar */}
              <div
                onClick={handleSeek}
                className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group/bar"
              >
                <div
                  className="h-full bg-primary rounded-full relative"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                </div>
              </div>
              {/* Buttons */}
              <div className="flex items-center gap-3 text-white">
                <button onClick={togglePlay} className="p-1.5 hover:text-primary transition-colors">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button onClick={() => skipTime(-10)} className="p-1.5 hover:text-primary transition-colors" title="رجوع 10 ثوان">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button onClick={() => skipTime(10)} className="p-1.5 hover:text-primary transition-colors" title="تقديم 10 ثوان">
                  <SkipForward className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="p-1.5 hover:text-primary transition-colors">
                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 accent-primary"
                  />
                </div>
                <span className="text-sm terminal-font">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <div className="flex-1" />
                <button onClick={toggleFullscreen} className="p-1.5 hover:text-primary transition-colors">
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion notice */}
      <AnimatePresence>
        {showCompleteNotice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-success/20 backdrop-blur-sm border border-success/40 rounded-lg px-4 py-2 text-white text-sm font-medium"
            dir="rtl"
          >
            ✓ شرط المشاهدة تحقق (80%)
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play button overlay when paused */}
      {!isPlaying && status === 'ready' && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-white mr-1" fill="white" />
          </div>
        </button>
      )}
    </div>
  );
}