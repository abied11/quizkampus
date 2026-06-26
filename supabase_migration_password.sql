-- Jalankan sekali di Supabase Dashboard → SQL Editor
-- Diperlukan agar fitur login & daftar dengan password berfungsi

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Password demo akun seed: demo123
UPDATE users SET password_hash = '122b5e5ac1da9411fadea91fe923cd3392f431597087b4de4086e263734f6e7f'
WHERE email = 'budi@kampus.ac.id' AND password_hash IS NULL;

UPDATE users SET password_hash = 'ead3b86be5a15c64eaec1bc586852f4fd7af5dc69114881d96d54ff3ce77400d'
WHERE email = 'adi@student.ac.id' AND password_hash IS NULL;

UPDATE users SET password_hash = '9da3a08e594d5ad501eacba60ff3315bdc6b03953513382b2b5c20575ef58109'
WHERE email = 'citra@student.ac.id' AND password_hash IS NULL;

UPDATE users SET password_hash = '6e20f2d6a9567f67ef3f4fbbe3d2a74bcb0998059d10ac0844e2aeb5e104d47a'
WHERE email = 'dedi@student.ac.id' AND password_hash IS NULL;
