-- ============================================================
-- UIR Quiz Kampus — Supabase Schema
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('dosen', 'mahasiswa')),
  user_class TEXT NOT NULL DEFAULT ''
);

-- 2. Questions
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'essay', 'boolean', 'matching')),
  text TEXT NOT NULL,
  options JSONB,                      -- string[] for MC/matching
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium'
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
  questions JSONB NOT NULL DEFAULT '[]'::jsonb   -- array of question IDs
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
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')) DEFAULT 'in_progress'
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

-- ============================================================
-- Indexes for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_logs_attempt ON activity_logs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_logs_student ON activity_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- ============================================================
-- Row Level Security — Permissive (public for now)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow all operations from anon key (public app without auth)
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON quiz_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Seed Data (optional — matches original mock data)
-- ============================================================
INSERT INTO users (id, name, email, role, user_class) VALUES
  ('u_dosen1', 'Dr. Budi Santoso', 'budi@kampus.ac.id', 'dosen', 'Informatika'),
  ('u_mhs1',   'Adi Wijaya',       'adi@student.ac.id',  'mahasiswa', 'IF-2024-A'),
  ('u_mhs2',   'Citra Lestari',    'citra@student.ac.id','mahasiswa', 'IF-2024-A'),
  ('u_mhs3',   'Dedi Kurniawan',   'dedi@student.ac.id', 'mahasiswa', 'IF-2024-B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, subject, topic, type, text, options, correct_answer, explanation, difficulty) VALUES
  ('q1', 'Pemrograman Web', 'React JS', 'multiple_choice',
   'Manakah dari berikut ini yang merupakan hook dasar untuk mengelola state di React?',
   '["useContext","useState","useEffect","useReducer"]',
   'useState',
   'useState adalah hook React bawaan dasar yang memungkinkan kita menyimpan dan mengelola state lokal di komponen fungsional.',
   'easy'),
  ('q2', 'Pemrograman Web', 'JavaScript', 'boolean',
   'Di JavaScript, keyword "const" membuat variabel yang nilainya sama sekali tidak bisa bermutasi/berubah meskipun itu berupa objek atau array.',
   NULL,
   'false',
   'Keyword "const" mencegah penugasan ulang (reassignment) variabel, tetapi isi dari objek atau array yang dideklarasikan dengan const masih dapat dimutasi.',
   'medium'),
  ('q3', 'Pemrograman Web', 'CSS Grid', 'essay',
   'Properti CSS apa yang digunakan untuk menentukan ukuran kolom pada layout CSS Grid?',
   NULL,
   'grid-template-columns',
   'Properti grid-template-columns digunakan untuk mendefinisikan nama baris dan fungsi ukuran dari track kolom pada CSS grid.',
   'medium'),
  ('q4', 'Struktur Data', 'Stack & Queue', 'multiple_choice',
   'Struktur data manakah yang bekerja menggunakan prinsip First-In, First-Out (FIFO)?',
   '["Stack (Tumpukan)","Queue (Antrean)","Binary Tree","Graph"]',
   'Queue (Antrean)',
   'Queue bekerja dengan prinsip FIFO (First In First Out), di mana elemen yang masuk pertama kali akan dikeluarkan pertama kali.',
   'easy'),
  ('q5', 'Struktur Data', 'Sorting', 'boolean',
   'Quick Sort memiliki kompleksitas waktu rata-rata (average case) sebesar O(n log n).',
   NULL,
   'true',
   'Quick Sort adalah algoritma pengurutan berbasis divide-and-conquer yang rata-rata berkinerja O(n log n), meskipun dalam terburuknya (worst case) bisa mencapai O(n^2).',
   'medium'),
  ('q6', 'Matematika Diskrit', 'Aljabar Boolean', 'multiple_choice',
   'Berapakah nilai dari ekspresi boolean: (True AND False) OR (NOT False)?',
   '["True","False","Tidak dapat ditentukan","Error"]',
   'True',
   '(True AND False) menghasilkan False. NOT False menghasilkan True. Sehingga False OR True menghasilkan True.',
   'easy')
ON CONFLICT (id) DO NOTHING;
