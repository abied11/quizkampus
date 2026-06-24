import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  dbMarkNotificationRead, dbMarkAllNotificationsRead, dbDeleteNotification
} from '../dbService';
import type { Notification, User } from '../dbService';
import { Bell, X, CheckCheck, Calendar, Trophy, Info, Lock, Trash2 } from 'lucide-react';
import { useAppContext } from '../AppContext';

interface NotificationBellProps {
  user: User;
}

const notifIcon = (type: Notification['type']) => {
  switch (type) {
    case 'session_open':  return <Calendar className="h-4 w-4 text-uir-green-muted" />;
    case 'session_close': return <Lock className="h-4 w-4 text-slate-400" />;
    case 'score_ready':   return <Trophy className="h-4 w-4 text-emerald-400" />;
    case 'rank_change':   return <Trophy className="h-4 w-4 text-amber-400" />;
    default:              return <Info className="h-4 w-4 text-uir-yellow-gold" />;
  }
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ user }) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { notifications, refreshNotifications } = useAppContext();

  const notifs = useMemo(() => {
    return notifications
      .filter(n => n.userId === user.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, user.id]);

  useEffect(() => {
    refreshNotifications(user.id);
    const interval = setInterval(() => {
      refreshNotifications(user.id);
    }, 15000);
    return () => clearInterval(interval);
  }, [user.id, refreshNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifs.filter(n => !n.read).length;

  const handleRead = async (id: string) => {
    try {
      await dbMarkNotificationRead(id);
      await refreshNotifications(user.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReadAll = async () => {
    try {
      await dbMarkAllNotificationsRead(user.id);
      await refreshNotifications(user.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await dbDeleteNotification(id);
      await refreshNotifications(user.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) refreshNotifications(user.id); }}
        className="relative p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        title="Notifikasi"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 items-center justify-center text-[8px] font-black text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 animate-scale-in">
          <div className="glass rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-uir-yellow-gold" />
                <span className="text-sm font-bold text-white">Notifikasi</span>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-uir-green-medium text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={handleReadAll}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/20 transition-colors"
                    title="Tandai semua dibaca"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Tandai semua
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
              {notifs.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-medium">Tidak ada notifikasi</p>
                  <p className="text-xs text-slate-500 mt-1">Notifikasi baru akan muncul di sini</p>
                </div>
              ) : (
                notifs.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleRead(n.id)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-800/40 group ${
                      !n.read ? 'bg-uir-green-darker/30' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                      !n.read ? 'bg-slate-800' : 'bg-slate-900/50'
                    }`}>
                      {notifIcon(n.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-tight ${!n.read ? 'text-white' : 'text-slate-300'}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {timeAgo(n.timestamp)}
                      </p>
                    </div>

                    {/* Unread indicator + delete */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      {!n.read && (
                        <div className="h-2 w-2 rounded-full bg-uir-yellow-gold mt-1" />
                      )}
                      <button
                        onClick={e => handleDelete(e, n.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 text-slate-500 transition-all"
                        title="Hapus notifikasi"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
