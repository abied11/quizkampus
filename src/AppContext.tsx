import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  dbGetUsers, dbGetQuestions, dbGetSessions, dbGetAttempts, dbGetLogs, dbGetNotifications, dbGetPackages
} from './dbService';
import type {
  User, Question, QuizSession, Attempt, ActivityLog, Notification, QuestionPackage
} from './dbService';
import { supabase } from './supabaseClient';

interface AppContextType {
  // Data
  users: User[];
  questions: Question[];
  sessions: QuizSession[];
  attempts: Attempt[];
  logs: ActivityLog[];
  notifications: Notification[];
  packages: QuestionPackage[];
  // Loading state
  loading: boolean;
  // Refresh methods
  refreshUsers: () => Promise<void>;
  refreshQuestions: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  refreshAttempts: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  refreshNotifications: (userId?: string) => Promise<void>;
  refreshPackages: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export { AppContext };

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
  const [packages, setPackages] = useState<QuestionPackage[]>([]);
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

  const refreshPackages = useCallback(async () => {
    try { setPackages(await dbGetPackages()); } catch (e) { console.error('refreshPackages', e); }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      refreshUsers(), refreshQuestions(), refreshSessions(),
      refreshAttempts(), refreshLogs(), refreshNotifications(), refreshPackages()
    ]);
    setLoading(false);
  }, [refreshUsers, refreshQuestions, refreshSessions, refreshAttempts, refreshLogs, refreshNotifications, refreshPackages]);

  // Initial load
  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Realtime updates for live mode & monitor
  useEffect(() => {
    const channel = supabase
      .channel('quiz-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_sessions' }, () => {
        refreshSessions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' }, () => {
        refreshAttempts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_packages' }, () => {
        refreshPackages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshSessions, refreshAttempts]);

  return (
    <AppContext.Provider value={{
      users, questions, sessions, attempts, logs, notifications, packages,
      loading,
      refreshUsers, refreshQuestions, refreshSessions,
      refreshAttempts, refreshLogs, refreshNotifications, refreshPackages, refreshAll,
    }}>
      {children}
    </AppContext.Provider>
  );
};
