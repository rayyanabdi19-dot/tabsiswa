import React, { useState, useMemo } from 'react';
import { Transaction, SchoolInfo } from '../types';
import { formatRupiah, formatDateCustom, exportToCSV } from '../utils/formatters';
import { exportTransactionsToPDF } from '../utils/pdfGenerator';
import { showToast } from './Toast';

interface HistoryViewProps {
  transactions: Transaction[];
  onOpenReport: () => void;
  schoolInfo?: SchoolInfo;
  adminName?: string;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  transactions,
  onOpenReport,
  schoolInfo,
  adminName,
}) => {
  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY'>('DD/MM/YYYY');
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // PDF Export State
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Column Customization
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    studentDetails: true,
    type: true,
    amount: true,
    status: true,
    admin: true,
    notes: false,
  });

  // Filter application
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Date filter
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;

      // Type filter
      if (selectedType === 'Deposit (Setor)' && tx.type !== 'deposit') return false;
      if (selectedType === 'Withdrawal (Tarik)' && tx.type !== 'withdrawal') return false;

      // Class filter
      if (selectedClass !== 'All Classes') {
        const normalizedTxClass = tx.className.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedFilter = selectedClass.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normalizedTxClass.includes(normalizedFilter) && !normalizedFilter.includes(normalizedTxClass)) {
          return false;
        }
      }

      // Search filter
      if (searchFilter) {
        const query = searchFilter.toLowerCase();
        const matchesName = tx.studentName.toLowerCase().includes(query);
        const matchesNisn = tx.studentNisn.toLowerCase().includes(query);
        const matchesNotes = tx.notes?.toLowerCase().includes(query);
        if (!matchesName && !matchesNisn && !matchesNotes) return false;
      }

      return true;
    });
  }, [transactions, startDate, endDate, selectedType, selectedClass, searchFilter]);

  // Pagination calculation
  const totalRecords = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRecords = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  // Handle Export Direct to PDF
  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      exportTransactionsToPDF(filteredTransactions, {
        schoolInfo,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        selectedClass: selectedClass !== 'All Classes' ? selectedClass : undefined,
        selectedType: selectedType !== 'All Types' ? selectedType : undefined,
        adminName: adminName || 'Siti Rahmawati, S.E. (Bendahara)',
        title: 'LAPORAN RIWAYAT TRANSAKSI TABUNGAN SISWA',
        filename: `Laporan_Transaksi_Tabungan_${new Date().toISOString().split('T')[0]}.pdf`,
      });
      showToast(
        'Dokumen PDF Berhasil Diunduh',
        `Laporan memuat ${filteredTransactions.length} riwayat transaksi dengan kop dan tanda tangan resmi.`
      );
    } catch (err: any) {
      showToast('Gagal Generate PDF', err.message || 'Terjadi kesalahan saat membuat PDF.', 'error');
    } finally {
      setIsExportingPDF(false);
      setShowExportMenu(false);
    }
  };

  // Handle Export Excel / CSV
  const handleExportExcel = () => {
    const headers = ['ID Transaksi', 'Tanggal', 'Nama Siswa', 'NISN', 'Kelas', 'Jenis', 'Nominal (Rp)', 'Status', 'Admin', 'Catatan'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      formatDateCustom(tx.date, dateFormat === 'MM/DD/YYYY' ? 'DD/MM/YYYY' : dateFormat),
      tx.studentName,
      tx.studentNisn,
      tx.className,
      tx.type === 'deposit' ? 'Setoran (Masuk)' : 'Penarikan (Keluar)',
      tx.amount,
      tx.status === 'success' ? 'Berhasil' : 'Menunggu Konfirmasi',
      tx.adminName,
      tx.notes || '',
    ]);

    exportToCSV(`Riwayat_Transaksi_Tabungan_${new Date().toISOString().split('T')[0]}`, [headers, ...rows]);
    showToast('Export Excel Berhasil', `${filteredTransactions.length} baris data berhasil diekspor ke file spreadsheet.`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">Transaction History</h2>
          <p className="text-sm text-[#3f4940] mt-1">Lihat, saring, dan cetak seluruh riwayat mutasi keuangan tabungan.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* PDF Export Dropdown / Button */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-[#006130] hover:bg-[#107c41] text-[#ffffff] font-semibold text-xs py-2 px-4 rounded-full shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              <span>Export PDF</span>
              <span className="material-symbols-outlined text-[14px]">
                {showExportMenu ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#becabd] py-1.5 z-50 animate-fadeIn">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className="w-full px-3.5 py-2.5 text-left text-xs text-[#1a1c1c] hover:bg-[#faf9f8] flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#006130] text-base">download</span>
                  <div>
                    <span className="font-bold block">Unduh File PDF (.pdf)</span>
                    <span className="text-[10px] text-[#6f7a6f]">Format laporan resmi A4</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onOpenReport();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs text-[#1a1c1c] hover:bg-[#faf9f8] flex items-center gap-2.5 cursor-pointer border-t border-[#becabd]/40"
                >
                  <span className="material-symbols-outlined text-[#005db5] text-base">preview</span>
                  <div>
                    <span className="font-bold block">Pratinjau Kustom & Cetak</span>
                    <span className="text-[10px] text-[#6f7a6f]">Kustomisasi kop & tanda tangan</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleExportExcel}
            className="border border-[#6f7a6f] text-[#006130] font-semibold text-xs py-2 px-4 rounded-full hover:bg-[#efeeed] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">description</span>
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setShowColumnModal(true)}
            className="border border-[#6f7a6f] text-[#3f4940] font-semibold text-xs py-2 px-4 rounded-full hover:bg-[#efeeed] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">settings_suggest</span>
            <span>Customize Columns</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Filters + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Filter Sidebar */}
        <div className="lg:col-span-1 bg-[#ffffff] border border-[#becabd]/60 rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] h-fit space-y-5">
          <div className="flex justify-between items-center border-b border-[#becabd]/60 pb-3">
            <h3 className="text-base font-bold text-[#1a1c1c]">Filters</h3>
            {(startDate || endDate || selectedType !== 'All Types' || selectedClass !== 'All Classes' || searchFilter) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSelectedType('All Types');
                  setSelectedClass('All Classes');
                  setSearchFilter('');
                  setCurrentPage(1);
                }}
                className="text-xs text-[#005db5] hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Quick Search */}
            <div>
              <label className="block text-xs font-semibold text-[#3f4940] mb-1.5">Search</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#3f4940] text-sm">
                  search
                </span>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari siswa atau NIS..."
                  className="w-full bg-[#faf9f8] border border-[#becabd]/80 rounded-lg pl-8 pr-3 py-2 text-xs text-[#1a1c1c] focus:border-[#005db5] focus:ring-1 focus:ring-[#005db5] outline-none"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-semibold text-[#3f4940] mb-1.5">Date Range</label>
              <div className="flex flex-col gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#faf9f8] border border-[#becabd]/80 rounded-md px-3 py-2 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none"
                />
                <span className="text-center text-[#3f4940] text-[11px] font-medium">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#faf9f8] border border-[#becabd]/80 rounded-md px-3 py-2 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none"
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-xs font-semibold text-[#3f4940] mb-1.5">Type</label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#faf9f8] border border-[#becabd]/80 rounded-md px-3 py-2 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none cursor-pointer"
              >
                <option>All Types</option>
                <option>Deposit (Setor)</option>
                <option>Withdrawal (Tarik)</option>
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="block text-xs font-semibold text-[#3f4940] mb-1.5">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#faf9f8] border border-[#becabd]/80 rounded-md px-3 py-2 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none cursor-pointer"
              >
                <option>All Classes</option>
                <option>10A</option>
                <option>10B</option>
                <option>X-A</option>
                <option>X-B</option>
                <option>XI-A</option>
                <option>XII-A</option>
                <option>12B</option>
              </select>
            </div>

            {/* Excel Date Format */}
            <div>
              <label className="block text-xs font-semibold text-[#3f4940] mb-1.5">Excel Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as any)}
                className="w-full bg-[#faf9f8] border border-[#becabd]/80 rounded-md px-3 py-2 text-xs text-[#1a1c1c] focus:border-[#005db5] outline-none cursor-pointer"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>

            <button
              onClick={() => {
                showToast('Filter Diterapkan', `Ditemukan ${filteredTransactions.length} transaksi sesuai kriteria.`);
              }}
              className="w-full border border-[#005db5] text-[#005db5] font-semibold text-xs py-2.5 rounded-full hover:bg-[#d6e3ff]/60 transition-all cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Right Data Table Area */}
        <div className="lg:col-span-3 bg-[#ffffff] border border-[#becabd]/60 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f4f3f2] border-b border-[#becabd]/60">
                  {visibleColumns.date && (
                    <th className="p-4 text-xs font-bold text-[#3f4940] whitespace-nowrap">Date</th>
                  )}
                  {visibleColumns.studentDetails && (
                    <th className="p-4 text-xs font-bold text-[#3f4940] whitespace-nowrap">Student Details</th>
                  )}
                  {visibleColumns.type && (
                    <th className="p-4 text-xs font-bold text-[#3f4940] whitespace-nowrap">Type</th>
                  )}
                  {visibleColumns.amount && (
                    <th className="p-4 text-xs font-bold text-[#3f4940] text-right whitespace-nowrap">Amount (Rp)</th>
                  )}
                  {visibleColumns.status && (
                    <th className="p-4 text-xs font-bold text-[#3f4940] whitespace-nowrap">Status</th>
                  )}
                  {visibleColumns.admin && (
                    <th className="p-4 text-xs font-bold text-[#3f4940] whitespace-nowrap">Admin</th>
                  )}
                  {visibleColumns.notes && (
                    <th className="p-4 text-xs font-bold text-[#3f4940] whitespace-nowrap">Notes</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#becabd]/40 text-sm text-[#1a1c1c]">
                {currentRecords.length > 0 ? (
                  currentRecords.map((tx) => {
                    const isDeposit = tx.type === 'deposit';
                    return (
                      <tr key={tx.id} className="hover:bg-[#f4f3f2]/60 transition-colors group">
                        {visibleColumns.date && (
                          <td className="p-4 whitespace-nowrap text-xs text-[#3f4940]">
                            {formatDateCustom(tx.date, dateFormat === 'MM/DD/YYYY' ? 'DD/MM/YYYY' : dateFormat)}
                          </td>
                        )}

                        {visibleColumns.studentDetails && (
                          <td className="p-4">
                            <div className="font-semibold text-sm text-[#1a1c1c]">{tx.studentName}</div>
                            <div className="text-xs text-[#3f4940] mt-0.5">
                              ID: {tx.studentNisn} • {tx.className}
                            </div>
                          </td>
                        )}

                        {visibleColumns.type && (
                          <td className="p-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold text-xs ${
                                isDeposit ? 'text-[#006130]' : 'text-[#ba1a1a]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isDeposit ? 'arrow_downward' : 'arrow_upward'}
                              </span>
                              <span>{isDeposit ? 'Deposit' : 'Withdrawal'}</span>
                            </span>
                          </td>
                        )}

                        {visibleColumns.amount && (
                          <td className="p-4 text-right font-bold text-sm whitespace-nowrap">
                            {tx.amount.toLocaleString('id-ID')}
                          </td>
                        )}

                        {visibleColumns.status && (
                          <td className="p-4 whitespace-nowrap">
                            {tx.status === 'success' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#107c41] text-[#ffffff] text-[11px] font-semibold">
                                Berhasil
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#e3e2e1] text-[#3f4940] border border-[#becabd] text-[11px] font-semibold">
                                Menunggu Konfirmasi
                              </span>
                            )}
                          </td>
                        )}

                        {visibleColumns.admin && (
                          <td className="p-4 whitespace-nowrap text-xs text-[#3f4940]">{tx.adminName}</td>
                        )}

                        {visibleColumns.notes && (
                          <td className="p-4 text-xs text-[#3f4940] max-w-xs truncate">{tx.notes || '-'}</td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-[#3f4940]">
                      Tidak ada transaksi yang cocok dengan filter yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-[#becabd]/60 bg-[#faf9f8] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#3f4940]">
              Showing {totalRecords === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalRecords)} of{' '}
              {totalRecords} records
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-full hover:bg-[#e9e8e7] transition-colors text-[#3f4940] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>

              <span className="text-xs font-semibold text-[#1a1c1c] px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-full hover:bg-[#e9e8e7] transition-colors text-[#3f4940] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customize Columns Modal */}
      {showColumnModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setShowColumnModal(false)}
        >
          <div
            className="bg-[#ffffff] rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#becabd]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-[#1a1c1c]">Customize Table Columns</h3>
              <button
                onClick={() => setShowColumnModal(false)}
                className="text-[#6f7a6f] hover:text-[#1a1c1c] p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-[#3f4940] mb-4">Pilih kolom yang ingin Anda tampilkan pada tabel riwayat transaksi:</p>

            <div className="space-y-3 mb-6">
              {Object.entries({
                date: 'Tanggal (Date)',
                studentDetails: 'Detail Siswa (Nama & Kelas)',
                type: 'Jenis Transaksi (Deposit/Withdrawal)',
                amount: 'Nominal (Rp)',
                status: 'Status Verifikasi',
                admin: 'Petugas / Admin',
                notes: 'Catatan Transaksi',
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={visibleColumns[key as keyof typeof visibleColumns]}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded text-[#006130] focus:ring-[#006130] border-[#becabd]"
                  />
                  <span className="text-sm text-[#1a1c1c]">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowColumnModal(false)}
                className="px-4 py-2 bg-[#006130] text-[#ffffff] text-xs font-semibold rounded-lg hover:bg-[#107c41] transition-colors"
              >
                Terapkan Kolom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
