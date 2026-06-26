import React from 'react';
import type { QuizSession } from '../dbService';
import { QrCode } from 'lucide-react';

interface QRJoinCardProps {
  session: QuizSession;
}

export const QRJoinCard: React.FC<QRJoinCardProps> = ({ session }) => {
  const joinUrl = `${window.location.origin}${window.location.pathname}?code=${session.accessCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`;

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
      <img src={qrUrl} alt="QR Join" className="rounded-lg bg-white p-2" width={180} height={180} />
      <div className="text-center">
        <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
          <QrCode className="h-3.5 w-3.5" /> Scan untuk join
        </p>
        <p className="text-lg font-mono font-bold text-uir-yellow-gold tracking-widest mt-1">{session.accessCode}</p>
        <p className="text-[10px] text-slate-500 mt-1 break-all max-w-[200px]">{joinUrl}</p>
      </div>
    </div>
  );
};

export const QRJoinHint: React.FC = () => (
  <p className="text-[10px] text-slate-500 text-center mt-2">
    Atau scan QR code dari dosen
  </p>
);
