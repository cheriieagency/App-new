'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Volume2, Radio } from 'lucide-react';

interface AudioMiniPlayerProps {
  lessonTitle: string;
  courseName: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
}

const SPEEDS = [1, 1.25, 1.5, 2];

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function AudioMiniPlayer({
  lessonTitle,
  courseName,
  iframeRef,
  onClose,
}: AudioMiniPlayerProps) {
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef(speed);

  // Keep speedRef in sync so the interval closure always has the current speed
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const postCmd = useCallback(
    (func: string, args: (number | boolean)[] = []) => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch {
        // cross-origin: ignore
      }
    },
    [iframeRef]
  );

  // Tick elapsed timer
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setElapsed((p) => p + speedRef.current);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing]);

  // On mount: tell iframe to start + set speed
  useEffect(() => {
    const t = setTimeout(() => {
      postCmd('playVideo');
      postCmd('setPlaybackRate', [speed]);
    }, 800);
    return () => clearTimeout(t);
  }, [postCmd, speed]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (p) {
        postCmd('pauseVideo');
      } else {
        postCmd('playVideo');
      }
      return !p;
    });
  }, [postCmd]);

  const skip = useCallback(
    (seconds: number) => {
      setElapsed((prev) => {
        const next = Math.max(0, prev + seconds);
        postCmd('seekTo', [next, true]);
        return next;
      });
    },
    [postCmd]
  );

  const changeSpeed = useCallback(
    (s: number) => {
      setSpeed(s);
      postCmd('setPlaybackRate', [s]);
    },
    [postCmd]
  );

  const vizBars = [4, 7, 5, 9, 6, 8, 4, 7, 5];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 "
      style={{
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
        borderTop: '1px solid rgba(99,102,241,0.25)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Waveform / art */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-lg">
            {playing ? (
              <div className="flex items-end gap-[2px] h-5">
                {vizBars.slice(0, 5).map((h, i) => (
                  <div
                    key={i}
                    className="w-[2px] bg-white rounded-full"
                    style={{
                      height: `${h * 2}px`,
                      animation: `audioBarAnim ${0.55 + i * 0.07}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <Volume2 size={16} className="text-white" />
            )}
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Radio size={9} className="text-blue-400 flex-shrink-0" />
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest truncate">
                {courseName} · Audio Only
              </p>
            </div>
            <p className="text-sm font-black text-white truncate leading-tight">{lessonTitle}</p>
          </div>

          {/* Elapsed time */}
          <span className="text-xs text-zinc-500 font-mono tabular-nums hidden sm:block flex-shrink-0">
            {formatTime(elapsed)}
          </span>

          {/* Skip back 15s */}
          <button
            onClick={() => skip(-15)}
            className="flex flex-col items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white flex-shrink-0"
            title="Rewind 15s"
          >
            <SkipBack size={14} />
            <span className="text-[8px] font-black leading-none mt-0.5">15</span>
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
          >
            {playing ? (
              <Pause size={18} className="text-white" />
            ) : (
              <Play size={18} className="text-white ml-0.5" />
            )}
          </button>

          {/* Skip forward 15s */}
          <button
            onClick={() => skip(15)}
            className="flex flex-col items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white flex-shrink-0"
            title="Forward 15s"
          >
            <SkipForward size={14} />
            <span className="text-[8px] font-black leading-none mt-0.5">15</span>
          </button>

          {/* Speed selector */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => changeSpeed(s)}
                className={`px-1.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  speed === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-600 hover:text-white transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-[3px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-[width] duration-1000"
            style={{ width: `${Math.min((elapsed / 3600) * 100, 100)}%` }}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes audioBarAnim {
          from {
            transform: scaleY(0.35);
            opacity: 0.5;
          }
          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
