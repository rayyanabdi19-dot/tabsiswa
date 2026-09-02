import React, { useState, useMemo } from 'react';
import { Student, Transaction, ClassInfo } from '../types';
import { formatRupiah, getSavingsBreakdown } from '../utils/formatters';
import { exportStudentsToCSV, exportStudentsToJSON } from '../utils/studentDataHelpers';
import { StudentImportModal } from './StudentImportModal';
import { StudentFormModal } from './StudentFormModal';
import { ClassManagementSection } from './ClassManagementSection';
import { ConfirmDeleteModal, DeleteTarget } from './ConfirmDeleteModal';
import { showToast } from './Toast';

interface StudentsViewProps {
  students: Student[];
  transactions: Transaction[];
  classes: ClassInfo[];
  onSelectStudent: (student: Student) => void;
  onOpenTransactionForStudent: (student: Student, type?: 'deposit' | 'withdrawal') => void;
  onImportStudents: (imported: Student[], mode: 'merge' | 'replace') => void;
  onSaveStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onSaveClass: (classData: ClassInfo, oldName?: string) => void;
  onDeleteClass: (classId: string, className: string) => void;
  onOpenReportForClass?: (className: string) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  transactions,
  classes,
  onSelectStudent,
  onOpenTransactionForStudent,
  onImportStudents,
  onSaveStudent,
  onDeleteStudent,
  onSaveClass,
  onDeleteClass,
  onOpenReportForClass,
}) => {
  const [subTab, setSubTab] = useState<'students' | 'classes'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'balance-desc' | 'balance-asc' | 'nisn'>('name-asc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleCopyStudentCredentials = (s: Student) => {
    const pin = s.pin || '123456';
    const text = `*KREDENSIAL LOGIN TABUNGAN SISWA*\nNama: ${s.name}\nNIS/NISN: ${s.nisn}\nKelas: ${s.className}\nPIN: ${pin}\n\nSilakan gunakan NISN dan PIN untuk login ke portal siswa.`;
    navigator.clipboard.writeText(text);
    showToast('Kredensial Login Disalin', `NISN & PIN untuk ${s.name} (${pin}) berhasil disalin.`);
  };

  // Extract unique class names list
  const classNames = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => set.add(c.name));
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [classes, students]);

  // Highlight text helper for real-time search matches
  const highlightMatch = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed || !text) return text;
    const regex = new RegExp(`(${trimmed.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === trimmed.toLowerCase() ? (
            <mark key={i} className="bg-[#96f7af] text-[#00210c] font-bold px-0.5 rounded-xs">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Filter & Sort students
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        const matchesClass = selectedClass === 'all' || s.className === selectedClass;
        const q = searchQuery.toLowerCase().trim();
        if (!q) return matchesClass;

        // Clean query and values for flexible matching (e.g. spaces in NISN)
        const cleanQuery = q.replace(/[\s-]/g, '');
        const cleanNisn = (s.nisn || '').toLowerCase().replace(/[\s-]/g, '');

        const matchesName = s.name.toLowerCase().includes(q);
        const matchesNisn = cleanNisn.includes(cleanQuery) || s.nisn.toLowerCase().includes(q);
        const matchesClassName = s.className.toLowerCase().includes(q);
        const matchesGuardian = s.guardianName ? s.guardianName.toLowerCase().includes(q) : false;

        return matchesClass && (matchesName || matchesNisn || matchesClassName || matchesGuardian);
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'balance-desc':
            return b.balance - a.balance;
          case 'balance-asc':
            return a.balance - b.balance;
          case 'nisn':
            return a.nisn.localeCompare(b.nisn);
          default:
            return 0;
        }
      });
  }, [students, selectedClass, searchQuery, sortBy]);

  // Aggregate metrics
  const totalBalance = useMemo(() => {
    return students.reduce((acc, s) => acc + s.balance, 0);
  }, [students]);

  const totalBreakdown = useMemo(() => {
    return getSavingsBreakdown(totalBalance);
  }, [totalBalance]);

  const averageBalance = useMemo(() => {
    return students.length > 0 ? Math.round(totalBalance / students.length) : 0;
  }, [totalBalance, students.length]);

  const handleExportCSV = () => {
    exportStudentsToCSV(filteredStudents, `data-siswa-tabungan-${selectedClass === 'all' ? 'semua' : selectedClass}.csv`);
    showToast('Export CSV Berhasil', `${filteredStudents.length} data siswa berhasil diunduh ke format Excel/CSV.`);
    setExportMenuOpen(false);
  };

  const handleExportJSON = () => {
    exportStudentsToJSON(filteredStudents, `data-siswa-tabungan-${selectedClass === 'all' ? 'semua' : selectedClass}.json`);
    showToast('Export JSON Berhasil', `${filteredStudents.length} data siswa berhasil diunduh ke format JSON.`);
    setExportMenuOpen(false);
  };

  const handlePrint = () => {
    window.print();
    setExportMenuOpen(false);
  };

  const handleDeleteConfirm = (student: Student) => {
    setDeleteTarget({ type: 'student', item: student });
    setIsDeleteModalOpen(true);
  };

  const handleExecuteDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'student') {
      const student = deleteTarget.item;
      onDeleteStudent(student.id);
      showToast('Siswa Dihapus', `Data siswa ${student.name} telah berhasil dihapus.`, 'info');
    }
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
            Data Siswa &amp; Pengaturan Kelas
          </h2>
          <p className="text-sm text-[#3f4940] mt-1">
            Kelola data siswa, informasi wali, pembagian kelas &amp; wali kelas, serta aturan penarikan 80% dan 20% terkunci.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {subTab === 'students' ? (
            <>
              {/* Import Button */}
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex-1 md:flex-none px-3.5 py-2.5 bg-[#ffffff] hover:bg-[#f4f3f2] border border-[#becabd] text-[#006130] font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">upload_file</span>
                <span>Import Siswa</span>
              </button>

              {/* Export Dropdown */}
              <div className="relative flex-1 md:flex-none">
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="w-full px-3.5 py-2.5 bg-[#ffffff] hover:bg-[#f4f3f2] border border-[#becabd] text-[#005db5] font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  <span>Export Siswa</span>
                  <span className="material-symbols-outlined text-base">expand_more</span>
                </button>

                {exportMenuOpen && (
                  <div
                    className="absolute right-0 mt-1 w-48 bg-[#ffffff] rounded-xl shadow-xl border border-[#becabd]/80 py-1.5 z-20 text-xs text-[#1a1c1c]"
                    onClick={() => setExportMenuOpen(false)}
                  >
                    <button
                      onClick={handleExportCSV}
                      className="w-full px-3.5 py-2 text-left hover:bg-[#f4f3f2] flex items-center gap-2 font-medium"
                    >
                      <span className="material-symbols-outlined text-base text-[#006130]">table_chart</span>
                      <span>Export Excel / CSV</span>
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="w-full px-3.5 py-2 text-left hover:bg-[#f4f3f2] flex items-center gap-2 font-medium"
                    >
                      <span className="material-symbols-outlined text-base text-[#005db5]">data_object</span>
                      <span>Export JSON</span>
                    </button>
                    <div className="h-[1px] bg-[#becabd]/40 my-1"></div>
                    <button
                      onClick={handlePrint}
                      className="w-full px-3.5 py-2 text-left hover:bg-[#f4f3f2] flex items-center gap-2 font-medium"
                    >
                      <span className="material-symbols-outlined text-base text-[#3f4940]">print</span>
                      <span>Cetak Daftar Siswa</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Tambah Siswa Manual */}
              <button
                onClick={() => {
                  setEditingStudent(null);
                  setIsFormModalOpen(true);
                }}
                className="flex-1 md:flex-none px-4 py-2.5 bg-[#006130] hover:bg-[#107c41] text-[#ffffff] font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                <span>+ Tambah Siswa</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setSubTab('students')}
              className="flex-1 md:flex-none px-4 py-2.5 bg-[#ffffff] hover:bg-[#f4f3f2] border border-[#becabd] text-[#006130] font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              <span>Kembali ke Data Siswa</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tab Switcher: Siswa vs Pengaturan Kelas */}
      <div className="flex border-b border-[#becabd]/60 bg-[#ffffff] rounded-t-xl px-2">
        <button
          onClick={() => setSubTab('students')}
          className={`flex items-center gap-2 py-3 px-5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            subTab === 'students'
              ? 'border-[#006130] text-[#006130]'
              : 'border-transparent text-[#6f7a6f] hover:text-[#1a1c1c]'
          }`}
        >
          <span className="material-symbols-outlined text-base">groups</span>
          <span>Daftar Siswa &amp; Saldo</span>
          <span className="bg-[#96f7af] text-[#00210c] text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
            {students.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('classes')}
          className={`flex items-center gap-2 py-3 px-5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            subTab === 'classes'
              ? 'border-[#006130] text-[#006130]'
              : 'border-transparent text-[#6f7a6f] hover:text-[#1a1c1c]'
          }`}
        >
          <span className="material-symbols-outlined text-base">meeting_room</span>
          <span>Pengaturan Kelas &amp; Aturan 80/20</span>
          <span className="bg-[#d6e3ff] text-[#00376f] text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
            {classes.length}
          </span>
        </button>
      </div>

      {/* Tab 2: Class Management */}
      {subTab === 'classes' && (
        <ClassManagementSection
          classes={classes}
          students={students}
          transactions={transactions}
          onSaveClass={onSaveClass}
          onDeleteClass={onDeleteClass}
          onFilterStudentsByClass={(className) => {
            setSelectedClass(className);
            setSubTab('students');
          }}
          onOpenReportForClass={onOpenReportForClass}
        />
      )}

      {/* Tab 1: Students List & 80/20 Balance View */}
      {subTab === 'students' && (
        <>
          {/* Metric Cards Banner with 80% / 20% Breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#ffffff] p-4 rounded-xl border border-[#becabd]/80 shadow-2xs">
              <div className="flex items-center justify-between text-[#6f7a6f] mb-1">
                <span className="text-xs font-semibold">Total Siswa</span>
                <span className="material-symbols-outlined text-lg text-[#006130]">group</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-[#1a1c1c]">{students.length}</div>
              <div className="text-[11px] text-[#3f4940] mt-0.5">Siswa terdaftar aktif</div>
            </div>

            <div className="bg-[#ffffff] p-4 rounded-xl border border-[#becabd]/80 shadow-2xs">
              <div className="flex items-center justify-between text-[#6f7a6f] mb-1">
                <span className="text-xs font-semibold">Total Tabungan</span>
                <span className="material-symbols-outlined text-lg text-[#005db5]">savings</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-[#1a1c1c]">{formatRupiah(totalBalance)}</div>
              <div className="text-[11px] text-[#3f4940] mt-0.5">Akumulasi seluruh siswa</div>
            </div>

            <div className="bg-[#ffffff] p-4 rounded-xl border border-[#becabd]/80 shadow-2xs">
              <div className="flex items-center justify-between text-[#6f7a6f] mb-1">
                <span className="text-xs font-semibold">Bisa Digunakan (80%)</span>
                <span className="material-symbols-outlined text-lg text-[#006130]">lock_open</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-[#006130]">{formatRupiah(totalBreakdown.available)}</div>
              <div className="text-[11px] text-[#006130] font-semibold mt-0.5">Maks. saldo ditarik</div>
            </div>

            <div className="bg-[#ffffff] p-4 rounded-xl border border-[#becabd]/80 shadow-2xs">
              <div className="flex items-center justify-between text-[#6f7a6f] mb-1">
                <span className="text-xs font-semibold">Terkunci (20%)</span>
                <span className="material-symbols-outlined text-lg text-[#ba1a1a]">lock</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-[#ba1a1a]">{formatRupiah(totalBreakdown.locked)}</div>
              <div className="text-[11px] text-[#ba1a1a] font-semibold mt-0.5">Dana cadangan wajib</div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#becabd]/80 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Real-time Search Bar */}
              <div className="relative flex-1 min-w-[260px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#6f7a6f] pointer-events-none">
                  <span className="material-symbols-outlined text-lg text-[#006130]">search</span>
                </div>
                <input
                  id="student-search-input"
                  type="text"
                  placeholder="Cari berdasarkan nama siswa atau nomor NISN secara real-time..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchQuery('');
                  }}
                  className="w-full pl-10 pr-20 py-2.5 bg-[#faf9f8] border border-[#becabd] rounded-xl text-xs font-medium text-[#1a1c1c] focus:border-[#006130] focus:ring-1 focus:ring-[#006130] focus:bg-[#ffffff] outline-none transition-all shadow-2xs placeholder:text-[#6f7a6f]"
                />

                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 rounded-full text-[#6f7a6f] hover:text-[#1a1c1c] hover:bg-[#e9e8e7] transition-colors cursor-pointer"
                      title="Hapus pencarian (Esc)"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  ) : (
                    <span className="hidden sm:inline-block text-[10px] font-mono text-[#6f7a6f] bg-[#e9e8e7] px-1.5 py-0.5 rounded border border-[#becabd]/60">
                      Cari Cepat
                    </span>
                  )}
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Class Filter */}
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-[#faf9f8] border border-[#becabd] text-xs font-semibold text-[#1a1c1c] rounded-xl px-3 py-2.5 outline-none focus:border-[#006130] cursor-pointer"
                >
                  <option value="all">Semua Kelas ({students.length})</option>
                  {classNames.map((cls) => {
                    const count = students.filter((s) => s.className === cls).length;
                    return (
                      <option key={cls} value={cls}>
                        {cls} ({count})
                      </option>
                    );
                  })}
                </select>

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#faf9f8] border border-[#becabd] text-xs font-semibold text-[#1a1c1c] rounded-xl px-3 py-2.5 outline-none focus:border-[#006130] cursor-pointer"
                >
                  <option value="name-asc">Nama (A - Z)</option>
                  <option value="name-desc">Nama (Z - A)</option>
                  <option value="balance-desc">Saldo Tertinggi</option>
                  <option value="balance-asc">Saldo Terendah</option>
                  <option value="nisn">Nomor NISN</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex border border-[#becabd] rounded-xl overflow-hidden bg-[#faf9f8] p-0.5">
                  <button
                    onClick={() => setViewMode('table')}
                    title="Tampilan Tabel"
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'table' ? 'bg-[#ffffff] text-[#006130] shadow-xs' : 'text-[#6f7a6f]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">table_rows</span>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    title="Tampilan Grid Kartu"
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'grid' ? 'bg-[#ffffff] text-[#006130] shadow-xs' : 'text-[#6f7a6f]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">grid_view</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Search & Filter Indicator Bar */}
            {searchQuery.trim() && (
              <div className="pt-2 border-t border-[#becabd]/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#006130]">filter_alt</span>
                  <span className="text-[#3f4940]">
                    Hasil pencarian untuk{' '}
                    <strong className="text-[#006130] bg-[#96f7af]/25 px-1.5 py-0.5 rounded">
                      "{searchQuery.trim()}"
                    </strong>
                    :
                  </span>
                  <span className="font-bold text-[#1a1c1c] bg-[#faf9f8] px-2 py-0.5 rounded-full border border-[#becabd]/60">
                    {filteredStudents.length} siswa cocok
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[11px] font-bold text-[#ba1a1a] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">backspace</span>
                  <span>Bersihkan Pencarian</span>
                </button>
              </div>
            )}
          </div>

          {/* Results Count & Active Filters Indicator */}
          <div className="flex items-center justify-between text-xs text-[#3f4940] px-1">
            <div>
              Menampilkan <strong>{filteredStudents.length}</strong> dari <strong>{students.length}</strong> siswa
              {selectedClass !== 'all' && (
                <span className="ml-2 px-2 py-0.5 bg-[#e9e8e7] rounded-full text-[11px] font-semibold text-[#1a1c1c]">
                  Kelas: {selectedClass}
                </span>
              )}
            </div>

            {filteredStudents.length > 0 && (
              <div className="font-semibold text-[#006130]">
                Total Saldo Ditampilkan: {formatRupiah(filteredStudents.reduce((sum, s) => sum + s.balance, 0))}
              </div>
            )}
          </div>

          {/* Main List Render: Table or Grid */}
          {filteredStudents.length === 0 ? (
            <div className="bg-[#ffffff] rounded-2xl border border-[#becabd]/80 p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-[#f4f3f2] flex items-center justify-center mx-auto text-[#6f7a6f] mb-3">
                <span className="material-symbols-outlined text-3xl">person_search</span>
              </div>
              <h3 className="font-bold text-[#1a1c1c] text-base">Tidak Ada Siswa Ditemukan</h3>
              <p className="text-xs text-[#6f7a6f] mt-1 max-w-md mx-auto">
                Tidak ada data siswa yang cocok dengan kriteria pencarian "{searchQuery}" atau filter kelas saat ini.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedClass('all');
                }}
                className="mt-4 px-4 py-2 bg-[#f4f3f2] hover:bg-[#e9e8e7] border border-[#becabd] text-xs font-semibold text-[#006130] rounded-lg transition-colors"
              >
                Reset Filter Pencarian
              </button>
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-[#ffffff] rounded-2xl border border-[#becabd]/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#f4f3f2] border-b border-[#becabd]/80 text-[#3f4940] font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Siswa</th>
                      <th className="py-3 px-4">NISN</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Wali &amp; Kontak</th>
                      <th className="py-3 px-4 text-right">Total Saldo</th>
                      <th className="py-3 px-4 text-right">Bisa Dipakai (80%)</th>
                      <th className="py-3 px-4 text-right">Terkunci (20%)</th>
                      <th className="py-3 px-4 text-center">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#becabd]/40 text-[#1a1c1c]">
                    {filteredStudents.map((student) => {
                      const breakdown = getSavingsBreakdown(student.balance);
                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-[#faf9f8] transition-colors group"
                        >
                          {/* Siswa Photo & Name */}
                          <td className="py-3 px-4">
                            <div
                              onClick={() => onSelectStudent(student)}
                              className="flex items-center gap-3 cursor-pointer"
                            >
                              <div className="w-9 h-9 rounded-full overflow-hidden border border-[#becabd] flex-shrink-0">
                                <img
                                  alt={student.name}
                                  src={student.avatarUrl}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <div className="font-bold text-[#1a1c1c] group-hover:text-[#006130] transition-colors">
                                  {highlightMatch(student.name, searchQuery)}
                                </div>
                                <div className="text-[11px] text-[#6f7a6f]">
                                  Tgl Mulai: {student.initialDepositDate || '2023-07-15'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* NISN */}
                          <td className="py-3 px-4 font-mono font-semibold text-[#005db5] text-[11px]">
                            {highlightMatch(student.nisn, searchQuery)}
                          </td>

                          {/* Kelas */}
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e9e8e7] text-[#3f4940]">
                              {student.className}
                            </span>
                          </td>

                          {/* Wali & Kontak */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#1a1c1c]">{student.guardianName || '-'}</div>
                            <div className="text-[11px] text-[#6f7a6f] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">call</span>
                              <span>{student.guardianPhone || '-'}</span>
                            </div>
                          </td>

                          {/* Total Saldo */}
                          <td className="py-3 px-4 text-right">
                            <div className="font-bold text-sm text-[#1a1c1c]">
                              {formatRupiah(student.balance)}
                            </div>
                          </td>

                          {/* Saldo Tersedia 80% */}
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-xs text-[#006130] bg-[#96f7af]/25 px-2 py-0.5 rounded-md">
                              {formatRupiah(breakdown.available)}
                            </span>
                          </td>

                          {/* Saldo Terkunci 20% */}
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-xs text-[#ba1a1a] bg-[#ffdad6]/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[11px]">lock</span>
                              <span>{formatRupiah(breakdown.locked)}</span>
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Copy / Share Login PIN */}
                              <button
                                onClick={() => handleCopyStudentCredentials(student)}
                                title={`Salin Kredensial Login (PIN: ${student.pin || '123456'})`}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-900 rounded-lg transition-colors cursor-pointer border border-amber-200"
                              >
                                <span className="material-symbols-outlined text-base">key</span>
                              </button>

                              {/* Deposit button */}
                              <button
                                onClick={() => onOpenTransactionForStudent(student, 'deposit')}
                                title="Setor / Tarik Tabungan"
                                className="p-1.5 bg-[#006130]/10 hover:bg-[#006130] text-[#006130] hover:text-[#ffffff] rounded-lg transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base">payments</span>
                              </button>

                              {/* Profile */}
                              <button
                                onClick={() => onSelectStudent(student)}
                                title="Lihat Profil"
                                className="p-1.5 bg-[#005db5]/10 hover:bg-[#005db5] text-[#005db5] hover:text-[#ffffff] rounded-lg transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base">visibility</span>
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => {
                                  setEditingStudent(student);
                                  setIsFormModalOpen(true);
                                }}
                                title="Edit Data Siswa"
                                className="p-1.5 hover:bg-[#e9e8e7] text-[#3f4940] rounded-lg transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base">edit</span>
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteConfirm(student)}
                                title="Hapus Siswa"
                                className="p-1.5 hover:bg-[#ffdad6] text-[#ba1a1a] rounded-lg transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid Card View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student) => {
                const breakdown = getSavingsBreakdown(student.balance);
                return (
                  <div
                    key={student.id}
                    className="bg-[#ffffff] rounded-2xl border border-[#becabd]/80 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-[#becabd]">
                            <img
                              alt={student.name}
                              src={student.avatarUrl}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h4
                              onClick={() => onSelectStudent(student)}
                              className="font-bold text-sm text-[#1a1c1c] hover:text-[#006130] cursor-pointer transition-colors"
                            >
                              {highlightMatch(student.name, searchQuery)}
                            </h4>
                            <div className="text-xs text-[#005db5] font-mono font-semibold">
                              NISN: {highlightMatch(student.nisn, searchQuery)}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e9e8e7] text-[#3f4940]">
                          {student.className}
                        </span>
                      </div>

                      {/* Total Saldo & Breakdown Card */}
                      <div className="bg-[#faf9f8] p-3 rounded-xl border border-[#becabd]/60 my-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#6f7a6f]">Total Saldo:</span>
                          <span className="text-base font-bold text-[#1a1c1c]">
                            {formatRupiah(student.balance)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#becabd]/40 text-[11px]">
                          <div className="bg-[#ffffff] p-1.5 rounded-lg border border-[#becabd]/40">
                            <span className="text-[#006130] font-semibold block text-[10px]">Tersedia (80%)</span>
                            <span className="font-bold text-[#006130]">{formatRupiah(breakdown.available)}</span>
                          </div>
                          <div className="bg-[#ffffff] p-1.5 rounded-lg border border-[#becabd]/40">
                            <span className="text-[#ba1a1a] font-semibold block text-[10px] flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]">lock</span>
                              <span>Terkunci (20%)</span>
                            </span>
                            <span className="font-bold text-[#ba1a1a]">{formatRupiah(breakdown.locked)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs space-y-1 text-[#3f4940]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#6f7a6f]">Orang Tua/Wali:</span>
                          <span className="font-semibold text-[#1a1c1c]">{student.guardianName || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6f7a6f]">Kontak:</span>
                          <span>{student.guardianPhone || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#becabd]/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleCopyStudentCredentials(student)}
                        title={`Salin Kredensial Login (PIN: ${student.pin || '123456'})`}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-900 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">key</span>
                      </button>

                      <button
                        onClick={() => onOpenTransactionForStudent(student, 'deposit')}
                        className="flex-1 py-1.5 bg-[#006130] hover:bg-[#107c41] text-[#ffffff] font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">payments</span>
                        <span>Setor/Tarik</span>
                      </button>

                      <button
                        onClick={() => onSelectStudent(student)}
                        className="px-3 py-1.5 bg-[#f4f3f2] hover:bg-[#e9e8e7] border border-[#becabd] text-[#005db5] font-bold text-xs rounded-lg transition-colors"
                      >
                        Profil
                      </button>

                      <button
                        onClick={() => {
                          setEditingStudent(student);
                          setIsFormModalOpen(true);
                        }}
                        title="Edit Siswa"
                        className="p-1.5 hover:bg-[#e9e8e7] text-[#3f4940] rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteConfirm(student)}
                        title="Hapus Siswa"
                        className="p-1.5 hover:bg-[#ffdad6] text-[#ba1a1a] rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Import Modal */}
      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportStudents={onImportStudents}
      />

      {/* Form Modal (Add / Edit) */}
      <StudentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSaveStudent={onSaveStudent}
        editingStudent={editingStudent}
        existingClasses={classNames.length > 0 ? classNames : ['Kelas 10A', 'Kelas 10B', 'Kelas 11A']}
        existingStudents={students}
      />

      {/* Confirmation Modal for Delete */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        target={deleteTarget}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleExecuteDelete}
      />
    </div>
  );
};
