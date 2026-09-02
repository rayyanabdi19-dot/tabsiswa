import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '../types';
import { showToast } from './Toast';
import { StudentAvatarPicker, DEFAULT_AVATAR } from './StudentAvatarPicker';
import { validateNisnFormat, checkNisnDuplicateInList } from '../utils/workspaceStorage';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveStudent: (student: Student) => void;
  editingStudent?: Student | null;
  existingClasses: string[];
  existingStudents?: Student[];
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSaveStudent,
  editingStudent,
  existingClasses,
  existingStudents = [],
}) => {
  const [nisn, setNisn] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('Class 10A Science');
  const [customClass, setCustomClass] = useState('');
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [balance, setBalance] = useState('0');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [touchedNisn, setTouchedNisn] = useState(false);
  const [pin, setPin] = useState('123456');
  const [showPin, setShowPin] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  useEffect(() => {
    if (editingStudent) {
      setNisn(editingStudent.nisn);
      setName(editingStudent.name);
      if (existingClasses.includes(editingStudent.className)) {
        setClassName(editingStudent.className);
        setIsCustomClass(false);
      } else {
        setIsCustomClass(true);
        setCustomClass(editingStudent.className);
      }
      setBalance(String(editingStudent.balance));
      setGuardianName(editingStudent.guardianName || '');
      setGuardianPhone(editingStudent.guardianPhone || '');
      setAddress(editingStudent.address || '');
      setAvatarUrl(editingStudent.avatarUrl || DEFAULT_AVATAR);
      setPin(editingStudent.pin || '123456');
      setShowPin(false);
      setCopiedPin(false);
      setTouchedNisn(false);
    } else {
      // Default new student form
      setNisn('');
      setName('');
      setClassName(existingClasses[0] || 'Class 10A Science');
      setIsCustomClass(false);
      setCustomClass('');
      setBalance('0');
      setGuardianName('');
      setGuardianPhone('');
      setAddress('');
      setAvatarUrl(DEFAULT_AVATAR);
      setPin('123456');
      setShowPin(false);
      setCopiedPin(false);
      setTouchedNisn(false);
    }
  }, [editingStudent, existingClasses, isOpen]);

  // Real-time NISN Validation & Anti-Duplication Check
  const nisnValidation = useMemo(() => {
    if (!nisn.trim()) {
      return {
        isValid: false,
        message: 'NISN wajib diisi (angka 4-12 digit).',
        isDuplicate: false,
      };
    }

    const formatCheck = validateNisnFormat(nisn);
    if (!formatCheck.isValid) {
      return {
        isValid: false,
        message: formatCheck.message,
        isDuplicate: false,
      };
    }

    const dupCheck = checkNisnDuplicateInList(existingStudents, formatCheck.cleanNisn, editingStudent?.id);
    if (dupCheck.isDuplicate && dupCheck.conflictingStudent) {
      return {
        isValid: false,
        message: `NISN "${formatCheck.cleanNisn}" sudah digunakan oleh ${dupCheck.conflictingStudent.name} (${dupCheck.conflictingStudent.className}).`,
        isDuplicate: true,
        conflictingStudent: dupCheck.conflictingStudent,
      };
    }

    return {
      isValid: true,
      cleanNisn: formatCheck.cleanNisn,
      message: formatCheck.isStandard10Digits
        ? '✓ NISN valid (10 Digit Kemendikbud) & belum digunakan.'
        : `✓ NIS/NISN valid (${formatCheck.cleanNisn.length} digit) & tersedia.`,
      isDuplicate: false,
    };
  }, [nisn, existingStudents, editingStudent]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedNisn(true);

    if (!nisn.trim() || !name.trim()) {
      showToast('Form Tidak Lengkap', 'NISN dan Nama Siswa wajib diisi.', 'error');
      return;
    }

    if (!nisnValidation.isValid) {
      showToast(
        nisnValidation.isDuplicate ? 'Duplikasi NISN Ditolak' : 'Format NISN Tidak Valid',
        nisnValidation.message,
        'error'
      );
      return;
    }

    const finalClassName = isCustomClass ? (customClass.trim() || 'Kelas Umum') : className;
    const finalBalance = Math.max(0, Number(balance.replace(/[^0-9]/g, '')) || 0);

    const cleanPin = pin.trim() ? pin.trim().slice(0, 6) : '123456';

    const studentData: Student = {
      id: editingStudent ? editingStudent.id : `s-${Date.now()}`,
      nisn: nisnValidation.cleanNisn || nisn.trim(),
      name: name.trim(),
      className: finalClassName,
      balance: finalBalance,
      guardianName: guardianName.trim() || '-',
      guardianPhone: guardianPhone.trim() || '-',
      address: address.trim() || '-',
      initialDepositDate: editingStudent?.initialDepositDate || new Date().toISOString().split('T')[0],
      avatarUrl: avatarUrl || DEFAULT_AVATAR,
      goal: editingStudent?.goal,
      pin: cleanPin,
    };

    onSaveStudent(studentData);
    showToast(
      editingStudent ? 'Data Siswa Diperbarui' : 'Siswa Baru Ditambahkan',
      `${studentData.name} (NISN: ${studentData.nisn}) berhasil disimpan ke workspace.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div
        className="bg-[#ffffff] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#becabd] max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-3 border-b border-[#becabd]/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006130] text-2xl">
              {editingStudent ? 'edit_note' : 'person_add'}
            </span>
            <h3 className="text-lg font-bold text-[#1a1c1c]">
              {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#6f7a6f] hover:text-[#1a1c1c] p-1 rounded-full cursor-pointer">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs flex-1 overflow-y-auto custom-scrollbar my-4 pr-1">
          {/* Photo / Avatar Section */}
          <StudentAvatarPicker
            currentAvatar={avatarUrl}
            onChangeAvatar={setAvatarUrl}
            studentName={name || 'Siswa Baru'}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[#1a1c1c]">
                  NISN (Nomor Induk) <span className="text-[#ba1a1a]">*</span>
                </label>
                {nisn.trim().length > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      nisnValidation.isValid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {nisnValidation.isValid ? 'Tersedia' : 'Cek Error'}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="Contoh: 0041234567"
                value={nisn}
                onChange={(e) => {
                  setNisn(e.target.value);
                  setTouchedNisn(true);
                }}
                className={`w-full bg-[#faf9f8] border rounded-lg p-2.5 text-xs text-[#1a1c1c] font-mono outline-none transition-colors ${
                  !touchedNisn || !nisn.trim()
                    ? 'border-[#becabd] focus:border-[#006130]'
                    : nisnValidation.isValid
                    ? 'border-emerald-500 bg-emerald-50/30 focus:border-emerald-600'
                    : 'border-rose-500 bg-rose-50/40 focus:border-rose-600'
                }`}
              />
              {/* Inline NISN Validation Message */}
              {nisn.trim().length > 0 && (
                <p
                  className={`text-[11px] mt-1 font-semibold flex items-center gap-1 ${
                    nisnValidation.isValid ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">
                    {nisnValidation.isValid ? 'check_circle' : 'error'}
                  </span>
                  <span>{nisnValidation.message}</span>
                </p>
              )}
            </div>

            <div>
              <label className="font-bold text-[#1a1c1c] block mb-1">
                Nama Lengkap Siswa <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nama Lengkap Siswa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
              />
            </div>
          </div>


          <div>
            <label className="font-bold text-[#1a1c1c] block mb-1">Kelas</label>
            {!isCustomClass ? (
              <div className="flex gap-2">
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="flex-1 bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
                >
                  {existingClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCustomClass(true)}
                  className="px-3 py-2 bg-[#f4f3f2] hover:bg-[#e9e8e7] border border-[#becabd] text-[#005db5] font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
                >
                  + Kelas Baru
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik nama kelas baru (misal: 10C Science)"
                  value={customClass}
                  onChange={(e) => setCustomClass(e.target.value)}
                  className="flex-1 bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomClass(false)}
                  className="px-3 py-2 bg-[#f4f3f2] hover:bg-[#e9e8e7] border border-[#becabd] text-[#3f4940] font-semibold text-xs rounded-lg transition-colors"
                >
                  Pilih Daftar
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-[#1a1c1c] block mb-1">
              {editingStudent ? 'Saldo Tabungan (Rp)' : 'Saldo Tabungan Awal (Rp)'}
            </label>
            <input
              type="number"
              min="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none font-semibold text-[#006130]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#3f4940] block mb-1">Nama Orang Tua / Wali</label>
              <input
                type="text"
                placeholder="Nama Wali"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-[#3f4940] block mb-1">No. HP / WhatsApp Wali</label>
              <input
                type="text"
                placeholder="0812-xxxx-xxxx"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
              />
            </div>
          </div>

          {/* Security & PIN Settings Card */}
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-[#006130]">lock_person</span>
                <label className="font-bold text-[#1a1c1c] text-xs">
                  PIN Login Siswa (6 Digit)
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
                    setPin(randomPin);
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-emerald-100/70 text-[#006130] border border-emerald-300 rounded-md transition-colors cursor-pointer"
                >
                  Acak PIN
                </button>
                <button
                  type="button"
                  onClick={() => setPin('123456')}
                  className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md transition-colors cursor-pointer"
                >
                  Default (123456)
                </button>
              </div>
            </div>

            <div className="relative flex items-center">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                  setPin(val);
                }}
                placeholder="123456"
                className="w-full bg-white border border-emerald-300 rounded-lg py-2 pl-3 pr-20 text-xs font-mono font-bold tracking-widest text-[#006130] outline-none focus:border-[#006130] focus:ring-1 focus:ring-[#006130]"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                  title={showPin ? 'Sembunyikan PIN' : 'Lihat PIN'}
                >
                  <span className="material-symbols-outlined text-sm">
                    {showPin ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pin || '123456');
                    setCopiedPin(true);
                    setTimeout(() => setCopiedPin(false), 2000);
                  }}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                  title="Salin PIN"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copiedPin ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              PIN ini digunakan siswa untuk masuk ke Portal Tabungan &amp; melihat mutasi tabungan pribadi.
            </p>
          </div>

          <div>
            <label className="font-semibold text-[#3f4940] block mb-1">Alamat Domisili Siswa</label>
            <textarea
              rows={2}
              placeholder="Alamat lengkap tempat tinggal"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
            />
          </div>

          <div className="pt-3 border-t border-[#becabd]/60 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#becabd] text-[#3f4940] font-semibold text-xs rounded-lg hover:bg-[#e9e8e7]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#006130] hover:bg-[#107c41] text-[#ffffff] font-bold text-xs rounded-lg shadow-sm transition-all"
            >
              {editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
