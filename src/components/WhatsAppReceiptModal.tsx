import React, { useState } from 'react';
import { WhatsAppReceiptPayload } from '../types';
import { formatRupiah } from '../utils/formatters';
import { TabsiLogo } from './TabsiLogo';
import { showToast } from './Toast';

interface WhatsAppReceiptModalProps {
  payload: WhatsAppReceiptPayload | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppReceiptModal: React.FC<WhatsAppReceiptModalProps> = ({
  payload,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !payload) return null;

  const [phone, setPhone] = useState(payload.guardianPhone || '');
  const [customNote, setCustomNote] = useState('');

  // Sanitize phone number to international format 62...
  const formatPhoneNumber = (input: string) => {
    let cleaned = input.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  };

  const isDeposit = payload.type === 'deposit';
  const mutationTitle = isDeposit ? '🟢 SETORAN TABUNGAN (+)' : '🔴 PENARIKAN SALDO TABUNGAN (-)';

  // Construct formatted WhatsApp message text
  const generateWhatsAppMessage = () => {
    return (
      `*NOTIFIKASI TRANSAKSI TABUNGAN SISWA (TABSI)*\n` +
      `*${payload.schoolName.toUpperCase()}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Yth. Bapak/Ibu Wali Murid dari *${payload.studentName}*,\n\n` +
      `Berikut adalah rincian transaksi tabungan sekolah yang baru saja dicatat secara *real-time*:\n\n` +
      `📄 *No. Transaksi:* \`${payload.transactionId}\`\n` +
      `⏰ *Waktu:* ${payload.date} ${payload.time ? `(${payload.time})` : ''}\n` +
      `👤 *Nama Siswa:* ${payload.studentName}\n` +
      `🆔 *NIS/NISN:* ${payload.studentNisn}\n` +
      `🏫 *Kelas:* ${payload.className}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *Jenis Mutasi:* ${mutationTitle}\n` +
      `💰 *Nominal:* *${formatRupiah(payload.amount)}*\n` +
      `📝 *Keterangan:* ${payload.notes || (isDeposit ? 'Setoran Tabungan Siswa' : 'Penarikan Kas Siswa')}\n` +
      (customNote ? `💬 *Catatan Kasir:* ${customNote}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 *POSISI SALDO TERKINI:*\n` +
      `• *Total Saldo:* ${formatRupiah(payload.totalBalance)}\n` +
      `• *Saldo Bisa Dipakai (80%):* ${formatRupiah(payload.availableBalance)}\n` +
      `• *Saldo Terkunci (20%):* ${formatRupiah(payload.lockedBalance)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Petugas Kasir: *${payload.adminName}*\n\n` +
      `_Terima kasih atas kepercayaannya menabung di ${payload.schoolName}._\n` +
      `_Sistem Tabungan Siswa Pintar (TABSI) by MD2R._`
    );
  };

  const handleSendWhatsApp = () => {
    const targetPhone = formatPhoneNumber(phone);
    if (!targetPhone || targetPhone.length < 9) {
      showToast('Nomor HP Tidak Valid', 'Silakan masukkan nomor WhatsApp yang benar (contoh: 08123456789).', 'error');
      return;
    }

    const message = generateWhatsAppMessage();
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${targetPhone}?text=${encoded}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showToast('Membuka WhatsApp', `Mengirim bukti transaksi ke nomor +${targetPhone}...`);
    onClose();
  };

  const handleCopyMessage = () => {
    const message = generateWhatsAppMessage();
    navigator.clipboard.writeText(message);
    showToast('Tersalin ke Clipboard', 'Format pesan struk WhatsApp berhasil disalin.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#becabd]/80 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#006130] to-[#107c41] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 text-white">
              <span className="material-symbols-outlined text-2xl font-bold">send</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-tight">
                Notifikasi WhatsApp Real-Time
              </h3>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                Kirim bukti rincian mutasi langsung ke nomor orang tua/wali siswa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quick Summary Card */}
          <div className="p-3.5 rounded-2xl bg-[#faf9f8] border border-[#becabd]/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs ${
                  isDeposit ? 'bg-[#006130]' : 'bg-[#ba1a1a]'
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {isDeposit ? 'arrow_downward' : 'arrow_upward'}
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-[#1a1c1c]">{payload.studentName}</div>
                <div className="text-[11px] text-[#6f7a6f]">
                  {payload.className} • NIS: {payload.studentNisn}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-sm font-black ${
                  isDeposit ? 'text-[#006130]' : 'text-[#ba1a1a]'
                }`}
              >
                {isDeposit ? '+' : '-'} {formatRupiah(payload.amount)}
              </div>
              <div className="text-[10px] text-gray-500 font-semibold">{payload.date}</div>
            </div>
          </div>

          {/* Recipient Phone Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1c1c] flex items-center justify-between">
              <span>Nomor WhatsApp Wali Murid:</span>
              <span className="text-[11px] font-normal text-[#006130]">
                {payload.guardianName ? `Wali: ${payload.guardianName}` : 'Format: 08... atau 628...'}
              </span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">
                phone_android
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full pl-9 pr-3 py-2 bg-[#faf9f8] border border-[#becabd]/80 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#006130] focus:bg-white"
              />
            </div>
          </div>

          {/* Optional Additional Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1c1c]">Pesan Tambahan (Opsional):</label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Contoh: Titipan uang saku dari Ibu..."
              className="w-full px-3 py-2 bg-[#faf9f8] border border-[#becabd]/80 rounded-xl text-xs focus:outline-none focus:border-[#006130] focus:bg-white"
            />
          </div>

          {/* Live Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1a1c1c] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#006130]">chat</span>
                <span>Pratinjau Draf Pesan WhatsApp:</span>
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-bold text-[#006130] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">content_copy</span>
                <span>Salin Teks</span>
              </button>
            </div>
            <div className="p-3.5 bg-[#dcf8c6]/30 border border-[#25D366]/30 rounded-2xl text-[11px] text-gray-800 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {generateWhatsAppMessage()}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[#faf9f8] border-t border-[#becabd]/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#6f7a6f] hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Tutup Nanti
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="px-5 py-2.5 bg-[#25D366] hover:bg-[#1ebd59] text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <span className="material-symbols-outlined text-base">send</span>
            <span>Kirim Pesan WhatsApp Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
