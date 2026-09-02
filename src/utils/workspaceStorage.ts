import { Student, Transaction, ClassInfo, SchoolInfo, RegisteredAccount } from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_CLASSES,
  INITIAL_SCHOOL_INFO,
} from '../data/mockData';

const ACCOUNTS_KEY = 'tabsi_registered_accounts_v1';
const CURRENT_ACCOUNT_KEY = 'tabsi_current_active_account_id';

// Default initial admin account
export const DEFAULT_ADMIN_ACCOUNT: RegisteredAccount = {
  id: 'acc-default',
  name: 'Siti Rahmawati (Bendahara)',
  schoolName: 'SMA BINTANG GEMILANG',
  email: 'admin.siti@bintanggemilang.sch.id',
  phone: '08123456789',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

// Retrieve all registered accounts
export function getRegisteredAccounts(): RegisteredAccount[] {
  try {
    const saved = localStorage.getItem(ACCOUNTS_KEY);
    if (!saved) {
      const initial = [DEFAULT_ADMIN_ACCOUNT];
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(saved);
  } catch {
    return [DEFAULT_ADMIN_ACCOUNT];
  }
}

// Register a new isolated school account
export function registerNewAccount(params: {
  name: string;
  schoolName: string;
  email: string;
  phone?: string;
  role?: 'admin' | 'student';
}): RegisteredAccount {
  const accounts = getRegisteredAccounts();
  const newAccount: RegisteredAccount = {
    id: `acc-${Date.now()}`,
    name: params.name,
    schoolName: params.schoolName || 'Sekolah Baru',
    email: params.email,
    phone: params.phone || '',
    role: params.role || 'admin',
    createdAt: new Date().toISOString(),
  };

  accounts.push(newAccount);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  localStorage.setItem(CURRENT_ACCOUNT_KEY, newAccount.id);

  // Initialize fresh isolated workspace for this new account
  const schoolProfile: SchoolInfo = {
    ...INITIAL_SCHOOL_INFO,
    name: params.schoolName || 'Sekolah Baru',
    email: params.email,
    phone: params.phone || INITIAL_SCHOOL_INFO.phone,
    treasurerName: params.name,
  };

  saveAccountWorkspace(newAccount.id, {
    students: [
      {
        id: `std-1-${Date.now()}`,
        nisn: '1001',
        name: 'Siswa Contoh 1',
        className: 'Kelas 10 A',
        address: 'Jl. Contoh Siswa No. 1',
        guardianName: 'Orang Tua Contoh',
        guardianPhone: params.phone || '081234567890',
        avatarUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCnxBUwl02SVwyadeg4l9dwxInh2Ub3IZ47_EpYICav7_o6fcArr2BNlqq9V_6z5IhXHR45WdElLT8W4EbMjABwGM1nr0dEChtg5l2ya-PVen4emL9COraoIU7Pt3JtcGlksYy9Zs8-_K3_6PCr9FDeR0StcAczrrt2d6jwnfPJ5ZcL5hMpx3DitM3vXEuY6Ojeg7DltVClcrJIwKzg7b7vppEuxR7MU11xzQGm-g9jFUxLgvEklwJ',
        balance: 50000,
        initialDepositDate: new Date().toISOString().split('T')[0],
      },
    ],
    transactions: [],
    classes: [
      {
        id: 'cls-1',
        name: 'Kelas 10 A',
        level: 'Kelas 10',
        homeroomTeacher: params.name,
        academicYear: '2023/2024',
      },
    ],
    schoolInfo: schoolProfile,
  });

  return newAccount;
}

// Workspace Keys
function getStorageKey(accountId: string, suffix: string) {
  return `tabsi_data_${accountId}_${suffix}`;
}

export interface WorkspaceData {
  students: Student[];
  transactions: Transaction[];
  classes: ClassInfo[];
  schoolInfo: SchoolInfo;
}

// Load isolated workspace data for an account
export function loadAccountWorkspace(accountId: string = 'acc-default'): WorkspaceData {
  try {
    const studentsRaw = localStorage.getItem(getStorageKey(accountId, 'students'));
    const txsRaw = localStorage.getItem(getStorageKey(accountId, 'transactions'));
    const classesRaw = localStorage.getItem(getStorageKey(accountId, 'classes'));
    const schoolRaw = localStorage.getItem(getStorageKey(accountId, 'school'));

    const students: Student[] = (studentsRaw ? JSON.parse(studentsRaw) : INITIAL_STUDENTS).map((s: Student) => ({
      ...s,
      pin: s.pin || '123456',
    }));
    const transactions: Transaction[] = txsRaw ? JSON.parse(txsRaw) : INITIAL_TRANSACTIONS;
    const classes: ClassInfo[] = classesRaw ? JSON.parse(classesRaw) : INITIAL_CLASSES;
    const schoolInfo: SchoolInfo = schoolRaw ? JSON.parse(schoolRaw) : INITIAL_SCHOOL_INFO;

    return { students, transactions, classes, schoolInfo };
  } catch {
    return {
      students: INITIAL_STUDENTS.map((s) => ({ ...s, pin: s.pin || '123456' })),
      transactions: INITIAL_TRANSACTIONS,
      classes: INITIAL_CLASSES,
      schoolInfo: INITIAL_SCHOOL_INFO,
    };
  }
}

// Save isolated workspace data for an account
export function saveAccountWorkspace(accountId: string, data: Partial<WorkspaceData>) {
  try {
    if (data.students) {
      localStorage.setItem(getStorageKey(accountId, 'students'), JSON.stringify(data.students));
    }
    if (data.transactions) {
      localStorage.setItem(getStorageKey(accountId, 'transactions'), JSON.stringify(data.transactions));
    }
    if (data.classes) {
      localStorage.setItem(getStorageKey(accountId, 'classes'), JSON.stringify(data.classes));
    }
    if (data.schoolInfo) {
      localStorage.setItem(getStorageKey(accountId, 'school'), JSON.stringify(data.schoolInfo));
      // Synchronize schoolName in registered accounts list
      const accounts = getRegisteredAccounts();
      const idx = accounts.findIndex((a) => a.id === accountId);
      if (idx >= 0 && data.schoolInfo.name) {
        accounts[idx].schoolName = data.schoolInfo.name;
        if (data.schoolInfo.treasurerName) {
          accounts[idx].name = data.schoolInfo.treasurerName;
        }
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      }
    }
  } catch (err) {
    console.error('Error saving account workspace:', err);
  }
}

export function getCurrentActiveAccountId(): string {
  try {
    return localStorage.getItem(CURRENT_ACCOUNT_KEY) || 'acc-default';
  } catch {
    return 'acc-default';
  }
}

export function setCurrentActiveAccountId(accountId: string) {
  try {
    localStorage.setItem(CURRENT_ACCOUNT_KEY, accountId);
  } catch {}
}

/**
 * Validate NISN format (Nomor Induk Siswa Nasional):
 * - Must not be empty
 * - Must consist of numbers only (4-12 digits, standard Kemendikbud is 10 digits)
 */
export function validateNisnFormat(rawNisn: string): {
  isValid: boolean;
  cleanNisn: string;
  message: string;
  isStandard10Digits: boolean;
} {
  const trimmed = (rawNisn || '').trim();
  const cleanNisn = trimmed.replace(/\s+/g, '');

  if (!cleanNisn) {
    return {
      isValid: false,
      cleanNisn: '',
      message: 'NISN tidak boleh kosong.',
      isStandard10Digits: false,
    };
  }

  if (!/^\d+$/.test(cleanNisn)) {
    return {
      isValid: false,
      cleanNisn,
      message: 'NISN hanya boleh berisi angka (0-9) tanpa spasi atau huruf.',
      isStandard10Digits: false,
    };
  }

  if (cleanNisn.length < 4) {
    return {
      isValid: false,
      cleanNisn,
      message: 'NISN terlalu pendek (minimal 4 digit).',
      isStandard10Digits: false,
    };
  }

  if (cleanNisn.length > 12) {
    return {
      isValid: false,
      cleanNisn,
      message: 'NISN terlalu panjang (maksimal 12 digit).',
      isStandard10Digits: false,
    };
  }

  const isStandard10Digits = cleanNisn.length === 10;
  return {
    isValid: true,
    cleanNisn,
    message: isStandard10Digits
      ? 'NISN valid (Standar 10 digit Kemendikbud).'
      : `NIS/NISN valid (${cleanNisn.length} digit).`,
    isStandard10Digits,
  };
}

/**
 * Check if a NISN is duplicate in a student list
 */
export function checkNisnDuplicateInList(
  students: Student[],
  rawNisn: string,
  excludeStudentId?: string
): {
  isDuplicate: boolean;
  conflictingStudent?: Student;
  cleanNisn: string;
} {
  const cleanNisn = (rawNisn || '').trim().replace(/\s+/g, '');
  if (!cleanNisn) return { isDuplicate: false, cleanNisn };

  const conflictingStudent = students.find((s) => {
    const existingClean = (s.nisn || '').trim().replace(/\s+/g, '');
    return existingClean === cleanNisn && (!excludeStudentId || s.id !== excludeStudentId);
  });

  return {
    isDuplicate: !!conflictingStudent,
    conflictingStudent,
    cleanNisn,
  };
}

/**
 * Check if a NISN is duplicate in a specific workspace
 */
export function checkNisnDuplicateInWorkspace(
  accountId: string,
  rawNisn: string,
  excludeStudentId?: string
): {
  isDuplicate: boolean;
  conflictingStudent?: Student;
  cleanNisn: string;
} {
  const workspace = loadAccountWorkspace(accountId);
  return checkNisnDuplicateInList(workspace.students, rawNisn, excludeStudentId);
}

/**
 * Register a new student into an isolated workspace with strict anti-duplication validation
 */
export function registerNewStudentInWorkspace(
  accountId: string,
  studentData: {
    nisn: string;
    name: string;
    className: string;
    guardianName?: string;
    guardianPhone?: string;
    address?: string;
    avatarUrl?: string;
    initialBalance?: number;
    pin?: string;
  }
): {
  success: boolean;
  message: string;
  student?: Student;
} {
  const formatCheck = validateNisnFormat(studentData.nisn);
  if (!formatCheck.isValid) {
    return { success: false, message: formatCheck.message };
  }

  const dupCheck = checkNisnDuplicateInWorkspace(accountId, formatCheck.cleanNisn);
  if (dupCheck.isDuplicate && dupCheck.conflictingStudent) {
    return {
      success: false,
      message: `NISN ${formatCheck.cleanNisn} sudah digunakan oleh ${dupCheck.conflictingStudent.name} (${dupCheck.conflictingStudent.className}) pada sekolah ini.`,
    };
  }

  const workspace = loadAccountWorkspace(accountId);
  const newStudent: Student = {
    id: `std-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nisn: formatCheck.cleanNisn,
    name: studentData.name.trim(),
    className: studentData.className.trim() || 'Kelas 10 A',
    balance: Math.max(0, studentData.initialBalance || 0),
    guardianName: studentData.guardianName?.trim() || '-',
    guardianPhone: studentData.guardianPhone?.trim() || '-',
    address: studentData.address?.trim() || '-',
    initialDepositDate: new Date().toISOString().split('T')[0],
    pin: studentData.pin?.trim() || '123456',
    avatarUrl:
      studentData.avatarUrl ||
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCnxBUwl02SVwyadeg4l9dwxInh2Ub3IZ47_EpYICav7_o6fcArr2BNlqq9V_6z5IhXHR45WdElLT8W4EbMjABwGM1nr0dEChtg5l2ya-PVen4emL9COraoIU7Pt3JtcGlksYy9Zs8-_K3_6PCr9FDeR0StcAczrrt2d6jwnfPJ5ZcL5hMpx3DitM3vXEuY6Ojeg7DltVClcrJIwKzg7b7vppEuxR7MU11xzQGm-g9jFUxLgvEklwJ',
  };

  const updatedStudents = [...workspace.students, newStudent];
  saveAccountWorkspace(accountId, { students: updatedStudents });

  return {
    success: true,
    message: `Siswa ${newStudent.name} (NISN: ${newStudent.nisn}) berhasil didaftarkan.`,
    student: newStudent,
  };
}

