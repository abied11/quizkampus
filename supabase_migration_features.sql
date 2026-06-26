-- ============================================================
-- UIR Quiz — Migrasi Fitur Lengkap (Kahoot/Quizizz style)
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

-- Session modes & live control
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS session_mode TEXT NOT NULL DEFAULT 'exam'
  CHECK (session_mode IN ('exam', 'live', 'homework', 'practice', 'poll'));
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS live_phase TEXT NOT NULL DEFAULT 'waiting'
  CHECK (live_phase IN ('waiting', 'question', 'reveal', 'leaderboard', 'finished'));
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS current_question_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS proctor_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS show_explanation_mode TEXT NOT NULL DEFAULT 'after_submit'
  CHECK (show_explanation_mode IN ('never', 'after_each', 'after_submit'));
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS speed_bonus_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS adaptive_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS teams_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS host_id TEXT;

-- Attempt extensions
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS attempt_type TEXT NOT NULL DEFAULT 'exam'
  CHECK (attempt_type IN ('exam', 'practice', 'live', 'homework', 'poll'));
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS bonus_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS answers_meta JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS team_id TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS adaptive_path JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;

-- User gamification
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS badges JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Poll question type support
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check
  CHECK (type IN ('multiple_choice', 'essay', 'boolean', 'matching', 'poll'));

-- Flashcard progress
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

ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all flashcard_progress" ON flashcard_progress FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for live sessions
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE attempts;
