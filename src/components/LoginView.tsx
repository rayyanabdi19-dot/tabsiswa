import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, UserSession, Student, RegisteredAccount, SchoolInfo } from '../types';
import { showToast } from './Toast';
import { INITIAL_STUDENTS } from '../data/mockData';
import { TabsiLogo } from './TabsiLogo';
import {
  getRegisteredAccounts,
  registerNewAccount,
  DEFAULT_ADMIN_ACCOUNT,
  validateNisnFormat,
  checkNisnDuplicateInWorkspace,
  registerNewStudentInWorkspace,
  loadAccountWorkspace,
  getCurrentActiveAccountId,
  setCurrentActiveAccountId,
} from '../utils/workspaceStorage';

interface LoginViewProps {
  students?: Student[];
  schoolInfo?: SchoolInfo;
  onLogin: (session: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  students = INITIAL_STUDENTS,
  schoolInfo,
  onLogin,
}) => {
  const [activeMode, setActiveMode] = useState<'login' | 'register'>('login');
  const [registerType, setRegisterType] = useState<'student' | 'admin'>('student');
  const [role, setRole] = useState<UserRole>('student');
  const [accounts, setAccounts] = useState<RegisteredAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('acc-default');
  const [currentSchoolName, setCurrentSchoolName] = useState<string>('SMA BINTANG GEMILANG');

  // Student Login Fields
  const [nisInput, setNisInput] = useState('0041234567');
  const [studentPin, setStudentPin] = useState('123456');
  const [showStudentPin, setShowStudentPin] = useState(false);

  // Admin Login Fields
  const [adminEmail, setAdminEmail] = useState('admin.siti@bintanggemilang.sch.id');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // School / Admin Registration Form Fields
  const [regName, setRegName] = useState('');
  const [regSchool, setRegSchool] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Student Registration Form Fields
  const [studentRegNisn, setStudentRegNisn] = useState('');
  const [studentRegName, setStudentRegName] = useState('');
  const [studentRegClass, setStudentRegClass] = useState('Kelas 10 A');
  const [studentRegGuardian, setStudentRegGuardian] = useState('');
  const [studentRegPhone, setStudentRegPhone] = useState('');
  const [studentRegAddress, setStudentRegAddress] = useState('');
  const [studentRegPin, setStudentRegPin] = useState('123456');
  const [touchedStudentNisn, setTouchedStudentNisn] = useState(false);

  // Load and synchronize active accounts and school name
  useEffect(() => {
    const loadedAccounts = getRegisteredAccounts();
    setAccounts(loadedAccounts);

    const savedActiveId = getCurrentActiveAccountId();
    const activeAcc = loadedAccounts.find((a) => a.id === savedActiveId) || loadedAccounts[0] || DEFAULT_ADMIN_ACCOUNT;
    setActiveAccountId(activeAcc.id);

    // Synchronize school name with priority: schoolInfo prop -> workspace storage -> account profile
    const ws = loadAccountWorkspace(activeAcc.id);
    const resolvedSchoolName = schoolInfo?.name || ws.schoolInfo?.name || activeAcc.schoolName || 'SMA BINTANG GEMILANG';
    setCurrentSchoolName(resolvedSchoolName);
  }, [schoolInfo?.name]);

  // Real-time NISN Validation & Anti-Duplication Checker for Student Registration
  const studentNisnValidation = useMemo(() => {
    if (!studentRegNisn.trim()) {
      return {
        isValid: false,
        cleanNisn: '',
        message: 'NISN wajib diisi (angka 4-12 digit).',
        isDuplicate: false,
      };
    }

    const formatCheck = validateNisnFormat(studentRegNisn);
    if (!formatCheck.isValid) {
      return {
        isValid: false,
        cleanNisn: formatCheck.cleanNisn,
        message: formatCheck.message,
        isDuplicate: false,
      };
    }

    // Check duplication in the current workspace
    const dupCheck = checkNisnDuplicateInWorkspace(activeAccountId, formatCheck.cleanNisn);
    if (dupCheck.isDuplicate && dupCheck.conflictingStudent) {
      return {
        isValid: false,
        cleanNisn: formatCheck.cleanNisn,
        message: `NISN "${formatCheck.cleanNisn}" sudah terdaftar atas nama ${dupCheck.conflictingStudent.name} (${dupCheck.conflictingStudent.className}) di ${currentSchoolName}.`,
        isDuplicate: true,
        conflictingStudent: dupCheck.conflictingStudent,
      };
    }

    return {
      isValid: true,
      cleanNisn: formatCheck.cleanNisn,
      message: formatCheck.isStandard10Digits
        ? '✓ NISN valid (10 Digit Kemendikbud) & siap didaftarkan.'
        : `✓ NIS/NISN valid (${formatCheck.cleanNisn.length} digit) & tersedia.`,
      isDuplicate: false,
    };
  }, [studentRegNisn, activeAccountId, currentSchoolName]);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'student') {
      const activeWorkspace = loadAccountWorkspace(activeAccountId);
      const activeStd = activeWorkspace.students[0] || students[0];
      if (activeStd) {
        setNisInput(activeStd.nisn);
        setStudentPin(activeStd.pin || '123456');
      }
    } else {
      const activeAcc = accounts.find((a) => a.id === activeAccountId) || DEFAULT_ADMIN_ACCOUNT;
      setAdminEmail(activeAcc.email);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'student') {
      const query = nisInput.trim().replace(/\s+/g, '');
      if (!query) {
        showToast('NIS / NISN Wajib Diisi', 'Silakan masukkan Nomor Induk Siswa Anda.', 'error');
        return;
      }

      // Check in active workspace first, then across all accounts and fallback
      let matchedStudent: Student | null = null;
      let targetAccountId = activeAccountId;

      const currentWs = loadAccountWorkspace(activeAccountId);
      let found = currentWs.students.find((s) => s.nisn === query || s.id === query);
      if (found) {
        matchedStudent = found;
        targetAccountId = activeAccountId;
      } else {
        for (const acc of accounts) {
          const ws = loadAccountWorkspace(acc.id);
          found = ws.students.find((s) => s.nisn === query || s.id === query);
          if (found) {
            matchedStudent = found;
            targetAccountId = acc.id;
            break;
          }
        }
        if (!matchedStudent) {
          matchedStudent = students.find((s) => s.nisn === query || s.id === query) || null;
        }
      }

      if (!matchedStudent) {
        showToast(
          'NIS Tidak Ditemukan',
          `Nomor Induk Siswa "${query}" tidak terdaftar pada sistem sekolah.`,
          'error'
        );
        return;
      }

      // Verify PIN (Managed by School Admin)
      const expectedPin = matchedStudent.pin || '123456';
      const cleanEnteredPin = studentPin.trim();
      if (!cleanEnteredPin) {
        showToast('PIN Wajib Diisi', 'Silakan masukkan 6 digit PIN tabungan Anda.', 'error');
        return;
      }

      if (cleanEnteredPin !== expectedPin) {
        showToast(
          'PIN Tabungan Salah',
          'PIN yang Anda masukkan keliru. Silakan periksa kembali atau hubungi bendahara/admin sekolah untuk mereset PIN Anda.',
          'error'
        );
        return;
      }

      setCurrentActiveAccountId(targetAccountId);
      onLogin({
        role: 'student',
        name: matchedStudent.name,
        nisnOrEmail: matchedStudent.nisn,
        className: matchedStudent.className,
        studentId: matchedStudent.id,
        accountId: targetAccountId,
        avatarUrl:
          matchedStudent.avatarUrl ||
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCnxBUwl02SVwyadeg4l9dwxInh2Ub3IZ47_EpYICav7_o6fcArr2BNlqq9V_6z5IhXHR45WdElLT8W4EbMjABwGM1nr0dEChtg5l2ya-PVen4emL9COraoIU7Pt3JtcGlksYy9Zs8-_K3_6PCr9FDeR0StcAczrrt2d6jwnfPJ5ZcL5hMpx3DitM3vXEuY6Ojeg7DltVClcrJIwKzg7b7vppEuxR7MU11xzQGm-g9jFUxLgvEklwJ',
      });

      showToast(
        'Login Siswa Berhasil',
        `Selamat datang ${matchedStudent.name}. Anda masuk ke portal tabungan ${currentSchoolName}.`
      );
    } else {
      // Admin login: Locate account by email
      const matchedAccount =
        accounts.find((a) => a.email.toLowerCase() === adminEmail.trim().toLowerCase()) ||
        accounts.find((a) => a.id === activeAccountId) ||
        DEFAULT_ADMIN_ACCOUNT;

      setCurrentActiveAccountId(matchedAccount.id);
      onLogin({
        role: 'admin',
        name: matchedAccount.name,
        nisnOrEmail: adminEmail || matchedAccount.email,
        accountId: matchedAccount.id,
        schoolName: matchedAccount.schoolName,
        avatarUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCFjn6lH32yAUrvZmJPLsf3nI-q1tIaonsaPQXroil8Cspc1anf9uM82rG6yhC8IPO6ivZN9_TxJc_M_fVjT9gIL-ma0VWaKTFhIxAi1R2DZky4Zy4spweYUvTyFbDdZvyMFX2sUqR6JXJ0XNy-QE7OpxdJczirH91jw7uv4KB-8kB-RsISksG59GD-Mre_4PlQopbCdulFRXEwWkxZjm4AXtg4BJ58NljC56Zp23ny1KfY-PbN5dkz',
      });

      showToast(
        'Login Bendahara Berhasil',
        `Selamat datang ${matchedAccount.name} di sistem ${matchedAccount.schoolName}.`
      );
    }
  };

  // Student Self-Registration Handler
  const handleStudentRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedStudentNisn(true);

    if (!studentRegNisn.trim() || !studentRegName.trim()) {
      showToast('Form Belum Lengkap', 'NISN dan Nama Siswa wajib diisi.', 'error');
      return;
    }

    if (!studentNisnValidation.isValid) {
      showToast(
        studentNisnValidation.isDuplicate ? 'Duplikasi NISN Terdeteksi' : 'Format NISN Tidak Valid',
        studentNisnValidation.message,
        'error'
      );
      return;
    }

    const regResult = registerNewStudentInWorkspace(activeAccountId, {
      nisn: studentNisnValidation.cleanNisn,
      name: studentRegName.trim(),
      className: studentRegClass.trim() || 'Kelas 10 A',
      guardianName: studentRegGuardian.trim() || '-',
      guardianPhone: studentRegPhone.trim() || '-',
      address: studentRegAddress.trim() || '-',
      pin: studentRegPin.trim() || '123456',
      initialBalance: 0,
    });

    if (!regResult.success || !regResult.student) {
      showToast('Pendaftaran Gagal', regResult.message, 'error');
      return;
    }

    const createdStudent = regResult.student;
    const targetAccount = accounts.find((a) => a.id === activeAccountId) || DEFAULT_ADMIN_ACCOUNT;

    onLogin({
      role: 'student',
      name: createdStudent.name,
      nisnOrEmail: createdStudent.nisn,
      className: createdStudent.className,
      studentId: createdStudent.id,
      accountId: targetAccount.id,
      avatarUrl: createdStudent.avatarUrl,
    });

    showToast(
      'Pendaftaran Siswa Berhasil',
      `Akun tabungan untuk ${createdStudent.name} (NISN: ${createdStudent.nisn}) berhasil dibuat dengan PIN: ${createdStudent.pin || '123456'}.`
    );
  };

  // Admin / School Workspace Registration Handler
  const handleSchoolRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!regName.trim() || !regSchool.trim() || !regEmail.trim()) {
      showToast('Form Belum Lengkap', 'Nama pengelola, nama sekolah, dan email wajib diisi.', 'error');
      return;
    }

    const newAcc = registerNewAccount({
      name: regName.trim(),
      schoolName: regSchool.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim(),
      role: 'admin',
    });

    const updatedAccs = getRegisteredAccounts();
    setAccounts(updatedAccs);
    setActiveAccountId(newAcc.id);
    setCurrentSchoolName(newAcc.schoolName);
    setCurrentActiveAccountId(newAcc.id);

    onLogin({
      role: 'admin',
      name: newAcc.name,
      nisnOrEmail: newAcc.email,
      accountId: newAcc.id,
      schoolName: newAcc.schoolName,
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCFjn6lH32yAUrvZmJPLsf3nI-q1tIaonsaPQXroil8Cspc1anf9uM82rG6yhC8IPO6ivZN9_TxJc_M_fVjT9gIL-ma0VWaKTFhIxAi1R2DZky4Zy4spweYUvTyFbDdZvyMFX2sUqR6JXJ0XNy-QE7OpxdJczirH91jw7uv4KB-8kB-RsISksG59GD-Mre_4PlQopbCdulFRXEwWkxZjm4AXtg4BJ58NljC56Zp23ny1KfY-PbN5dkz',
    });

    showToast(
      'Akun & Sekolah Baru Dibuat',
      `Workspace mandiri untuk ${newAcc.schoolName} telah siap dengan isolasi data terpisah.`
    );
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 selection:bg-[#96f7af] selection:text-[#00210c] overflow-hidden bg-slate-900">
      {/* Background Graphic Pattern */}
      <div className="absolute inset-0 z-0 opacity-25">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#0284c7]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#16a34a]/30 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 backdrop-blur-md">
        {/* Official TABSI Branding Header with Synchronized School Name at TOP */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-inner mb-3">
            <TabsiLogo size="lg" variant="modern" showByline={true} />
          </div>

          {/* Synchronized Institution / School Name Display right below logo */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50/90 text-[#006130] border border-emerald-200/90 rounded-full font-extrabold text-xs shadow-2xs mb-2 transition-all">
            <span className="material-symbols-outlined text-base text-[#006130]">account_balance</span>
            <span className="tracking-wide uppercase">{currentSchoolName}</span>
          </div>

          <p className="text-xs text-slate-500 font-medium max-w-xs">
            Sistem Informasi Tabungan Siswa Pintar &amp; Transparansi Keuangan Sekolah
          </p>
        </div>

        {/* Top Tab Mode: Masuk vs Daftar Akun Baru */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveMode('login')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Masuk ke Akun
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('register')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'register'
                ? 'bg-white text-[#006130] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            + Pendaftaran Akun Baru
          </button>
        </div>

        {/* MODE 1: LOGIN FORM (NO SCHOOL SELECTION DROPDOWN) */}
        {activeMode === 'login' && (
          <div>
            {/* Role Switcher */}
            <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-slate-50 border border-slate-200 rounded-2xl">
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  role === 'student'
                    ? 'bg-[#006130] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <span className="material-symbols-outlined text-base">school</span>
                <span>Role Siswa (NIS)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'bg-[#005db5] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                <span>Role Bendahara</span>
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* STUDENT ROLE LOGIN */}
              {role === 'student' && (
                <>
                  <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-900 flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-[#006130] shrink-0 mt-0.5">
                      lock_person
                    </span>
                    <div>
                      <strong>Cek Tabungan Siswa:</strong> Masukkan NIS/NISN dan PIN 6 digit yang diberikan oleh admin sekolah untuk membuka mutasi tabungan pribadi Anda.
                    </div>
                  </div>

                  {/* NIS / NISN Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Nomor Induk Siswa (NIS / NISN):
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                        badge
                      </span>
                      <input
                        type="text"
                        value={nisInput}
                        onChange={(e) => setNisInput(e.target.value)}
                        placeholder="Contoh: 0041234567 atau 102938"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#006130] focus:bg-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Quick Select Student in School */}
                  {(() => {
                    const currentWs = loadAccountWorkspace(activeAccountId);
                    const listToUse = currentWs.students.length > 0 ? currentWs.students : students;
                    return listToUse.length > 0 ? (
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-semibold">
                          Pilih Cepat Contoh Siswa Terdaftar:
                        </label>
                        <select
                          onChange={(e) => {
                            const chosen = listToUse.find((s) => s.id === e.target.value);
                            if (chosen) {
                              setNisInput(chosen.nisn);
                              setStudentPin(chosen.pin || '123456');
                            }
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
                        >
                          {listToUse.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.className} - NIS: {s.nisn})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null;
                  })()}

                  {/* PIN 6 Digit (Managed by School Admin) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">PIN Tabungan (6 Digit):</label>
                      <span className="text-[10px] text-slate-400">PIN awal: 123456</span>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                        pin
                      </span>
                      <input
                        type={showStudentPin ? 'text' : 'password'}
                        value={studentPin}
                        onChange={(e) => setStudentPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                        placeholder="••••••"
                        maxLength={6}
                        required
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest text-[#006130] focus:outline-none focus:border-[#006130] focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentPin(!showStudentPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showStudentPin ? 'Sembunyikan' : 'Tampilkan PIN'}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {showStudentPin ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ADMIN / BENDAHARA ROLE LOGIN */}
              {role === 'admin' && (
                <>
                  {/* Email / Username */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">Email Pengelola / Bendahara:</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                        mail
                      </span>
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@sekolah.sch.id"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#005db5] focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">Kata Sandi:</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                        lock
                      </span>
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#005db5] focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {showAdminPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-3 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 mt-5 ${
                  role === 'admin'
                    ? 'bg-[#005db5] hover:bg-[#004a93]'
                    : 'bg-[#006130] hover:bg-[#107c41]'
                }`}
              >
                <span>Masuk Sekarang</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </form>
          </div>
        )}

        {/* MODE 2: REGISTRATION FORM */}
        {activeMode === 'register' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Registration Type Selector: Siswa Baru (NISN) vs Sekolah / Bendahara */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 border border-slate-200 rounded-2xl">
              <button
                type="button"
                onClick={() => setRegisterType('student')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  registerType === 'student'
                    ? 'bg-[#006130] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <span className="material-symbols-outlined text-sm">how_to_reg</span>
                <span>Daftar Siswa Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setRegisterType('admin')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  registerType === 'admin'
                    ? 'bg-[#005db5] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <span className="material-symbols-outlined text-sm">add_business</span>
                <span>Buat Sekolah Baru</span>
              </button>
            </div>

            {/* FORM 2A: REGISTRASI SISWA BARU DENGAN VALIDASI NISN & PIN */}
            {registerType === 'student' && (
              <form onSubmit={handleStudentRegisterSubmit} className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-900 flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-[#006130] shrink-0 mt-0.5">
                    verified_user
                  </span>
                  <div>
                    <strong>Pendaftaran Siswa di {currentSchoolName}:</strong> Sistem secara otomatis memvalidasi NISN dan membuat akun tabungan terlindungi PIN.
                  </div>
                </div>

                {/* NISN Input with Real-Time Validation & Anti-Duplication Feedback */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      NISN (Nomor Induk Siswa Nasional): <span className="text-[#ba1a1a]">*</span>
                    </label>
                    {studentRegNisn.trim().length > 0 && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          studentNisnValidation.isValid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {studentNisnValidation.isValid ? '✓ NISN Tersedia' : '✗ Tidak Valid / Duplikat'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                      badge
                    </span>
                    <input
                      type="text"
                      required
                      value={studentRegNisn}
                      onChange={(e) => {
                        setStudentRegNisn(e.target.value);
                        setTouchedStudentNisn(true);
                      }}
                      placeholder="Contoh: 0041234567 (10 Digit)"
                      className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono font-bold outline-none transition-colors ${
                        !touchedStudentNisn || !studentRegNisn.trim()
                          ? 'border-slate-300 focus:border-[#006130]'
                          : studentNisnValidation.isValid
                          ? 'border-emerald-500 bg-emerald-50/40 focus:border-emerald-600'
                          : 'border-rose-500 bg-rose-50/50 focus:border-rose-600'
                      }`}
                    />
                  </div>
                  {studentRegNisn.trim().length > 0 && (
                    <p
                      className={`text-[11px] font-semibold flex items-center gap-1 mt-1 ${
                        studentNisnValidation.isValid ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {studentNisnValidation.isValid ? 'check_circle' : 'error'}
                      </span>
                      <span>{studentNisnValidation.message}</span>
                    </p>
                  )}
                </div>

                {/* Nama Lengkap & Kelas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">
                      Nama Lengkap Siswa: <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={studentRegName}
                      onChange={(e) => setStudentRegName(e.target.value)}
                      placeholder="Nama Lengkap"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#006130] focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">
                      Rombel Kelas: <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={studentRegClass}
                      onChange={(e) => setStudentRegClass(e.target.value)}
                      placeholder="Contoh: Kelas 10 A"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#006130] focus:bg-white"
                    />
                  </div>
                </div>

                {/* Nama Wali & No WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Nama Orang Tua / Wali:</label>
                    <input
                      type="text"
                      value={studentRegGuardian}
                      onChange={(e) => setStudentRegGuardian(e.target.value)}
                      placeholder="Nama Orang Tua"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#006130] focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">WhatsApp Notifikasi Wali:</label>
                    <input
                      type="tel"
                      value={studentRegPhone}
                      onChange={(e) => setStudentRegPhone(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#006130] focus:bg-white"
                    />
                  </div>
                </div>

                {/* PIN Tabungan */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Buat PIN Akses (6 Digit):</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={studentRegPin}
                    onChange={(e) => setStudentRegPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest text-[#006130] focus:outline-none focus:border-[#006130] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!studentNisnValidation.isValid && studentRegNisn.trim().length > 0}
                  className={`w-full py-3 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 mt-3 ${
                    studentNisnValidation.isValid || !studentRegNisn.trim()
                      ? 'bg-[#006130] hover:bg-[#107c41]'
                      : 'bg-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span>Daftarkan Akun Siswa Sekarang</span>
                </button>
              </form>
            )}

            {/* FORM 2B: REGISTRASI AKUN SEKOLAH / BENDAHARA BARU */}
            {registerType === 'admin' && (
              <form onSubmit={handleSchoolRegisterSubmit} className="space-y-3.5">
                <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-2xl text-[11px] text-blue-900 flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-[#005db5] shrink-0 mt-0.5">
                    verified_user
                  </span>
                  <div>
                    <strong>Isolasi Data Terjamin:</strong> Pendaftaran sekolah baru otomatis membuat ruang kerja (*workspace*) terpisah. Data murid dan kasir terisolasi mandiri.
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Nama Sekolah / Instansi Baru:</label>
                  <input
                    type="text"
                    value={regSchool}
                    onChange={(e) => setRegSchool(e.target.value)}
                    placeholder="Contoh: SMP Negeri 2 Gemilang"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#006130] focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Nama Lengkap Bendahara / Admin:</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Contoh: Siti Nurhaliza, S.Pd"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#006130] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Email Akun:</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="admin@smp2.sch.id"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#006130] focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">No. WhatsApp Admin:</label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#006130] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Kata Sandi Baru:</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#006130] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#005db5] hover:bg-[#004a93] text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 mt-4"
                >
                  <span className="material-symbols-outlined text-sm">add_business</span>
                  <span>Daftarkan Akun &amp; Workspace Baru</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Security & Privacy Badge */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-center flex items-center justify-center gap-2 text-[10px] text-slate-600 font-medium">
          <span className="material-symbols-outlined text-xs text-emerald-600">verified_user</span>
          <span>TABSI by MD2R • Terlindungi Enkripsi &amp; Isolasi Data Penuh</span>
        </div>
      </div>
    </div>
  );
};
