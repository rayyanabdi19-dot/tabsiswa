import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Student, Transaction, TransactionType, WhatsAppReceiptPayload, SchoolInfo } from '../types';
import { formatRupiah, getSavingsBreakdown } from '../utils/formatters';
import { showToast } from './Toast';
import { ReceiptPrintAndShareModal } from './ReceiptPrintAndShareModal';

interface TransactionInputViewProps {
  students: Student[];
  initialStudent?: Student | null;
  initialType?: TransactionType;
  schoolName?: string;
  adminName?: string;
  schoolInfo?: SchoolInfo;
  onSaveTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

export const TransactionInputView: React.FC<TransactionInputViewProps> = ({
  students,
  initialStudent,
  initialType = 'deposit',
  schoolName = 'SMA BINTANG GEMILANG',
  adminName = 'Siti Rahmawati (Bendahara)',
  schoolInfo,
  onSaveTransaction,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student>(
    initialStudent || students.find((s) => s.nisn === '102938') || students[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>(initialType);
  const [rawAmount, setRawAmount] = useState<string>('50000');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whatsappPayload, setWhatsappPayload] = useState<WhatsAppReceiptPayload | null>(null);
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);

  useEffect(() => {
    if (initialStudent) {
      setSelectedStudent(initialStudent);
    }
  }, [initialStudent]);

  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(query) || s.nisn.includes(query) || s.className.toLowerCase().includes(query);
  });

  const numericAmount = parseInt(rawAmount.replace(/\D/g, '') || '0', 10);

  // Calculate 80% usable / 20% locked breakdown
  const currentBreakdown = getSavingsBreakdown(selectedStudent ? selectedStudent.balance : 0);
  const maxAllowedWithdrawal = currentBreakdown.available; // 80%

  const projectedBalance =
    transactionType === 'deposit'
      ? (selectedStudent?.balance || 0) + numericAmount
      : (selectedStudent?.balance || 0) - numericAmount;

  const projectedBreakdown = getSavingsBreakdown(Math.max(0, projectedBalance));

  const isWithdrawalExceeding80 =
    transactionType === 'withdrawal' && numericAmount > maxAllowedWithdrawal;

