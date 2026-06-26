import React, { useRef, useState } from 'react';
import type { User } from '../dbService';
import { dbUpdateUserProfile, dbUploadProfilePhoto } from '../dbService';
import { Camera, Save, User as UserIcon, Mail, Phone, BookOpen } from 'lucide-react';
import { BADGE_DEFINITIONS } from '../utils/scoring';

interface ProfileViewProps {
  user: User;
  onUserUpdated: (user: User) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUserUpdated }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [className, setClassName] = useState(user.class);
  const [bio, setBio] = useState(user.bio ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [photoUrl, setPhotoUrl] = useState(user.profilePhotoUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran foto maksimal 2 MB.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const url = await dbUploadProfilePhoto(user.id, file);
      setPhotoUrl(url);
      const updated = { ...user, profilePhotoUrl: url };
      onUserUpdated(updated);
      setMessage('Foto profil berhasil diperbarui.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await dbUpdateUserProfile(user.id, {
        name: name.trim(),
        class: className.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
      });
      onUserUpdated(updated);
      setMessage('Profil berhasil disimpan.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Profil Saya</h2>
        <p className="text-slate-400 text-sm mt-1">Edit foto profil dan data diri Anda.</p>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-uir-green-dark/40 border border-uir-green-medium/30 text-uir-green-muted text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Photo */}
      <div className="glass rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={user.name}
              className="w-28 h-28 rounded-2xl object-cover border-2 border-uir-green-medium/40"
            />
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-uir-green-medium/20 border-2 border-uir-green-medium/30 flex items-center justify-center text-4xl font-black text-uir-green-muted">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-uir-green-medium text-white shadow-lg hover:bg-uir-green-dark disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div className="text-center sm:text-left flex-1">
          <p className="text-lg font-bold text-white">{user.name}</p>
          <p className="text-sm text-slate-400">{user.email}</p>
          <p className="text-xs text-uir-yellow-gold mt-1 capitalize">{user.role} • {user.xp ?? 0} XP</p>
          <p className="text-xs text-slate-500 mt-2">
            {uploading ? 'Mengunggah foto...' : 'Klik ikon kamera untuk ganti foto (max 2MB)'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="glass rounded-2xl p-6 border border-slate-800 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            <UserIcon className="h-3.5 w-3.5 inline mr-1" /> Nama Lengkap
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl glass-input text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            <Mail className="h-3.5 w-3.5 inline mr-1" /> Email
          </label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full px-4 py-3 rounded-xl glass-input text-sm opacity-60 cursor-not-allowed"
          />
          <p className="text-[10px] text-slate-500 mt-1">Email tidak dapat diubah.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            <BookOpen className="h-3.5 w-3.5 inline mr-1" />
            {user.role === 'dosen' ? 'Mata Kuliah / Bidang' : 'Kelas / Angkatan'}
          </label>
          <input
            type="text"
            required
            value={className}
            onChange={e => setClassName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl glass-input text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            <Phone className="h-3.5 w-3.5 inline mr-1" /> Nomor Telepon
          </label>
          <input
            type="tel"
            placeholder="Contoh: 08123456789"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl glass-input text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Bio</label>
          <textarea
            rows={3}
            placeholder="Ceritakan sedikit tentang diri Anda..."
            value={bio}
            onChange={e => setBio(e.target.value)}
            className="w-full px-4 py-3 rounded-xl glass-input text-sm resize-none"
          />
        </div>

        {(user.badges ?? []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Badge</p>
            <div className="flex flex-wrap gap-2">
              {(user.badges ?? []).map(b => (
                <span key={b} className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200">
                  {BADGE_DEFINITIONS[b]?.icon ?? '🏅'} {BADGE_DEFINITIONS[b]?.label ?? b}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-uir-green-medium hover:bg-uir-green-dark disabled:opacity-60 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>
    </div>
  );
};
