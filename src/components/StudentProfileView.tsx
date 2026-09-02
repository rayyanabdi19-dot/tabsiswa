import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Student, Transaction, RecurringSavings } from '../types';
import { formatRupiah, getSavingsBreakdown } from '../utils/formatters';
import { showToast } from './Toast';
import { StudentAvatarPicker } from './StudentAvatarPicker';
import { validateNisnFormat, checkNisnDuplicateInList } from '../utils/workspaceStorage';

interface StudentProfileViewProps {
  student: Student;
  allTransactions: Transaction[];
  allStudents?: Student[];
  onUpdateStudent: (updated: Student) => void;
  onOpenDepositForStudent: (student: Student) => void;
  onOpenReport: () => void;
  onExecuteAutoDebit?: (student: Student, amount: number, notes: string) => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  allTransactions,
  allStudents = [],
  onUpdateStudent,
  onOpenDepositForStudent,
  onOpenReport,
  onExecuteAutoDebit,
}) => {
  // Form States
  const [formData, setFormData] = useState({
    name: student.name,
    nisn: student.nisn,
    className: student.className,
    address: student.address,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
  });

  // Password & PIN Update State
  const [studentPin, setStudentPin] = useState(student.pin || '123456');
  const [showStudentPin, setShowStudentPin] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Savings Goal State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState(student.avatarUrl || '');
  const [goalTitle, setGoalTitle] = useState(student.goal?.title || 'Bali Study Tour');
  const [goalTarget, setGoalTarget] = useState(student.goal?.targetAmount ? String(student.goal.targetAmount) : '2500000');
  const [goalDate, setGoalDate] = useState(student.goal?.targetDate || '15 June 2024 (3 Months left)');

  // Recurring Savings (Tabungan Rutin / Autodebet) State
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [isExecutingDebit, setIsExecutingDebit] = useState(false);

  const recurring: RecurringSavings = student.recurringSavings || {
    id: `rec-${student.id}`,
    isEnabled: true,
    amount: 150000,
    debitDate: 5,
    sourceAccount: 'bank_transfer',
    sourceName: 'Virtual Account BCA (08123456789 - Ortu)',
    frequency: 'monthly',
    category: 'Tabungan Wajib & Pendidikan',
    notes: 'Autodebet bulanan rutin setiap tanggal 5',
    lastDebitedDate: '2024-05-05',
    nextDebitDate: '2024-06-05',
    notificationReminder: true,
  };

  const [recEnabled, setRecEnabled] = useState(recurring.isEnabled);
  const [recAmount, setRecAmount] = useState(String(recurring.amount));
  const [recDate, setRecDate] = useState(recurring.debitDate || 5);
  const [recSource, setRecSource] = useState(recurring.sourceAccount || 'bank_transfer');
  const [recSourceName, setRecSourceName] = useState(recurring.sourceName || 'Virtual Account BCA');
  const [recCategory, setRecCategory] = useState(recurring.category || 'Tabungan Wajib & Pendidikan');
  const [recNotification, setRecNotification] = useState(recurring.notificationReminder ?? true);
  const [recNotes, setRecNotes] = useState(recurring.notes || '');

  // Student specific transactions
  const studentTransactions = allTransactions.filter(
    (t) => t.studentId === student.id || t.studentName === student.name
  );

  const goal = student.goal || {
    id: 'g1',
    title: 'Bali Study Tour',
    targetAmount: 2500000,
    currentAmount: student.balance,
    targetDate: '15 June 2024 (3 Months left)',
    status: 'active',
  };

  const goalPercentage = Math.min(
    Math.round((student.balance / (goal.targetAmount || 1)) * 100),
    100
  );

  // Compute next debit date string based on chosen day
  const calculateNextDebitDate = (day: number) => {
    const now = new Date();
    const currentDay = now.getDate();
    let targetMonth = now.getMonth();
    let targetYear = now.getFullYear();

    if (currentDay > day) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${day} ${monthNames[targetMonth]} ${targetYear}`;
  };

  // Real-time NISN Validation for Profile Form
  const profileNisnValidation = useMemo(() => {
    if (!formData.nisn.trim()) {
      return { isValid: false, message: 'NISN tidak boleh kosong.' };
    }
    const formatCheck = validateNisnFormat(formData.nisn);
    if (!formatCheck.isValid) {
      return { isValid: false, message: formatCheck.message };
    }
    if (allStudents && allStudents.length > 0) {
      const dupCheck = checkNisnDuplicateInList(allStudents, formatCheck.cleanNisn, student.id);
      if (dupCheck.isDuplicate) {
        return {
          isValid: false,
          message: `NISN "${formatCheck.cleanNisn}" sudah digunakan oleh siswa ${dupCheck.conflictingStudent?.name} (${dupCheck.conflictingStudent?.className}).`,
        };
      }
    }
    return {
      isValid: true,
      cleanNisn: formatCheck.cleanNisn,
      message: '✓ Format NISN valid dan tersedia.',
    };
  }, [formData.nisn, allStudents, student.id]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileNisnValidation.isValid) {
      showToast('Gagal Menyimpan Profil', profileNisnValidation.message, 'error');
      return;
    }

    onUpdateStudent({
      ...student,
      name: formData.name.trim(),
      nisn: profileNisnValidation.cleanNisn || formData.nisn.trim(),
      className: formData.className.trim(),
      address: formData.address.trim(),
      guardianName: formData.guardianName.trim(),
      guardianPhone: formData.guardianPhone.trim(),
      pin: studentPin.trim() || '123456',
    });
    showToast('Profil Diperbarui', 'Data identitas siswa berhasil disimpan ke sistem.');
  };

  const handleSavePin = (pinValue: string) => {
    const clean = pinValue.replace(/[^0-9]/g, '').slice(0, 6);
    const finalPin = clean.length > 0 ? clean.padStart(6, '0') : '123456';
    setStudentPin(finalPin);
    onUpdateStudent({
      ...student,
      pin: finalPin,
    });
    showToast('PIN Berhasil Diperbarui', `PIN login ${student.name} berhasil diubah menjadi: ${finalPin}`);
  };

  const handleResetPinDefault = () => {
    setStudentPin('123456');
    onUpdateStudent({
      ...student,
      pin: '123456',
    });
    showToast('PIN Direset', `PIN login ${student.name} dikembalikan ke default: 123456`);
  };

  const handleGenerateRandomPin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setStudentPin(randomPin);
    onUpdateStudent({
      ...student,
      pin: randomPin,
    });
    showToast('PIN Acak Dibuat', `PIN login baru dibuat: ${randomPin}`);
  };

  const handleCopyCredentials = () => {
    const text = `*KREDENSIAL LOGIN TABUNGAN SISWA*\nNama: ${student.name}\nNIS/NISN: ${student.nisn}\nKelas: ${student.className}\nPIN Login: ${studentPin}\n\nSilakan gunakan NISN dan PIN di atas untuk masuk ke Portal Tabungan Siswa.`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
    showToast('Kredensial Disalin', 'Data login siswa disalin ke clipboard untuk dibagikan via WhatsApp.');
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Kata Sandi Saat Ini Diperlukan', 'Harap masukkan kata sandi saat ini.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Kata Sandi Lemah', 'Kata sandi baru minimal 6 karakter.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Kata Sandi Tidak Cocok', 'Konfirmasi kata sandi tidak sama dengan kata sandi baru.', 'error');
      return;
    }

    showToast('Kata Sandi Berhasil Diubah', 'Akun siswa kini dilindungi dengan kata sandi baru.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(goalTarget.replace(/\D/g, '') || '0', 10);
    const updatedGoal = {
      id: goal.id,
      title: goalTitle,
      targetAmount: target,
      currentAmount: student.balance,
      targetDate: goalDate,
      status: 'active' as const,
    };

    onUpdateStudent({
      ...student,
      goal: updatedGoal,
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    setShowGoalModal(false);
    showToast('Target Tabungan Disimpan', `Target "${goalTitle}" berhasil diperbarui.`);
  };

  // Save Recurring Savings Settings
  const handleSaveRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(recAmount.replace(/\D/g, '') || '0', 10);
    if (parsedAmount <= 0) {
      showToast('Nominal Tidak Valid', 'Nominal autodebet harus lebih besar dari Rp 0.', 'error');
      return;
    }

    const nextDateStr = calculateNextDebitDate(recDate);
    const updatedRecurring: RecurringSavings = {
      id: recurring.id || `rec-${student.id}`,
      isEnabled: recEnabled,
      amount: parsedAmount,
      debitDate: recDate,
      sourceAccount: recSource as RecurringSavings['sourceAccount'],
      sourceName: recSourceName,
      frequency: 'monthly',
      category: recCategory,
      notes: recNotes || `Autodebet bulanan rutin setiap tanggal ${recDate}`,
      lastDebitedDate: recurring.lastDebitedDate,
      nextDebitDate: nextDateStr,
      notificationReminder: recNotification,
    };

    onUpdateStudent({
      ...student,
      recurringSavings: updatedRecurring,
    });

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });

    setShowRecurringModal(false);
    showToast(
      recEnabled ? 'Autodebet Aktif!' : 'Pengaturan Disimpan',
      recEnabled
        ? `Tabungan rutin ${formatRupiah(parsedAmount)} diset setiap tanggal ${recDate} per bulan.`
        : 'Tabungan rutin autodebet saat ini dijeda.'
    );
  };

  // Toggle Recurring Quick Switch (Instant Pause/Resume)
  const handleToggleRecurringQuick = () => {
    const nextState = !recurring.isEnabled;
    const updated = {
      ...recurring,
      isEnabled: nextState,
      nextDebitDate: nextState ? calculateNextDebitDate(recurring.debitDate) : '-',
    };

    onUpdateStudent({
      ...student,
      recurringSavings: updated,
    });

    showToast(
      nextState ? 'Autodebet Diaktifkan' : 'Autodebet Dijeda',
      nextState
        ? `Pemotongan otomatis setiap tanggal ${recurring.debitDate} kembali aktif.`
        : 'Pemotongan otomatis bulanan dinonaktifkan sementara.',
      nextState ? 'success' : 'info'
    );
  };

  // Manual Trigger / Test Execute Autodebit Now
  const handleExecuteAutoDebitNow = () => {
    if (isExecutingDebit) return;
    setIsExecutingDebit(true);

    const amount = recurring.amount || 150000;
    const todayStr = new Date().toISOString().split('T')[0];

    setTimeout(() => {
      setIsExecutingDebit(false);

      if (onExecuteAutoDebit) {
        onExecuteAutoDebit(
          student,
          amount,
          `Autodebet Rutin Bulanan (Tgl ${recurring.debitDate}) - ${recurring.sourceName || 'VA Bank'}`
        );
      } else {
        // Fallback update balance locally
        onUpdateStudent({
          ...student,
          balance: student.balance + amount,
          recurringSavings: {
            ...recurring,
            lastDebitedDate: todayStr,
            nextDebitDate: calculateNextDebitDate(recurring.debitDate),
          },
        });
      }

      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      });

      showToast(
        'Autodebet Berhasil Dieksekusi!',
        `Setoran rutin ${formatRupiah(amount)} berhasil diproses dari ${recurring.sourceName || 'Akun Terhubung'}.`
      );
    }, 700);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">Student Profile</h2>
        <p className="text-sm text-[#3f4940] mt-1">Manage personal information, savings goals, and account security.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Profile Card & Basic Info (lg:col-span-1) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Overview Card */}
          <div className="bg-[#ffffff] border border-[#becabd]/60 rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] text-center relative">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#107c41]/20 mx-auto shadow-md">
                <img
                  alt={student.name}
                  className="w-full h-full object-cover"
                  src={student.avatarUrl}
                  onError={(e) => {
                    // Fallback to avatar placeholder
                    (e.target as HTMLImageElement).src =
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuCnxBUwl02SVwyadeg4l9dwxInh2Ub3IZ47_EpYICav7_o6fcArr2BNlqq9V_6z5IhXHR45WdElLT8W4EbMjABwGM1nr0dEChtg5l2ya-PVen4emL9COraoIU7Pt3JtcGlksYy9Zs8-_K3_6PCr9FDeR0StcAczrrt2d6jwnfPJ5ZcL5hMpx3DitM3vXEuY6Ojeg7DltVClcrJIwKzg7b7vppEuxR7MU11xzQGm-g9jFUxLgvEklwJ';
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setTempAvatarUrl(student.avatarUrl);
                  setShowAvatarModal(true);
                }}
                className="absolute bottom-0 right-0 p-1.5 bg-[#006130] text-[#ffffff] rounded-full shadow hover:bg-[#107c41] transition-colors cursor-pointer"
                title="Ganti Foto dari Galeri"
              >
                <span className="material-symbols-outlined text-sm">photo_camera</span>
              </button>
            </div>

            <h3 className="text-lg font-bold text-[#1a1c1c]">{student.name}</h3>
            <p className="text-xs text-[#3f4940] mt-0.5">
              NISN: {student.nisn} | {student.className}
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#96f7af] text-[#00210c] text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#006130]"></span>
              <span>Active Saver</span>
            </div>
          </div>

          {/* Basic Information Form */}
          <div className="bg-[#ffffff] border border-[#becabd]/60 rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
            <h4 className="text-base font-bold text-[#1a1c1c] mb-4 pb-2 border-b border-[#becabd]/60 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005db5]">badge</span>
              <span>Basic Information</span>
            </h4>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#3f4940] block mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#faf9f8] border border-[#becabd]/80 rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#3f4940]">Student ID (NISN)</label>
                  {formData.nisn.trim() && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        profileNisnValidation.isValid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {profileNisnValidation.isValid ? 'Valid' : 'Invalid / Duplikat'}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  className={`w-full border rounded-lg p-2.5 text-xs text-[#1a1c1c] font-mono outline-none ${
                    profileNisnValidation.isValid
                      ? 'bg-[#faf9f8] border-[#becabd]/80 focus:border-[#005db5]'
                      : 'bg-rose-50 border-rose-400 focus:border-rose-500'
                  }`}
                />
                {formData.nisn.trim() && !profileNisnValidation.isValid && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                    {profileNisnValidation.message}
                  </p>
                )}
              </div>

              <div>
                <label className="font-semibold text-[#3f4940] block mb-1">Class / Grade</label>
                <input
                  type="text"
                  value={formData.className}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  className="w-full bg-[#faf9f8] border border-[#becabd]/80 rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#3f4940] block mb-1">Home Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-[#faf9f8] border border-[#becabd]/80 rounded-lg p-2 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-[#3f4940] block mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    className="w-full bg-[#faf9f8] border border-[#becabd]/80 rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#3f4940] block mb-1">Guardian Phone</label>
                  <input
                    type="text"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    className="w-full bg-[#faf9f8] border border-[#becabd]/80 rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-[#005db5] text-[#ffffff] rounded-lg font-semibold hover:bg-[#62a1fe] hover:text-[#00376f] transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">check</span>
                <span>Save Profile Changes</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Balance Banner, Goals, History, Security (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Total Savings Balance Banner Card */}
          {(() => {
            const breakdown = getSavingsBreakdown(student.balance);
            return (
              <div className="bg-[#107c41] text-[#ffffff] p-6 sm:p-8 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-15 pointer-events-none">
                  <span className="material-symbols-outlined text-[160px] text-[#ffffff]">account_balance_wallet</span>
                </div>

                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                      <span className="text-xs font-bold text-[#b6ffc5] uppercase tracking-wider">
                        Total Saldo Tabungan Siswa
                      </span>
                      <h3 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
                        {formatRupiah(student.balance)}
                      </h3>
                      <p className="text-xs text-[#b6ffc5] mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        <span>
                          Terdaftar sejak {student.initialDepositDate || '2023-07-15'} • {studentTransactions.length} Transaksi Tercatat
                        </span>
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/20 text-xs space-y-2 min-w-[200px]">
                      <div className="flex justify-between items-center text-[#b6ffc5]">
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="material-symbols-outlined text-xs">lock_open</span>
                          <span>Bisa Ditarik (80%):</span>
                        </span>
                        <span className="font-bold text-white">{formatRupiah(breakdown.available)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#ffdad6]">
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="material-symbols-outlined text-xs">lock</span>
                          <span>Terkunci (20%):</span>
                        </span>
                        <span className="font-bold text-white">{formatRupiah(breakdown.locked)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => onOpenDepositForStudent(student)}
                      className="bg-[#ffffff] text-[#006130] font-bold text-xs py-2.5 px-5 rounded-lg shadow-sm hover:bg-[#faf9f8] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">payments</span>
                      <span>Setor / Tarik Tabungan</span>
                    </button>
                    <button
                      onClick={onOpenReport}
                      className="bg-transparent border border-[#b6ffc5] text-[#ffffff] font-semibold text-xs py-2.5 px-5 rounded-lg hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                      <span>Unduh Rekening Koran</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tabungan Rutin (Autodebet Bulanan) Card */}
          <div className="bg-[#ffffff] border border-[#becabd]/60 rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#becabd]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#006130]/10 text-[#006130] flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">event_repeat</span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#1a1c1c] flex items-center gap-2">
                    <span>Tabungan Rutin (Autodebet)</span>
                    {recurring.isEnabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#96f7af] text-[#00210c]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#006130] animate-pulse"></span>
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e3e2e1] text-[#3f4940]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#707970]"></span>
                        Dijeda
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-[#3f4940]">Setoran otomatis berkala dari rekening / uang saku terpilih</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleRecurringQuick}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                    recurring.isEnabled
                      ? 'border-[#becabd] text-[#3f4940] hover:bg-[#f4f3f2]'
                      : 'border-[#006130] bg-[#006130]/10 text-[#006130] hover:bg-[#006130]/20'
                  }`}
                  title={recurring.isEnabled ? 'Jeda autodebet sementara' : 'Aktifkan autodebet'}
                >
                  <span className="material-symbols-outlined text-xs">
                    {recurring.isEnabled ? 'pause_circle' : 'play_circle'}
                  </span>
                  <span>{recurring.isEnabled ? 'Jeda' : 'Aktifkan'}</span>
                </button>

                <button
                  onClick={() => {
                    setRecEnabled(recurring.isEnabled);
                    setRecAmount(String(recurring.amount));
                    setRecDate(recurring.debitDate || 5);
                    setRecSource(recurring.sourceAccount || 'bank_transfer');
                    setRecSourceName(recurring.sourceName || 'Virtual Account BCA');
                    setRecCategory(recurring.category || 'Tabungan Wajib & Pendidikan');
                    setRecNotification(recurring.notificationReminder ?? true);
                    setRecNotes(recurring.notes || '');
                    setShowRecurringModal(true);
                  }}
                  className="text-xs font-bold text-[#ffffff] bg-[#006130] hover:bg-[#107c41] px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-xs">tune</span>
                  <span>Atur Jadwal</span>
                </button>
              </div>
            </div>

            {/* Recurring Status Banner & Highlights */}
            {recurring.isEnabled ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#faf9f8] p-3.5 rounded-xl border border-[#becabd]/40">
                    <span className="text-[11px] text-[#3f4940] font-medium block">Nominal Autodebet</span>
                    <span className="text-base sm:text-lg font-black text-[#006130] mt-0.5 block">
                      {formatRupiah(recurring.amount)}
                      <span className="text-[11px] font-normal text-[#3f4940]"> / bulan</span>
                    </span>
                    <span className="text-[10px] text-[#3f4940] mt-1 block truncate">
                      Kategori: {recurring.category || 'Tabungan Rutin'}
                    </span>
                  </div>

                  <div className="bg-[#faf9f8] p-3.5 rounded-xl border border-[#becabd]/40">
                    <span className="text-[11px] text-[#3f4940] font-medium block">Tanggal Penarikan</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-base sm:text-lg font-black text-[#005db5]">
                        Setiap Tgl {recurring.debitDate}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#006130] font-semibold mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">event</span>
                      <span>Berikutnya: {recurring.nextDebitDate || calculateNextDebitDate(recurring.debitDate)}</span>
                    </span>
                  </div>

                  <div className="bg-[#faf9f8] p-3.5 rounded-xl border border-[#becabd]/40">
                    <span className="text-[11px] text-[#3f4940] font-medium block">Sumber Rekening / Akun</span>
                    <span className="text-xs font-bold text-[#1a1c1c] mt-1 block truncate">
                      {recurring.sourceName || 'Virtual Account Bank'}
                    </span>
                    <span className="text-[10px] text-[#3f4940] mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-[#006130]">notifications_active</span>
                      <span>Pengingat H-1 Aktif</span>
                    </span>
                  </div>
                </div>

                {/* Savings Projection Bar & Quick Test Debit */}
                <div className="bg-[#f4f3f2] p-3.5 rounded-xl border border-[#becabd]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-bold text-[#1a1c1c] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#006130]">trending_up</span>
                      <span>Proyeksi Tabungan Rutin:</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-[#3f4940]">
                      <span>
                        Semester (6 Bln):{' '}
                        <strong className="text-[#006130] font-bold">
                          +{formatRupiah(recurring.amount * 6)}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        1 Tahun Ajaran (12 Bln):{' '}
                        <strong className="text-[#006130] font-bold">
                          +{formatRupiah(recurring.amount * 12)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isExecutingDebit}
                    onClick={handleExecuteAutoDebitNow}
                    className="w-full sm:w-auto bg-[#ffffff] border border-[#006130] text-[#006130] hover:bg-[#006130] hover:text-[#ffffff] font-bold text-xs py-2 px-3.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-sm ${isExecutingDebit ? 'animate-spin' : ''}`}>
                      {isExecutingDebit ? 'sync' : 'bolt'}
                    </span>
                    <span>{isExecutingDebit ? 'Memproses...' : 'Uji Jalankan Autodebet Sekarang'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#f4f3f2] p-5 rounded-xl border border-dashed border-[#becabd] text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-[#3f4940]">schedule</span>
                <p className="text-xs font-semibold text-[#1a1c1c]">Autodebet bulanan saat ini sedang dijeda</p>
                <p className="text-[11px] text-[#3f4940] max-w-md mx-auto">
                  Aktifkan fitur autodebet untuk mendisiplinkan tabungan siswa secara otomatis pada tanggal tertentu setiap bulan.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleToggleRecurringQuick}
                    className="bg-[#006130] text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-[#107c41] transition-colors cursor-pointer"
                  >
                    Aktifkan Autodebet Bulanan
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Savings Goals Card */}
          <div className="bg-[#ffffff] border border-[#becabd]/60 rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#becabd]/60">
              <div>
                <h4 className="text-base font-bold text-[#1a1c1c]">Active Savings Goals</h4>
                <p className="text-xs text-[#3f4940]">Lacak pencapaian target tabungan spesifik siswa</p>
              </div>
              <button
                onClick={() => setShowGoalModal(true)}
                className="text-xs font-semibold text-[#006130] bg-[#96f7af]/40 hover:bg-[#96f7af] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>Edit Target</span>
              </button>
            </div>

            {/* Goal Item Card */}
            <div className="p-4 rounded-xl bg-[#f4f3f2] border border-[#becabd]/60">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#62a1fe] text-[#00376f] flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-xl">flight</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-[#1a1c1c]">{goal.title}</h5>
                    <p className="text-xs text-[#3f4940]">{goal.targetDate}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-[#006130]">{goalPercentage}%</div>
                  <div className="text-[11px] text-[#3f4940]">
                    {formatRupiah(student.balance)} / {formatRupiah(goal.targetAmount)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#e3e2e1] h-2.5 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-[#006130] rounded-full transition-all duration-700"
                  style={{ width: `${goalPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Student Specific Recent Transactions */}
          <div className="bg-[#ffffff] border border-[#becabd]/60 rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#becabd]/60">
              <h4 className="text-base font-bold text-[#1a1c1c]">Personal Activity Stream</h4>
              <span className="text-xs text-[#3f4940]">{studentTransactions.length} Transaksi</span>
            </div>

            <div className="space-y-3">
              {studentTransactions.slice(0, 4).map((tx) => {
                const isDeposit = tx.type === 'deposit';
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#faf9f8] border border-[#becabd]/40 hover:bg-[#f4f3f2] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDeposit ? 'bg-[#107c41]/15 text-[#006130]' : 'bg-[#ffdad6] text-[#ba1a1a]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isDeposit ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[#1a1c1c]">{tx.notes || tx.category}</div>
                        <div className="text-[11px] text-[#3f4940]">{tx.time || tx.date}</div>
                      </div>
                    </div>

                    <div
                      className={`text-xs font-bold ${
                        isDeposit ? 'text-[#006130]' : 'text-[#ba1a1a]'
                      }`}
                    >
                      {isDeposit ? '+' : '-'}
                      {formatRupiah(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security & PIN Management Module (Diatur oleh Admin Sekolah) */}
          <div className="bg-[#ffffff] border border-[#becabd]/60 rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#becabd]/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006130] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">lock_person</span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#1a1c1c]">Pengaturan PIN Login Siswa</h4>
                  <p className="text-xs text-[#3f4940]">Kelola dan reset PIN akses portal tabungan untuk siswa ini</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="self-start sm:self-auto px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#006130] border border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-sm">
                  {copiedCreds ? 'done_all' : 'share'}
                </span>
                <span>{copiedCreds ? 'Kredensial Tersalin!' : 'Salin Kredensial (WA)'}</span>
              </button>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    PIN 6 Digit Saat Ini:
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-black font-mono tracking-widest text-[#006130]">
                      {showStudentPin ? studentPin : '••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowStudentPin(!showStudentPin)}
                      className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title={showStudentPin ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      <span className="material-symbols-outlined text-base">
                        {showStudentPin ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(studentPin);
                        setCopiedPin(true);
                        setTimeout(() => setCopiedPin(false), 2000);
                        showToast('PIN Disalin', `PIN ${studentPin} disalin ke clipboard.`);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title="Salin PIN"
                    >
                      <span className="material-symbols-outlined text-base">
                        {copiedPin ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Action Buttons: Reset Default & Generate Random */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="px-3 py-2 bg-white hover:bg-emerald-100/80 text-[#006130] border border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-sm">cached</span>
                    <span>Acak PIN Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPinDefault}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-sm">restart_alt</span>
                    <span>Reset Default (123456)</span>
                  </button>
                </div>
              </div>

              {/* Direct Custom PIN Form */}
              <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-xs font-semibold text-slate-700 shrink-0">
                  Ubah Manual PIN:
                </label>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={studentPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                      setStudentPin(val);
                    }}
                    placeholder="Contoh: 654321"
                    className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold tracking-widest text-[#006130] outline-none focus:border-[#006130]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSavePin(studentPin)}
                    className="px-4 py-1.5 bg-[#006130] hover:bg-[#107c41] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    Simpan PIN
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#3f4940] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#006130]">info</span>
              <span>
                Siswa dapat langsung login ke portal menggunakan <strong>NISN</strong> dan <strong>PIN 6 Digit</strong> yang telah diatur di atas.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Goal Edit Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#ffffff] rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#becabd]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-[#1a1c1c]">Atur Target Tabungan Siswa</h3>
              <button onClick={() => setShowGoalModal(false)} className="text-[#3f4940]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#3f4940] block mb-1">Nama Target Tabungan</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Bali Study Tour, Beli Laptop Pelajar"
                  className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] outline-none focus:border-[#005db5]"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-[#3f4940] block mb-1">Target Nominal (IDR)</label>
                <input
                  type="text"
                  value={goalTarget ? parseInt(goalTarget.replace(/\D/g, '') || '0', 10).toLocaleString('id-ID') : ''}
                  onChange={(e) => setGoalTarget(e.target.value.replace(/\D/g, ''))}
                  placeholder="2.500.000"
                  className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] outline-none focus:border-[#005db5]"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-[#3f4940] block mb-1">Estimasi Waktu Target</label>
                <input
                  type="text"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  placeholder="e.g. 15 Juni 2024 (3 Bulan lagi)"
                  className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] outline-none focus:border-[#005db5]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 border border-[#becabd] text-[#3f4940] font-semibold rounded-lg hover:bg-[#f4f3f2] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#006130] text-[#ffffff] font-semibold rounded-lg hover:bg-[#107c41] cursor-pointer shadow-2xs"
                >
                  Simpan Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabungan Rutin (Autodebet) Configuration Modal */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#ffffff] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#becabd] my-8 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-5 pb-3 border-b border-[#becabd]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#006130]/10 text-[#006130] flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">event_repeat</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a1c1c]">Pengaturan Tabungan Rutin</h3>
                  <p className="text-xs text-[#3f4940]">Autodebet bulanan terjadwal untuk {student.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecurringModal(false)}
                className="text-[#3f4940] hover:text-[#1a1c1c] p-1 rounded-lg hover:bg-[#f4f3f2] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRecurring} className="space-y-4 text-xs">
              {/* Enable / Disable Toggle */}
              <div className="p-3.5 rounded-xl bg-[#faf9f8] border border-[#becabd]/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#1a1c1c] text-xs flex items-center gap-1.5">
                    <span>Status Autodebet Bulanan</span>
                  </div>
                  <div className="text-[11px] text-[#3f4940] mt-0.5">
                    {recEnabled
                      ? 'Autodebet aktif dan akan berjalan sesuai tanggal terpilih.'
                      : 'Autodebet saat ini dinonaktifkan / dijeda.'}
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recEnabled}
                    onChange={(e) => setRecEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#e3e2e1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#becabd] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006130]"></div>
                </label>
              </div>

              {/* Tanggal Penarikan Autodebet */}
              <div>
                <label className="font-bold text-[#1a1c1c] block mb-1.5 flex items-center justify-between">
                  <span>Pilih Tanggal Autodebet Setiap Bulan</span>
                  <span className="text-[#005db5] font-semibold">Tgl {recDate} Tiap Bulan</span>
                </label>

                {/* Quick Date Buttons */}
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {[1, 5, 10, 15, 20, 25, 28].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setRecDate(day)}
                      className={`py-2 text-center rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        recDate === day
                          ? 'bg-[#005db5] text-[#ffffff] shadow-xs'
                          : 'bg-[#faf9f8] border border-[#becabd]/80 text-[#3f4940] hover:bg-[#e9e8e7]'
                      }`}
                    >
                      Tgl {day}
                    </button>
                  ))}
                </div>

                {/* Date Slider / Custom Selector */}
                <div className="flex items-center gap-3 bg-[#faf9f8] p-2.5 rounded-lg border border-[#becabd]/80">
                  <span className="text-[11px] text-[#3f4940] whitespace-nowrap">Pilih Tanggal Bebas (1 - 28):</span>
                  <input
                    type="range"
                    min={1}
                    max={28}
                    value={recDate}
                    onChange={(e) => setRecDate(Number(e.target.value))}
                    className="w-full accent-[#005db5] cursor-pointer"
                  />
                  <span className="font-black text-xs text-[#005db5] w-8 text-center">{recDate}</span>
                </div>
                <p className="text-[10px] text-[#3f4940] mt-1">
                  * Eksekusi berikutnya:{' '}
                  <strong className="text-[#006130]">{calculateNextDebitDate(recDate)}</strong>
                </p>
              </div>

              {/* Nominal Autodebet */}
              <div>
                <label className="font-bold text-[#1a1c1c] block mb-1.5">
                  Nominal Autodebet Bulanan (IDR)
                </label>

                {/* Quick Amount Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[25000, 50000, 100000, 150000, 250000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRecAmount(String(amt))}
                      className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        parseInt(recAmount.replace(/\D/g, '') || '0', 10) === amt
                          ? 'bg-[#006130] text-[#ffffff] shadow-2xs'
                          : 'bg-[#faf9f8] border border-[#becabd]/80 text-[#3f4940] hover:bg-[#e9e8e7]'
                      }`}
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-[#3f4940]">Rp</span>
                  <input
                    type="text"
                    value={
                      recAmount
                        ? parseInt(recAmount.replace(/\D/g, '') || '0', 10).toLocaleString('id-ID')
                        : ''
                    }
                    onChange={(e) => setRecAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="150.000"
                    className="w-full pl-10 pr-3 py-2.5 bg-[#faf9f8] border border-[#becabd] rounded-lg text-xs font-bold text-[#1a1c1c] outline-none focus:border-[#006130]"
                    required
                  />
                </div>
              </div>

              {/* Sumber Rekening & Metode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#3f4940] block mb-1">Metode / Sumber Dana</label>
                  <select
                    value={recSource}
                    onChange={(e) => {
                      const val = e.target.value as RecurringSavings['sourceAccount'];
                      setRecSource(val);
                      if (val === 'bank_transfer') setRecSourceName('Virtual Account Bank BCA');
                      else if (val === 'e_wallet') setRecSourceName('E-Wallet GoPay / OVO Siswa');
                      else if (val === 'uang_saku') setRecSourceName('Potong Uang Saku Tunai di Kasir');
                      else if (val === 'gaji_ortu') setRecSourceName('Autodebet Payroll Orang Tua');
                    }}
                    className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] outline-none focus:border-[#005db5]"
                  >
                    <option value="bank_transfer">Virtual Account Bank (BCA / Mandiri / BRI / BNI)</option>
                    <option value="e_wallet">E-Wallet (GoPay / OVO / DANA / ShopeePay)</option>
                    <option value="uang_saku">Potong Uang Saku Tunai Sekolah</option>
                    <option value="gaji_ortu">Autodebet Payroll / Rekening Wali</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#3f4940] block mb-1">Nama / Keterangan Rekening</label>
                  <input
                    type="text"
                    value={recSourceName}
                    onChange={(e) => setRecSourceName(e.target.value)}
                    placeholder="e.g. BCA 88129031 - Ibu Siswa"
                    className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] outline-none focus:border-[#005db5]"
                  />
                </div>
              </div>

              {/* Pos Kategori Tabungan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#3f4940] block mb-1">Alokasi Pos Tabungan</label>
                  <input
                    type="text"
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value)}
                    placeholder="e.g. Tabungan Wajib & Wisata"
                    className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] outline-none focus:border-[#005db5]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#3f4940] block mb-1">Catatan Tambahan</label>
                  <input
                    type="text"
                    value={recNotes}
                    onChange={(e) => setRecNotes(e.target.value)}
                    placeholder="Catatan debit..."
                    className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] outline-none focus:border-[#005db5]"
                  />
                </div>
              </div>

              {/* WhatsApp Notification Checkbox */}
              <div className="p-3 rounded-xl bg-[#faf9f8] border border-[#becabd]/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006130] text-lg">chat</span>
                  <div>
                    <span className="font-bold text-[#1a1c1c] block">Pengingat WhatsApp H-1</span>
                    <span className="text-[10px] text-[#3f4940]">
                      Kirim notifikasi otomatis sebelum saldo dipotong ke {student.guardianPhone || 'nomor wali'}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={recNotification}
                  onChange={(e) => setRecNotification(e.target.checked)}
                  className="rounded border-[#becabd] text-[#006130] focus:ring-[#006130] w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Dynamic Projection Calculation Card */}
              {(() => {
                const nominal = parseInt(recAmount.replace(/\D/g, '') || '0', 10);
                return (
                  <div className="p-3.5 rounded-xl bg-[#96f7af]/25 border border-[#006130]/30 text-[#00210c]">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="material-symbols-outlined text-sm text-[#006130]">insights</span>
                      <span>Kalkulator Akumulasi Tabungan:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                      <div className="bg-white/80 p-2 rounded-lg border border-[#006130]/20">
                        <span className="text-[10px] text-[#3f4940] block">3 Bulan</span>
                        <span className="font-black text-xs text-[#006130]">{formatRupiah(nominal * 3)}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-[#006130]/20">
                        <span className="text-[10px] text-[#3f4940] block">6 Bulan (1 Sem)</span>
                        <span className="font-black text-xs text-[#006130]">{formatRupiah(nominal * 6)}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-[#006130]/20">
                        <span className="text-[10px] text-[#3f4940] block">12 Bulan (1 Thn)</span>
                        <span className="font-black text-xs text-[#006130]">{formatRupiah(nominal * 12)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Actions */}
              <div className="pt-3 flex justify-end gap-2.5 border-t border-[#becabd]/40">
                <button
                  type="button"
                  onClick={() => setShowRecurringModal(false)}
                  className="px-4 py-2.5 border border-[#becabd] text-[#3f4940] font-semibold rounded-lg hover:bg-[#f4f3f2] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#006130] text-[#ffffff] font-bold rounded-lg hover:bg-[#107c41] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>Simpan Jadwal Autodebet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Avatar / Photo Modal (Ambil dari Galeri) */}
      {showAvatarModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setShowAvatarModal(false)}
        >
          <div
            className="bg-[#ffffff] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#becabd]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-[#becabd]/60 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006130] text-xl">photo_camera</span>
                <h3 className="text-base font-bold text-[#1a1c1c]">Ubah Foto Profil Siswa</h3>
              </div>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-[#6f7a6f] hover:text-[#1a1c1c] p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <StudentAvatarPicker
                currentAvatar={tempAvatarUrl}
                onChangeAvatar={setTempAvatarUrl}
                studentName={student.name}
              />

              <div className="pt-3 flex justify-end gap-2 border-t border-[#becabd]/50">
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(false)}
                  className="px-4 py-2 border border-[#becabd] text-[#3f4940] font-semibold text-xs rounded-lg hover:bg-[#e9e8e7]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateStudent({
                      ...student,
                      avatarUrl: tempAvatarUrl,
                    });
                    setShowAvatarModal(false);
                    showToast('Foto Diperbarui', `Foto profil ${student.name} berhasil disimpan.`);
                  }}
                  className="px-5 py-2 bg-[#006130] hover:bg-[#107c41] text-[#ffffff] font-bold text-xs rounded-lg shadow-sm transition-all"
                >
                  Simpan Foto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
