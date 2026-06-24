import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { dbAddActivityLog } from '../dbService';
import type { Attempt, User } from '../dbService';
import { Camera, CameraOff, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAppContext } from '../AppContext';

interface WebcamProctorProps {
  attempt: Attempt;
  user: User;
  enabled: boolean; // set to false during lobby/finished
}

type ProctorStatus = 'loading' | 'requesting' | 'active' | 'denied' | 'no_face' | 'multiple_faces' | 'ok';

const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
const DETECTION_INTERVAL_MS = 3000; // check every 3 seconds
const MISSING_FACE_THRESHOLD_MS = 7000; // warn after 7s of no face

export const WebcamProctor: React.FC<WebcamProctorProps> = ({ attempt, user, enabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noFaceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modelsLoadedRef = useRef(false);

  const { refreshLogs } = useAppContext();

  const [status, setStatus] = useState<ProctorStatus>('loading');
  const [minimized, setMinimized] = useState(false);
  const [faceCount, setFaceCount] = useState<number | null>(null);

  const logViolation = useCallback(async (type: 'face_missing' | 'multiple_faces', msg: string) => {
    try {
      await dbAddActivityLog(attempt.id, user.id, user.name, type, msg);
      await refreshLogs();
    } catch (err) {
      console.error('Gagal mencatat log webcam:', err);
    }
  }, [attempt.id, user.id, user.name, refreshLogs]);

  // Load face-api models
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const loadModels = async () => {
      try {
        if (!modelsLoadedRef.current) {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          ]);
          modelsLoadedRef.current = true;
        }
        if (!cancelled) {
          setStatus('requesting');
        }
      } catch {
        if (!cancelled) {
          // Model load failed (possibly offline), gracefully degrade
          setStatus('denied');
        }
      }
    };

    loadModels();
    return () => { cancelled = true; };
  }, [enabled]);

  // Request camera access
  useEffect(() => {
    if (status !== 'requesting') return;
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('active');
      } catch {
        if (!cancelled) setStatus('denied');
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [status]);

  // Face detection loop
  useEffect(() => {
    if (status !== 'active' || !enabled) return;

    let lastFaceDetectedAt = Date.now();
    let noFaceLogged = false;
    let multiFaceLogged = false;

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 })
        );

        setFaceCount(detections.length);

        if (detections.length === 0) {
          const msWithoutFace = Date.now() - lastFaceDetectedAt;
          if (msWithoutFace >= MISSING_FACE_THRESHOLD_MS) {
            if (!noFaceLogged) {
              logViolation('face_missing', `Wajah mahasiswa tidak terdeteksi selama ${Math.round(msWithoutFace / 1000)} detik`);
              noFaceLogged = true;
            }
            setStatus('no_face');
          }
          multiFaceLogged = false;
        } else {
          lastFaceDetectedAt = Date.now();
          noFaceLogged = false;

          if (detections.length > 1) {
            if (!multiFaceLogged) {
              logViolation('multiple_faces', `${detections.length} wajah terdeteksi dalam frame kamera`);
              multiFaceLogged = true;
            }
            setStatus('multiple_faces');
          } else {
            multiFaceLogged = false;
            setStatus('ok');
          }
        }
      } catch {
        // detection error, ignore
      }
    }, DETECTION_INTERVAL_MS);

    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (noFaceTimerRef.current) clearTimeout(noFaceTimerRef.current);
    };
  }, [status, enabled, logViolation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    };
  }, []);

  if (!enabled) return null;

  const statusConfig: Record<ProctorStatus, { label: string; color: string; icon: React.ReactNode }> = {
    loading: {
      label: 'Memuat model...',
      color: 'bg-slate-700 border-slate-600',
      icon: <div className="h-3 w-3 rounded-full border-2 border-uir-green-muted border-t-transparent animate-spin" />,
    },
    requesting: {
      label: 'Meminta akses kamera...',
      color: 'bg-slate-700 border-slate-600',
      icon: <Camera className="h-3 w-3 text-uir-green-muted" />,
    },
    active: {
      label: 'Kamera aktif',
      color: 'bg-slate-900/80 border-slate-700',
      icon: <Camera className="h-3 w-3 text-slate-400" />,
    },
    ok: {
      label: 'Wajah terdeteksi ✓',
      color: 'bg-slate-900/80 border-emerald-500/40',
      icon: <CheckCircle className="h-3 w-3 text-emerald-400" />,
    },
    no_face: {
      label: '⚠ Wajah tidak terdeteksi!',
      color: 'bg-red-950/80 border-red-500/60',
      icon: <AlertTriangle className="h-3 w-3 text-red-400 animate-pulse" />,
    },
    multiple_faces: {
      label: '⚠ Multi-wajah terdeteksi!',
      color: 'bg-amber-950/80 border-amber-500/60',
      icon: <AlertTriangle className="h-3 w-3 text-amber-400 animate-pulse" />,
    },
    denied: {
      label: 'Kamera tidak tersedia',
      color: 'bg-slate-800 border-slate-700',
      icon: <CameraOff className="h-3 w-3 text-slate-500" />,
    },
  };

  const cfg = statusConfig[status];

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300 ${cfg.color}`}
      style={{ width: minimized ? 'auto' : 200 }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/60">
        <div className="flex items-center gap-1.5">
          {cfg.icon}
          {!minimized && (
            <span className="text-[10px] font-semibold text-slate-300 truncate max-w-[120px]">{cfg.label}</span>
          )}
        </div>
        <button
          onClick={() => setMinimized(m => !m)}
          className="text-slate-400 hover:text-white transition-colors"
          title={minimized ? 'Perluas' : 'Perkecil'}
        >
          {minimized ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Video feed */}
      {!minimized && (
        <div className="relative bg-slate-950" style={{ height: 150 }}>
          {status === 'denied' ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
              <CameraOff className="h-8 w-8 text-slate-600" />
              <p className="text-[10px] text-slate-500 leading-snug">Izin kamera ditolak. Kuis tetap berjalan namun tanpa pengawasan kamera.</p>
            </div>
          ) : (status === 'loading' || status === 'requesting') ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <div className="h-6 w-6 rounded-full border-2 border-uir-green-muted border-t-transparent animate-spin" />
              <p className="text-[10px] text-slate-400">Menyiapkan kamera...</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
                style={{ transform: 'scaleX(-1)' }} // mirror effect
              />
              <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

              {/* Face count badge */}
              {faceCount !== null && (
                <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                  faceCount === 1 ? 'bg-emerald-600/80 text-white'
                  : faceCount === 0 ? 'bg-red-600/80 text-white'
                  : 'bg-amber-600/80 text-white'
                }`}>
                  {faceCount} wajah
                </div>
              )}

              {/* Status overlay */}
              {(status === 'no_face' || status === 'multiple_faces') && (
                <div className={`absolute inset-0 flex items-center justify-center ${
                  status === 'no_face' ? 'bg-red-950/60' : 'bg-amber-950/60'
                }`}>
                  <AlertTriangle className={`h-8 w-8 animate-pulse ${status === 'no_face' ? 'text-red-400' : 'text-amber-400'}`} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Bottom label for minimized */}
      {minimized && (
        <div className="px-3 py-1.5">
          <span className="text-[9px] font-semibold text-slate-400">Proktor</span>
        </div>
      )}
    </div>
  );
};
