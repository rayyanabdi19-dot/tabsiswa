import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ClassInfo, Student, Transaction } from '../types';
import { formatRupiah, getSavingsBreakdown } from '../utils/formatters';
import { ClassModal } from './ClassModal';
import { ConfirmDeleteModal, DeleteTarget } from './ConfirmDeleteModal';
import { showToast } from './Toast';

interface ClassesViewProps {
  classes: ClassInfo[];
  students: Student[];
  transactions: Transaction[];
  onSaveClass: (classData: ClassInfo, oldName?: string) => void;
  onDeleteClass: (classId: string, className: string) => void;
  onSelectStudent: (student: Student) => void;
  onNavigateToStudents: (className?: string) => void;
  onOpenTransactionForStudent: (student: Student, type?: 'deposit' | 'withdrawal') => void;
  onOpenReportForClass?: (className: string) => void;
  onOpenNewTransaction?: (type?: 'deposit' | 'withdrawal') => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  classes,
  students,
  transactions,
  onSaveClass,
  onDeleteClass,
  onSelectStudent,
  onNavigateToStudents,
  onOpenTransactionForStudent,
  onOpenReportForClass,
  onOpenNewTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [chartMode, setChartMode] = useState<'total' | 'stacked' | 'average'>('total');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [selectedClassForDetails, setSelectedClassForDetails] = useState<ClassInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Calculate statistics per class
  const classStats = useMemo(() => {
    const map = new Map<
      string,
      {
        studentCount: number;
        totalBalance: number;
        availableBalance: number;
        lockedBalance: number;
        activeTransactionsCount: number;
      }
    >();

    // Initialize all configured classes
    classes.forEach((c) => {
      map.set(c.name, {
        studentCount: 0,
        totalBalance: 0,
        availableBalance: 0,
        lockedBalance: 0,
        activeTransactionsCount: 0,
      });
    });

    // Count students and balance
    students.forEach((s) => {
      const cName = s.className || 'Tanpa Kelas';
      const breakdown = getSavingsBreakdown(s.balance);
      const current = map.get(cName) || {
        studentCount: 0,
        totalBalance: 0,
        availableBalance: 0,
        lockedBalance: 0,
        activeTransactionsCount: 0,
      };

      map.set(cName, {
        studentCount: current.studentCount + 1,
        totalBalance: current.totalBalance + breakdown.total,
        availableBalance: current.availableBalance + breakdown.available,
        lockedBalance: current.lockedBalance + breakdown.locked,
        activeTransactionsCount: current.activeTransactionsCount,
      });
    });

    // Count transactions per class
    transactions.forEach((tx) => {
      if (tx.className && map.has(tx.className)) {
        const item = map.get(tx.className)!;
        item.activeTransactionsCount += 1;
      }
    });

    return map;
  }, [classes, students, transactions]);

