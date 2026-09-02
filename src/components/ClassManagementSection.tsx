import React, { useState, useMemo } from 'react';
import { ClassInfo, Student, Transaction } from '../types';
import { formatRupiah, getSavingsBreakdown } from '../utils/formatters';
import { ClassModal } from './ClassModal';
import { ConfirmDeleteModal, DeleteTarget } from './ConfirmDeleteModal';
import { showToast } from './Toast';

interface ClassManagementSectionProps {
  classes: ClassInfo[];
  students: Student[];
  transactions: Transaction[];
  onSaveClass: (classData: ClassInfo, oldName?: string) => void;
  onDeleteClass: (classId: string, className: string) => void;
  onFilterStudentsByClass: (className: string) => void;
  onOpenReportForClass?: (className: string) => void;
}

export const ClassManagementSection: React.FC<ClassManagementSectionProps> = ({
  classes,
  students,
  transactions,
  onSaveClass,
  onDeleteClass,
  onFilterStudentsByClass,
  onOpenReportForClass,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
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
      }
    >();

    // Initialize map for all configured classes
    classes.forEach((c) => {
      map.set(c.name, {
        studentCount: 0,
        totalBalance: 0,
        availableBalance: 0,
        lockedBalance: 0,
      });
    });

    // Populate with students
    students.forEach((s) => {
      const cName = s.className || 'Tanpa Kelas';
      const breakdown = getSavingsBreakdown(s.balance);
      const current = map.get(cName) || {
        studentCount: 0,
        totalBalance: 0,
        availableBalance: 0,
        lockedBalance: 0,
      };

      map.set(cName, {
        studentCount: current.studentCount + 1,
        totalBalance: current.totalBalance + breakdown.total,
        availableBalance: current.availableBalance + breakdown.available,
        lockedBalance: current.lockedBalance + breakdown.locked,
      });
    });

    return map;
  }, [classes, students]);

  // Aggregate overall metrics
  const totalStudents = students.length;
  const grandTotalBalance = students.reduce((acc, s) => acc + s.balance, 0);
  const overallBreakdown = getSavingsBreakdown(grandTotalBalance);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchLevel = selectedLevel === 'all' || c.level === selectedLevel;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.homeroomTeacher && c.homeroomTeacher.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q));
      return matchLevel && matchSearch;
    });
  }, [classes, selectedLevel, searchQuery]);

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
      showToast('Kelas Dihapus', `Kelas ${c.name} berhasil dihapus dari daftar.`);
    }
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* 80% Usable & 20% Locked Savings Rule Banner */}
      <div className="bg-gradient-to-r from-[#006130] to-[#107c41] text-[#ffffff] rounded-2xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[160px] text-[#ffffff]">lock_clock</span>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-[#b6ffc5] text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                <span>Kebijakan Tabungan Pintar: Aturan 80% / 20%</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                Saldo Bisa Digunakan 80% &amp; Saldo Terkunci 20%
              </h3>
              <p className="text-xs sm:text-sm text-[#b6ffc5] leading-relaxed">
                Sistem secara otomatis mengunci <strong>20%</strong> dari total saldo setiap siswa sebagai <strong>Dana Cadangan Wajib / Abadi</strong> untuk menjamin keamanan tabungan masa depan. Siswa dan wali hanya dapat menarik maksimal <strong>80%</strong> dari saldo aktif.
              </p>
            </div>

            <div className="bg-[#ffffff]/10 border border-white/20 backdrop-blur-md rounded-xl p-4 min-w-[280px] space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#b6ffc5] font-semibold">Total Saldo Sekolah:</span>
                <span className="font-bold text-white">{formatRupiah(overallBreakdown.total)}</span>
              </div>

              {/* Progress Bar 80% / 20% */}
              <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="bg-[#96f7af] h-full"
                  style={{ width: '80%' }}
                  title="80% Bisa Ditarik"
                ></div>
                <div
                  className="bg-[#ffb4ab] h-full"
                  style={{ width: '20%' }}
                  title="20% Terkunci / Cadangan"
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="bg-white/10 rounded-lg p-2">
                  <div className="text-[#b6ffc5] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">lock_open</span>
                    <span>Tersedia (80%)</span>
                  </div>
                  <div className="font-extrabold text-white text-xs mt-0.5">
                    {formatRupiah(overallBreakdown.available)}
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-2">
                  <div className="text-[#ffdad6] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">lock</span>
                    <span>Terkunci (20%)</span>
                  </div>
                  <div className="font-extrabold text-white text-xs mt-0.5">
                    {formatRupiah(overallBreakdown.locked)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Class Statistics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#ffffff] p-5 rounded-xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-[#3f4940] text-xs font-semibold mb-1">
            <span>Total Kelas Terdaftar</span>
            <span className="material-symbols-outlined text-[#006130] text-lg">meeting_room</span>
          </div>
          <div className="text-2xl font-bold text-[#1a1c1c]">{classes.length} Kelas</div>
          <div className="text-[11px] text-[#6f7a6f] mt-1">Jenjang Kelas 10, 11 &amp; 12</div>
        </div>

        <div className="bg-[#ffffff] p-5 rounded-xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-[#3f4940] text-xs font-semibold mb-1">
            <span>Total Siswa di Kelas</span>
            <span className="material-symbols-outlined text-[#005db5] text-lg">groups</span>
          </div>
          <div className="text-2xl font-bold text-[#1a1c1c]">{totalStudents} Siswa</div>
          <div className="text-[11px] text-[#6f7a6f] mt-1">Rata-rata {classes.length ? Math.round(totalStudents / classes.length) : 0} siswa/kelas</div>
        </div>

        <div className="bg-[#ffffff] p-5 rounded-xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-[#3f4940] text-xs font-semibold mb-1">
            <span>Total Saldo Bisa Dipakai (80%)</span>
            <span className="material-symbols-outlined text-[#006130] text-lg">payments</span>
          </div>
          <div className="text-2xl font-bold text-[#006130]">{formatRupiah(overallBreakdown.available)}</div>
          <div className="text-[11px] text-[#3f4940] mt-1">Dapat ditarik untuk keperluan siswa</div>
        </div>

        <div className="bg-[#ffffff] p-5 rounded-xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-[#3f4940] text-xs font-semibold mb-1">
            <span>Total Saldo Terkunci (20%)</span>
            <span className="material-symbols-outlined text-[#ba1a1a] text-lg">lock</span>
          </div>
          <div className="text-2xl font-bold text-[#ba1a1a]">{formatRupiah(overallBreakdown.locked)}</div>
          <div className="text-[11px] text-[#3f4940] mt-1">Simpanan pokok &amp; dana darurat</div>
        </div>
      </div>

      {/* Toolbar: Search, Level Filter, Add Class Button */}
      <div className="bg-[#ffffff] border border-[#becabd]/60 rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7a6f] text-base">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kelas, wali kelas, catatan..."
              className="w-full pl-9 pr-3 py-2 bg-[#faf9f8] border border-[#becabd]/80 rounded-lg text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
            />
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="bg-[#faf9f8] border border-[#becabd]/80 rounded-lg py-2 px-3 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none cursor-pointer"
          >
            <option value="all">Semua Jenjang</option>
            <option value="Kelas 10">Kelas 10 (Fase E)</option>
            <option value="Kelas 11">Kelas 11 (Fase F)</option>
            <option value="Kelas 12">Kelas 12 (Fase F Akhir)</option>
          </select>
        </div>

        {/* Add Class Button */}
        <button
          onClick={() => {
            setEditingClass(null);
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto px-4 py-2 bg-[#006130] hover:bg-[#107c41] text-[#ffffff] font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Tambah Kelas Baru</span>
        </button>
      </div>

      {/* Classes Table */}
      <div className="bg-[#ffffff] border border-[#becabd]/60 rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f4f3f2] border-b border-[#becabd]/80 text-[#3f4940] font-semibold">
                <th className="py-3 px-4">Nama Kelas &amp; Jenjang</th>
                <th className="py-3 px-4">Wali Kelas</th>
                <th className="py-3 px-4 text-center">Jumlah Siswa</th>
                <th className="py-3 px-4 text-right">Total Saldo</th>
                <th className="py-3 px-4 text-right">Bisa Dipakai (80%)</th>
                <th className="py-3 px-4 text-right">Terkunci (20%)</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#becabd]/40 text-[#1a1c1c]">
              {filteredClasses.length > 0 ? (
                filteredClasses.map((c) => {
                  const stats = classStats.get(c.name) || {
                    studentCount: 0,
                    totalBalance: 0,
                    availableBalance: 0,
                    lockedBalance: 0,
                  };

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-[#faf9f8] transition-colors group"
                    >
                      {/* Name & Level */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm text-[#1a1c1c]">{c.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#6f7a6f]">
                          <span className="bg-[#d6e3ff] text-[#00376f] font-semibold px-1.5 py-0.2 rounded text-[10px]">
                            {c.level || 'Kelas'}
                          </span>
                          {c.notes && <span>• {c.notes}</span>}
                        </div>
                      </td>

                      {/* Homeroom Teacher */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1a1c1c] flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-[#005db5]">person</span>
                          <span>{c.homeroomTeacher || 'Belum diisi'}</span>
                        </div>
                        {c.teacherPhone && (
                          <div className="text-[11px] text-[#6f7a6f] mt-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-[#006130]">call</span>
                            <span>{c.teacherPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Student Count */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onFilterStudentsByClass(c.name)}
                          className="inline-flex items-center gap-1 font-bold text-xs bg-[#f4f3f2] hover:bg-[#006130]/10 hover:text-[#006130] text-[#1a1c1c] px-2.5 py-1 rounded-full border border-[#becabd]/60 transition-colors cursor-pointer"
                          title="Lihat daftar siswa kelas ini"
                        >
                          <span className="material-symbols-outlined text-xs">groups</span>
                          <span>{stats.studentCount} Siswa</span>
                        </button>
                      </td>

                      {/* Total Balance */}
                      <td className="py-3.5 px-4 text-right font-bold text-xs text-[#1a1c1c]">
                        {formatRupiah(stats.totalBalance)}
                      </td>

                      {/* Available Balance (80%) */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-xs text-[#006130] bg-[#96f7af]/25 px-2 py-0.5 rounded-md">
                          {formatRupiah(stats.availableBalance)}
                        </span>
                      </td>

                      {/* Locked Balance (20%) */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-xs text-[#ba1a1a] bg-[#ffdad6]/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">lock</span>
                          <span>{formatRupiah(stats.lockedBalance)}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingClass(c);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-[#005db5] hover:bg-[#d6e3ff]/60 rounded-md transition-colors cursor-pointer"
                            title="Edit Pengaturan Kelas"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>

                          {onOpenReportForClass && (
                            <button
                              onClick={() => onOpenReportForClass(c.name)}
                              className="p-1.5 text-[#006130] hover:bg-[#006130]/10 rounded-md transition-colors cursor-pointer"
                              title="Buka Laporan Tabungan Kelas"
                            >
                              <span className="material-symbols-outlined text-base">summarize</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6]/60 rounded-md transition-colors cursor-pointer"
                            title="Hapus Kelas"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#6f7a6f]">
                    <span className="material-symbols-outlined text-3xl mb-1 block">search_off</span>
                    Tidak ada kelas yang cocok dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Add/Edit Modal */}
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
