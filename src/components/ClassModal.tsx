import React, { useState, useEffect } from 'react';
import { ClassInfo } from '../types';
import { showToast } from './Toast';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveClass: (classData: ClassInfo, oldName?: string) => void;
  initialData?: ClassInfo | null;
  existingClasses: ClassInfo[];
}

export const ClassModal: React.FC<ClassModalProps> = ({
  isOpen,
  onClose,
  onSaveClass,
  initialData,
  existingClasses,
}) => {
  const isEditing = !!initialData;

  const [name, setName] = useState('');
  const [level, setLevel] = useState('Kelas 10');
  const [homeroomTeacher, setHomeroomTeacher] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [academicYear, setAcademicYear] = useState('2023/2024');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setLevel(initialData.level || 'Kelas 10');
      setHomeroomTeacher(initialData.homeroomTeacher || '');
      setTeacherPhone(initialData.teacherPhone || '');
      setAcademicYear(initialData.academicYear || '2023/2024');
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setLevel('Kelas 10');
      setHomeroomTeacher('');
      setTeacherPhone('');
      setAcademicYear('2023/2024');
      setNotes('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      showToast('Nama Kelas Diperlukan', 'Harap isi nama kelas.', 'error');
      return;
    }

    // Check for duplicate name if new or changed
    const duplicate = existingClasses.some(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase() && c.id !== initialData?.id
    );

    if (duplicate) {
      showToast('Nama Kelas Sudah Ada', `Kelas "${cleanName}" sudah terdaftar dalam sistem.`, 'error');
      return;
    }

    const savedClass: ClassInfo = {
      id: initialData?.id || `cls-${Date.now()}`,
      name: cleanName,
      level,
      homeroomTeacher: homeroomTeacher.trim() || 'Belum Ditentukan',
      teacherPhone: teacherPhone.trim(),
      academicYear: academicYear.trim() || '2023/2024',
      notes: notes.trim(),
    };

    onSaveClass(savedClass, initialData?.name);
    showToast(
      isEditing ? 'Kelas Diperbarui' : 'Kelas Ditambahkan',
      `Data ${cleanName} dengan Wali Kelas ${savedClass.homeroomTeacher} berhasil disimpan.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div
        className="bg-[#ffffff] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#becabd] max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-3 border-b border-[#becabd]/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006130] text-2xl">
              {isEditing ? 'edit_note' : 'add_circle'}
            </span>
            <h3 className="text-lg font-bold text-[#1a1c1c]">
              {isEditing ? 'Edit Pengaturan Kelas' : 'Tambah Kelas Baru'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#6f7a6f] hover:text-[#1a1c1c] p-1 rounded-full cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="font-semibold text-[#3f4940] block mb-1">
              Nama Kelas <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kelas 10A, Kelas 11 MIPA 1, dsb."
              className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#3f4940] block mb-1">Tingkat / Jenjang</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
              >
                <option value="Kelas 10">Kelas 10 (Fase E)</option>
                <option value="Kelas 11">Kelas 11 (Fase F)</option>
                <option value="Kelas 12">Kelas 12 (Fase F Akhir)</option>
                <option value="Lainnya">Lainnya / Ekstrakurikuler</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#3f4940] block mb-1">Tahun Ajaran</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2023/2024"
                className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#3f4940] block mb-1">
              Nama Wali Kelas (Untuk Tanda Tangan & Laporan)
            </label>
            <input
              type="text"
              value={homeroomTeacher}
              onChange={(e) => setHomeroomTeacher(e.target.value)}
              placeholder="Contoh: Siti Rahmawati, S.Pd"
              className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-[#3f4940] block mb-1">No. Kontak / WhatsApp Wali Kelas</label>
            <input
              type="text"
              value={teacherPhone}
              onChange={(e) => setTeacherPhone(e.target.value)}
              placeholder="08123456789"
              className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-[#3f4940] block mb-1">Catatan / Keterangan Program</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Peminatan Sains, Program Bilingual, dll."
              className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none resize-none"
            />
          </div>

          {isEditing && (
            <div className="p-3 bg-[#f4f3f2] rounded-lg border border-[#becabd]/80 text-[11px] text-[#3f4940]">
              <span className="font-bold text-[#005db5]">Perhatian:</span> Mengubah nama kelas akan otomatis memperbarui nama kelas pada seluruh data siswa yang berada di kelas ini.
            </div>
          )}

          <div className="pt-3 border-t border-[#becabd]/60 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#becabd] text-[#3f4940] font-semibold rounded-lg hover:bg-[#e9e8e7]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#006130] text-[#ffffff] font-semibold rounded-lg hover:bg-[#107c41] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              <span>{isEditing ? 'Simpan Perubahan' : 'Tambah Kelas'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
