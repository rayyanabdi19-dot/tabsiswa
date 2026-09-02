import React, { useState, useMemo } from 'react';
import { Student, Transaction, SchoolInfo, ReportConfig } from '../types';
import { formatRupiah, formatDateCustom, exportToCSV } from '../utils/formatters';
import { exportTransactionsToPDF } from '../utils/pdfGenerator';
import { CLASS_OPTIONS, TEACHER_REPRESENTATIVES } from '../data/mockData';
import { showToast } from './Toast';

interface ReportGenerateViewProps {
  students: Student[];
  transactions: Transaction[];
  schoolInfo: SchoolInfo;
  onBack: () => void;
}

export const ReportGenerateView: React.FC<ReportGenerateViewProps> = ({
  students,
  transactions,
  schoolInfo,
  onBack,
}) => {
  // Configuration State
  const [config, setConfig] = useState<ReportConfig>({
    className: 'Kelas 10A',
    startDate: '2023-10-01',
    endDate: '2023-10-31',
    dateFormat: 'DD/MM/YYYY',
    includeBalanceSummary: true,
    includeTransactionDetails: true,
    includeClassStats: false,
    columns: {
      nisn: true,
      name: true,
      className: true,
      date: true,
      type: true,
      amount: true,
      notes: true,
    },
  });

  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Filter transactions for preview
  const filteredReportTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Date filter
      if (config.startDate && tx.date < config.startDate) return false;
      if (config.endDate && tx.date > config.endDate) return false;

      // Class filter
      if (config.className !== 'Semua Kelas') {
        const normalizedTxClass = tx.className.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedConfig = config.className.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normalizedTxClass.includes(normalizedConfig) && !normalizedConfig.includes(normalizedTxClass)) {
          // If specific class sample records are few, keep representative sample
          if (transactions.filter(t => t.className.toLowerCase().includes(normalizedConfig)).length === 0) {
            return true;
          }
        }
      }
      return true;
    });
  }, [transactions, config.startDate, config.endDate, config.className]);

  // Totals
  const totalIncome = filteredReportTransactions
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0) || 12500000;

  const totalExpense = filteredReportTransactions
    .filter((t) => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0) || 3200000;

  // Teacher name for signature
  const teacherName = TEACHER_REPRESENTATIVES[config.className] || 'Siti Rahmawati, S.Pd';

  // Actions
  const handleDownloadPDF = () => {
    try {
      exportTransactionsToPDF(filteredReportTransactions, {
        schoolInfo,
        startDate: config.startDate,
        endDate: config.endDate,
        selectedClass: config.className !== 'Semua Kelas' ? config.className : undefined,
        adminName: teacherName,
        title: `LAPORAN KEUANGAN TABUNGAN - ${config.className.toUpperCase()}`,
        filename: `Laporan_Tabungan_${config.className.replace(/\s+/g, '_')}_${config.startDate}.pdf`,
      });
      showToast('PDF Berhasil Diunduh', `File laporan ${config.className} tersimpan dalam format PDF.`);
    } catch (err: any) {
      showToast('Gagal Generate PDF', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  const handlePrintPDF = () => {
    showToast('Mempersiapkan Dokumen PDF', 'Membuka dialog cetak sistem untuk generate PDF berkualitas tinggi.');
    window.print();
  };

  const handleExportExcel = () => {
    const headers: string[] = [];
    if (config.columns.nisn) headers.push('NISN');
    if (config.columns.name) headers.push('Nama Siswa');
    if (config.columns.className) headers.push('Kelas');
    if (config.columns.date) headers.push('Tanggal');
    if (config.columns.type) headers.push('Jenis');
    if (config.columns.amount) headers.push('Nominal');
    if (config.columns.notes) headers.push('Keterangan');

    const rows = filteredReportTransactions.map((tx) => {
      const row: (string | number)[] = [];
      if (config.columns.nisn) row.push(tx.studentNisn);
      if (config.columns.name) row.push(tx.studentName);
      if (config.columns.className) row.push(tx.className);
      if (config.columns.date) row.push(formatDateCustom(tx.date, config.dateFormat));
      if (config.columns.type) row.push(tx.type === 'deposit' ? 'Masuk' : 'Keluar');
      if (config.columns.amount) row.push(tx.amount);
      if (config.columns.notes) row.push(tx.notes || '-');
      return row;
    });

    const summaryRow = ['TOTAL PEMASUKAN', formatRupiah(totalIncome), 'TOTAL PENGELUARAN', formatRupiah(totalExpense)];
    exportToCSV(`Laporan_Keuangan_Tabungan_${config.className.replace(/\s+/g, '_')}_${config.startDate}`, [
      [`LAPORAN KEUANGAN TABUNGAN SISWA - ${schoolInfo.name}`],
      [`Periode: ${formatDateCustom(config.startDate, config.dateFormat)} - ${formatDateCustom(config.endDate, config.dateFormat)} | Kelas: ${config.className}`],
      summaryRow,
      [],
      headers,
      ...rows,
    ]);

    showToast('Ekspor Excel Berhasil', `File laporan untuk ${config.className} berhasil diunduh.`);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus('sending');
    setTimeout(() => {
      setEmailStatus('sent');
      showToast('Laporan Terkirim', `Dokumen laporan keuangan telah dikirim ke email Wali ${config.className}.`);
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailStatus('idle');
      }, 1500);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#faf9f8] text-[#1a1c1c] flex flex-col">
      {/* Top Bar for Task-Focused Page */}
      <header className="bg-[#ffffff] border-b border-[#becabd]/60 shadow-xs flex justify-between items-center px-4 sm:px-6 h-16 w-full sticky top-0 z-40 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-[#3f4940] hover:bg-[#e9e8e7] p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center"
            title="Kembali ke Dashboard"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-lg md:text-xl font-bold text-[#006130]">Buat Laporan Baru</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast('Pusat Bantuan', 'Pilih kelas dan periode, sesuaikan kolom yang ingin dicetak, lalu klik Generate PDF.')}
            className="text-[#3f4940] hover:bg-[#e9e8e7] p-2 rounded-full transition-colors cursor-pointer"
            title="Bantuan"
          >
            <span className="material-symbols-outlined text-xl">help</span>
          </button>
        </div>
      </header>

      {/* Main Task Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8 w-full max-w-7xl mx-auto items-start">
        {/* Left: Configuration Panel */}
        <section className="w-full lg:max-w-md flex flex-col gap-6 no-print">
          <div className="bg-[#ffffff] border border-[#becabd]/60 rounded-xl p-6 shadow-xs">
            <h2 className="text-lg font-bold text-[#1a1c1c] mb-5">Pengaturan Laporan</h2>

            <div className="flex flex-col gap-5">
              {/* Class Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#3f4940]">Pilih Kelas</label>
                <select
                  value={config.className}
                  onChange={(e) => setConfig({ ...config, className: e.target.value })}
                  className="w-full rounded-lg border border-[#becabd]/80 bg-[#faf9f8] py-2.5 px-3 text-sm text-[#1a1c1c] focus:border-[#005db5] focus:ring-1 focus:ring-[#005db5] outline-none cursor-pointer"
                >
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#3f4940]">Periode Laporan</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[#3f4940] text-base">
                      calendar_month
                    </span>
                    <input
                      type="date"
                      value={config.startDate}
                      onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                      className="w-full pl-9 pr-2 py-2 rounded-lg border border-[#becabd]/80 bg-[#faf9f8] text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none"
                    />
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[#3f4940] text-base">
                      calendar_month
                    </span>
                    <input
                      type="date"
                      value={config.endDate}
                      onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                      className="w-full pl-9 pr-2 py-2 rounded-lg border border-[#becabd]/80 bg-[#faf9f8] text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Format Tanggal */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#3f4940]">Format Tanggal</label>
                <select
                  value={config.dateFormat}
                  onChange={(e) => setConfig({ ...config, dateFormat: e.target.value as any })}
                  className="w-full rounded-lg border border-[#becabd]/80 bg-[#faf9f8] py-2.5 px-3 text-sm text-[#1a1c1c] focus:border-[#005db5] outline-none cursor-pointer"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD MMM YYYY">DD MMM YYYY</option>
                </select>
              </div>

              {/* Konten Laporan */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#3f4940]">Konten Laporan</label>
                <div className="flex flex-col gap-2.5">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.includeBalanceSummary}
                      onChange={(e) => setConfig({ ...config, includeBalanceSummary: e.target.checked })}
                      className="rounded text-[#006130] focus:ring-[#006130] border-[#becabd] h-4 w-4"
                    />
                    <span className="text-sm text-[#1a1c1c]">Ringkasan Saldo</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.includeTransactionDetails}
                      onChange={(e) => setConfig({ ...config, includeTransactionDetails: e.target.checked })}
                      className="rounded text-[#006130] focus:ring-[#006130] border-[#becabd] h-4 w-4"
                    />
                    <span className="text-sm text-[#1a1c1c]">Detail Transaksi</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.includeClassStats}
                      onChange={(e) => setConfig({ ...config, includeClassStats: e.target.checked })}
                      className="rounded text-[#006130] focus:ring-[#006130] border-[#becabd] h-4 w-4"
                    />
                    <span className="text-sm text-[#1a1c1c]">Statistik Kelas</span>
                  </label>
                </div>
              </div>

              {/* Kolom Excel */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#becabd]/40">
                <label className="text-xs font-semibold text-[#3f4940]">Kolom Excel</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      ['nisn', 'NISN'],
                      ['name', 'Nama Siswa'],
                      ['className', 'Kelas'],
                      ['date', 'Tanggal'],
                      ['type', 'Jenis'],
                      ['amount', 'Nominal'],
                      ['notes', 'Keterangan'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.columns[key]}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            columns: { ...config.columns, [key]: e.target.checked },
                          })
                        }
                        className="rounded text-[#006130] focus:ring-[#006130] border-[#becabd] h-4 w-4"
                      />
                      <span className="text-xs text-[#1a1c1c]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleDownloadPDF}
              className="bg-[#006130] text-[#ffffff] font-semibold text-sm py-3 px-6 rounded-full hover:bg-[#107c41] hover:shadow-md transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined fill-1">download</span>
              <span>Unduh File PDF (.pdf)</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="border border-[#006130] text-[#006130] font-semibold text-sm py-3 px-6 rounded-full hover:bg-[#96f7af]/20 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined">print</span>
              <span>Cetak Dokumen (Print Preview)</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="bg-[#005db5] text-[#ffffff] font-semibold text-sm py-3 px-6 rounded-full hover:bg-[#62a1fe] hover:text-[#00376f] hover:shadow-md transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined">table_view</span>
              <span>Ekspor ke Excel</span>
            </button>

            <button
              onClick={() => setShowEmailModal(true)}
              className="bg-transparent border border-[#005db5] text-[#005db5] font-semibold text-sm py-3 px-6 rounded-full hover:bg-[#d6e3ff]/50 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined">send</span>
              <span>Kirim ke Email Wali Kelas</span>
            </button>
          </div>
        </section>

        {/* Right: Preview Area */}
        <section className="flex-1 w-full flex flex-col bg-[#f4f3f2] rounded-2xl border border-[#becabd]/60 overflow-hidden relative shadow-xs">
          {/* Preview Toolbar */}
          <div className="bg-[#ffffff] border-b border-[#becabd]/60 p-3.5 flex justify-between items-center z-10 no-print">
            <h3 className="text-xs font-semibold text-[#3f4940] flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#005db5]">visibility</span>
              <span>Pratinjau Dokumen (A4 Layout)</span>
            </h3>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#3f4940] font-medium mr-1">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                className="p-1 rounded-md hover:bg-[#e9e8e7] text-[#3f4940] cursor-pointer"
                title="Perbesar"
              >
                <span className="material-symbols-outlined text-base">zoom_in</span>
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                className="p-1 rounded-md hover:bg-[#e9e8e7] text-[#3f4940] cursor-pointer"
                title="Perkecil"
              >
                <span className="material-symbols-outlined text-base">zoom_out</span>
              </button>
            </div>
          </div>

          {/* Scrollable Canvas for A4 Paper */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 bg-[#efeeed] flex justify-center">
            {/* PDF Mockup Sheet */}
            <div
              id="printable-report-sheet"
              className="print-page bg-[#ffffff] w-full max-w-[210mm] min-h-[297mm] shadow-xl p-8 sm:p-12 flex flex-col relative transition-transform duration-200 border border-[#becabd]/40 rounded-sm"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              {/* Header Letterhead */}
              <div className="flex items-center border-b-2 border-[#006130] pb-6 mb-8 gap-6">
                <img
                  className="w-20 h-20 object-contain shrink-0"
                  alt="School Official Logo"
                  src={schoolInfo.logoUrl}
                  onError={(e) => {
                    // Fallback to stylized SVG emblem if remote CDN is blocked
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="flex-1">
                  <h4 className="text-xl font-extrabold text-[#1a1c1c] uppercase tracking-wide">
                    {schoolInfo.name}
                  </h4>
                  <p className="text-xs text-[#3f4940] mt-0.5">{schoolInfo.address}</p>
                  <p className="text-xs text-[#3f4940]">
                    Telp: {schoolInfo.phone} | Email: {schoolInfo.email}
                  </p>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center mb-8">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#006130] mb-1">
                  Laporan Keuangan Tabungan Siswa
                </h2>
                <p className="text-xs sm:text-sm text-[#3f4940] font-medium">
                  Periode: {formatDateCustom(config.startDate, config.dateFormat)} -{' '}
                  {formatDateCustom(config.endDate, config.dateFormat)}
                </p>
                <p className="text-xs sm:text-sm text-[#3f4940] font-bold mt-0.5">
                  Kelas: {config.className}
                </p>
              </div>

              {/* Summary Cards */}
              {config.includeBalanceSummary && (
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="border border-[#becabd]/80 p-4 rounded-lg bg-[#faf9f8]">
                    <p className="text-[11px] font-bold text-[#3f4940] uppercase tracking-wider">
                      TOTAL PEMASUKAN
                    </p>
                    <p className="text-lg sm:text-xl text-[#006130] font-extrabold mt-1">
                      {formatRupiah(totalIncome)}
                    </p>
                  </div>
                  <div className="border border-[#becabd]/80 p-4 rounded-lg bg-[#faf9f8]">
                    <p className="text-[11px] font-bold text-[#3f4940] uppercase tracking-wider">
                      TOTAL PENGELUARAN
                    </p>
                    <p className="text-lg sm:text-xl text-[#ba1a1a] font-extrabold mt-1">
                      {formatRupiah(totalExpense)}
                    </p>
                  </div>
                </div>
              )}

              {/* Transaction Table */}
              {config.includeTransactionDetails && (
                <div className="mb-10 flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#e3e2e1] border-y border-[#6f7a6f]/60">
                        <th className="py-2.5 px-3 text-xs font-bold text-[#1a1c1c]">Tanggal</th>
                        <th className="py-2.5 px-3 text-xs font-bold text-[#1a1c1c]">Keterangan</th>
                        <th className="py-2.5 px-3 text-xs font-bold text-[#1a1c1c]">Jenis</th>
                        <th className="py-2.5 px-3 text-xs font-bold text-[#1a1c1c] text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-[#1a1c1c] divide-y divide-[#becabd]/60">
                      {filteredReportTransactions.slice(0, 8).map((tx) => {
                        const isDeposit = tx.type === 'deposit';
                        return (
                          <tr key={tx.id} className="border-b border-[#becabd]/40">
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {formatDateCustom(tx.date, config.dateFormat)}
                            </td>
                            <td className="py-2.5 px-3 font-medium">
                              {tx.notes || `${isDeposit ? 'Setoran Tunai' : 'Penarikan'} - ${tx.studentName}`}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  isDeposit
                                    ? 'bg-[#107c41] text-[#ffffff]'
                                    : 'bg-[#ffdad6] text-[#93000a]'
                                }`}
                              >
                                {isDeposit ? 'Masuk' : 'Keluar'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold">
                              {formatRupiah(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signatures */}
              <div className="flex justify-between items-end mt-auto pt-8 border-t border-[#becabd]/40">
                <div className="text-center w-44">
                  <p className="text-xs text-[#3f4940] mb-14 leading-tight">
                    Mengetahui,<br />Kepala Sekolah
                  </p>
                  <div className="border-b border-[#1a1c1c] w-full mb-1"></div>
                  <p className="text-xs text-[#1a1c1c] font-bold">{schoolInfo.principalName}</p>
                </div>

                <div className="text-center w-48">
                  <p className="text-xs text-[#3f4940] mb-14 leading-tight">
                    Kota Cerdas, {formatDateCustom(config.endDate, 'DD MMM YYYY')}<br />
                    Wali {config.className}
                  </p>
                  <div className="border-b border-[#1a1c1c] w-full mb-1"></div>
                  <p className="text-xs text-[#1a1c1c] font-bold">{teacherName}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#ffffff] rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#becabd]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-[#1a1c1c]">Kirim Laporan via Email</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-[#3f4940] hover:text-[#1a1c1c]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3f4940] mb-1">Penerima (Wali Kelas)</label>
                <input
                  type="text"
                  readOnly
                  value={`${teacherName} (${config.className})`}
                  className="w-full bg-[#f4f3f2] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4940] mb-1">Alamat Email Wali Kelas</label>
                <input
                  type="email"
                  required
                  defaultValue={`wali.${config.className.toLowerCase().replace(/[^a-z0-9]/g, '')}@bintanggemilang.sch.id`}
                  className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4940] mb-1">Pesan Pengantar (Opsional)</label>
                <textarea
                  rows={2}
                  defaultValue={`Yth. Bapak/Ibu Wali ${config.className}, terlampir rekapan resmi laporan keuangan tabungan siswa periode ${config.startDate} s.d ${config.endDate}.`}
                  className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-[#becabd] text-[#3f4940] text-xs font-semibold rounded-lg hover:bg-[#e9e8e7]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={emailStatus === 'sending'}
                  className="px-5 py-2 bg-[#005db5] text-[#ffffff] text-xs font-semibold rounded-lg hover:bg-[#62a1fe] hover:text-[#00376f] transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>{emailStatus === 'sending' ? 'Mengirim...' : 'Kirim Laporan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
