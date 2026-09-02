export type UserRole = 'admin' | 'student';

export interface RegisteredAccount {
  id: string; // e.g. 'acc-default' or 'acc-1700000000'
  name: string; // e.g. 'Siti Rahmawati'
  schoolName: string; // e.g. 'SMA BINTANG GEMILANG'
  email: string;
  phone?: string;
  role: 'admin' | 'student';
  createdAt: string;
}

export interface UserSession {
  role: UserRole;
  name: string;
  nisnOrEmail: string;
  avatarUrl?: string;
  className?: string;
  studentId?: string;
  accountId?: string;
  schoolName?: string;
}

export interface WhatsAppReceiptPayload {
  transactionId: string;
  studentName: string;
  studentNisn: string;
  className: string;
  guardianName?: string;
  guardianPhone: string;
  type: TransactionType;
  amount: number;
  date: string;
  time?: string;
  notes?: string;
  totalBalance: number;
  availableBalance: number;
  lockedBalance: number;
  adminName: string;
  schoolName: string;
}

export type TransactionType = 'deposit' | 'withdrawal';
export type TransactionStatus = 'success' | 'pending' | 'cancelled';

export interface ClassInfo {
  id: string;
  name: string;
  level: string; // e.g. 'Kelas 10', 'Kelas 11', 'Kelas 12'
  homeroomTeacher: string; // Wali Kelas e.g. 'Siti Rahmawati, S.Pd'
  teacherPhone?: string;
  academicYear?: string; // e.g. '2023/2024'
  notes?: string;
}

export interface SavingsBreakdown {
  total: number;
  available: number; // 80% usable
  locked: number; // 20% locked
  usablePercentage: number;
  lockedPercentage: number;
}

export interface RecurringSavings {
  id: string;
  isEnabled: boolean;
  amount: number; // e.g. 100000
  debitDate: number; // Day of month 1 to 28
  sourceAccount: 'bank_transfer' | 'e_wallet' | 'uang_saku' | 'gaji_ortu';
  sourceName?: string; // e.g. 'Virtual Account BCA / Uang Saku'
  frequency: 'monthly' | 'weekly';
  notes?: string;
  category?: string;
  lastDebitedDate?: string;
  nextDebitDate?: string;
  notificationReminder: boolean;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  className: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  avatarUrl: string;
  balance: number;
  initialDepositDate: string;
  goal?: SavingsGoal;
  recurringSavings?: RecurringSavings;
  pin?: string; // 6-digit PIN login siswa, dikelola oleh admin/bendahara sekolah
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  status: 'active' | 'completed';
}

export interface Transaction {
  id: string;
  studentId: string;
  studentName: string;
  studentNisn: string;
  className: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO or YYYY-MM-DD
  time?: string;
  status: TransactionStatus;
  adminName: string;
  notes: string;
  category?: string;
}

export interface ReportConfig {
  className: string;
  startDate: string;
  endDate: string;
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD MMM YYYY';
  includeBalanceSummary: boolean;
  includeTransactionDetails: boolean;
  includeClassStats: boolean;
  columns: {
    nisn: boolean;
    name: boolean;
    className: boolean;
    date: boolean;
    type: boolean;
    amount: boolean;
    notes: boolean;
  };
}

export interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  principalName: string;
  treasurerName?: string;
  logoUrl: string;
}

export type AdminTab =
  | 'dashboard'
  | 'classes'
  | 'students'
  | 'transactions'
  | 'history'
  | 'profile'
  | 'report'
  | 'guide';

export type StudentTab =
  | 'student-portal-balance'
  | 'student-portal-history'
  | 'student-portal-profile'
  | 'guide';

export type NavigationTab = AdminTab | StudentTab;

