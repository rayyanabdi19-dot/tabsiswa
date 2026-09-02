import React from 'react';
import { Student, ClassInfo } from '../types';
import { formatRupiah } from '../utils/formatters';

export type DeleteTarget =
  | {
      type: 'student';
      item: Student;
    }
  | {
      type: 'class';
      item: ClassInfo;
      studentCount?: number;
    };

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  target: DeleteTarget | null;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  target,
  onClose,
  onConfirm,
  isProcessing = false,
}) => {
  if (!isOpen || !target) return null;

  const isStudent = target.type === 'student';
  const student = isStudent ? target.item : null;
  const classItem = !isStudent ? target.item : null;
  const classStudentCount = !isStudent ? target.studentCount || 0 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-md w-full p-6 sm:p-7 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Danger Accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-100 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-2xl">warning</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {isStudent ? 'Hapus Data Siswa?' : 'Hapus Data Kelas?'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Konfirmasi penghapusan data untuk mencegah tindakan yang tidak disengaja.
            </p>
          </div>
        </div>

        {/* Item Details Card */}
        {isStudent && student && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-xs shrink-0 bg-slate-200">
                <img
                  src={student.avatarUrl}
                  alt={student.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuCnxBUwl02SVwyadeg4l9dwxInh2Ub3IZ47_EpYICav7_o6fcArr2BNlqq9V_6z5IhXHR45WdElLT8W4EbMjABwGM1nr0dEChtg5l2ya-PVen4emL9COraoIU7Pt3JtcGlksYy9Zs8-_K3_6PCr9FDeR0StcAczrrt2d6jwnfPJ5ZcL5hMpx3DitM3vXEuY6Ojeg7DltVClcrJIwKzg7b7vppEuxR7MU11xzQGm-g9jFUxLgvEklwJ';
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-900 truncate">{student.name}</h4>
                <p className="text-xs text-slate-500 font-mono">
                  NISN: {student.nisn} • {student.className}
                </p>
              </div>
            </div>

            {/* Balance warning if > 0 */}
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between font-semibold ${
                student.balance > 0
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-amber-700">
                  account_balance_wallet
                </span>
                <span>Saldo Tabungan:</span>
              </div>
              <span className="font-bold text-sm font-mono text-emerald-700">
                {formatRupiah(student.balance)}
              </span>
            </div>

            {student.balance > 0 && (
              <p className="text-[11px] text-amber-800 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 leading-relaxed">
                ⚠️ <strong>Perhatian:</strong> Siswa ini masih memiliki saldo aktif sebesar{' '}
                <strong>{formatRupiah(student.balance)}</strong>. Pastikan saldo telah diserahkan kembali kepada siswa atau wali sebelum menghapus.
              </p>
            )}
          </div>
        )}

        {!isStudent && classItem && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#006130]/10 border border-[#006130]/20 flex items-center justify-center text-[#006130] shrink-0">
                <span className="material-symbols-outlined text-2xl">meeting_room</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-900 truncate">{classItem.name}</h4>
                <p className="text-xs text-slate-500">
                  Tingkat: {classItem.level || '-'} • Wali: {classItem.homeroomTeacher || '-'}
                </p>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between font-semibold ${
                classStudentCount > 0
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-amber-700">groups</span>
                <span>Jumlah Siswa Terdaftar:</span>
              </div>
              <span className="font-bold text-sm text-slate-900">{classStudentCount} Siswa</span>
            </div>

            {classStudentCount > 0 && (
              <p className="text-[11px] text-amber-800 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 leading-relaxed">
                ℹ️ <strong>Catatan:</strong> Menghapus kelas ini tidak akan menghapus data siswa. Sebanyak{' '}
                <strong>{classStudentCount} siswa</strong> akan dipindahkan statusnya ke <em>"Tanpa Kelas"</em>.
              </p>
            )}
          </div>
        )}

        {/* Warning Callout */}
        <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl mb-6 text-xs text-rose-900 flex items-start gap-2">
          <span className="material-symbols-outlined text-base text-rose-600 shrink-0 mt-0.5">
            delete_forever
          </span>
          <p className="leading-relaxed">
            Apakah Anda yakin ingin melanjutkan? Tindakan penghapusan ini bersifat permanen pada workspace aktif saat ini.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            <span>{isProcessing ? 'Menghapus...' : isStudent ? 'Hapus Siswa' : 'Hapus Kelas'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
