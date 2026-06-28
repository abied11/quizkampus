import { supabase } from './supabaseClient';
import { computeSpeedBonus, isAnswerCorrect, xpForAttempt } from './utils/scoring';

// ── Interfaces (unchanged) ────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'dosen' | 'mahasiswa';
  class: string;
  xp?: number;
  badges?: string[];
  profilePhotoUrl?: string;
  bio?: string;
  phone?: string;
}

export type SessionMode = 'exam' | 'live' | 'homework' | 'practice' | 'poll';
export type LivePhase = 'waiting' | 'question' | 'reveal' | 'leaderboard' | 'finished';
export type ExplanationMode = 'never' | 'after_each' | 'after_submit';
export type AttemptType = 'exam' | 'practice' | 'live' | 'homework' | 'poll';

export interface Question {
  id: string;
  subject: string;
  topic: string;
  type: 'multiple_choice' | 'essay' | 'boolean' | 'matching' | 'poll';
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuestionPackage {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdBy: string;
  createdAt: string;
  questions: string[];
}

export interface Report {
  id: string;
  userId: string;
  type: 'bug' | 'feedback' | 'question_error' | 'other';
  message: string;
  status: 'pending' | 'resolved';
  timestamp: string;
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
  isPublic: boolean;
  sessionMode: SessionMode;
  livePhase: LivePhase;
  currentQuestionIndex: number;
  proctorEnabled: boolean;
  showExplanationMode: ExplanationMode;
  speedBonusEnabled: boolean;
  adaptiveEnabled: boolean;
  teamsEnabled: boolean;
  hostId?: string;
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
  attemptType: AttemptType;
  bonusPoints: number;
  answersMeta: Record<string, { answeredAt: string; timeSpentMs: number }>;
  teamId?: string;
  teamName?: string;
  adaptivePath: string[];
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
  xp: r.xp ?? 0, badges: r.badges ?? [],
  profilePhotoUrl: r.profile_photo_url ?? undefined,
  bio: r.bio ?? '',
  phone: r.phone ?? '',
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
  isPublic: r.is_public ?? false,
  sessionMode: r.session_mode ?? 'exam',
  livePhase: r.live_phase ?? 'waiting',
  currentQuestionIndex: r.current_question_index ?? 0,
  proctorEnabled: r.proctor_enabled ?? true,
  showExplanationMode: r.show_explanation_mode ?? 'after_submit',
  speedBonusEnabled: r.speed_bonus_enabled ?? false,
  adaptiveEnabled: r.adaptive_enabled ?? false,
  teamsEnabled: r.teams_enabled ?? false,
  hostId: r.host_id ?? undefined,
});
const sessionToRow = (s: QuizSession) => ({
  id: s.id, title: s.title, subject: s.subject,
  start_time: s.startTime, end_time: s.endTime,
  duration_minutes: s.durationMinutes, attempt_limit: s.attemptLimit,
  shuffle_questions: s.shuffleQuestions, shuffle_options: s.shuffleOptions,
  timer_type: s.timerType, per_question_seconds: s.perQuestionSeconds,
  access_code: s.accessCode, is_closed: s.isClosed,
  questions: s.questions,
  is_public: s.isPublic,
  session_mode: s.sessionMode,
  live_phase: s.livePhase,
  current_question_index: s.currentQuestionIndex,
  proctor_enabled: s.proctorEnabled,
  show_explanation_mode: s.showExplanationMode,
  speed_bonus_enabled: s.speedBonusEnabled,
  adaptive_enabled: s.adaptiveEnabled,
  teams_enabled: s.teamsEnabled,
  host_id: s.hostId ?? null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToPackage = (r: any): QuestionPackage => ({
  id: r.id, title: r.title, description: r.description,
  imageUrl: r.image_url ?? undefined, createdBy: r.created_by,
  createdAt: r.created_at, questions: r.questions ?? [],
});
const packageToRow = (p: QuestionPackage) => ({
  id: p.id, title: p.title, description: p.description,
  image_url: p.imageUrl ?? null, created_by: p.createdBy,
  created_at: p.createdAt, questions: p.questions,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToReport = (r: any): Report => ({
  id: r.id, userId: r.user_id, type: r.type,
  message: r.message, status: r.status, timestamp: r.timestamp,
});
const reportToRow = (rep: Report) => ({
  id: rep.id, user_id: rep.userId, type: rep.type,
  message: rep.message, status: rep.status, timestamp: rep.timestamp,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToAttempt = (r: any): Attempt => ({
  id: r.id, quizSessionId: r.quiz_session_id,
  studentId: r.student_id, studentName: r.student_name,
  startTime: r.start_time, submitTime: r.submit_time ?? undefined,
  answers: r.answers ?? {}, score: r.score,
  totalQuestions: r.total_questions, correctCount: r.correct_count,
  status: r.status,
  attemptType: r.attempt_type ?? 'exam',
  bonusPoints: r.bonus_points ?? 0,
  answersMeta: r.answers_meta ?? {},
  teamId: r.team_id ?? undefined,
  teamName: r.team_name ?? undefined,
  adaptivePath: r.adaptive_path ?? [],
});
const attemptToRow = (a: Attempt) => ({
  id: a.id, quiz_session_id: a.quizSessionId,
  student_id: a.studentId, student_name: a.studentName,
  start_time: a.startTime, submit_time: a.submitTime ?? null,
  answers: a.answers, score: a.score,
  total_questions: a.totalQuestions, correct_count: a.correctCount,
  status: a.status,
  attempt_type: a.attemptType,
  bonus_points: a.bonusPoints,
  answers_meta: a.answersMeta,
  team_id: a.teamId ?? null,
  team_name: a.teamName ?? null,
  adaptive_path: a.adaptivePath,
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

// ── Password hashing (SHA-256 with email salt) ───────────────────────────────
const toAuthError = (err: unknown, fallback: string): Error => {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: unknown }).message);
    const code = 'code' in err ? String((err as { code: unknown }).code) : '';
    if (code === '42703' || msg.includes('password_hash')) {
      return new Error(
        'Database belum diupdate. Buka Supabase Dashboard → SQL Editor, lalu jalankan isi file supabase_migration_password.sql.',
      );
    }
    return new Error(msg || fallback);
  }
  return new Error(fallback);
};

const hashPassword = async (email: string, password: string): Promise<string> => {
  const data = new TextEncoder().encode(`${email.trim().toLowerCase()}:${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

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
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, user_class, xp, badges, profile_photo_url, bio, phone');
  if (error) throw error;
  return (data ?? []).map(rowToUser);
};

export const dbGetUserById = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, user_class, xp, badges, profile_photo_url, bio, phone')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToUser(data) : null;
};

export const dbGetUsersByIds = async (userIds: string[]): Promise<User[]> => {
  if (!userIds.length) return [];
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, user_class, xp, badges, profile_photo_url, bio, phone')
    .in('id', userIds);
  if (error) throw error;
  return (data ?? []).map(rowToUser);
};

export interface GlobalLeaderboardEntry {
  user: User;
  totalQuizzes: number;
  avgScore: number;
  bestScore: number;
  totalCorrect: number;
  rank: number;
}

export const dbGetGlobalLeaderboard = async (): Promise<GlobalLeaderboardEntry[]> => {
  // Fetch all users with xp
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, name, email, role, user_class, xp, badges, profile_photo_url, bio, phone')
    .eq('role', 'mahasiswa')
    .order('xp', { ascending: false });
  if (uErr) throw uErr;

  // Fetch completed attempts for stats
  const { data: attempts, error: aErr } = await supabase
    .from('attempts')
    .select('student_id, score, correct_count, total_questions')
    .eq('status', 'completed');
  if (aErr) throw aErr;

  const attemptMap: Record<string, { scores: number[]; correct: number }> = {};
  for (const a of (attempts ?? [])) {
    if (!attemptMap[a.student_id]) {
      attemptMap[a.student_id] = { scores: [], correct: 0 };
    }
    attemptMap[a.student_id].scores.push(a.score);
    attemptMap[a.student_id].correct += a.correct_count;
  }

  return (users ?? []).map((u, idx) => {
    const mapped = rowToUser(u);
    const stats = attemptMap[u.id];
    const scores = stats?.scores ?? [];
    return {
      user: mapped,
      totalQuizzes: scores.length,
      avgScore: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0,
      bestScore: scores.length ? Math.max(...scores) : 0,
      totalCorrect: stats?.correct ?? 0,
      rank: idx + 1,
    };
  });
};

export interface PublicProfileData {
  user: User;
  totalQuizzes: number;
  avgScore: number;
  bestScore: number;
  totalCorrect: number;
  recentAttempts: { sessionTitle: string; score: number; submitTime: string; correct: number; total: number }[];
}

export const dbGetPublicProfile = async (userId: string): Promise<PublicProfileData | null> => {
  const user = await dbGetUserById(userId);
  if (!user) return null;

  const { data: attempts } = await supabase
    .from('attempts')
    .select('score, correct_count, total_questions, submit_time, quiz_session_id')
    .eq('student_id', userId)
    .eq('status', 'completed')
    .order('submit_time', { ascending: false })
    .limit(20);

  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id, title');

  const sessionMap: Record<string, string> = {};
  (sessions ?? []).forEach((s: { id: string; title: string }) => { sessionMap[s.id] = s.title; });

  const allAttempts = attempts ?? [];
  const scores = allAttempts.map(a => a.score);

  return {
    user,
    totalQuizzes: scores.length,
    avgScore: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0,
    bestScore: scores.length ? Math.max(...scores) : 0,
    totalCorrect: allAttempts.reduce((s, a) => s + (a.correct_count ?? 0), 0),
    recentAttempts: allAttempts.slice(0, 5).map(a => ({
      sessionTitle: sessionMap[a.quiz_session_id] ?? 'Unknown',
      score: a.score,
      submitTime: a.submit_time ?? '',
      correct: a.correct_count ?? 0,
      total: a.total_questions ?? 0,
    })),
  };
};

export const dbUpdateUserProfile = async (
  userId: string,
  patch: { name: string; class: string; bio?: string; phone?: string },
): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .update({
      name: patch.name,
      user_class: patch.class,
      bio: patch.bio ?? '',
      phone: patch.phone ?? '',
    })
    .eq('id', userId)
    .select('id, name, email, role, user_class, xp, badges, profile_photo_url, bio, phone')
    .single();
  if (error) throw toAuthError(error, 'Gagal memperbarui profil.');
  return rowToUser(data);
};

export const dbUploadProfilePhoto = async (userId: string, file: File): Promise<string> => {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    if (uploadError.message.includes('Bucket not found')) {
      throw new Error('Bucket foto belum dibuat. Jalankan supabase_migration_profile.sql di Supabase.');
    }
    throw new Error(uploadError.message);
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from('users')
    .update({ profile_photo_url: publicUrl })
    .eq('id', userId);

  if (updateError) throw toAuthError(updateError, 'Gagal menyimpan URL foto.');

  return publicUrl;
};

export const dbLoginUser = async (email: string, password: string): Promise<User> => {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', normalizedEmail)
    .limit(1);

  if (error) throw toAuthError(error, 'Gagal masuk.');
  if (!data || data.length === 0) throw new Error('Email atau password salah.');

  const row = data[0];
  if (!row.password_hash) throw new Error('Akun ini belum memiliki password. Silakan daftar ulang atau hubungi admin.');

  const hash = await hashPassword(normalizedEmail, password);
  if (row.password_hash !== hash) throw new Error('Email atau password salah.');

  return rowToUser(row);
};

export const dbRegisterUser = async (
  name: string,
  email: string,
  password: string,
  role: 'dosen' | 'mahasiswa',
  className: string,
): Promise<User> => {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .ilike('email', normalizedEmail)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error('Email sudah terdaftar. Silakan masuk dengan akun Anda.');
  }

  if (password.length < 6) {
    throw new Error('Password minimal 6 karakter.');
  }

  const passwordHash = await hashPassword(normalizedEmail, password);
  const newUser: User = { id: genId('u_'), name, email: normalizedEmail, role, class: className };
  const { error } = await supabase.from('users').insert({
    ...userToRow(newUser),
    password_hash: passwordHash,
  });
  if (error) throw toAuthError(error, 'Gagal mendaftar.');
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
  sessions: QuizSession[], attempts: Attempt[],
  opts?: { teamName?: string; forceType?: AttemptType },
): Promise<Attempt> => {
  const session = sessions.find(s => s.id === quizSessionId);
  if (!session) throw new Error('Sesi kuis tidak ditemukan.');

  const attemptType: AttemptType = opts?.forceType ?? (
    session.sessionMode === 'practice' ? 'practice'
    : session.sessionMode === 'live' ? 'live'
    : session.sessionMode === 'homework' ? 'homework'
    : session.sessionMode === 'poll' ? 'poll'
    : 'exam'
  );

  const pastAttempts = attempts.filter(
    a => a.quizSessionId === quizSessionId && a.studentId === studentId && a.attemptType !== 'practice',
  );
  if (session.attemptLimit > 0 && attemptType !== 'practice' && pastAttempts.length >= session.attemptLimit) {
    throw new Error(`Anda telah melampaui batas pengerjaan (${session.attemptLimit}x).`);
  }

  const newAttempt: Attempt = {
    id: genId('att_'), quizSessionId, studentId, studentName,
    startTime: new Date().toISOString(),
    answers: {}, score: 0,
    totalQuestions: session.questions.length, correctCount: 0,
    status: 'in_progress',
    attemptType,
    bonusPoints: 0,
    answersMeta: {},
    teamName: opts?.teamName,
    teamId: opts?.teamName ? `team_${opts.teamName.toLowerCase().replace(/\s+/g, '_')}` : undefined,
    adaptivePath: [],
  };

  const { error } = await supabase.from('attempts').insert(attemptToRow(newAttempt));
  if (error) throw toAuthError(error, 'Gagal memulai kuis.');
  return newAttempt;
};

export const dbSaveAttemptAnswers = async (
  attemptId: string,
  answers: Record<string, string>,
  answersMeta?: Record<string, { answeredAt: string; timeSpentMs: number }>,
): Promise<void> => {
  const payload: Record<string, unknown> = { answers, last_heartbeat: new Date().toISOString() };
  if (answersMeta) payload.answers_meta = answersMeta;
  const { error } = await supabase.from('attempts').update(payload).eq('id', attemptId);
  if (error) throw error;
};

export const dbUpdateLiveSession = async (
  sessionId: string,
  patch: Partial<Pick<QuizSession, 'livePhase' | 'currentQuestionIndex' | 'isClosed' | 'hostId'>>,
): Promise<void> => {
  const row: Record<string, unknown> = {};
  if (patch.livePhase !== undefined) row.live_phase = patch.livePhase;
  if (patch.currentQuestionIndex !== undefined) row.current_question_index = patch.currentQuestionIndex;
  if (patch.isClosed !== undefined) row.is_closed = patch.isClosed;
  if (patch.hostId !== undefined) row.host_id = patch.hostId;
  const { error } = await supabase.from('quiz_sessions').update(row).eq('id', sessionId);
  if (error) throw error;
};

export const dbGetPollResults = async (
  sessionId: string,
  questionId: string,
  attempts: Attempt[],
): Promise<{ option: string; count: number; pct: number }[]> => {
  const sessionAttempts = attempts.filter(
    a => a.quizSessionId === sessionId && a.status === 'completed',
  );
  const counts: Record<string, number> = {};
  let total = 0;
  sessionAttempts.forEach(a => {
    const ans = a.answers[questionId];
    if (ans) {
      counts[ans] = (counts[ans] || 0) + 1;
      total++;
    }
  });
  return Object.entries(counts)
    .map(([option, count]) => ({ option, count, pct: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
};

export const dbAwardUserXP = async (
  userId: string,
  xpGain: number,
  newBadges: string[],
): Promise<void> => {
  const { data } = await supabase.from('users').select('xp, badges').eq('id', userId).single();
  if (!data) return;
  const currentBadges: string[] = data.badges ?? [];
  const mergedBadges = [...new Set([...currentBadges, ...newBadges])];
  const { error } = await supabase.from('users').update({
    xp: (data.xp ?? 0) + xpGain,
    badges: mergedBadges,
  }).eq('id', userId);
  if (error) console.error('awardXP', error);
};

export const dbGetFlashcardDue = async (userId: string, questions: Question[]): Promise<Question[]> => {
  const { data, error } = await supabase
    .from('flashcard_progress')
    .select('question_id, next_review')
    .eq('user_id', userId);
  if (error) return questions.slice(0, 20);
  const dueIds = new Set(
    (data ?? [])
      .filter(r => new Date(r.next_review) <= new Date())
      .map(r => r.question_id),
  );
  const due = questions.filter(q => dueIds.has(q.id));
  return due.length > 0 ? due : questions.slice(0, 10);
};

export const dbUpdateFlashcardProgress = async (
  userId: string,
  questionId: string,
  quality: 'easy' | 'hard' | 'again',
): Promise<void> => {
  const { data: existing } = await supabase
    .from('flashcard_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle();

  const intervals = { again: 1, hard: 3, easy: 7 };
  const days = intervals[quality];
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + days);

  if (existing) {
    await supabase.from('flashcard_progress').update({
      interval_days: days,
      next_review: nextReview.toISOString(),
      review_count: (existing.review_count ?? 0) + 1,
    }).eq('id', existing.id);
  } else {
    await supabase.from('flashcard_progress').insert({
      id: genId('fc_'),
      user_id: userId,
      question_id: questionId,
      ease_factor: 2.5,
      interval_days: days,
      next_review: nextReview.toISOString(),
      review_count: 1,
    });
  }
};

export const defaultSessionSettings = (mode: SessionMode = 'exam'): Pick<
  QuizSession,
  'sessionMode' | 'livePhase' | 'currentQuestionIndex' | 'proctorEnabled' |
  'showExplanationMode' | 'speedBonusEnabled' | 'adaptiveEnabled' | 'teamsEnabled'
> => ({
  sessionMode: mode,
  livePhase: 'waiting',
  currentQuestionIndex: 0,
  proctorEnabled: mode === 'exam',
  showExplanationMode: mode === 'practice' ? 'after_each' : mode === 'poll' ? 'never' : 'after_submit',
  speedBonusEnabled: mode === 'live',
  adaptiveEnabled: false,
  teamsEnabled: false,
});

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
    if (session.sessionMode === 'poll') {
      if (attempt.answers[qId]) correctCount++;
      return;
    }
    if (isAnswerCorrect(q, attempt.answers[qId] || '')) correctCount++;
  });

  const bonusPoints = session.sessionMode === 'poll' ? 0
    : computeSpeedBonus(session, attempt.answersMeta ?? {}, correctCount);

  const baseScore = attempt.totalQuestions > 0
    ? Math.round((correctCount / attempt.totalQuestions) * 100)
    : session.sessionMode === 'poll' ? 100 : 0;
  const finalScore = session.sessionMode === 'poll'
    ? 100
    : Math.min(100, baseScore + bonusPoints);

  const updatedAttempt: Attempt = {
    ...attempt,
    status: 'completed',
    submitTime: new Date().toISOString(),
    correctCount,
    score: finalScore,
    bonusPoints,
  };

  const { error } = await supabase.from('attempts')
    .update({
      status: 'completed',
      submit_time: updatedAttempt.submitTime,
      correct_count: correctCount,
      score: finalScore,
      bonus_points: bonusPoints,
    })
    .eq('id', attemptId);
  if (error) throw error;

  if (attempt.attemptType !== 'practice' && session.sessionMode !== 'poll') {
    const violationCount = 0;
    const xp = xpForAttempt(finalScore, bonusPoints, violationCount);
    const badges: string[] = [];
    if (finalScore === 100) badges.push('perfect_score');
    if (bonusPoints >= 15) badges.push('speed_demon');
    await dbAwardUserXP(attempt.studentId, xp, badges);
  }

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

// ── Question Packages ────────────────────────────────────────────────────────
export const dbCreatePackage = async (
  title: string, description: string, questions: string[], createdBy: string, imageUrl?: string
): Promise<QuestionPackage> => {
  const p: QuestionPackage = {
    id: genId('pkg_'),
    title,
    description,
    imageUrl,
    createdBy,
    createdAt: new Date().toISOString(),
    questions,
  };
  const { error } = await supabase.from('question_packages').insert(packageToRow(p));
  if (error) throw toAuthError(error, 'Gagal membuat paket soal.');
  return p;
};

export const dbGetPackages = async (): Promise<QuestionPackage[]> => {
  const { data, error } = await supabase.from('question_packages').select('*').order('created_at', { ascending: false });
  if (error) throw toAuthError(error, 'Gagal memuat paket soal.');
  return (data || []).map(rowToPackage);
};

export const dbGetPackageById = async (id: string): Promise<QuestionPackage> => {
  const { data, error } = await supabase.from('question_packages').select('*').eq('id', id).single();
  if (error || !data) throw toAuthError(error, 'Paket soal tidak ditemukan.');
  return rowToPackage(data);
};

export const dbUpdatePackage = async (id: string, updates: Partial<QuestionPackage>): Promise<void> => {
  const rowUpdates: any = {};
  if (updates.title !== undefined) rowUpdates.title = updates.title;
  if (updates.description !== undefined) rowUpdates.description = updates.description;
  if (updates.imageUrl !== undefined) rowUpdates.image_url = updates.imageUrl;
  if (updates.questions !== undefined) rowUpdates.questions = updates.questions;

  const { error } = await supabase.from('question_packages').update(rowUpdates).eq('id', id);
  if (error) throw toAuthError(error, 'Gagal memperbarui paket soal.');
};

export const dbDeletePackage = async (id: string): Promise<void> => {
  const { error } = await supabase.from('question_packages').delete().eq('id', id);
  if (error) throw toAuthError(error, 'Gagal menghapus paket soal.');
};

// ── Reports ──────────────────────────────────────────────────────────────────
export const dbSubmitReport = async (userId: string, type: 'bug' | 'feedback' | 'question_error' | 'other', message: string): Promise<Report> => {
  const rep: Report = {
    id: genId('rep_'),
    userId,
    type,
    message,
    status: 'pending',
    timestamp: new Date().toISOString(),
  };
  const { error } = await supabase.from('reports').insert(reportToRow(rep));
  if (error) throw toAuthError(error, 'Gagal mengirim laporan.');
  return rep;
};

// ── Public Quizzes (Perpustakaan Kuis) ───────────────────────────────────────
export const dbGetPublicQuizzes = async (): Promise<QuizSession[]> => {
  const { data, error } = await supabase.from('quiz_sessions').select('*').eq('is_public', true).order('start_time', { ascending: false });
  if (error) throw toAuthError(error, 'Gagal memuat kuis publik.');
  return (data || []).map(rowToSession);
};
