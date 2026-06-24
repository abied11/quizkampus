import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  dbGetUsers, dbGetQuestions, dbGetSessions, dbGetAttempts, dbGetLogs, dbGetNotifications,
} from './dbService';
import type {
  User, Question, QuizSession, Attempt, ActivityLog, Notification,
} from './dbService';

interface AppContextType {
  // Data
  users: User[];
  questions: Question[];
  sessions: QuizSession[];
  attempts: Attempt[];
  logs: ActivityLog[];
  notifications: Notification[];
  // Loading state
  loading: boolean;
  // Refresh methods
  refreshUsers: () => Promise<void>;
  refreshQuestions: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  refreshAttempts: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  refreshNotifications: (userId?: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUsers = useCallback(async () => {
    try { setUsers(await dbGetUsers()); } catch (e) { console.error('refreshUsers', e); }
  }, []);

  const refreshQuestions = useCallback(async () => {
    try { setQuestions(await dbGetQuestions()); } catch (e) { console.error('refreshQuestions', e); }
  }, []);

  const refreshSessions = useCallback(async () => {
    try { setSessions(await dbGetSessions()); } catch (e) { console.error('refreshSessions', e); }
  }, []);

  const refreshAttempts = useCallback(async () => {
    try { setAttempts(await dbGetAttempts()); } catch (e) { console.error('refreshAttempts', e); }
  }, []);

  const refreshLogs = useCallback(async () => {
    try { setLogs(await dbGetLogs()); } catch (e) { console.error('refreshLogs', e); }
  }, []);

  const refreshNotifications = useCallback(async (userId?: string) => {
    try { setNotifications(await dbGetNotifications(userId)); } catch (e) { console.error('refreshNotifications', e); }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      refreshUsers(), refreshQuestions(), refreshSessions(),
      refreshAttempts(), refreshLogs(), refreshNotifications(),
    ]);
    setLoading(false);
  }, [refreshUsers, refreshQuestions, refreshSessions, refreshAttempts, refreshLogs, refreshNotifications]);

  // Initial load
  useEffect(() => { refreshAll(); }, [refreshAll]);

  return (
    <AppContext.Provider value={{
      users, questions, sessions, attempts, logs, notifications,
      loading,
      refreshUsers, refreshQuestions, refreshSessions,
      refreshAttempts, refreshLogs, refreshNotifications, refreshAll,
    }}>
      {children}
    </AppContext.Provider>
  );
};
