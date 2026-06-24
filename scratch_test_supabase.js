import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function check() {
  const { data: users, error } = await supabase.from('users').select('*');
  if (error) { console.error('ERROR:', error.message); return; }
  
  console.log('=== TABEL users (public.users) ===');
  console.log(`Jumlah baris: ${users.length}`);
  console.table(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
  
  const { data: sessions } = await supabase.from('quiz_sessions').select('id, title, access_code');
  console.log('\n=== TABEL quiz_sessions ===');
  console.log(`Jumlah baris: ${sessions.length}`);
  console.table(sessions);
}

check();