  const quickAmounts = [20000, 50000, 100000, 200000, 500000];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '');
    setRawAmount(cleaned);
  };

  const handleSetMaxWithdrawal = () => {
    if (maxAllowedWithdrawal > 0) {
      setRawAmount(maxAllowedWithdrawal.toString());
      showToast('Nominal 80% Diterapkan', `Maksimal saldo bisa ditarik: ${formatRupiah(maxAllowedWithdrawal)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) {
      showToast('Pilih Siswa', 'Silakan pilih siswa terlebih dahulu.', 'error');
      return;
    }

    if (numericAmount <= 0) {
      showToast('Nominal Kosong', 'Harap masukkan nominal transaksi lebih dari 0.', 'error');
      return;
    }

    // Enforce 80% maximum withdrawal rule (20% locked)
    if (transactionType === 'withdrawal') {
      if (numericAmount > selectedStudent.balance) {
        showToast(
          'Saldo Tidak Mencukupi',
          `Saldo total ${selectedStudent.name} (${formatRupiah(selectedStudent.balance)}) tidak mencukupi untuk penarikan ini.`,
          'error'
        );
        return;
      }

      if (numericAmount > maxAllowedWithdrawal) {
        showToast(
          'Batas Penarikan 80% Terlampaui',
          `Penarikan maksimal adalah 80% dari saldo (${formatRupiah(maxAllowedWithdrawal)}). 20% (${formatRupiah(currentBreakdown.locked)}) tetap terkunci sebagai dana cadangan wajib.`,
          'error'
        );
        return;
      }
    }

    setIsSubmitting(true);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
    const txId = `TX-${Date.now().toString().slice(-6)}`;
    const newTotalBalance = projectedBalance;
    const newAvailable = projectedBreakdown.available;
    const newLocked = projectedBreakdown.locked;

    setTimeout(() => {
      onSaveTransaction({
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        studentNisn: selectedStudent.nisn,
        className: selectedStudent.className,
        type: transactionType,
        amount: numericAmount,
        date: dateStr,
        time: `Hari ini, ${timeStr}`,
        status: 'success',
        adminName: adminName,
        notes: notes.trim() || (transactionType === 'deposit' ? 'Setoran Tunai' : 'Penarikan Kas Siswa (Maks 80%)'),
        category: transactionType === 'deposit' ? 'Setoran Tunai' : 'Penarikan Kas',
      });

      // Prepare real-time WhatsApp payload
      setWhatsappPayload({
        transactionId: txId,
        studentName: selectedStudent.name,
        studentNisn: selectedStudent.nisn,
        className: selectedStudent.className,
        guardianName: selectedStudent.guardianName,
        guardianPhone: selectedStudent.guardianPhone || '',
        type: transactionType,
        amount: numericAmount,
        date: dateStr,
        time: timeStr,
        notes: notes.trim() || (transactionType === 'deposit' ? 'Setoran Tunai' : 'Penarikan Kas Siswa'),
        totalBalance: newTotalBalance,
        availableBalance: newAvailable,
        lockedBalance: newLocked,
        adminName: adminName,
        schoolName: schoolName,
      });

      // Trigger celebratory confetti
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#006130', '#107c41', '#96f7af', '#005db5'],
      });

      showToast(
        'Transaksi Berhasil Disimpan',
        `${transactionType === 'deposit' ? 'Setoran' : 'Penarikan'} sebesar ${formatRupiah(
          numericAmount
        )} untuk ${selectedStudent.name} telah dicatat.`
      );

      // Open WhatsApp receipt modal immediately
      setIsWhatsappModalOpen(true);

      // Reset form
      setRawAmount('');
      setNotes('');
      setIsSubmitting(false);
    }, 400);
  };

  // Helper for student initials
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">Input Transaksi Tabungan</h1>
          <p className="text-sm text-[#3f4940] mt-1">
            Catat setoran dan penarikan kas siswa dengan aturan penarikan 80% &amp; dana terkunci 20%.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Form (lg:col-span-2) */}
        <div className="lg:col-span-2 bg-[#ffffff] border border-[#becabd]/60 rounded-xl p-6 sm:p-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Selection */}
            <div className="space-y-2 relative">
              <label className="text-sm font-semibold text-[#1a1c1c] block">Pilih Siswa</label>
              <div className="relative">
                <div
                  onClick={() => setIsSearching(!isSearching)}
                  className="flex items-center justify-between p-3.5 bg-[#faf9f8] border border-[#becabd]/80 rounded-lg cursor-pointer hover:border-[#005db5] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#006130] text-[#ffffff] flex items-center justify-center font-bold text-xs shrink-0">
                      {selectedStudent ? getInitials(selectedStudent.name) : 'ST'}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#1a1c1c]">
                        {selectedStudent ? selectedStudent.name : 'Pilih Siswa'}
                      </div>
                      <div className="text-xs text-[#3f4940]">
                        {selectedStudent ? `${selectedStudent.className} • NISN: ${selectedStudent.nisn}` : 'Klik untuk mencari siswa'}
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#6f7a6f]">unfold_more</span>
                </div>

                {/* Dropdown Menu */}
                {isSearching && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#ffffff] border border-[#becabd] rounded-xl shadow-xl z-30 p-3 max-h-72 overflow-hidden flex flex-col">
                    <div className="relative mb-2">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#6f7a6f]">
                        search
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ketik nama, NISN, atau kelas..."
                        autoFocus
                        className="w-full pl-9 pr-3 py-2 bg-[#faf9f8] border border-[#becabd] rounded-lg text-xs outline-none focus:border-[#006130]"
                      />
                    </div>

                    <div className="overflow-y-auto custom-scrollbar divide-y divide-[#becabd]/40 flex-1">
                      {filteredStudents.map((st) => (
                        <div
                          key={st.id}
                          onClick={() => {
                            setSelectedStudent(st);
                            setIsSearching(false);
                            setSearchQuery('');
                          }}
                          className={`p-2.5 flex items-center justify-between hover:bg-[#faf9f8] cursor-pointer rounded-lg transition-colors ${
                            selectedStudent?.id === st.id ? 'bg-[#96f7af]/20' : ''
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-xs text-[#1a1c1c]">{st.name}</div>
                            <div className="text-[11px] text-[#6f7a6f]">
                              {st.className} • NISN: {st.nisn}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-xs text-[#006130]">{formatRupiah(st.balance)}</div>
                            <div className="text-[10px] text-[#6f7a6f]">
                              Bisa: {formatRupiah(Math.round(st.balance * 0.8))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction Type Segmented Control */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1a1c1c] block">Jenis Transaksi</label>
              <div className="flex bg-[#f4f3f2] p-1 rounded-lg border border-[#becabd]/60">
                <button
                  type="button"
                  onClick={() => setTransactionType('deposit')}
                  className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                    transactionType === 'deposit'
                      ? 'bg-[#ffffff] text-[#006130] shadow-sm border border-[#becabd]/60'
                      : 'text-[#3f4940] hover:bg-[#e9e8e7]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                  <span>Setoran Tabungan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('withdrawal')}
                  className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                    transactionType === 'withdrawal'
                      ? 'bg-[#ffffff] text-[#ba1a1a] shadow-sm border border-[#becabd]/60'
                      : 'text-[#3f4940] hover:bg-[#e9e8e7]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  <span>Penarikan Kas (Maks. 80%)</span>
                </button>
              </div>
            </div>

            {/* Withdrawal Notice & 80/20 Limits */}
            {transactionType === 'withdrawal' && (
              <div className="bg-[#f4f3f2] border border-[#becabd] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1a1c1c] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#006130]">lock_open</span>
                    <span>Batas Maksimal Penarikan (80%):</span>
                  </span>
                  <span className="text-sm font-extrabold text-[#006130]">
                    {formatRupiah(maxAllowedWithdrawal)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#3f4940] pt-1 border-t border-[#becabd]/40">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-[#ba1a1a]">lock</span>
                    <span>Dana Terkunci Wajib (20%):</span>
                  </span>
                  <span className="font-bold text-[#ba1a1a]">{formatRupiah(currentBreakdown.locked)}</span>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSetMaxWithdrawal}
                    className="text-xs bg-[#006130] hover:bg-[#107c41] text-white font-bold py-1 px-3 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">tune</span>
                    <span>Tarik Maksimal 80% ({formatRupiah(maxAllowedWithdrawal)})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[#1a1c1c]">Jumlah Nominal (IDR)</label>
                {transactionType === 'withdrawal' && (
                  <span className="text-[11px] font-semibold text-[#6f7a6f]">
                    Maks. 80%: {formatRupiah(maxAllowedWithdrawal)}
                  </span>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[#3f4940] font-semibold">
                  Rp
                </span>
                <input
                  type="text"
                  value={rawAmount ? parseInt(rawAmount, 10).toLocaleString('id-ID') : ''}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className={`w-full pl-12 pr-4 py-3.5 bg-[#faf9f8] border rounded-lg focus:ring-1 outline-none transition-colors text-lg font-bold tracking-wide ${
                    isWithdrawalExceeding80
                      ? 'border-[#ba1a1a] focus:border-[#ba1a1a] focus:ring-[#ba1a1a] text-[#ba1a1a]'
                      : 'border-[#becabd]/80 focus:border-[#005db5] focus:ring-[#005db5] text-[#1a1c1c]'
                  }`}
                />
              </div>

              {/* Warning when exceeding 80% */}
              {isWithdrawalExceeding80 && (
                <div className="p-3 bg-[#ffdad6]/60 border border-[#ffb4ab] rounded-lg text-xs text-[#ba1a1a] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">warning</span>
                  <span>
                    Nominal melebihi batas 80% ({formatRupiah(maxAllowedWithdrawal)}). 20% saldo ({formatRupiah(currentBreakdown.locked)}) wajib tersimpan sebagai dana cadangan.
                  </span>
                </div>
              )}

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setRawAmount(amt.toString())}
                    className="text-xs bg-[#f4f3f2] hover:bg-[#e9e8e7] text-[#3f4940] font-medium py-1 px-3 rounded-full border border-[#becabd]/40 transition-colors cursor-pointer"
                  >
                    +{formatRupiah(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1a1c1c] block">Catatan / Keterangan</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Tambahkan keperluan transaksi (misal: Uang saku kegiatan, tabungan mingguan, dll)..."
                className="w-full p-3 bg-[#faf9f8] border border-[#becabd]/80 rounded-lg focus:border-[#005db5] focus:ring-1 focus:ring-[#005db5] outline-none transition-colors text-sm text-[#1a1c1c] resize-none"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-[#becabd]/60">
              <button
                type="submit"
                disabled={isSubmitting || isWithdrawalExceeding80}
                className="w-full py-3.5 bg-[#006130] text-[#ffffff] rounded-lg text-base font-bold shadow-xs hover:bg-[#107c41] hover:-translate-y-0.5 active:translate-y-0 transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-xl">save</span>
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Info Siswa & 80/20 Breakdown (lg:col-span-1) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Selected Student Info Card */}
          <div className="bg-[#f4f3f2] border border-[#becabd]/60 rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <h3 className="text-base font-bold text-[#1a1c1c] mb-4 flex items-center gap-2 border-b border-[#becabd]/60 pb-2.5">
              <span className="material-symbols-outlined text-[#005db5]">account_circle</span>
              <span>Info Siswa &amp; Rekening</span>
            </h3>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-full bg-[#006130] text-[#ffffff] flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                {selectedStudent ? getInitials(selectedStudent.name) : 'ST'}
              </div>
              <div>
                <div className="text-base font-bold text-[#1a1c1c]">
                  {selectedStudent ? selectedStudent.name : 'Pilih Siswa'}
                </div>
                <div className="text-xs text-[#3f4940] mt-0.5">
                  {selectedStudent?.className} • NISN: {selectedStudent?.nisn}
                </div>
              </div>
            </div>

            {/* Balance Breakdown Cards */}
            <div className="bg-[#ffffff] p-4 rounded-xl border border-[#becabd]/60 shadow-2xs space-y-3">
              <div>
                <div className="text-[11px] font-semibold text-[#6f7a6f] uppercase tracking-wider">Total Saldo Saat Ini</div>
                <div className="text-2xl font-black text-[#1a1c1c] tracking-tight mt-0.5">
                  {formatRupiah(selectedStudent ? selectedStudent.balance : 0)}
                </div>
              </div>

              {/* 80% / 20% Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#becabd]/40">
                <div className="bg-[#96f7af]/20 border border-[#96f7af] p-2.5 rounded-lg">
                  <div className="text-[10px] font-bold text-[#006130] flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">lock_open</span>
                    <span>Bisa Digunakan (80%)</span>
                  </div>
                  <div className="text-xs font-extrabold text-[#006130] mt-1">
                    {formatRupiah(currentBreakdown.available)}
                  </div>
                </div>

                <div className="bg-[#ffdad6]/40 border border-[#ffdad6] p-2.5 rounded-lg">
                  <div className="text-[10px] font-bold text-[#ba1a1a] flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">lock</span>
                    <span>Terkunci (20%)</span>
                  </div>
                  <div className="text-xs font-extrabold text-[#ba1a1a] mt-1">
                    {formatRupiah(currentBreakdown.locked)}
                  </div>
                </div>
              </div>

              {/* Projected Balance on Change */}
              {numericAmount > 0 && (
                <div className="pt-2 border-t border-[#becabd]/40 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#3f4940]">Estimasi Saldo Baru:</span>
                    <span
                      className={`font-bold ${
                        projectedBalance < 0 ? 'text-[#ba1a1a]' : 'text-[#006130]'
                      }`}
                    >
                      {formatRupiah(projectedBalance)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-[#6f7a6f]">
                    <span>Bisa Dipakai Baru (80%):</span>
                    <span className="font-semibold text-[#006130]">{formatRupiah(projectedBreakdown.available)}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-[#6f7a6f]">
                    <span>Terkunci Baru (20%):</span>
                    <span className="font-semibold text-[#ba1a1a]">{formatRupiah(projectedBreakdown.locked)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Savings Policy Card */}
          <div className="bg-[#e9e8e7]/70 rounded-xl p-4 text-xs text-[#3f4940] border border-[#becabd]/60 flex gap-3 leading-relaxed">
            <span className="material-symbols-outlined text-[#006130] shrink-0 text-xl mt-0.5">verified_user</span>
            <div>
              <strong className="text-[#1a1c1c] font-semibold block mb-1">Ketentuan Tabungan Pintar 80/20</strong>
              Maksimal 80% dari total saldo dapat ditarik untuk operasional siswa. 20% dana abadi/cadangan dikunci demi proteksi tabungan jangka panjang.
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Receipt Print & WhatsApp Share Modal */}
      <ReceiptPrintAndShareModal
        isOpen={isWhatsappModalOpen}
        payload={whatsappPayload}
        schoolInfo={schoolInfo}
        onClose={() => setIsWhatsappModalOpen(false)}
      />
    </div>
  );
};
