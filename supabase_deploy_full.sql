-- ============================================================
-- UIR Quiz — DEPLOY LENGKAP (project Supabase BARU)
-- Jalankan SATU KALI di Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('dosen', 'mahasiswa')),
  user_class TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_photo_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT ''
);

-- 2. Questions
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'essay', 'boolean', 'matching', 'poll')),
  text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium'
);

-- 2.5 Question Packages
CREATE TABLE IF NOT EXISTS question_packages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  questions JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 3. Quiz Sessions
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  attempt_limit INTEGER NOT NULL DEFAULT 1,
  shuffle_questions BOOLEAN NOT NULL DEFAULT true,
  shuffle_options BOOLEAN NOT NULL DEFAULT true,
  timer_type TEXT NOT NULL CHECK (timer_type IN ('per_question', 'total_session')) DEFAULT 'total_session',
  per_question_seconds INTEGER NOT NULL DEFAULT 0,
  access_code TEXT NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  session_mode TEXT NOT NULL DEFAULT 'exam' CHECK (session_mode IN ('exam', 'live', 'homework', 'practice', 'poll')),
  live_phase TEXT NOT NULL DEFAULT 'waiting' CHECK (live_phase IN ('waiting', 'question', 'reveal', 'leaderboard', 'finished')),
  current_question_index INTEGER NOT NULL DEFAULT 0,
  proctor_enabled BOOLEAN NOT NULL DEFAULT true,
  show_explanation_mode TEXT NOT NULL DEFAULT 'after_submit' CHECK (show_explanation_mode IN ('never', 'after_each', 'after_submit')),
  speed_bonus_enabled BOOLEAN NOT NULL DEFAULT false,
  adaptive_enabled BOOLEAN NOT NULL DEFAULT false,
  teams_enabled BOOLEAN NOT NULL DEFAULT false,
  host_id TEXT
);

-- 4. Attempts
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  quiz_session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  submit_time TIMESTAMPTZ,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')) DEFAULT 'in_progress',
  attempt_type TEXT NOT NULL DEFAULT 'exam' CHECK (attempt_type IN ('exam', 'practice', 'live', 'homework', 'poll')),
  bonus_points INTEGER NOT NULL DEFAULT 0,
  answers_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id TEXT,
  team_name TEXT,
  adaptive_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_heartbeat TIMESTAMPTZ
);

-- 5. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT ''
);

-- 6. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('session_open', 'session_close', 'score_ready', 'rank_change', 'info')),
  related_id TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6.5 Reports
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feedback', 'question_error', 'other')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Flashcard Progress
CREATE TABLE IF NOT EXISTS flashcard_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 1,
  next_review TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, question_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_logs_attempt ON activity_logs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_logs_student ON activity_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all questions" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all packages" ON question_packages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all sessions" ON quiz_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all attempts" ON attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all flashcard" ON flashcard_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all reports" ON reports FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE question_packages;
ALTER PUBLICATION supabase_realtime ADD TABLE reports;

-- Storage avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatar upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Avatar update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');
CREATE POLICY "Avatar delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars');

-- Seed demo (password: demo123)
INSERT INTO users (id, name, email, role, user_class, password_hash) VALUES
  ('u_dosen1', 'Dr. Budi Santoso', 'budi@kampus.ac.id', 'dosen', 'Informatika', '122b5e5ac1da9411fadea91fe923cd3392f431597087b4de4086e263734f6e7f'),
  ('u_mhs1',   'Adi Wijaya',       'adi@student.ac.id',  'mahasiswa', 'IF-2024-A', 'ead3b86be5a15c64eaec1bc586852f4fd7af5dc69114881d96d54ff3ce77400d'),
  ('u_mhs2',   'Citra Lestari',    'citra@student.ac.id','mahasiswa', 'IF-2024-A', '9da3a08e594d5ad501eacba60ff3315bdc6b03953513382b2b5c20575ef58109'),
  ('u_mhs3',   'Dedi Kurniawan',   'dedi@student.ac.id', 'mahasiswa', 'IF-2024-B', '6e20f2d6a9567f67ef3f4fbbe3d2a74bcb0998059d10ac0844e2aeb5e104d47a')
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, subject, topic, type, text, options, correct_answer, explanation, difficulty) VALUES
  ('q1', 'Pemrograman Web', 'React JS', 'multiple_choice',
   'Manakah hook dasar untuk state di React?',
   '["useContext","useState","useEffect","useReducer"]', 'useState',
   'useState adalah hook React bawaan untuk state lokal.', 'easy'),
  ('q2', 'Pemrograman Web', 'JavaScript', 'boolean',
   'Keyword const mencegah mutasi isi objek/array.',
   NULL, 'false',
   'const mencegah reassignment, bukan mutasi isi.', 'medium')
ON CONFLICT (id) DO NOTHING;
