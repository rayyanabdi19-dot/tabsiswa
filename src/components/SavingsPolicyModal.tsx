import React, { useState, useEffect } from 'react';
import {
  SavingsPolicy,
  SavingsPolicyChangeLogItem,
  SchoolInfo,
  UserSession,
} from '../types';
import {
  getStoredSavingsPolicy,
  getStoredPolicyChangeLog,
  updateSavingsPolicyWithAudit,
  formatRupiah,
  formatDateCustom,
} from '../utils/formatters';
import { showToast } from './Toast';

interface SavingsPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserSession | null;
  schoolInfo?: SchoolInfo;
  onPolicyUpdated?: (policy: SavingsPolicy) => void;
}

export const SavingsPolicyModal: React.FC<SavingsPolicyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  schoolInfo,
  onPolicyUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'changelog'>('config');

  // Policy Form State
  const [currentPolicy, setCurrentPolicy] = useState<SavingsPolicy>(() => getStoredSavingsPolicy());
  const [usablePercentage, setUsablePercentage] = useState<number>(() => currentPolicy.usablePercentage);
  const [policyName, setPolicyName] = useState<string>(() => currentPolicy.policyName || '');
  const [description, setDescription] = useState<string>(() => currentPolicy.description || '');

  // Change Log State
  const [changeLogs, setChangeLogs] = useState<SavingsPolicyChangeLogItem[]>(() => getStoredPolicyChangeLog());
  const [searchLogQuery, setSearchLogQuery] = useState('');

  // Password Confirmation Pop-up Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const active = getStoredSavingsPolicy();
      setCurrentPolicy(active);
      setUsablePercentage(active.usablePercentage);
      setPolicyName(active.policyName || '');
      setDescription(active.description || '');
      setChangeLogs(getStoredPolicyChangeLog());
      setConfirmError('');
      setAdminPassword('');
      setChangeReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const lockedPercentage = 100 - usablePercentage;
  const isRatioChanged =
    usablePercentage !== currentPolicy.usablePercentage ||
    lockedPercentage !== currentPolicy.lockedPercentage;

  // Preset Ratio Options
  const presets = [
    {
      usable: 80,
      locked: 20,
      title: 'Standar Disiplin 80/20',
      badge: 'Rekomendasi',
      desc: '80% likuid ditarik, 20% tabungan wajib akhir tahun.',
    },
    {
      usable: 70,
      locked: 30,
      title: 'Hemat Ketat 70/30',
      badge: 'Dana Wajib Tinggi',
      desc: '30% dikunci untuk persiapan kelulusan/wisuda.',
    },
    {
      usable: 85,
      locked: 15,
      title: 'Fleksibel 85/15',
      badge: 'Fleksibel',
      desc: 'Kelonggaran penarikan lebih besar untuk kebutuhan sekolah.',
    },
    {
      usable: 90,
      locked: 10,
      title: 'Minimal 90/10',
      badge: 'Kunci Ringan',
      desc: 'Hanya 10% saldo ditahan sebagai cadangan rekening.',
    },
    {
      usable: 100,
      locked: 0,
      title: 'Bebas Tarik 100/0',
      badge: 'Tanpa Kunci',
      desc: 'Siswa dapat menarik hingga 100% dari seluruh saldo.',
    },
  ];

  const handleApplyPreset = (usable: number, locked: number, title: string) => {
    setUsablePercentage(usable);
    setPolicyName(title);
  };

  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();

    if (usablePercentage < 0 || usablePercentage > 100) {
      showToast('Nilai Tidak Valid', 'Persentase harus berada di antara 0% hingga 100%.', 'error');
      return;
    }

    setConfirmError('');
    setAdminPassword('');
    if (!changeReason) {
      setChangeReason(`Penyesuaian rasio kunci saldo menjadi ${usablePercentage}% Bisa Ditarik / ${lockedPercentage}% Terkunci.`);
    }
    setIsConfirmModalOpen(true);
  };

  const handleExecuteUpdate = () => {
    if (!adminPassword.trim()) {
      setConfirmError('Harap masukkan kata sandi admin sekolah.');
      return;
    }

    if (!changeReason.trim()) {
      setConfirmError('Harap isi alasan/catatan perubahan kebijakan.');
      return;
    }

    setIsVerifying(true);
    setConfirmError('');

    setTimeout(() => {
      const result = updateSavingsPolicyWithAudit({
        newUsablePercentage: usablePercentage,
        newLockedPercentage: lockedPercentage,
        policyName: policyName || `Kebijakan Tabungan (${usablePercentage}% / ${lockedPercentage}%)`,
        description: description,
        adminName: currentUser?.name || schoolInfo?.treasurerName || 'Bendahara Sekolah',
        adminEmail: currentUser?.nisnOrEmail || schoolInfo?.email || 'admin.siti@bintanggemilang.sch.id',
        reason: changeReason.trim(),
        passwordConfirmation: adminPassword.trim(),
      });

      setIsVerifying(false);

      if (result.success && result.updatedPolicy) {
        setCurrentPolicy(result.updatedPolicy);
        setChangeLogs(getStoredPolicyChangeLog());
        setIsConfirmModalOpen(false);

        if (onPolicyUpdated) {
          onPolicyUpdated(result.updatedPolicy);
        }

        showToast(
          'Kebijakan Berhasil Diperbarui!',
          `Rasio baru (${result.updatedPolicy.usablePercentage}% / ${result.updatedPolicy.lockedPercentage}%) aktif & tercatat di Change Log.`
        );
        setActiveSubTab('changelog');
      } else {
        setConfirmError(result.message || 'Password salah atau gagal menyimpan kebijakan.');
        showToast('Otorisasi Gagal', result.message || 'Password admin tidak sesuai.', 'error');
      }
    }, 400);
  };

  const filteredLogs = changeLogs.filter((log) => {
    const q = searchLogQuery.toLowerCase();
    return (
      log.reason.toLowerCase().includes(q) ||
      log.adminName.toLowerCase().includes(q) ||
      log.timestamp.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#ffffff] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-[#becabd]/80 overflow-hidden relative">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#becabd]/50 bg-[#faf9f8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006130]/10 text-[#006130] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">lock_clock</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-[#1a1c1c] tracking-tight">
                  Pengaturan Rasio Kunci Saldo Tabungan
                </h3>
              </div>
              <p className="text-xs text-[#3f4940] mt-0.5">
                Konfigurasi batas likuiditas penarikan dan proteksi dana cadangan tabungan siswa.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#3f4940] hover:text-[#1a1c1c] hover:bg-[#e9e8e7] rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex border-b border-[#becabd]/50 bg-[#faf9f8] px-4 sm:px-5 shrink-0 gap-4">
          <button
            onClick={() => setActiveSubTab('config')}
            className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'config'
                ? 'border-[#006130] text-[#006130]'
                : 'border-transparent text-[#6f7a6f] hover:text-[#1a1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-base">tune</span>
            <span>Konfigurasi Rasio Saldo</span>
            {isRatioChanged && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('changelog')}
            className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'changelog'
                ? 'border-[#006130] text-[#006130]'
                : 'border-transparent text-[#6f7a6f] hover:text-[#1a1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-base">history_edu</span>
            <span>Change Log &amp; Riwayat Audit</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-[#e9e8e7] text-[#1a1c1c] rounded-full font-extrabold">
              {changeLogs.length}
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {activeSubTab === 'config' ? (
            <form onSubmit={handleOpenConfirmation} className="space-y-6 text-xs">
              {/* Active Policy Status Banner */}
              <div className="p-4 rounded-xl bg-[#faf9f8] border border-[#becabd]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6f7a6f]">
                    Kebijakan Saat Ini Aktif:
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h4 className="text-sm font-black text-[#1a1c1c]">
                      {currentPolicy.policyName || 'Standar Disiplin Kas'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#96f7af] text-[#00210c]">
                      {currentPolicy.usablePercentage}% Likuid / {currentPolicy.lockedPercentage}% Kunci
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6f7a6f] mt-1">
                    Terakhir diubah oleh <strong className="text-[#1a1c1c]">{currentPolicy.updatedBy || 'Bendahara'}</strong> pada{' '}
                    {currentPolicy.lastUpdated ? formatDateCustom(currentPolicy.lastUpdated, 'DD MMM YYYY, HH:mm') : '-'}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px] bg-white px-3 py-1.5 rounded-lg border border-[#becabd]/60 text-[#006130] font-bold shrink-0">
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  <span>Otorisasi Diperlukan</span>
                </div>
              </div>

              {/* Presets Selection */}
              <div>
                <label className="font-extrabold text-[#1a1c1c] block mb-2 text-xs">
                  1. Pilih Rekomendasi Preset Rasio atau Sesuaikan Sendiri:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {presets.map((p) => {
                    const isSelected = usablePercentage === p.usable && lockedPercentage === p.locked;
                    return (
                      <button
                        key={p.title}
                        type="button"
                        onClick={() => handleApplyPreset(p.usable, p.locked, p.title)}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#006130] bg-[#006130]/5 ring-2 ring-[#006130]/20 shadow-xs'
                            : 'border-[#becabd]/70 hover:border-[#006130]/40 bg-[#ffffff] hover:bg-[#faf9f8]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs text-[#1a1c1c]">{p.title}</span>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${
                                isSelected
                                  ? 'bg-[#006130] text-white'
                                  : 'bg-[#f4f3f2] text-[#3f4940]'
                              }`}
                            >
                              {p.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#6f7a6f] leading-tight">{p.desc}</p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#becabd]/40 flex justify-between items-center text-[11px]">
                          <span className="font-bold text-[#006130]">Bisa: {p.usable}%</span>
                          <span className="font-bold text-[#ba1a1a]">Kunci: {p.locked}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Dual Slider */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#f4f3f2] border border-[#becabd]/60 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-[#1a1c1c] text-xs">
                    2. Penggeser Persentase Fleksibel:
                  </label>
                  <span className="text-[11px] font-mono text-[#3f4940]">
                    Total: <strong className="text-[#1a1c1c]">100%</strong>
                  </span>
                </div>

                {/* Visual Ratio Bar */}
                <div className="h-6 w-full rounded-xl overflow-hidden flex shadow-inner border border-[#becabd]/60">
                  <div
                    style={{ width: `${usablePercentage}%` }}
                    className="bg-emerald-600 transition-all duration-150 flex items-center justify-center text-[10px] font-black text-white px-2 whitespace-nowrap overflow-hidden"
                    title={`Bisa Ditarik: ${usablePercentage}%`}
                  >
                    {usablePercentage > 12 ? `Bisa Ditarik: ${usablePercentage}%` : `${usablePercentage}%`}
                  </div>
                  <div
                    style={{ width: `${lockedPercentage}%` }}
                    className="bg-rose-600 transition-all duration-150 flex items-center justify-center text-[10px] font-black text-white px-2 whitespace-nowrap overflow-hidden"
                    title={`Terkunci Cadangan: ${lockedPercentage}%`}
                  >
                    {lockedPercentage > 12 ? `Terkunci: ${lockedPercentage}%` : `${lockedPercentage}%`}
                  </div>
                </div>

                {/* Range Slider Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">lock_open</span>
                      <span>Saldo Bisa Ditarik ({usablePercentage}%)</span>
                    </span>
                    <span className="font-bold text-rose-800 flex items-center gap-1">
                      <span>Saldo Wajib Terkunci ({lockedPercentage}%)</span>
                      <span className="material-symbols-outlined text-sm">lock</span>
                    </span>
                  </div>

                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={usablePercentage}
                    onChange={(e) => setUsablePercentage(parseInt(e.target.value, 10))}
                    className="w-full accent-[#006130] h-2 bg-[#becabd] rounded-lg cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-[#6f7a6f] font-mono">
                    <span>50% (Ketat)</span>
                    <span>70%</span>
                    <span>80% (Standar)</span>
                    <span>90%</span>
                    <span>100% (Bebas)</span>
                  </div>
                </div>

                {/* Simulation Card */}
                <div className="p-3.5 bg-white rounded-xl border border-[#becabd]/60">
                  <span className="text-[10px] font-bold text-[#6f7a6f] uppercase tracking-wider block mb-1">
                    Simulasi Penerapan (Contoh Saldo Siswa Rp 1.000.000):
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 font-semibold block">Maksimal Bisa Ditarik:</span>
                      <span className="text-sm font-black text-emerald-700">
                        {formatRupiah(1000000 * (usablePercentage / 100))}
                      </span>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">({usablePercentage}% dari saldo)</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                      <span className="text-[10px] text-rose-800 font-semibold block">Dana Terkunci Wajib:</span>
                      <span className="text-sm font-black text-rose-700">
                        {formatRupiah(1000000 * (lockedPercentage / 100))}
                      </span>
                      <span className="text-[10px] text-rose-600 block mt-0.5">({lockedPercentage}% dana cadangan)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy Description and Name */}
              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-[#3f4940] block mb-1">
                    Nama Kebijakan (Opsional):
                  </label>
                  <input
                    type="text"
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
                    placeholder="Contoh: Kebijakan Disiplin Kas Semester Genap 2024"
                    className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#3f4940] block mb-1">
                    Keterangan Kebijakan / Dasar Keputusan:
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Deskripsi tujuan kebijakan ini untuk siswa dan komite sekolah..."
                    className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#becabd]/60 flex justify-end items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-[#becabd] text-[#3f4940] font-semibold rounded-lg hover:bg-[#e9e8e7] cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#006130] hover:bg-[#107c41] text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">enhanced_encryption</span>
                  <span>Simpan &amp; Otorisasi Admin</span>
                </button>
              </div>
            </form>
          ) : (
            /* CHANGE LOG / AUDIT TRAIL TAB */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-[#1a1c1c]">
                    Riwayat Perubahan Kebijakan Tabungan (Audit Trail)
                  </h4>
                  <p className="text-[11px] text-[#6f7a6f]">
                    Daftar rekam jejak resmi setiap perubahan rasio kunci tabungan lengkap dengan otorisasi admin.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#6f7a6f] text-sm">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchLogQuery}
                    onChange={(e) => setSearchLogQuery(e.target.value)}
                    placeholder="Cari alasan / admin..."
                    className="pl-8 pr-3 py-1.5 bg-[#faf9f8] border border-[#becabd] rounded-lg text-xs outline-none focus:border-[#006130] w-full sm:w-48"
                  />
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[#becabd] rounded-xl text-[#6f7a6f] text-xs">
                  <span className="material-symbols-outlined text-3xl mb-1">history_toggle_off</span>
                  <p>Tidak ada catatan riwayat perubahan yang sesuai.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="p-4 rounded-xl border border-[#becabd]/70 bg-white shadow-2xs hover:border-[#006130]/40 transition-colors space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#becabd]/40 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#006130]"></span>
                          <span className="font-extrabold text-xs text-[#1a1c1c]">
                            {log.adminName}
                          </span>
                          {log.adminEmail && (
                            <span className="text-[10px] text-[#6f7a6f] font-mono">
                              ({log.adminEmail})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-[#6f7a6f] font-mono">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          <span>{formatDateCustom(log.timestamp, 'DD MMM YYYY, HH:mm')}</span>
                        </div>
                      </div>

                      {/* Diff Badges */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-[11px] text-[#6f7a6f] font-semibold">Perubahan Rasio:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-[#f4f3f2] text-[#3f4940] font-mono text-[11px] border border-[#becabd]">
                            {log.oldUsablePercentage}% / {log.oldLockedPercentage}%
                          </span>
                          <span className="material-symbols-outlined text-xs text-[#6f7a6f]">
                            arrow_forward
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-[#96f7af] text-[#00210c] font-bold font-mono text-[11px] border border-[#006130]/30 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">verified</span>
                            <span>{log.newUsablePercentage}% Likuid / {log.newLockedPercentage}% Kunci</span>
                          </span>
                        </div>
                      </div>

                      {/* Reason and Note */}
                      <div className="text-xs bg-[#faf9f8] p-2.5 rounded-lg border border-[#becabd]/40">
                        <p className="text-[#1a1c1c] font-medium leading-relaxed">
                          <strong>Alasan / SK:</strong> {log.reason}
                        </p>
                        {log.adminConfirmationNote && (
                          <p className="text-[10px] text-[#006130] font-semibold mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">security</span>
                            <span>{log.adminConfirmationNote}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= POP-UP MODAL KONFIRMASI PASSWORD ADMIN ================= */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[#becabd] space-y-4">
            {/* Header Dialog */}
            <div className="text-center space-y-1 pb-3 border-b border-[#becabd]/60">
              <div className="w-12 h-12 rounded-full bg-[#006130]/10 text-[#006130] flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
              </div>
              <h4 className="text-base font-extrabold text-[#1a1c1c]">
                Otorisasi Password Admin Sekolah
              </h4>
              <p className="text-xs text-[#3f4940]">
                Masukkan kata sandi admin untuk mengonfirmasi perubahan rasio saldo tabungan.
              </p>
            </div>

            {/* Change Summary Box */}
            <div className="p-3.5 bg-[#faf9f8] rounded-xl border border-[#becabd]/60 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#6f7a6f]">Rasio Sebelumnya:</span>
                <span className="font-mono font-bold text-[#3f4940]">
                  {currentPolicy.usablePercentage}% Likuid / {currentPolicy.lockedPercentage}% Kunci
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#becabd]/40">
                <span className="font-bold text-[#006130]">Rasio Baru:</span>
                <span className="font-mono font-extrabold text-[#006130] bg-[#96f7af]/60 px-2 py-0.5 rounded">
                  {usablePercentage}% Likuid / {lockedPercentage}% Kunci
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1a1c1c] block mb-1">
                  Alasan / Catatan Perubahan Kebijakan:
                </label>
                <input
                  type="text"
                  required
                  value={changeReason}
                  onChange={(e) => {
                    setChangeReason(e.target.value);
                    setConfirmError('');
                  }}
                  placeholder="Contoh: Keputusan Rapat Komite Sekolah Semester Baru"
                  className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#1a1c1c] block mb-1">
                  Password Admin / Bendahara:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    required
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setConfirmError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExecuteUpdate();
                      }
                    }}
                    placeholder="Masukkan password admin (default: admin123)..."
                    className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 pr-10 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-[#6f7a6f] hover:text-[#1a1c1c] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-[#6f7a6f] mt-1">
                  Password akun demo bendahara: <code className="font-bold font-mono text-[#006130]">admin123</code>
                </p>
              </div>

              {confirmError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-1.5 animate-shake">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>{confirmError}</span>
                </div>
              )}
            </div>

            {/* Modal Buttons */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2.5 border border-[#becabd] text-[#3f4940] font-bold text-xs rounded-xl hover:bg-[#f4f3f2] cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isVerifying}
                onClick={handleExecuteUpdate}
                className="flex-1 py-2.5 bg-[#006130] hover:bg-[#107c41] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-sm ${isVerifying ? 'animate-spin' : ''}`}>
                  {isVerifying ? 'progress_activity' : 'check_circle'}
                </span>
                <span>{isVerifying ? 'Memverifikasi...' : 'Konfirmasi & Terapkan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
