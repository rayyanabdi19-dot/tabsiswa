import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SchoolInfo, ClassInfo, Student, Transaction, UserSession } from '../types';
import { formatRupiah, formatDateCustom } from '../utils/formatters';
import { showToast } from './Toast';
import {
  getBackupStatus,
  downloadJsonBackup,
  validateAndParseBackupFile,
  getBackupHistory,
  BackupHistoryItem,
  BackupPayload,
} from '../utils/backupStorage';

interface BackupRestoreViewProps {
  schoolInfo: SchoolInfo;
  classes: ClassInfo[];
  students: Student[];
  transactions: Transaction[];
  user: UserSession;
  onRestoreData: (restoredData: {
    schoolInfo: SchoolInfo;
    classes: ClassInfo[];
    students: Student[];
    transactions: Transaction[];
  }) => void;
  onOpenSettings?: () => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  schoolInfo,
  classes,
  students,
  transactions,
  user,
  onRestoreData,
  onOpenSettings,
}) => {
  const [backupStatus, setBackupStatus] = useState(() => getBackupStatus());
  const [history, setHistory] = useState<BackupHistoryItem[]>(() => getBackupHistory());
  const [isExporting, setIsExporting] = useState(false);

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh status when mounted or after backup
  const refreshStatus = () => {
    setBackupStatus(getBackupStatus());
    setHistory(getBackupHistory());
  };

  const totalBalance = useMemo(() => {
    return students.reduce((sum, s) => sum + (s.balance || 0), 0);
  }, [students]);

  // Handle Download Full JSON Backup
  const handleDownloadBackup = () => {
    setIsExporting(true);
    try {
      const result = downloadJsonBackup(
        schoolInfo,
        classes,
        students,
        transactions,
        user.name || 'Admin Bendahara'
      );
      refreshStatus();
      showToast(
        'Backup Berhasil Diunduh',
        `File "${result.fileName}" berhasil disimpan. Seluruh data (${students.length} siswa & ${transactions.length} transaksi) telah diamankan.`
      );
    } catch (err: any) {
      showToast('Gagal Backup', err.message || 'Terjadi kesalahan saat membuat backup.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Export CSV Summary
  const handleExportCSVSummary = () => {
    try {
      const rows = [
        ['REKAPITULASI DATA TABUNGAN SISWA'],
        [`Lembaga / Sekolah: ${schoolInfo.name}`],
        [`Tanggal Export: ${new Date().toLocaleString('id-ID')}`],
        [`Total Siswa: ${students.length}`],
        [`Total Transaksi: ${transactions.length}`],
        [`Total Saldo: Rp ${totalBalance.toLocaleString('id-ID')}`],
        [],
        ['--- DAFTAR SISWA & SALDO ---'],
        ['NISN', 'Nama Siswa', 'Kelas', 'Wali', 'No HP Wali', 'Saldo (IDR)', 'PIN Akses'],
        ...students.map((s) => [
          `"${s.nisn}"`,
          `"${s.name}"`,
          `"${s.className}"`,
          `"${s.guardianName || '-'}"`,
          `"${s.guardianPhone || '-'}"`,
          s.balance,
          `"${s.pin || '123456'}"`,
        ]),
        [],
        ['--- RIWAYAT TRANSAKSI TERAKHIR ---'],
        ['ID Transaksi', 'Tanggal', 'NISN', 'Nama Siswa', 'Kelas', 'Tipe', 'Nominal (IDR)', 'Keterangan'],
        ...transactions.slice(0, 500).map((t) => [
          `"${t.id}"`,
          `"${t.date}"`,
          `"${t.studentNisn}"`,
          `"${t.studentName}"`,
          `"${t.className}"`,
          `"${t.type === 'deposit' ? 'Setor' : 'Tarik'}"`,
          t.amount,
          `"${t.notes || '-'}"`,
        ]),
      ];

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `rekap-tabsi-${(schoolInfo.name || 'sekolah').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Export CSV Berhasil', 'Rekapitulasi tabungan siswa telah diunduh.');
    } catch (err: any) {
      showToast('Export Gagal', err.message, 'error');
    }
  };

  // Handle File Selection for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setParsedBackup(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = validateAndParseBackupFile(content);
      if (validation.isValid && validation.data) {
        setParsedBackup(validation.data);
      } else {
        setParseError(validation.message);
      }
    };
    reader.onerror = () => {
      setParseError('Gagal membaca isi file yang dipilih.');
    };
    reader.readAsText(file);
  };

  // Handle Execute Restore
  const handleExecuteRestore = () => {
    if (!parsedBackup) return;

    setIsRestoring(true);
    try {
      onRestoreData({
        schoolInfo: parsedBackup.schoolInfo || schoolInfo,
        classes: parsedBackup.classes || classes,
        students: parsedBackup.students || [],
        transactions: parsedBackup.transactions || [],
      });

      setShowRestoreModal(false);
      setSelectedFile(null);
      setParsedBackup(null);
      refreshStatus();

      showToast(
        'Pemulihan Berhasil!',
        `Data berhasil dipulihkan. Memuat ${parsedBackup.students.length} siswa dan ${parsedBackup.transactions.length} riwayat transaksi.`
      );
    } catch (err: any) {
      showToast('Gagal Memulihkan', err.message || 'Terjadi kesalahan saat memulihkan data.', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#006130]/10 text-[#006130] border border-[#006130]/20">
            <span className="material-symbols-outlined text-3xl">settings_backup_restore</span>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Backup &amp; Pemulihan Data
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Pusat pencadangan berkala, pengamanan file data tabungan, dan pemulihan arsip database sekolah.
            </p>
          </div>
        </div>

        {/* Action Quick Link */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-slate-500">cloud_sync</span>
            <span>Pengaturan Cloud Drive</span>
          </button>
        )}
      </div>

      {/* 1. WEEKLY BACKUP RECOMMENDATION & STATUS BANNER */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border shadow-sm relative overflow-hidden transition-all ${
          backupStatus.statusLevel === 'urgent'
            ? 'bg-rose-50/90 border-rose-200 text-rose-950'
            : backupStatus.statusLevel === 'warning'
            ? 'bg-amber-50/90 border-amber-200 text-amber-950'
            : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                backupStatus.statusLevel === 'urgent'
                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                  : backupStatus.statusLevel === 'warning'
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-emerald-100 text-[#006130] border border-emerald-300'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">
                {backupStatus.statusLevel === 'urgent'
                  ? 'notification_important'
                  : backupStatus.statusLevel === 'warning'
                  ? 'warning'
                  : 'verified_user'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  {backupStatus.statusLevel === 'urgent'
                    ? '⚠️ Perhatian: Data Perlu Segera Dicadangkan'
                    : backupStatus.statusLevel === 'warning'
                    ? '⏱️ Pengingat: Jadwal Backup Rutin Mendekati Batas'
                    : '✓ Status Cadangan: Aman & Terkini'}
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    backupStatus.statusLevel === 'urgent'
                      ? 'bg-rose-200 text-rose-900 border border-rose-300'
                      : backupStatus.statusLevel === 'warning'
                      ? 'bg-amber-200 text-amber-900 border border-amber-300'
                      : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  {backupStatus.daysSinceLastBackup === null
                    ? 'Belum Pernah'
                    : backupStatus.daysSinceLastBackup === 0
                    ? 'Hari Ini'
                    : `${backupStatus.daysSinceLastBackup} Hari Lalu`}
                </span>
              </div>

              <p className="text-xs leading-relaxed max-w-2xl opacity-90">
                {backupStatus.message}
              </p>

              {/* Explicit 1-Week Recommendation Notice */}
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/70 px-3 py-1 rounded-xl mt-1 border border-black/5">
                <span className="material-symbols-outlined text-xs text-[#006130]">lightbulb</span>
                <span>
                  <strong>Rekomendasi Keamanan:</strong> Lakukan backup data secara rutin minimal{' '}
                  <span className="text-[#006130] font-extrabold underline decoration-emerald-500 underline-offset-2">
                    1 Minggu 1 Kali
                  </span>{' '}
                  untuk menjaga keamanan mutasi kas siswa.
                </span>
              </div>
            </div>
          </div>

          {/* Quick Backup Action Button */}
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={isExporting}
            className={`w-full lg:w-auto px-5 py-3 rounded-2xl text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shrink-0 ${
              backupStatus.statusLevel === 'urgent'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-[#006130] hover:bg-[#107c41] text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">cloud_download</span>
            <span>{isExporting ? 'Memproses Backup...' : 'Cadangkan Data Sekarang (1-Klik)'}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN WORKFLOW: EXPORT vs RESTORE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD A: BUAT FILE CADANGAN (EXPORT) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#006130]/10 border border-[#006130]/20 flex items-center justify-center text-[#006130]">
                  <span className="material-symbols-outlined text-xl">download</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    1. Buat &amp; Unduh Cadangan Data
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ekspor seluruh arsip database tabungan sekolah ke file offline.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-mono text-[10px] font-bold rounded-lg">
                JSON &amp; CSV
              </span>
            </div>

            {/* Current Dataset Overview Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-5 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Ringkasan Data yang Akan Dicadangkan:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Total Siswa</span>
                  <span className="text-base font-extrabold text-[#006130]">{students.length}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Rombel Kelas</span>
                  <span className="text-base font-extrabold text-[#005db5]">{classes.length}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Transaksi</span>
                  <span className="text-base font-extrabold text-amber-700">{transactions.length}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Total Saldo</span>
                  <span className="text-xs font-extrabold text-slate-900 truncate block mt-1" title={formatRupiah(totalBalance)}>
                    {formatRupiah(totalBalance)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1">
                <span className="material-symbols-outlined text-xs text-[#006130]">lock</span>
                <span>Termasuk: Pengaturan PIN siswa, nomor WhatsApp wali, dan tabungan terencana.</span>
              </div>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200/70">
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="w-full py-3 bg-[#006130] hover:bg-[#107c41] text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span className="material-symbols-outlined text-base">download_for_offline</span>
              <span>{isExporting ? 'Sedang Memproses...' : 'Unduh Backup Lengkap (.JSON)'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSVSummary}
              className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#005db5]">table_chart</span>
              <span>Unduh Rekap Pembukuan (.CSV / Excel)</span>
            </button>
          </div>
        </div>

        {/* CARD B: PEMULIHAN DARI FILE (RESTORE) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#005db5]/10 border border-[#005db5]/20 flex items-center justify-center text-[#005db5]">
                  <span className="material-symbols-outlined text-xl">upload_file</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    2. Pemulihan Data dari File (.JSON)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Muat dan pulihkan arsip cadangan tabungan sebelumnya ke sistem.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 font-mono text-[10px] font-bold rounded-lg">
                Restore
              </span>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            {/* Dropzone Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all mb-4 ${
                selectedFile && parsedBackup
                  ? 'border-emerald-400 bg-emerald-50/50'
                  : parseError
                  ? 'border-rose-400 bg-rose-50/50'
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-400'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-2xs border border-slate-200 mx-auto flex items-center justify-center text-[#005db5] mb-2">
                <span className="material-symbols-outlined text-2xl">
                  {selectedFile && parsedBackup ? 'check_circle' : 'file_upload'}
                </span>
              </div>
              <h4 className="font-bold text-xs text-slate-800">
                {selectedFile ? selectedFile.name : 'Klik untuk Pilih File Backup (.json)'}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti file`
                  : 'Mendukung file cadangan TABSI (.json)'}
              </p>
            </div>

            {/* Parse Feedback & Preview Card */}
            {parseError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2 mb-4">
                <span className="material-symbols-outlined text-base text-rose-600 shrink-0">error</span>
                <span>{parseError}</span>
              </div>
            )}

            {parsedBackup && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span>Pratinjau File Cadangan:</span>
                  <span className="text-[10px] text-emerald-800">
                    {formatDateCustom(parsedBackup.exportedAt, 'DD MMM YYYY, HH:mm')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">Siswa</span>
                    <span className="font-bold text-emerald-900">{parsedBackup.students.length}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">Kelas</span>
                    <span className="font-bold text-emerald-900">{parsedBackup.classes?.length || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">Transaksi</span>
                    <span className="font-bold text-emerald-900">{parsedBackup.transactions.length}</span>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-900 font-semibold">
                  Instansi: <strong>{parsedBackup.schoolInfo?.name || 'Sekolah'}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Action Restore Button */}
          <div className="pt-2 border-t border-slate-200/70">
            <button
              type="button"
              disabled={!parsedBackup || isRestoring}
              onClick={() => setShowRestoreModal(true)}
              className="w-full py-3 bg-[#005db5] hover:bg-[#004a93] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span className="material-symbols-outlined text-base">restore</span>
              <span>Pulihkan Data Sekarang</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. RIWAYAT SNAPSHOT BACKUP */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006130] text-xl">history</span>
            <h3 className="font-extrabold text-sm text-slate-900">
              Riwayat Pencadangan Terakhir
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {history.length} kali pencadangan tercatat
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            <span className="material-symbols-outlined text-3xl mb-1 text-slate-300 block">
              inventory_2
            </span>
            <span>Belum ada riwayat backup tercatat pada perangkat ini. Klik tombol di atas untuk mencadangkan data.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold">
                  <th className="pb-2">Waktu &amp; Tanggal</th>
                  <th className="pb-2">Nama File</th>
                  <th className="pb-2">Jumlah Siswa</th>
                  <th className="pb-2">Jumlah Transaksi</th>
                  <th className="pb-2">Total Saldo</th>
                  <th className="pb-2">Pengelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-800">
                      {formatDateCustom(item.date, 'DD MMM YYYY, HH:mm')}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-[#005db5] font-semibold">
                      {item.fileName}
                    </td>
                    <td className="py-2.5 text-slate-700 font-semibold">{item.totalStudents} Siswa</td>
                    <td className="py-2.5 text-slate-700 font-semibold">{item.totalTransactions} Transaksi</td>
                    <td className="py-2.5 font-bold font-mono text-emerald-700">
                      {formatRupiah(item.totalBalance)}
                    </td>
                    <td className="py-2.5 text-slate-500">{item.adminName || 'Admin'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRMATION RESTORE MODAL */}
      {showRestoreModal && parsedBackup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowRestoreModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-amber-200 max-w-md w-full p-6 sm:p-7 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Konfirmasi Pemulihan Data</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini akan menimpa data aktif saat ini dengan data dari file cadangan.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 mb-5 text-xs text-amber-950 space-y-2">
              <p className="font-semibold">Ringkasan Data yang Akan Dipulihkan:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>Lembaga: <strong>{parsedBackup.schoolInfo?.name}</strong></li>
                <li>Jumlah Siswa: <strong>{parsedBackup.students.length} Siswa</strong></li>
                <li>Jumlah Kelas: <strong>{parsedBackup.classes?.length || 0} Kelas</strong></li>
                <li>Riwayat Transaksi: <strong>{parsedBackup.transactions.length} Transaksi</strong></li>
              </ul>
              <p className="text-[11px] text-amber-800 pt-1 font-bold">
                ⚠️ Pastikan Anda telah mengunduh backup kondisi saat ini jika ingin menyimpan salinannya terlebih dahulu.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                disabled={isRestoring}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                className="px-5 py-2.5 bg-[#005db5] hover:bg-[#004a93] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">restore</span>
                <span>{isRestoring ? 'Memulihkan Data...' : 'Ya, Pulihkan Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