  // Aggregate overall metrics
  const totalClassesCount = classes.length;
  const totalStudentsCount = students.length;
  const grandTotalBalance = students.reduce((acc, s) => acc + s.balance, 0);
  const overallBreakdown = getSavingsBreakdown(grandTotalBalance);
  const overallAveragePerStudent =
    totalStudentsCount > 0 ? Math.round(grandTotalBalance / totalStudentsCount) : 0;
  const overallAveragePerClass =
    totalClassesCount > 0 ? Math.round(grandTotalBalance / totalClassesCount) : 0;

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchLevel = selectedLevel === 'all' || c.level === selectedLevel;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.homeroomTeacher && c.homeroomTeacher.toLowerCase().includes(q)) ||
        (c.academicYear && c.academicYear.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q));
      return matchLevel && matchSearch;
    });
  }, [classes, selectedLevel, searchQuery]);

  // Chart data preparation
  const chartData = useMemo(() => {
    const classColors = [
      '#006130',
      '#005db5',
      '#7b5800',
      '#107c41',
      '#526070',
      '#8f4e00',
      '#006874',
      '#436651',
    ];

    return classes.map((cls, idx) => {
      const stat = classStats.get(cls.name) || {
        studentCount: 0,
        totalBalance: 0,
        availableBalance: 0,
        lockedBalance: 0,
        activeTransactionsCount: 0,
      };
      const avg = stat.studentCount > 0 ? Math.round(stat.totalBalance / stat.studentCount) : 0;

      return {
        name: cls.name,
        total: stat.totalBalance,
        available: stat.availableBalance,
        locked: stat.lockedBalance,
        average: avg,
        studentCount: stat.studentCount,
        color: classColors[idx % classColors.length],
      };
    });
  }, [classes, classStats]);

  // Get students for selected detail modal
  const studentsInDetail = useMemo(() => {
    if (!selectedClassForDetails) return [];
    return students.filter((s) => s.className === selectedClassForDetails.name);
  }, [selectedClassForDetails, students]);

  const handleDelete = (c: ClassInfo) => {
    const stats = classStats.get(c.name);
    const count = stats?.studentCount || 0;
    setDeleteTarget({ type: 'class', item: c, studentCount: count });
    setIsDeleteModalOpen(true);
  };

  const handleExecuteDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'class') {
      const c = deleteTarget.item;
      onDeleteClass(c.id, c.name);
      if (selectedClassForDetails?.id === c.id) {
        setSelectedClassForDetails(null);
      }
      showToast('Kelas Dihapus', `Kelas ${c.name} berhasil dihapus.`);
    }
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const handleExportClassSummary = () => {
    const rows = [
      ['No', 'Nama Kelas', 'Tingkat', 'Wali Kelas', 'No HP Wali Kelas', 'Tahun Ajaran', 'Jumlah Siswa', 'Total Saldo (IDR)', 'Saldo Bisa Digunakan (80%)', 'Saldo Terkunci (20%)', 'Rata-rata per Siswa (IDR)'],
      ...classes.map((cls, index) => {
        const stats = classStats.get(cls.name) || {
          studentCount: 0,
          totalBalance: 0,
          availableBalance: 0,
          lockedBalance: 0,
        };
        const avg = stats.studentCount > 0 ? Math.round(stats.totalBalance / stats.studentCount) : 0;
        return [
          index + 1,
          `"${cls.name}"`,
          `"${cls.level || '-'}"`,
          `"${cls.homeroomTeacher || '-'}"`,
          `"${cls.teacherPhone || '-'}"`,
          `"${cls.academicYear || '-'}"`,
          stats.studentCount,
          stats.totalBalance,
          stats.availableBalance,
          stats.lockedBalance,
          avg,
        ];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekapitulasi-tabungan-per-kelas-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Export Berhasil', 'Rekapitulasi data kelas berhasil diunduh ke format CSV/Excel.');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#006130]/10 text-[#006130]">
              <span className="material-symbols-outlined text-2xl">meeting_room</span>
            </span>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
                Menu Manajemen Kelas
              </h2>
              <p className="text-xs sm:text-sm text-[#3f4940] mt-0.5">
                Kelola rombongan belajar, wali kelas, serta pantau akumulasi saldo &amp; aturan 80/20 per kelas.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleExportClassSummary}
            className="flex-1 md:flex-none px-3.5 py-2.5 bg-[#ffffff] hover:bg-[#f4f3f2] border border-[#becabd] text-[#005db5] font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            title="Download Rekap Kelas ke CSV/Excel"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Export Rekap Kelas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingClass(null);
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none px-4 py-2.5 bg-[#006130] hover:bg-[#107c41] text-[#ffffff] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Tambah Kelas Baru</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Kelas */}
        <div className="bg-[#ffffff] p-5 rounded-2xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:border-[#006130]/60 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-5xl text-[#006130]">domain</span>
          </div>
          <span className="text-xs font-semibold text-[#3f4940] block">Total Rombel / Kelas</span>
          <p className="text-2xl sm:text-3xl font-black text-[#1a1c1c] mt-1 tracking-tight">
            {totalClassesCount}{' '}
            <span className="text-xs font-normal text-[#3f4940]">Kelas Aktif</span>
          </p>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-[#becabd]/40">
            <span className="text-[#3f4940]">Total Siswa:</span>
            <span className="font-bold text-[#006130]">{totalStudentsCount} Siswa</span>
          </div>
        </div>

        {/* Card 2: Total Saldo Seluruh Kelas */}
        <div className="bg-[#ffffff] p-5 rounded-2xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:border-[#006130]/60 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-5xl text-[#006130]">account_balance_wallet</span>
          </div>
          <span className="text-xs font-semibold text-[#3f4940] block">Akumulasi Saldo Seluruh Kelas</span>
          <p className="text-2xl sm:text-3xl font-black text-[#006130] mt-1 tracking-tight">
            {formatRupiah(grandTotalBalance)}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-[#becabd]/40">
            <span className="text-[#3f4940]">Rata-rata per Kelas:</span>
            <span className="font-bold text-[#1a1c1c]">{formatRupiah(overallAveragePerClass)}</span>
          </div>
        </div>

        {/* Card 3: 80% Saldo Siap Ditarik */}
        <div className="bg-[#ffffff] p-5 rounded-2xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:border-[#005db5]/60 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-5xl text-[#005db5]">lock_open</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#3f4940]">Bisa Digunakan (80%)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d6e3ff] text-[#001b3e]">
              Likuid
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#005db5] mt-1 tracking-tight">
            {formatRupiah(overallBreakdown.available)}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-[#becabd]/40">
            <span className="text-[#3f4940]">Rata-rata per Siswa:</span>
            <span className="font-bold text-[#005db5]">{formatRupiah(overallAveragePerStudent)}</span>
          </div>
        </div>

        {/* Card 4: 20% Saldo Terkunci */}
        <div className="bg-[#ffffff] p-5 rounded-2xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:border-[#ba1a1a]/40 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-5xl text-[#ba1a1a]">lock</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#3f4940]">Saldo Terkunci (20%)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdad6] text-[#410002]">
              Cadangan
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#ba1a1a] mt-1 tracking-tight">
            {formatRupiah(overallBreakdown.locked)}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-[#becabd]/40">
            <span className="text-[#3f4940]">Dana Abadi Wajib:</span>
            <span className="font-bold text-[#ba1a1a]">20% per Siswa</span>
          </div>
        </div>
      </div>

      {/* 80% / 20% Policy Reminder Banner */}
      <div className="bg-gradient-to-r from-[#006130] to-[#107c41] text-[#ffffff] rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[#b6ffc5] text-[11px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-xs">verified</span>
              <span>Aturan Baku Tabungan Pintar</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black">
              Alokasi 80% Saldo Bebas &amp; 20% Dana Cadangan Terkunci Otomatis
            </h3>
            <p className="text-xs text-[#b6ffc5]">
              Setiap kelas menerapkan kontrol keuangan otomatis untuk menjaga ketahanan tabungan siswa hingga kelulusan.
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-xl p-3.5 backdrop-blur-md min-w-[260px]">
            <div className="flex justify-between text-xs font-bold text-white mb-1.5">
              <span>Rasio Porsi Saldo:</span>
              <span>80% vs 20%</span>
            </div>
            <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden flex">
              <div className="bg-[#96f7af] h-full" style={{ width: '80%' }}></div>
              <div className="bg-[#ffb4ab] h-full" style={{ width: '20%' }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-[#b6ffc5] mt-1.5">
              <span>Bisa Ditarik: {formatRupiah(overallBreakdown.available)}</span>
              <span>Terkunci: {formatRupiah(overallBreakdown.locked)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart Visualization Section */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#becabd]/60 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#becabd]/40">
          <div>
            <h3 className="text-base font-bold text-[#1a1c1c] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006130]">bar_chart</span>
              <span>Grafik Perbandingan Saldo Tabungan per Kelas</span>
            </h3>
            <p className="text-xs text-[#3f4940] mt-0.5">
              Visualisasi komparasi saldo akumulasi, porsi likuid 80/20, dan rata-rata per siswa di tiap rombel.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#faf9f8] p-1 rounded-xl border border-[#becabd]/60 self-start sm:self-auto">
            <button
              onClick={() => setChartMode('total')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartMode === 'total'
                  ? 'bg-[#006130] text-[#ffffff] shadow-2xs'
                  : 'text-[#3f4940] hover:text-[#1a1c1c]'
              }`}
            >
              Total Saldo
            </button>
            <button
              onClick={() => setChartMode('stacked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartMode === 'stacked'
                  ? 'bg-[#006130] text-[#ffffff] shadow-2xs'
                  : 'text-[#3f4940] hover:text-[#1a1c1c]'
              }`}
            >
              Aturan 80/20
            </button>
            <button
              onClick={() => setChartMode('average')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartMode === 'average'
                  ? 'bg-[#006130] text-[#ffffff] shadow-2xs'
                  : 'text-[#3f4940] hover:text-[#1a1c1c]'
              }`}
            >
              Rata-rata Siswa
            </button>
          </div>
        </div>

        {/* Recharts Render */}
        <div className="h-72 w-full pt-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#becabd" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  stroke="#3f4940"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#becabd', opacity: 0.5 }}
                />
                <YAxis
                  stroke="#3f4940"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#becabd', opacity: 0.5 }}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return `${val}`;
                  }}
                />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    const valNum = Number(value) || 0;
                    if (name === 'total') return [formatRupiah(valNum), 'Total Saldo Kelas'];
                    if (name === 'available') return [formatRupiah(valNum), 'Bisa Ditarik (80%)'];
                    if (name === 'locked') return [formatRupiah(valNum), 'Dana Cadangan Terkunci (20%)'];
                    if (name === 'average') return [formatRupiah(valNum), 'Rata-rata per Siswa'];
                    return [formatRupiah(valNum), String(name)];
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#1a1c1c' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#becabd',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(val) => {
                    if (val === 'total') return 'Total Saldo Kelas';
                    if (val === 'available') return 'Bisa Ditarik (80%)';
                    if (val === 'locked') return 'Dana Cadangan Terkunci (20%)';
                    if (val === 'average') return 'Rata-rata per Siswa';
                    return val;
                  }}
                />

                {chartMode === 'total' && (
                  <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                )}

                {chartMode === 'stacked' && (
                  <>
                    <Bar dataKey="available" stackId="savings" fill="#006130" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="locked" stackId="savings" fill="#ba1a1a" radius={[8, 8, 0, 0]} />
                  </>
                )}

                {chartMode === 'average' && (
                  <Bar dataKey="average" fill="#005db5" radius={[8, 8, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[#3f4940]">
              Belum ada data kelas untuk ditampilkan pada grafik.
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#becabd]/60 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#3f4940] text-lg">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kelas, wali kelas, tahun ajaran..."
            className="w-full pl-9 pr-4 py-2 bg-[#faf9f8] border border-[#becabd] rounded-xl text-xs text-[#1a1c1c] outline-none focus:border-[#006130]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-[#3f4940] hover:text-[#1a1c1c]"
            >
              <span className="material-symbols-outlined text-sm">cancel</span>
            </button>
          )}
        </div>

        {/* Level Filters & View Toggle */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#3f4940] font-medium hidden sm:inline">Tingkat:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="bg-[#faf9f8] border border-[#becabd] text-xs font-semibold text-[#1a1c1c] rounded-xl px-3 py-2 outline-none focus:border-[#006130]"
            >
              <option value="all">Semua Tingkat ({classes.length})</option>
              <option value="Kelas 10">Kelas 10 / X</option>
              <option value="Kelas 11">Kelas 11 / XI</option>
              <option value="Kelas 12">Kelas 12 / XII</option>
            </select>
          </div>

          <div className="flex items-center bg-[#faf9f8] border border-[#becabd] p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#006130] text-[#ffffff]'
                  : 'text-[#3f4940] hover:text-[#1a1c1c]'
              }`}
              title="Tampilan Grid Kartu"
            >
              <span className="material-symbols-outlined text-base">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#006130] text-[#ffffff]'
                  : 'text-[#3f4940] hover:text-[#1a1c1c]'
              }`}
              title="Tampilan Tabel Rinci"
            >
              <span className="material-symbols-outlined text-base">view_list</span>
            </button>
          </div>
        </div>
      </div>

      {/* Classes List: Grid Mode */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => {
            const stats = classStats.get(cls.name) || {
              studentCount: 0,
              totalBalance: 0,
              availableBalance: 0,
              lockedBalance: 0,
              activeTransactionsCount: 0,
            };
            const avg = stats.studentCount > 0 ? Math.round(stats.totalBalance / stats.studentCount) : 0;

            return (
              <div
                key={cls.id}
                className="bg-[#ffffff] rounded-2xl border border-[#becabd]/70 hover:border-[#006130]/70 transition-all duration-200 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_25px_rgba(0,97,48,0.08)] hover:-translate-y-1 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top Subtle Emerald Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#006130] to-[#005db5] opacity-80 group-hover:h-1.5 transition-all duration-200" />

                <div>
                  {/* Class Card Top Header */}
                  <div className="flex items-start justify-between gap-3 mb-3 pt-0.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-lg font-black text-[#1a1c1c] group-hover:text-[#006130] transition-colors truncate">
                          {cls.name}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#faf9f8] border border-[#becabd] text-[#3f4940] whitespace-nowrap shadow-2xs">
                          {cls.level || 'Reguler'}
                        </span>
                      </div>
                      <p className="text-xs text-[#3f4940] mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        <span>T.A. {cls.academicYear || '2023/2024'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingClass(cls);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-[#3f4940] hover:text-[#005db5] hover:bg-[#faf9f8] rounded-lg transition-colors cursor-pointer"
                        title="Edit Kelas"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(cls)}
                        className="p-1.5 text-[#3f4940] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Kelas"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Wali Kelas Info */}
                  <div className="bg-[#faf9f8] p-3 rounded-xl border border-[#becabd]/40 space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-[#3f4940] flex items-center gap-1 shrink-0">
                        <span className="material-symbols-outlined text-sm text-[#006130]">school</span>
                        <span>Wali Kelas:</span>
                      </span>
                      <span className="font-bold text-[#1a1c1c] truncate text-right">
                        {cls.homeroomTeacher || 'Belum Ditentukan'}
                      </span>
                    </div>
                    {cls.teacherPhone && (
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-[#3f4940] flex items-center gap-1 shrink-0">
                          <span className="material-symbols-outlined text-sm text-[#005db5]">call</span>
                          <span>No. Telepon:</span>
                        </span>
                        <a
                          href={`tel:${cls.teacherPhone}`}
                          className="font-semibold text-[#005db5] hover:underline truncate"
                        >
                          {cls.teacherPhone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Financial Overview within Class */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-xs text-[#3f4940]">Total Saldo Tabungan:</span>
                      <span className="text-base sm:text-lg font-black text-[#006130] truncate">
                        {formatRupiah(stats.totalBalance)}
                      </span>
                    </div>

                    {/* 80/20 Mini Bar */}
                    <div className="w-full bg-[#f4f3f2] h-2 rounded-full overflow-hidden flex border border-[#becabd]/40">
                      <div
                        className="bg-[#006130] h-full transition-all duration-500"
                        style={{ width: '80%' }}
                        title="80% Bisa Ditarik (Likuid)"
                      />
                      <div
                        className="bg-[#ba1a1a] h-full transition-all duration-500"
                        style={{ width: '20%' }}
                        title="20% Terkunci (Cadangan)"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-[#006130]/5 hover:bg-[#006130]/10 border border-[#006130]/15 rounded-xl p-2 transition-colors">
                        <span className="text-[#006130] block text-[10px] font-bold mb-0.5">80% Likuid:</span>
                        <span className="font-black text-[#006130] text-xs truncate block" title={formatRupiah(stats.availableBalance)}>
                          {formatRupiah(stats.availableBalance)}
                        </span>
                      </div>
                      <div className="bg-[#ba1a1a]/5 hover:bg-[#ba1a1a]/10 border border-[#ba1a1a]/15 rounded-xl p-2 transition-colors">
                        <span className="text-[#ba1a1a] block text-[10px] font-bold mb-0.5">20% Terkunci:</span>
                        <span className="font-black text-[#ba1a1a] text-xs truncate block" title={formatRupiah(stats.lockedBalance)}>
                          {formatRupiah(stats.lockedBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-[#becabd]/40 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-black text-[#1a1c1c]">{stats.studentCount}</span>{' '}
                    <span className="text-[#3f4940]">Siswa</span>
                    <span className="mx-1 text-[#becabd]">•</span>
                    <span className="text-[11px] text-[#3f4940]">
                      Rata-rata: {formatRupiah(avg)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedClassForDetails(cls)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#faf9f8] hover:bg-[#e9e8e7] text-[#1a1c1c] font-bold text-xs border border-[#becabd]/60 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Lihat Daftar Siswa Kelas Ini"
                    >
                      <span className="material-symbols-outlined text-xs">group</span>
                      <span>Siswa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenReportForClass) onOpenReportForClass(cls.name);
                        else onNavigateToStudents(cls.name);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#006130] hover:bg-[#107c41] text-[#ffffff] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                      title="Buka Laporan / Rekap Tabungan Kelas"
                    >
                      <span className="material-symbols-outlined text-xs">analytics</span>
                      <span>Laporan</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-[#ffffff] rounded-2xl border border-[#becabd]/60 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1a1c1c]">
              <thead className="bg-[#f4f3f2] text-[#3f4940] font-bold uppercase tracking-wider text-[11px] border-b border-[#becabd]">
                <tr>
                  <th className="p-4">Nama Kelas</th>
                  <th className="p-4">Tingkat</th>
                  <th className="p-4">Wali Kelas</th>
                  <th className="p-4 text-center">Jumlah Siswa</th>
                  <th className="p-4 text-right">Total Saldo</th>
                  <th className="p-4 text-right">80% Bisa Ditarik</th>
                  <th className="p-4 text-right">20% Terkunci</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#becabd]/40">
                {filteredClasses.map((cls) => {
                  const stats = classStats.get(cls.name) || {
                    studentCount: 0,
                    totalBalance: 0,
                    availableBalance: 0,
                    lockedBalance: 0,
                  };

                  return (
                    <tr key={cls.id} className="hover:bg-[#faf9f8] transition-colors">
                      <td className="p-4 font-bold text-[#1a1c1c]">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base text-[#006130]">domain</span>
                          <span>{cls.name}</span>
                        </div>
                        <span className="text-[10px] text-[#3f4940] block pl-6">
                          T.A. {cls.academicYear || '2023/2024'}
                        </span>
                      </td>
                      <td className="p-4 text-[#3f4940]">{cls.level || '-'}</td>
                      <td className="p-4">
                        <div className="font-semibold text-[#1a1c1c]">{cls.homeroomTeacher || '-'}</div>
                        {cls.teacherPhone && (
                          <div className="text-[11px] text-[#005db5]">{cls.teacherPhone}</div>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold">
                        <button
                          onClick={() => setSelectedClassForDetails(cls)}
                          className="px-2 py-0.5 rounded-full bg-[#faf9f8] border border-[#becabd] hover:bg-[#e9e8e7] cursor-pointer"
                        >
                          {stats.studentCount} Siswa
                        </button>
                      </td>
                      <td className="p-4 text-right font-black text-[#006130]">
                        {formatRupiah(stats.totalBalance)}
                      </td>
                      <td className="p-4 text-right font-semibold text-[#005db5]">
                        {formatRupiah(stats.availableBalance)}
                      </td>
                      <td className="p-4 text-right font-semibold text-[#ba1a1a]">
                        {formatRupiah(stats.lockedBalance)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedClassForDetails(cls)}
                            className="p-1.5 text-[#3f4940] hover:text-[#006130] hover:bg-[#faf9f8] rounded-lg"
                            title="Detail Siswa"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingClass(cls);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-[#3f4940] hover:text-[#005db5] hover:bg-[#faf9f8] rounded-lg"
                            title="Edit Kelas"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(cls)}
                            className="p-1.5 text-[#3f4940] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg"
                            title="Hapus"
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
      )}

      {/* Class Students Details Modal */}
      {selectedClassForDetails && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#ffffff] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#becabd] max-h-[88vh] flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#becabd]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#006130]/10 text-[#006130] flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">groups</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a1c1c]">
                    Daftar Siswa {selectedClassForDetails.name}
                  </h3>
                  <p className="text-xs text-[#3f4940]">
                    Wali Kelas: {selectedClassForDetails.homeroomTeacher || 'Belum Ditentukan'} •{' '}
                    {studentsInDetail.length} Siswa Terdaftar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClassForDetails(null)}
                className="text-[#3f4940] hover:text-[#1a1c1c] p-1 rounded-lg hover:bg-[#f4f3f2] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content / Students List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
              {studentsInDetail.length > 0 ? (
                studentsInDetail.map((student) => {
                  const breakdown = getSavingsBreakdown(student.balance);
                  return (
                    <div
                      key={student.id}
                      className="p-3 bg-[#faf9f8] hover:bg-[#f4f3f2] border border-[#becabd]/60 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-[#becabd]">
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-[#1a1c1c]">{student.name}</h5>
                          <p className="text-[11px] text-[#3f4940]">NISN: {student.nisn}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-xs text-[#006130] block">
                          {formatRupiah(student.balance)}
                        </span>
                        <span className="text-[10px] text-[#3f4940]">
                          80%: {formatRupiah(breakdown.available)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedClassForDetails(null);
                            onSelectStudent(student);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-[#ffffff] border border-[#becabd] hover:border-[#006130] text-[#006130] rounded-lg cursor-pointer transition-colors"
                        >
                          Profil
                        </button>
                        <button
                          onClick={() => {
                            setSelectedClassForDetails(null);
                            onOpenTransactionForStudent(student, 'deposit');
                          }}
                          className="p-1 text-[#ffffff] bg-[#006130] hover:bg-[#107c41] rounded-lg cursor-pointer"
                          title="Setor Cepat"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-[#3f4940]">
                  Belum ada siswa yang dialokasikan ke kelas {selectedClassForDetails.name}.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-[#becabd]/60 flex justify-between items-center text-xs">
              <span className="text-[#3f4940]">
                Total Saldo Kelas:{' '}
                <strong className="text-[#006130] font-black">
                  {formatRupiah(studentsInDetail.reduce((acc, s) => acc + s.balance, 0))}
                </strong>
              </span>
              <button
                onClick={() => {
                  const cName = selectedClassForDetails.name;
                  setSelectedClassForDetails(null);
                  onNavigateToStudents(cName);
                }}
                className="px-3.5 py-2 bg-[#006130] text-[#ffffff] font-bold rounded-xl hover:bg-[#107c41] transition-colors cursor-pointer"
              >
                Buka di Data Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Class Modal */}
      <ClassModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClass(null);
        }}
        onSaveClass={onSaveClass}
        initialData={editingClass}
        existingClasses={classes}
      />

      {/* Confirmation Modal for Delete Class */}
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
