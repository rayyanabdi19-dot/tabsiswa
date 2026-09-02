import React, { useState, useMemo } from 'react';
import { Student, Transaction, SchoolInfo, WhatsAppReceiptPayload } from '../types';
import { formatRupiah, getSavingsBreakdown } from '../utils/formatters';
import { showToast } from './Toast';
import { TabsiLogo } from './TabsiLogo';
import { ReceiptPrintAndShareModal } from './ReceiptPrintAndShareModal';
import {
  AppAboutModal,
  APP_VERSION,
  APP_BRAND_NAME,
  APP_HELPDESK_EMAIL,
  APP_HELPDESK_PHONE,
  APP_HELPDESK_WA_URL,
} from './AppAboutModal';

interface StudentPortalViewProps {
  student: Student;
  allTransactions: Transaction[];
  schoolInfo: SchoolInfo;
  allStudents?: Student[];
  onSwitchStudent?: (student: Student) => void;
  onLogout: () => void;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  student,
  allTransactions,
  schoolInfo,
  allStudents = [],
  onSwitchStudent,
  onLogout,
}) => {
  const [portalTab, setPortalTab] = useState<'balance' | 'history' | 'profile'>('balance');

  // Filter only transactions belonging to this student
  const studentTransactions = useMemo(() => {
    return allTransactions.filter(
      (t) => t.studentId === student.id || t.studentNisn === student.nisn || t.studentName === student.name
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, student]);

  // Transaction filter states
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null);
  const [showPassbookModal, setShowPassbookModal] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Password change state
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Calculations
  const breakdown = getSavingsBreakdown(student.balance);
  const totalDeposits = studentTransactions
    .filter((t) => t.type === 'deposit')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalWithdrawals = studentTransactions
    .filter((t) => t.type === 'withdrawal')
    .reduce((acc, t) => acc + t.amount, 0);

  const recurring = student.recurringSavings;
  const goal = student.goal || {
    id: 'g1',
    title: 'Tabungan Masa Depan & Pendidikan',
    targetAmount: 2500000,
    currentAmount: student.balance,
    targetDate: 'Akhir Tahun Ajaran',
    status: 'active',
  };
  const goalProgress = Math.min(
    Math.round((student.balance / (goal.targetAmount || 1)) * 100),
    100
  );

  // Filtered transactions for view
  const filteredTransactions = studentTransactions.filter((tx) => {
    if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNotes = (tx.notes || '').toLowerCase().includes(q);
      const matchCategory = (tx.category || '').toLowerCase().includes(q);
      const matchId = tx.id.toLowerCase().includes(q);
      if (!matchNotes && !matchCategory && !matchId) return false;
    }
    return true;
  });

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPin) {
      showToast('PIN Lama Diperlukan', 'Harap masukkan PIN / kata sandi saat ini.', 'error');
      return;
    }
    if (newPin.length < 6) {
      showToast('PIN Kurang Aman', 'PIN / Kata Sandi baru minimal 6 digit/karakter.', 'error');
      return;
    }
    if (newPin !== confirmPin) {
      showToast('PIN Tidak Cocok', 'Konfirmasi PIN tidak sama dengan PIN baru.', 'error');
      return;
    }
    showToast('PIN Diperbarui!', 'PIN keamanan akun siswa berhasil diubah.');
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const handlePrintPassbook = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Student Identity & Quick Selector */}
      <div className="bg-white rounded-2xl border border-[#becabd]/80 p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#006130] bg-[#006130]/10 shadow-xs flex-shrink-0">
              <img
                src={student.avatarUrl}
                alt={student.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 bg-[#006130] text-white p-0.5 rounded-full ring-2 ring-white">
              <span className="material-symbols-outlined text-xs block">verified</span>
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#1a1c1c] tracking-tight">{student.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#006130]/10 text-[#006130] border border-[#006130]/20">
                {student.className}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#e9e8e7] text-[#3f4940]">
                NISN: {student.nisn}
              </span>
            </div>
            <p className="text-xs text-[#6f7a6f] mt-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#006130]">account_balance</span>
              <span>{schoolInfo.name}</span>
              <span>•</span>
              <span>Rekening Tabungan Pelajar Aktif</span>
            </p>
          </div>
        </div>

        {/* Student Security Badge */}
        <div className="flex items-center gap-2 self-stretch md:self-auto bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
          <span className="material-symbols-outlined text-base text-[#006130]">lock</span>
          <div className="text-right">
            <p className="text-[10px] font-bold text-emerald-800 leading-none">Akses Tabungan Siswa</p>
            <p className="text-[11px] font-extrabold text-[#006130] mt-0.5">NIS: {student.nisn}</p>
          </div>
        </div>
      </div>

      {/* Student Portal Navigation Pills */}
      <div className="flex border-b border-[#becabd]/60 bg-white rounded-xl p-1.5 shadow-2xs gap-1 overflow-x-auto">
        <button
          onClick={() => setPortalTab('balance')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            portalTab === 'balance'
              ? 'bg-[#006130] text-white shadow-xs'
              : 'text-[#3f4940] hover:bg-[#f4f3f2] hover:text-[#1a1c1c]'
          }`}
        >
          <span className="material-symbols-outlined text-base">account_balance_wallet</span>
          <span>Detail Saldo & Alokasi</span>
        </button>

        <button
          onClick={() => setPortalTab('history')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            portalTab === 'history'
              ? 'bg-[#006130] text-white shadow-xs'
              : 'text-[#3f4940] hover:bg-[#f4f3f2] hover:text-[#1a1c1c]'
          }`}
        >
          <span className="material-symbols-outlined text-base">history</span>
          <span>Riwayat Mutasi ({studentTransactions.length})</span>
        </button>

        <button
          onClick={() => setPortalTab('profile')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            portalTab === 'profile'
              ? 'bg-[#006130] text-white shadow-xs'
              : 'text-[#3f4940] hover:bg-[#f4f3f2] hover:text-[#1a1c1c]'
          }`}
        >
          <span className="material-symbols-outlined text-base">badge</span>
          <span>Profil Rekening</span>
        </button>
      </div>

      {/* ================= TAB 1: DETAIL SALDO & ALOKASI ================= */}
      {portalTab === 'balance' && (
        <div className="space-y-6">
          {/* Main Visual Digital Passbook Card & Balance Hero */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Digital Passbook Card */}
            <div className="lg:col-span-1 bg-gradient-to-br from-[#00381a] via-[#006130] to-[#0f8745] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              {/* Background watermark pattern */}
              <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-[160px]">account_balance</span>
              </div>

              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-[#96f7af]">
                    Tabungan Simpanan Pelajar (SimPel)
                  </p>
                  <p className="text-xs font-bold text-white/90 mt-0.5">{schoolInfo.name}</p>
                </div>
                <div className="w-9 h-7 bg-amber-400/90 rounded-md flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-amber-900 text-sm">memory</span>
                </div>
              </div>

              <div className="my-4 relative z-10">
                <p className="text-xs text-white/80 font-medium">Total Akumulasi Saldo</p>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 text-white">
                  {formatRupiah(student.balance)}
                </h2>
              </div>

              <div className="flex justify-between items-end relative z-10 pt-2 border-t border-white/20 text-xs">
                <div>
                  <p className="text-[10px] text-[#96f7af] font-medium">PEMEGANG REKENING</p>
                  <p className="font-bold tracking-wide uppercase">{student.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#96f7af] font-medium">NO. REK / NISN</p>
                  <p className="font-mono font-bold tracking-wider">{student.nisn}</p>
                </div>
              </div>
            </div>

            {/* Saldo Allocation Detail (80% Liquid vs 20% Locked) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#becabd]/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#1a1c1c] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#006130]">pie_chart</span>
                      <span>Rincian & Alokasi Saldo Tabungan</span>
                    </h3>
                    <p className="text-xs text-[#6f7a6f]">
                      Sistem membagi saldo tabungan secara otomatis untuk perlindungan dana jangka panjang
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPassbookModal(true)}
                    className="px-3 py-1.5 bg-[#f4f3f2] hover:bg-[#e9e8e7] border border-[#becabd] text-[#006130] font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    <span>Cetak Buku Tabungan</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {/* 80% Saldo Likuid */}
                  <div className="p-4 rounded-xl bg-[#006130]/5 border border-[#006130]/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#006130] text-white">
                        80% Saldo Likuid (Bebas)
                      </span>
                      <span className="material-symbols-outlined text-[#006130] text-lg">check_circle</span>
                    </div>
                    <div>
                      <p className="text-xs text-[#3f4940] font-medium">Dapat Ditarik Kapan Saja</p>
                      <h4 className="text-xl font-black text-[#006130] mt-0.5">
                        {formatRupiah(breakdown.available)}
                      </h4>
                    </div>
                    <p className="text-[11px] text-[#6f7a6f] mt-2 pt-2 border-t border-[#006130]/10 leading-relaxed">
                      Dana fleksibel untuk kebutuhan perlengkapan sekolah, kegiatan, atau uang saku.
                    </p>
                  </div>

                  {/* 20% Saldo Terkunci */}
                  <div className="p-4 rounded-xl bg-[#005db5]/5 border border-[#005db5]/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#005db5] text-white">
                        20% Saldo Terkunci (Cadangan)
                      </span>
                      <span className="material-symbols-outlined text-[#005db5] text-lg">lock</span>
                    </div>
                    <div>
                      <p className="text-xs text-[#3f4940] font-medium">Dana Abadi Kelulusan</p>
                      <h4 className="text-xl font-black text-[#005db5] mt-0.5">
                        {formatRupiah(breakdown.locked)}
                      </h4>
                    </div>
                    <p className="text-[11px] text-[#6f7a6f] mt-2 pt-2 border-t border-[#005db5]/10 leading-relaxed">
                      Disimpan aman hingga akhir kelulusan untuk biaya ijazah, studi lanjut, atau masa depan.
                    </p>
                  </div>
                </div>
              </div>

              {/* Allocation Visual Bar */}
              <div className="mt-5 pt-4 border-t border-[#becabd]/40">
                <div className="flex justify-between text-xs font-semibold text-[#3f4940] mb-1.5">
                  <span>Komposisi Saldo: Likuid vs Cadangan</span>
                  <span>Total: {formatRupiah(student.balance)}</span>
                </div>
                <div className="w-full h-3 bg-[#e9e8e7] rounded-full overflow-hidden flex">
                  <div style={{ width: '80%' }} className="bg-[#006130] h-full" title="80% Saldo Likuid" />
                  <div style={{ width: '20%' }} className="bg-[#005db5] h-full" title="20% Saldo Terkunci" />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Detail Modules: Autodebet Status & Savings Goal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tabungan Rutin / Autodebet Card */}
            <div className="bg-white rounded-2xl border border-[#becabd]/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-[#1a1c1c] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006130]">event_repeat</span>
                    <span>Status Tabungan Rutin (Autodebet)</span>
                  </h4>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      recurring?.isEnabled
                        ? 'bg-[#96f7af] text-[#00210c]'
                        : 'bg-[#e9e8e7] text-[#6f7a6f]'
                    }`}
                  >
                    {recurring?.isEnabled ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </div>

                {recurring?.isEnabled ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-[#faf9f8] rounded-xl border border-[#becabd]/60 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[#6f7a6f]">Nominal Debet Bulanan:</span>
                        <span className="font-extrabold text-sm text-[#006130]">
                          {formatRupiah(recurring.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#6f7a6f]">Jadwal Debet:</span>
                        <span className="font-bold text-[#1a1c1c]">Setiap tanggal {recurring.debitDate}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#6f7a6f]">Sumber Dana:</span>
                        <span className="font-semibold text-[#1a1c1c]">{recurring.sourceName || 'Transfer Otomatis Bank / Ortu'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#6f7a6f]">Kategori Tabungan:</span>
                        <span className="font-medium text-[#1a1c1c]">{recurring.category || 'Tabungan Wajib'}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#6f7a6f] italic">
                      *Autodebet diproses otomatis oleh Bendahara Sekolah pada tanggal yang ditentukan.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 text-center text-[#6f7a6f] bg-[#faf9f8] rounded-xl border border-[#becabd]/40">
                    <span className="material-symbols-outlined text-3xl text-[#6f7a6f] mb-1">schedule</span>
                    <p className="text-xs font-medium">Autodebet belum diaktifkan.</p>
                    <p className="text-[11px] mt-1">Hubungi Bendahara Sekolah jika ingin mengaktifkan setoran rutin bulanan.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Target Impian Menabung (Savings Goal) */}
            <div className="bg-white rounded-2xl border border-[#becabd]/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-[#1a1c1c] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#005db5]">flag</span>
                    <span>Target Impian Menabung</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#d6e3ff] text-[#00376f]">
                    {goalProgress}% Tercapai
                  </span>
                </div>

                <div className="p-3.5 bg-[#faf9f8] rounded-xl border border-[#becabd]/60 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-[#1a1c1c]">{goal.title}</p>
                    <p className="text-[11px] text-[#6f7a6f]">Target: {goal.targetDate}</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-[#006130]">{formatRupiah(student.balance)}</span>
                      <span className="text-[#6f7a6f]">Target: {formatRupiah(goal.targetAmount)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#e9e8e7] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${goalProgress}%` }}
                        className="bg-[#005db5] h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-[#3f4940]">
                    {student.balance >= goal.targetAmount
                      ? '🎉 Selamat! Target tabungan Anda telah tercapai penuh.'
                      : `Kurang ${formatRupiah(Math.max(0, goal.targetAmount - student.balance))} lagi untuk mencapai target.`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats: Total Setoran & Penarikan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-[#becabd]/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#006130]/10 text-[#006130] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined">arrow_downward</span>
              </div>
              <div>
                <p className="text-[11px] text-[#6f7a6f] font-semibold">Total Setoran Masuk</p>
                <p className="text-sm font-extrabold text-[#006130]">{formatRupiah(totalDeposits)}</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#becabd]/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ba1a1a]/10 text-[#ba1a1a] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined">arrow_upward</span>
              </div>
              <div>
                <p className="text-[11px] text-[#6f7a6f] font-semibold">Total Penarikan Keluar</p>
                <p className="text-sm font-extrabold text-[#ba1a1a]">{formatRupiah(totalWithdrawals)}</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#becabd]/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#005db5]/10 text-[#005db5] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
              <div>
                <p className="text-[11px] text-[#6f7a6f] font-semibold">Frekuensi Transaksi</p>
                <p className="text-sm font-extrabold text-[#005db5]">{studentTransactions.length} Kali Mutasi</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: RIWAYAT MUTASI TRANSAKSI SISWA ================= */}
      {portalTab === 'history' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl border border-[#becabd]/80 p-4 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7a6f] text-base">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi berdasarkan keterangan / ID..."
                className="w-full pl-9 pr-3 py-2 bg-[#faf9f8] border border-[#becabd] rounded-lg text-xs outline-none focus:border-[#006130]"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="flex gap-1 bg-[#f4f3f2] p-1 rounded-lg border border-[#becabd]/60">
              <button
                onClick={() => setTxTypeFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  txTypeFilter === 'all' ? 'bg-white text-[#006130] shadow-xs' : 'text-[#3f4940]'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setTxTypeFilter('deposit')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  txTypeFilter === 'deposit' ? 'bg-[#006130] text-white shadow-xs' : 'text-[#3f4940]'
                }`}
              >
                Setoran (+)
              </button>
              <button
                onClick={() => setTxTypeFilter('withdrawal')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  txTypeFilter === 'withdrawal' ? 'bg-[#ba1a1a] text-white shadow-xs' : 'text-[#3f4940]'
                }`}
              >
                Penarikan (-)
              </button>
            </div>

            {/* Print Passbook Button */}
            <button
              onClick={() => setShowPassbookModal(true)}
              className="px-3.5 py-2 bg-[#006130] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#107c41] transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Cetak Rekening Koran</span>
            </button>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-2xl border border-[#becabd]/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#becabd]/60 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-[#1a1c1c]">Daftar Mutasi Transaksi Tabungan</h3>
                <p className="text-xs text-[#6f7a6f]">Menampilkan {filteredTransactions.length} transaksi</p>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-[#6f7a6f]">
                <span className="material-symbols-outlined text-4xl text-[#becabd] mb-2 block">
                  receipt_long
                </span>
                <p className="text-xs font-bold text-[#1a1c1c]">Belum ada mutasi transaksi</p>
                <p className="text-[11px] mt-0.5">Transaksi setoran atau penarikan akan otomatis tercatat di sini.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#becabd]/40">
                {filteredTransactions.map((tx) => {
                  const isDeposit = tx.type === 'deposit';
                  return (
                    <div
                      key={tx.id}
                      className="p-4 hover:bg-[#faf9f8] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                            isDeposit
                              ? 'bg-[#006130]/10 text-[#006130] border border-[#006130]/20'
                              : 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/20'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">
                            {isDeposit ? 'arrow_downward' : 'arrow_upward'}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                isDeposit ? 'bg-[#96f7af] text-[#00210c]' : 'bg-[#ffdad6] text-[#410002]'
                              }`}
                            >
                              {isDeposit ? 'Setoran Masuk' : 'Penarikan'}
                            </span>
                            <span className="text-[11px] text-[#6f7a6f] font-mono">{tx.date}</span>
                            {tx.time && <span className="text-[11px] text-[#6f7a6f]">({tx.time})</span>}
                          </div>

                          <p className="text-xs font-bold text-[#1a1c1c] mt-1">
                            {tx.notes || (isDeposit ? 'Setoran Tabungan Siswa' : 'Penarikan Kas Siswa')}
                          </p>

                          <div className="flex items-center gap-2 text-[11px] text-[#6f7a6f] mt-0.5">
                            <span>Petugas: {tx.adminName || 'Bendahara'}</span>
                            <span>•</span>
                            <span className="font-mono text-[10px]">ID: {tx.id}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span
                            className={`text-base font-black tracking-tight ${
                              isDeposit ? 'text-[#006130]' : 'text-[#ba1a1a]'
                            }`}
                          >
                            {isDeposit ? '+' : '-'} {formatRupiah(tx.amount)}
                          </span>
                          <p className="text-[10px] text-[#6f7a6f] capitalize">
                            Status: {tx.status || 'Berhasil'}
                          </p>
                        </div>

                        <button
                          onClick={() => setSelectedReceiptTx(tx)}
                          title="Lihat Kuitansi Digital"
                          className="p-2 text-[#005db5] hover:bg-[#d6e3ff]/50 rounded-lg border border-[#becabd]/60 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base block">receipt</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: PROFIL REKENING & GANTI PIN ================= */}
      {portalTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Identitas Siswa & Wali */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-[#becabd]/80 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#1a1c1c] flex items-center gap-2 pb-3 border-b border-[#becabd]/60">
              <span className="material-symbols-outlined text-[#006130]">contact_page</span>
              <span>Informasi Rekening & Identitas Terdaftar</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#faf9f8] rounded-xl border border-[#becabd]/60">
                <span className="text-[#6f7a6f] block text-[11px]">Nama Lengkap Siswa:</span>
                <span className="font-bold text-[#1a1c1c] text-sm mt-0.5 block">{student.name}</span>
              </div>

              <div className="p-3 bg-[#faf9f8] rounded-xl border border-[#becabd]/60">
                <span className="text-[#6f7a6f] block text-[11px]">Nomor Induk Siswa Nasional (NISN):</span>
                <span className="font-bold font-mono text-[#1a1c1c] text-sm mt-0.5 block">{student.nisn}</span>
              </div>

              <div className="p-3 bg-[#faf9f8] rounded-xl border border-[#becabd]/60">
                <span className="text-[#6f7a6f] block text-[11px]">Kelas / Rombel:</span>
                <span className="font-bold text-[#1a1c1c] text-sm mt-0.5 block">{student.className}</span>
              </div>

              <div className="p-3 bg-[#faf9f8] rounded-xl border border-[#becabd]/60">
                <span className="text-[#6f7a6f] block text-[11px]">Tanggal Buka Rekening:</span>
                <span className="font-bold text-[#1a1c1c] text-sm mt-0.5 block">
                  {student.initialDepositDate || '15 Juli 2023'}
                </span>
              </div>

              <div className="p-3 bg-[#faf9f8] rounded-xl border border-[#becabd]/60">
                <span className="text-[#6f7a6f] block text-[11px]">Nama Orang Tua / Wali:</span>
                <span className="font-bold text-[#1a1c1c] text-sm mt-0.5 block">
                  {student.guardianName || 'Agus Santoso'}
                </span>
              </div>

              <div className="p-3 bg-[#faf9f8] rounded-xl border border-[#becabd]/60">
                <span className="text-[#6f7a6f] block text-[11px]">Kontak Telepon Wali:</span>
                <span className="font-bold font-mono text-[#1a1c1c] text-sm mt-0.5 block">
                  {student.guardianPhone || '08123456789'}
                </span>
              </div>

              <div className="p-3 bg-[#faf9f8] rounded-xl border border-[#becabd]/60 sm:col-span-2">
                <span className="text-[#6f7a6f] block text-[11px]">Alamat Domisili Siswa:</span>
                <span className="font-medium text-[#1a1c1c] text-xs mt-0.5 block">
                  {student.address || 'Jl. Merdeka No. 45, Kota Cerdas'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#006130]/5 rounded-xl border border-[#006130]/20 flex items-start gap-3 mt-4">
              <span className="material-symbols-outlined text-[#006130] text-lg">info</span>
              <p className="text-[11px] text-[#3f4940] leading-relaxed">
                *Jika terdapat kesalahan data identitas, kelas, atau kontak wali murid, silakan hubungi bagian Tata Usaha / Bendahara Sekolah untuk perbaikan data resmi.
              </p>
            </div>
          </div>

          {/* Form Ganti PIN Keamanan Siswa */}
          <div className="bg-white rounded-2xl border border-[#becabd]/80 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#1a1c1c] flex items-center gap-2 pb-3 border-b border-[#becabd]/60">
              <span className="material-symbols-outlined text-[#005db5]">lock_reset</span>
              <span>Ganti PIN / Kata Sandi</span>
            </h3>

            <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
              <div>
                <label className="text-[#3f4940] font-semibold block mb-1">PIN / Sandi Lama</label>
                <input
                  type="password"
                  required
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-[#faf9f8] border border-[#becabd] rounded-lg outline-none focus:border-[#006130]"
                />
              </div>

              <div>
                <label className="text-[#3f4940] font-semibold block mb-1">PIN / Sandi Baru (Min. 6 digit)</label>
                <input
                  type="password"
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-[#faf9f8] border border-[#becabd] rounded-lg outline-none focus:border-[#006130]"
                />
              </div>

              <div>
                <label className="text-[#3f4940] font-semibold block mb-1">Konfirmasi PIN Baru</label>
                <input
                  type="password"
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-[#faf9f8] border border-[#becabd] rounded-lg outline-none focus:border-[#006130]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#006130] hover:bg-[#107c41] text-white font-bold rounded-lg transition-colors cursor-pointer shadow-2xs mt-2"
              >
                Simpan PIN Baru
              </button>
            </form>

            <div className="pt-3 border-t border-[#becabd]/40">
              <button
                onClick={onLogout}
                className="w-full py-2 bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffdad6]/80 font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span>Keluar dari Akun Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Helpdesk Footer for Student Portal */}
      <footer className="mt-8 pt-5 border-t border-[#becabd]/60 bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-[#becabd]/60">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#faf9f8] rounded-xl border border-slate-200 shrink-0">
              <TabsiLogo size="sm" variant="modern" showByline={true} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-[#1a1c1c]">{APP_BRAND_NAME}</span>
                <span className="text-[9px] font-black px-2 py-0.2 rounded-full bg-[#006130]/10 text-[#006130]">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-[10px] text-[#6f7a6f] mt-0.5">
                Portal Tabungan Siswa Mandiri • Terlindungi Enkripsi Transaksi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <a
              href={APP_HELPDESK_WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-xs flex items-center gap-1.5 border border-emerald-200 transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-emerald-700">chat</span>
              <span>WA Helpdesk: {APP_HELPDESK_PHONE}</span>
            </a>
            <button
              type="button"
              onClick={() => setIsAboutModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#faf9f8] hover:bg-[#e9e8e7] text-[#1a1c1c] font-bold text-xs border border-[#becabd]/70 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-[#006130]">info</span>
              <span>Tentang Aplikasi</span>
            </button>
          </div>
        </div>
      </footer>

      {/* About & Helpdesk Modal */}
      <AppAboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* ================= MODAL KUITANSI DIGITAL & WHATSAPP ================= */}
      <ReceiptPrintAndShareModal
        isOpen={!!selectedReceiptTx}
        payload={
          selectedReceiptTx
            ? {
                transactionId: selectedReceiptTx.id,
                studentName: student.name,
                studentNisn: student.nisn,
                className: student.className,
                guardianName: student.guardianName,
                guardianPhone: student.guardianPhone,
                type: selectedReceiptTx.type,
                amount: selectedReceiptTx.amount,
                date: selectedReceiptTx.date,
                time: selectedReceiptTx.time,
                notes: selectedReceiptTx.notes,
                totalBalance: student.balance,
                availableBalance: breakdown.available,
                lockedBalance: breakdown.locked,
                adminName: selectedReceiptTx.adminName || 'Bendahara',
                schoolName: schoolInfo.name,
              }
            : null
        }
        schoolInfo={schoolInfo}
        onClose={() => setSelectedReceiptTx(null)}
      />

      {/* ================= MODAL CETAK BUKU TABUNGAN DIGITAL ================= */}
      {showPassbookModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-[#becabd] my-8">
            {/* Kop Surat / Buku Tabungan */}
            <div className="flex justify-between items-center border-b-2 border-[#1a1c1c] pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#006130]/10 flex items-center justify-center text-[#006130]">
                  <span className="material-symbols-outlined text-3xl">account_balance</span>
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-[#1a1c1c] uppercase">
                    {schoolInfo.name}
                  </h2>
                  <p className="text-xs text-[#3f4940]">{schoolInfo.address} • Telp: {schoolInfo.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-[#006130] text-white font-black text-xs rounded-lg uppercase tracking-wider">
                  BUKU TABUNGAN SISWA
                </span>
                <p className="text-[10px] font-mono text-[#6f7a6f] mt-1">Dicetak: {new Date().toLocaleDateString('id-ID')}</p>
              </div>
            </div>

            {/* Informasi Pemegang Rekening */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#faf9f8] rounded-xl border border-[#becabd]/80 text-xs mb-4">
              <div>
                <span className="text-[#6f7a6f] block text-[10px]">Nama Siswa:</span>
                <span className="font-bold text-[#1a1c1c]">{student.name}</span>
              </div>
              <div>
                <span className="text-[#6f7a6f] block text-[10px]">NISN:</span>
                <span className="font-mono font-bold text-[#1a1c1c]">{student.nisn}</span>
              </div>
              <div>
                <span className="text-[#6f7a6f] block text-[10px]">Kelas:</span>
                <span className="font-bold text-[#1a1c1c]">{student.className}</span>
              </div>
              <div>
                <span className="text-[#6f7a6f] block text-[10px]">Total Saldo:</span>
                <span className="font-extrabold text-[#006130]">{formatRupiah(student.balance)}</span>
              </div>
            </div>

            {/* Tabel Mutasi Buku Tabungan */}
            <div className="border border-[#becabd] rounded-xl overflow-hidden text-xs mb-4">
              <table className="w-full text-left">
                <thead className="bg-[#f4f3f2] text-[#3f4940] font-bold border-b border-[#becabd]">
                  <tr>
                    <th className="p-2.5 text-center w-10">No</th>
                    <th className="p-2.5">Tanggal</th>
                    <th className="p-2.5">Keterangan</th>
                    <th className="p-2.5 text-right">Debet (Setor)</th>
                    <th className="p-2.5 text-right">Kredit (Tarik)</th>
                    <th className="p-2.5 text-center">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#becabd]/40">
                  {studentTransactions.map((tx, idx) => (
                    <tr key={tx.id} className="hover:bg-[#faf9f8]">
                      <td className="p-2.5 text-center font-mono text-[#6f7a6f]">{idx + 1}</td>
                      <td className="p-2.5 font-mono">{tx.date}</td>
                      <td className="p-2.5 font-medium">{tx.notes || (tx.type === 'deposit' ? 'Setoran' : 'Penarikan')}</td>
                      <td className="p-2.5 text-right font-semibold text-[#006130]">
                        {tx.type === 'deposit' ? formatRupiah(tx.amount) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-[#ba1a1a]">
                        {tx.type === 'withdrawal' ? formatRupiah(tx.amount) : '-'}
                      </td>
                      <td className="p-2.5 text-center text-[10px] text-[#6f7a6f]">{tx.adminName || 'Bendahara'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tanda Tangan Resmi */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-[#becabd]/60 text-xs">
              <div className="text-center">
                <p className="text-[#6f7a6f]">Mengetahui,</p>
                <p className="font-bold text-[#1a1c1c] mt-0.5">Orang Tua / Wali Siswa</p>
                <div className="h-16" />
                <p className="font-bold text-[#1a1c1c]">({student.guardianName || 'Wali Murid'})</p>
              </div>

              <div className="text-center">
                <p className="text-[#6f7a6f]">Bendahara Pengelola Tabungan,</p>
                <p className="font-bold text-[#1a1c1c] mt-0.5">{schoolInfo.name}</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#006130] border border-[#006130] px-2 py-0.5 rounded-md uppercase">
                    [ TERCAP ELEKTRONIK ]
                  </span>
                </div>
                <p className="font-bold text-[#1a1c1c]">({schoolInfo.principalName || 'Kepala Sekolah'})</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-[#becabd]/40">
              <button
                onClick={() => setShowPassbookModal(false)}
                className="px-4 py-2 border border-[#becabd] text-[#3f4940] font-bold text-xs rounded-lg hover:bg-[#f4f3f2] cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={handlePrintPassbook}
                className="px-5 py-2 bg-[#006130] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 hover:bg-[#107c41] cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>Cetak Dokumen Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
