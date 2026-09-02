import React, { useState, useMemo } from 'react';
import { Student, Transaction } from '../types';
import { formatRupiah, formatDateCustom } from '../utils/formatters';
import { showToast } from './Toast';

interface InactiveStudentInfo {
  student: Student;
  lastDepositDate: string | null;
  daysInactive: number;
  lastDepositAmount?: number;
  neverDeposited: boolean;
}

interface InactiveStudentsNotificationProps {
  students: Student[];
  transactions: Transaction[];
  onSelectStudent: (student: Student) => void;
  onOpenNewTransaction: (type?: 'deposit' | 'withdrawal') => void;
}

export const InactiveStudentsNotification: React.FC<InactiveStudentsNotificationProps> = ({
  students,
  transactions,
  onSelectStudent,
  onOpenNewTransaction,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [daysThreshold, setDaysThreshold] = useState<number>(30);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dismissed, setDismissed] = useState<boolean>(false);

  // Compute reference date (handles current live time or mock transaction dates)
  const referenceTimestamp = useMemo(() => {
    let latestTxTime = 0;
    transactions.forEach((tx) => {
      if (tx.date) {
        const time = new Date(tx.date).getTime();
        if (!isNaN(time) && time > latestTxTime) {
          latestTxTime = time;
        }
      }
    });
    // If no transactions, use current timestamp
    return latestTxTime > 0 ? latestTxTime : Date.now();
  }, [transactions]);

  // Compute inactive students based on deposits
  const inactiveStudents: InactiveStudentInfo[] = useMemo(() => {
    const list: InactiveStudentInfo[] = [];

    students.forEach((student) => {
      // Find all successful deposit transactions for this student
      const studentDeposits = transactions.filter(
        (t) =>
          t.type === 'deposit' &&
          (t.studentNisn === student.nisn ||
            (t.studentId && t.studentId === student.id) ||
            t.studentName.toLowerCase() === student.name.toLowerCase())
      );

      let lastDepositDate: string | null = null;
      let lastDepositAmount: number | undefined = undefined;
      let neverDeposited = false;

      if (studentDeposits.length > 0) {
        // Sort descending by date
        const sorted = [...studentDeposits].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        lastDepositDate = sorted[0].date;
        lastDepositAmount = sorted[0].amount;
      } else if (student.initialDepositDate) {
        // Fallback to initial deposit date registered with the student
        lastDepositDate = student.initialDepositDate;
      } else {
        neverDeposited = true;
      }

      let daysInactive = 999;
      if (lastDepositDate) {
        const lastTime = new Date(lastDepositDate).getTime();
        if (!isNaN(lastTime)) {
          const diffMs = referenceTimestamp - lastTime;
          daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }
      }

      if (daysInactive >= daysThreshold || neverDeposited) {
        list.push({
          student,
          lastDepositDate,
          daysInactive,
          lastDepositAmount,
          neverDeposited,
        });
      }
    });

    // Sort by longest inactive first
    return list.sort((a, b) => b.daysInactive - a.daysInactive);
  }, [students, transactions, daysThreshold, referenceTimestamp]);

  // Get unique classes for filter
  const classList = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered inactive students
  const filteredList = useMemo(() => {
    return inactiveStudents.filter((item) => {
      const matchClass =
        selectedClassFilter === 'all' || item.student.className === selectedClassFilter;
      const matchSearch =
        !searchQuery.trim() ||
        item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.nisn.includes(searchQuery) ||
        (item.student.guardianName &&
          item.student.guardianName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchClass && matchSearch;
    });
  }, [inactiveStudents, selectedClassFilter, searchQuery]);

  // WhatsApp Reminder Generator
  const handleSendWhatsAppReminder = (item: InactiveStudentInfo) => {
    const rawPhone = item.student.guardianPhone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    let formattedPhone = cleanPhone;

    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('62') && formattedPhone.length > 5) {
      formattedPhone = '62' + formattedPhone;
    }

    const message = encodeURIComponent(
      `Yth. Bapak/Ibu Wali dari ${item.student.name} (${item.student.className}),\n\n` +
        `Kami dari Bendahara Tabungan Siswa ingin menginformasikan bahwa ananda belum melakukan setoran tabungan selama ${
          item.neverDeposited
            ? 'lebih dari 30 hari (belum ada riwayat setoran)'
            : `${item.daysInactive} hari terakhir (setoran terakhir: ${formatDateCustom(
                item.lastDepositDate || '',
                'DD MMM YYYY'
              )})`
        }.\n\n` +
        `Saldo tabungan saat ini: ${formatRupiah(item.student.balance)}.\n` +
        `Mari dukung ananda untuk terus membiasakan menabung secara berkala demi masa depan pendidikannya.\n\n` +
        `Terima kasih atas perhatian dan kerja samanya. 🙏\n` +
        `— Bendahara Tabungan Sekolah`
    );

    if (formattedPhone.length >= 9) {
      window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
      showToast(
        'WhatsApp Reminder Dibuka',
        `Membuka pesan pengingat untuk wali ${item.student.name}.`
      );
    } else {
      showToast(
        'Nomor HP Tidak Valid',
        `No. HP wali (${rawPhone || 'Kosong'}) tidak valid untuk WhatsApp.`,
        'error'
      );
    }
  };

  if (dismissed || inactiveStudents.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50/90 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs ring-4 ring-amber-100">
            <span className="material-symbols-outlined text-2xl animate-pulse">
              notifications_active
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-amber-950 text-sm sm:text-base flex items-center gap-1.5">
                <span>Pengingat Tabungan Siswa Pasif</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-extrabold">
                  {inactiveStudents.length} Siswa
                </span>
              </h4>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                &ge; {daysThreshold} Hari Belum Setor
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              Terdapat {inactiveStudents.length} siswa yang belum melakukan setoran tabungan dalam{' '}
              {daysThreshold} hari terakhir. Bendahara dapat mengirimkan pengingat ke orang tua/wali.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>{isExpanded ? 'Tutup Daftar' : 'Lihat Siswa'}</span>
            <span className="material-symbols-outlined text-sm">
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              showToast('Notifikasi Disembunyikan', 'Pengingat siswa pasif ditutup sementara.');
            }}
            className="p-1.5 text-amber-700 hover:text-amber-950 hover:bg-amber-200/60 rounded-lg transition-colors cursor-pointer"
            title="Tutup Notifikasi"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>

      {/* Expanded List & Filters */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-amber-200/80 space-y-4 animate-fadeIn">
          {/* Controls / Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 p-3 rounded-xl border border-amber-200">
            {/* Search Input */}
            <div className="flex-1 min-w-[200px] relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Cari nama siswa, NISN, atau wali..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Threshold Selector */}
            <div className="flex items-center gap-1.5 text-xs text-amber-950 font-medium">
              <span>Batas Hari:</span>
              <div className="inline-flex rounded-lg bg-amber-100 p-0.5 border border-amber-300 text-xs">
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDaysThreshold(days)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      daysThreshold === days
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-amber-900 hover:bg-amber-200/50'
                    }`}
                  >
                    &gt; {days} Hari
                  </button>
                ))}
              </div>
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-1.5 text-xs text-amber-950 font-medium">
              <span>Kelas:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="py-1.5 px-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="all">Semua Kelas ({inactiveStudents.length})</option>
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table / List of Inactive Students */}
          <div className="bg-white rounded-xl border border-amber-200/80 overflow-hidden shadow-2xs">
            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                <span className="material-symbols-outlined text-3xl text-amber-400 mb-1 block">
                  task_alt
                </span>
                Tidak ada siswa yang pasif sesuai filter pencarian.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[360px] custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-100/60 text-amber-950 font-bold border-b border-amber-200 text-[11px] sticky top-0 backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-3.5">Siswa</th>
                      <th className="py-2.5 px-3">Kelas & NISN</th>
                      <th className="py-2.5 px-3">Setoran Terakhir</th>
                      <th className="py-2.5 px-3">Lama Tidak Aktif</th>
                      <th className="py-2.5 px-3 text-right">Saldo Saat Ini</th>
                      <th className="py-2.5 px-3.5 text-center">Aksi Bendahara</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredList.map((item) => (
                      <tr
                        key={item.student.id}
                        className="hover:bg-amber-50/50 transition-colors group"
                      >
                        {/* Student Info */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                item.student.avatarUrl ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                              }
                              alt={item.student.name}
                              className="w-8 h-8 rounded-full object-cover border border-amber-200 shrink-0"
                            />
                            <div>
                              <button
                                type="button"
                                onClick={() => onSelectStudent(item.student)}
                                className="font-bold text-gray-900 group-hover:text-amber-800 text-left hover:underline block leading-tight cursor-pointer"
                              >
                                {item.student.name}
                              </button>
                              <span className="text-[10px] text-gray-500">
                                Wali: {item.student.guardianName || '-'} ({item.student.guardianPhone || '-'})
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Class & NISN */}
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-gray-800 block">
                            {item.student.className}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            NISN: {item.student.nisn}
                          </span>
                        </td>

                        {/* Last Deposit */}
                        <td className="py-2.5 px-3">
                          {item.lastDepositDate ? (
                            <div>
                              <span className="font-medium text-gray-700 block">
                                {formatDateCustom(item.lastDepositDate, 'DD MMM YYYY')}
                              </span>
                              {item.lastDepositAmount && (
                                <span className="text-[10px] text-emerald-700 font-semibold">
                                  {formatRupiah(item.lastDepositAmount)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">
                              Belum pernah setor
                            </span>
                          )}
                        </td>

                        {/* Days Inactive Status */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                item.daysInactive > 60
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {item.neverDeposited
                                ? 'Belum Ada Transaksi'
                                : `${item.daysInactive} Hari Lalu`}
                            </span>
                          </div>
                        </td>

                        {/* Balance */}
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-bold text-gray-900 font-mono">
                            {formatRupiah(item.student.balance)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* WhatsApp Reminder Button */}
                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppReminder(item)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="Kirim Pesan WhatsApp Pengingat ke Orang Tua/Wali"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                chat
                              </span>
                              <span>Ingatkan WA</span>
                            </button>

                            {/* Setoran Baru Button */}
                            <button
                              type="button"
                              onClick={() => {
                                onSelectStudent(item.student);
                                onOpenNewTransaction('deposit');
                              }}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="Input Setoran untuk Siswa Ini"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                add_circle
                              </span>
                              <span>Setor</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
