import { supabase } from './supabaseClient';

// ── Interfaces (unchanged) ────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'dosen' | 'mahasiswa';
  class: string;
}

export interface Question {
  id: string;
  subject: string;
  topic: string;
  type: 'multiple_choice' | 'essay' | 'boolean' | 'matching';
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizSession {
  id: string;
  title: string;
  subject: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  attemptLimit: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  timerType: 'per_question' | 'total_session';
  perQuestionSeconds: number;
  accessCode: string;
  isClosed: boolean;
  questions: string[];
}

export interface Attempt {
  id: string;
  quizSessionId: string;
  studentId: string;
  studentName: string;
  startTime: string;
  submitTime?: string;
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
  correctCount: number;
  status: 'in_progress' | 'completed';
}

export interface ActivityLog {
  id: string;
  attemptId: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  type: 'tab_switch' | 'exit_fullscreen' | 'copy_paste' | 'right_click' | 'mouse_leave' | 'devtools' | 'face_missing' | 'multiple_faces';
  details: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'session_open' | 'session_close' | 'score_ready' | 'rank_change' | 'info';
  relatedId?: string;
  read: boolean;
  timestamp: string;
}

export interface StudentStats {
  studentId: string;
  studentName: string;
  studentClass: string;
  totalAttempts: number;
  avgScore: number;
  bestScore: number;
  passCount: number;
  failCount: number;
  violationCount: number;
}

export interface GradeDistribution {
  range: string;
  count: number;
}

export interface QuestionDifficultyAnalysis {
  questionId: string;
  text: string;
  correctRate: number;
  difficulty: 'easy' | 'medium' | 'hard';
  attemptCount: number;
}

// ── ID generation helper ──────────────────────────────────────────────────────
const genId = (prefix: string) => prefix + Math.random().toString(36).substr(2, 9);

// ── Row ↔ Model mappers ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToUser = (r: any): User => ({
  id: r.id, name: r.name, email: r.email, role: r.role, class: r.user_class ?? '',
});
const userToRow = (u: User) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, user_class: u.class,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToQuestion = (r: any): Question => ({
  id: r.id, subject: r.subject, topic: r.topic, type: r.type,
  text: r.text, options: r.options ?? undefined,
  correctAnswer: r.correct_answer, explanation: r.explanation, difficulty: r.difficulty,
});
const questionToRow = (q: Question) => ({
  id: q.id, subject: q.subject, topic: q.topic, type: q.type,
  text: q.text, options: q.options ?? null,
  correct_answer: q.correctAnswer, explanation: q.explanation, difficulty: q.difficulty,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToSession = (r: any): QuizSession => ({
  id: r.id, title: r.title, subject: r.subject,
  startTime: r.start_time, endTime: r.end_time,
  durationMinutes: r.duration_minutes, attemptLimit: r.attempt_limit,
  shuffleQuestions: r.shuffle_questions, shuffleOptions: r.shuffle_options,
  timerType: r.timer_type, perQuestionSeconds: r.per_question_seconds,
  accessCode: r.access_code, isClosed: r.is_closed,
  questions: r.questions ?? [],
});
const sessionToRow = (s: QuizSession) => ({
  id: s.id, title: s.title, subject: s.subject,
  start_time: s.startTime, end_time: s.endTime,
  duration_minutes: s.durationMinutes, attempt_limit: s.attemptLimit,
  shuffle_questions: s.shuffleQuestions, shuffle_options: s.shuffleOptions,
  timer_type: s.timerType, per_question_seconds: s.perQuestionSeconds,
  access_code: s.accessCode, is_closed: s.isClosed,
  questions: s.questions,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToAttempt = (r: any): Attempt => ({
  id: r.id, quizSessionId: r.quiz_session_id,
  studentId: r.student_id, studentName: r.student_name,
  startTime: r.start_time, submitTime: r.submit_time ?? undefined,
  answers: r.answers ?? {}, score: r.score,
  totalQuestions: r.total_questions, correctCount: r.correct_count,
  status: r.status,
});
const attemptToRow = (a: Attempt) => ({
  id: a.id, quiz_session_id: a.quizSessionId,
  student_id: a.studentId, student_name: a.studentName,
  start_time: a.startTime, submit_time: a.submitTime ?? null,
  answers: a.answers, score: a.score,
  total_questions: a.totalQuestions, correct_count: a.correctCount,
  status: a.status,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToLog = (r: any): ActivityLog => ({
  id: r.id, attemptId: r.attempt_id,
  studentId: r.student_id, studentName: r.student_name,
  timestamp: r.timestamp, type: r.type, details: r.details,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToNotification = (r: any): Notification => ({
  id: r.id, userId: r.user_id,
  title: r.title, message: r.message, type: r.type,
  relatedId: r.related_id ?? undefined, read: r.read,
  timestamp: r.timestamp,
});

// ── Current user (still in localStorage for session persistence) ─────────────
const CURRENT_USER_KEY = 'wqk_current_user';
export const dbGetCurrentUser = (): User | null => {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
};
export const dbSetCurrentUser = (user: User | null): void => {
  if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(CURRENT_USER_KEY);
};

// ── USER OPERATIONS ──────────────────────────────────────────────────────────
export const dbGetUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return (data ?? []).map(rowToUser);
};

export const dbRegisterUser = async (name: string, email: string, role: 'dosen' | 'mahasiswa', className: string): Promise<User> => {
  // Check if user with this email already exists
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .limit(1);

  if (existing && existing.length > 0) return rowToUser(existing[0]);

  const newUser: User = { id: genId('u_'), name, email, role, class: className };
  const { error } = await supabase.from('users').insert(userToRow(newUser));
  if (error) throw error;
  return newUser;
};

// ── QUESTION OPERATIONS ─────────────────────────────────────────────────────
export const dbGetQuestions = async (): Promise<Question[]> => {
  const { data, error } = await supabase.from('questions').select('*');
  if (error) throw error;
  return (data ?? []).map(rowToQuestion);
};

export const dbSaveQuestion = async (q: Omit<Question, 'id'> & { id?: string }): Promise<Question> => {
  const finalQ: Question = { ...q, id: q.id || genId('q_') } as Question;
  const { error } = await supabase.from('questions').upsert(questionToRow(finalQ));
  if (error) throw error;
  return finalQ;
};

export const dbDeleteQuestion = async (id: string): Promise<void> => {
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) throw error;
};

export const dbBulkUploadQuestions = async (csvText: string): Promise<{ successCount: number; errors: string[] }> => {
  const lines = csvText.split('\n');
  if (lines.length <= 1) return { successCount: 0, errors: ['File kosong atau format salah'] };

  const toInsert: Question[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols: string[] = [];
    let insideQuote = false;
    let currentColumn = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') insideQuote = !insideQuote;
      else if (char === ',' && !insideQuote) { cols.push(currentColumn.trim()); currentColumn = ''; }
      else currentColumn += char;
    }
    cols.push(currentColumn.trim());

    if (cols.length < 7) { errors.push(`Baris ${i + 1}: Kolom kurang lengkap.`); continue; }

    const [subject, topic, type, text, optionsRaw, correctAnswer, explanation, difficulty] = cols;
    if (!subject || !topic || !text || !correctAnswer) { errors.push(`Baris ${i + 1}: Kolom wajib kosong.`); continue; }

    const validTypes = ['multiple_choice', 'essay', 'boolean', 'matching'];
    if (!validTypes.includes(type)) { errors.push(`Baris ${i + 1}: Tipe soal "${type}" tidak valid.`); continue; }

    const cleanDifficulty = ['easy', 'medium', 'hard'].includes(difficulty?.toLowerCase())
      ? (difficulty.toLowerCase() as 'easy' | 'medium' | 'hard') : 'medium';

    toInsert.push({
      id: genId('q_'), subject, topic,
      type: type as Question['type'],
      text: text.replace(/^"|"$/g, '').trim(),
      options: (type === 'multiple_choice' || type === 'matching') ? optionsRaw.split(';').map(o => o.trim()) : undefined,
      correctAnswer: correctAnswer.replace(/^"|"$/g, '').trim(),
      explanation: explanation ? explanation.replace(/^"|"$/g, '').trim() : '',
      difficulty: cleanDifficulty,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('questions').insert(toInsert.map(questionToRow));
    if (error) throw error;
  }

  return { successCount: toInsert.length, errors };
};

// ── QUIZ SESSION OPERATIONS ─────────────────────────────────────────────────
export const dbGetSessions = async (): Promise<QuizSession[]> => {
  const { data, error } = await supabase.from('quiz_sessions').select('*');
  if (error) throw error;
  return (data ?? []).map(rowToSession);
};

export const dbSaveSession = async (s: Omit<QuizSession, 'id'> & { id?: string }): Promise<QuizSession> => {
  const finalS: QuizSession = { ...s, id: s.id || genId('s_') } as QuizSession;
  const { error } = await supabase.from('quiz_sessions').upsert(sessionToRow(finalS));
  if (error) throw error;
  return finalS;
};

export const dbDeleteSession = async (id: string): Promise<void> => {
  const { error } = await supabase.from('quiz_sessions').delete().eq('id', id);
  if (error) throw error;
};

// ── QUIZ ATTEMPT OPERATIONS ─────────────────────────────────────────────────
export const dbGetAttempts = async (): Promise<Attempt[]> => {
  const { data, error } = await supabase.from('attempts').select('*');
  if (error) throw error;
  return (data ?? []).map(rowToAttempt);
};

export const dbStartAttempt = async (
  quizSessionId: string, studentId: string, studentName: string,
  sessions: QuizSession[], attempts: Attempt[]
): Promise<Attempt> => {
  const session = sessions.find(s => s.id === quizSessionId);
  if (!session) throw new Error('Sesi kuis tidak ditemukan.');

  const pastAttempts = attempts.filter(a => a.quizSessionId === quizSessionId && a.studentId === studentId);
  if (session.attemptLimit > 0 && pastAttempts.length >= session.attemptLimit) {
    throw new Error(`Anda telah melampaui batas pengerjaan (${session.attemptLimit}x).`);
  }

  const newAttempt: Attempt = {
    id: genId('att_'), quizSessionId, studentId, studentName,
    startTime: new Date().toISOString(),
    answers: {}, score: 0,
    totalQuestions: session.questions.length, correctCount: 0,
    status: 'in_progress',
  };

  const { error } = await supabase.from('attempts').insert(attemptToRow(newAttempt));
  if (error) throw error;
  return newAttempt;
};

export const dbSaveAttemptAnswers = async (attemptId: string, answers: Record<string, string>): Promise<void> => {
  const { error } = await supabase
    .from('attempts')
    .update({ answers })
    .eq('id', attemptId);
  if (error) throw error;
};

export const dbSubmitAttempt = async (
  attemptId: string, sessions: QuizSession[], questions: Question[], attempts: Attempt[]
): Promise<Attempt> => {
  const attempt = attempts.find(a => a.id === attemptId);
  if (!attempt) throw new Error('Pengerjaan tidak ditemukan.');
  if (attempt.status === 'completed') return attempt;

  const session = sessions.find(s => s.id === attempt.quizSessionId);
  if (!session) throw new Error('Sesi kuis tidak ditemukan.');

  let correctCount = 0;
  session.questions.forEach(qId => {
    const q = questions.find(item => item.id === qId);
    if (!q) return;

    if (q.type === 'matching') {
      try {
        const correctMap: Record<string, string> = JSON.parse(q.correctAnswer);
        const studentMap: Record<string, string> = attempt.answers[qId] ? JSON.parse(attempt.answers[qId]) : {};
        const pairCount = Object.keys(correctMap).length;
        if (pairCount === 0) return;
        let correctPairs = 0;
        Object.entries(correctMap).forEach(([key, val]) => {
          if ((studentMap[key] || '').trim().toLowerCase() === val.trim().toLowerCase()) correctPairs++;
        });
        if (correctPairs === pairCount) correctCount++;
      } catch { /* invalid JSON */ }
    } else {
      const studentAns = (attempt.answers[qId] || '').trim().toLowerCase();
      const correctAns = q.correctAnswer.trim().toLowerCase();
      if (studentAns === correctAns) correctCount++;
    }
  });

  const finalScore = attempt.totalQuestions > 0 ? Math.round((correctCount / attempt.totalQuestions) * 100) : 0;

  const updatedAttempt: Attempt = {
    ...attempt,
    status: 'completed',
    submitTime: new Date().toISOString(),
    correctCount,
    score: finalScore,
  };

  const { error } = await supabase.from('attempts')
    .update({
      status: 'completed',
      submit_time: updatedAttempt.submitTime,
      correct_count: correctCount,
      score: finalScore,
    })
    .eq('id', attemptId);
  if (error) throw error;
  return updatedAttempt;
};

// ── ACTIVITY LOG OPERATIONS ─────────────────────────────────────────────────
export const dbGetLogs = async (): Promise<ActivityLog[]> => {
  const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToLog);
};

export const dbAddActivityLog = async (
  attemptId: string, studentId: string, studentName: string,
  type: ActivityLog['type'], details: string
): Promise<ActivityLog> => {
  const newLog: ActivityLog = {
    id: genId('log_'), attemptId, studentId, studentName,
    timestamp: new Date().toISOString(), type, details,
  };
  const { error } = await supabase.from('activity_logs').insert({
    id: newLog.id, attempt_id: attemptId, student_id: studentId,
    student_name: studentName, timestamp: newLog.timestamp,
    type, details,
  });
  if (error) throw error;
  return newLog;
};

// ── NOTIFICATION OPERATIONS ─────────────────────────────────────────────────
export const dbGetNotifications = async (userId?: string): Promise<Notification[]> => {
  let query = supabase.from('notifications').select('*').order('timestamp', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToNotification);
};

export const dbAddNotification = async (n: Omit<Notification, 'id' | 'read' | 'timestamp'>): Promise<Notification> => {
  const newN: Notification = {
    ...n, id: genId('notif_'), read: false, timestamp: new Date().toISOString(),
  };
  const { error } = await supabase.from('notifications').insert({
    id: newN.id, user_id: n.userId, title: n.title, message: n.message,
    type: n.type, related_id: n.relatedId ?? null,
    read: false, timestamp: newN.timestamp,
  });
  if (error) throw error;
  return newN;
};

export const dbMarkNotificationRead = async (id: string): Promise<void> => {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
};

export const dbMarkAllNotificationsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  if (error) throw error;
};

export const dbDeleteNotification = async (id: string): Promise<void> => {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
};

export const dbBroadcastSessionNotification = async (
  session: QuizSession, type: 'session_open' | 'session_close',
  users: User[]
): Promise<void> => {
  const mahasiswa = users.filter(u => u.role === 'mahasiswa');
  const batch = mahasiswa.map(u => ({
    id: genId('notif_'),
    user_id: u.id,
    title: type === 'session_open' ? '🎯 Sesi Kuis Baru Dibuka!' : '🔒 Sesi Kuis Ditutup',
    message: type === 'session_open'
      ? `"${session.title}" kini tersedia. Kode akses: ${session.accessCode}`
      : `Sesi "${session.title}" telah ditutup oleh dosen.`,
    type,
    related_id: session.id,
    read: false,
    timestamp: new Date().toISOString(),
  }));
  if (batch.length > 0) {
    const { error } = await supabase.from('notifications').insert(batch);
    if (error) throw error;
  }
};

// ── COMPUTED ANALYTICS (from cached data) ────────────────────────────────────
export const computeStudentStats = (users: User[], attempts: Attempt[], logs: ActivityLog[]): StudentStats[] => {
  const students = users.filter(u => u.role === 'mahasiswa');
  return students.map(u => {
    const myAttempts = attempts.filter(a => a.studentId === u.id && a.status === 'completed');
    const scores = myAttempts.map(a => a.score);
    const myLogs = logs.filter(l => l.studentId === u.id);
    return {
      studentId: u.id, studentName: u.name, studentClass: u.class,
      totalAttempts: myAttempts.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      bestScore: scores.length > 0 ? Math.max(...scores) : 0,
      passCount: scores.filter(s => s >= 60).length,
      failCount: scores.filter(s => s < 60).length,
      violationCount: myLogs.length,
    };
  });
};

export const computeGradeDistribution = (attempts: Attempt[], sessionId: string): GradeDistribution[] => {
  const sessionAttempts = attempts.filter(a => a.quizSessionId === sessionId && a.status === 'completed');
  const distribution = [
    { range: '0-20', count: 0 }, { range: '21-40', count: 0 },
    { range: '41-60', count: 0 }, { range: '61-80', count: 0 }, { range: '81-100', count: 0 },
  ];
  sessionAttempts.forEach(a => {
    if (a.score <= 20) distribution[0].count++;
    else if (a.score <= 40) distribution[1].count++;
    else if (a.score <= 60) distribution[2].count++;
    else if (a.score <= 80) distribution[3].count++;
    else distribution[4].count++;
  });
  return distribution;
};

export const computeQuestionAnalysis = (
  sessions: QuizSession[], questions: Question[], attempts: Attempt[], sessionId: string
): QuestionDifficultyAnalysis[] => {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return [];

  const completed = attempts.filter(a => a.quizSessionId === sessionId && a.status === 'completed');

  return session.questions.map(qId => {
    const q = questions.find(item => item.id === qId);
    const qText = q ? q.text : 'Soal tidak ditemukan';
    const qDiff = q ? q.difficulty : 'medium';

    let correctCount = 0;
    let attemptCount = 0;

    completed.forEach(a => {
      const studentAns = (a.answers[qId] || '').trim().toLowerCase();
      const correctAns = q ? q.correctAnswer.trim().toLowerCase() : '';
      if (studentAns) {
        attemptCount++;
        if (studentAns === correctAns) correctCount++;
      }
    });

    return {
      questionId: qId, text: qText, correctRate: attemptCount > 0 ? Math.round((correctCount / attemptCount) * 100) : 0,
      difficulty: qDiff, attemptCount,
    };
  });
};

// ── Legacy initDB (no-op) ────────────────────────────────────────────────────
export const initDB = () => { /* no-op — data lives in Supabase now */ };
