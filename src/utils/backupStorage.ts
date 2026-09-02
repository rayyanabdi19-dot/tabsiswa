import { SchoolInfo, ClassInfo, Student, Transaction } from '../types';

export interface BackupPayload {
  version: string;
  app: string;
  exportedAt: string;
  schoolInfo: SchoolInfo;
  classes: ClassInfo[];
  students: Student[];
  transactions: Transaction[];
  metadata: {
    totalStudents: number;
    totalClasses: number;
    totalTransactions: number;
    totalBalance: number;
  };
}

export interface BackupHistoryItem {
  id: string;
  date: string;
  type: 'full_json' | 'csv_export' | 'cloud_sync';
  fileName: string;
  totalStudents: number;
  totalTransactions: number;
  totalBalance: number;
  adminName?: string;
}

const LAST_BACKUP_KEY = 'tp_last_backup_date';
const BACKUP_HISTORY_KEY = 'tp_backup_history';

/**
 * Get information about the last backup and overdue status (recommended every 7 days)
 */
export function getBackupStatus(): {
  lastBackupDate: string | null;
  daysSinceLastBackup: number | null;
  isOverdue: boolean;
  statusLevel: 'safe' | 'warning' | 'urgent';
  message: string;
} {
  const lastBackupStr = localStorage.getItem(LAST_BACKUP_KEY);
  if (!lastBackupStr) {
    return {
      lastBackupDate: null,
      daysSinceLastBackup: null,
      isOverdue: true,
      statusLevel: 'urgent',
      message: 'Belum pernah melakukan backup data. Sangat disarankan segera mencadangkan data tabungan.',
    };
  }

  const lastDate = new Date(lastBackupStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 7) {
    return {
      lastBackupDate: lastBackupStr,
      daysSinceLastBackup: diffDays,
      isOverdue: true,
      statusLevel: 'urgent',
      message: `Sudah ${diffDays} hari sejak backup terakhir. Disarankan melakukan backup data secara rutin minimal 1 minggu 1 kali.`,
    };
  }

  if (diffDays >= 5) {
    return {
      lastBackupDate: lastBackupStr,
      daysSinceLastBackup: diffDays,
      isOverdue: false,
      statusLevel: 'warning',
      message: `Backup terakhir dilakukan ${diffDays} hari yang lalu. Jadwal backup mingguan berikutnya segera tiba.`,
    };
  }

  return {
    lastBackupDate: lastBackupStr,
    daysSinceLastBackup: diffDays,
    isOverdue: false,
    statusLevel: 'safe',
    message: `Data aman. Backup terakhir ${diffDays === 0 ? 'hari ini' : `${diffDays} hari yang lalu`}.`,
  };
}

/**
 * Update the last backup date in storage
 */
export function recordBackupEvent(item: Omit<BackupHistoryItem, 'id' | 'date'>) {
  const now = new Date().toISOString();
  localStorage.setItem(LAST_BACKUP_KEY, now);

  const history = getBackupHistory();
  const newItem: BackupHistoryItem = {
    id: `bk-${Date.now()}`,
    date: now,
    ...item,
  };

  const updated = [newItem, ...history].slice(0, 20); // keep last 20 records
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(updated));
  return newItem;
}

/**
 * Retrieve backup history log
 */
export function getBackupHistory(): BackupHistoryItem[] {
  try {
    const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Construct full backup payload object
 */
export function generateFullBackupPayload(
  schoolInfo: SchoolInfo,
  classes: ClassInfo[],
  students: Student[],
  transactions: Transaction[]
): BackupPayload {
  const totalBalance = students.reduce((sum, s) => sum + (s.balance || 0), 0);

  return {
    version: '2.5.0',
    app: 'TABSI - Sistem Tabungan Siswa',
    exportedAt: new Date().toISOString(),
    schoolInfo,
    classes,
    students,
    transactions,
    metadata: {
      totalStudents: students.length,
      totalClasses: classes.length,
      totalTransactions: transactions.length,
      totalBalance,
    },
  };
}

/**
 * Trigger download of full JSON backup file
 */
export function downloadJsonBackup(
  schoolInfo: SchoolInfo,
  classes: ClassInfo[],
  students: Student[],
  transactions: Transaction[],
  adminName: string = 'Admin Bendahara'
): { fileName: string; payload: BackupPayload } {
  const payload = generateFullBackupPayload(schoolInfo, classes, students, transactions);
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const cleanSchoolName = (schoolInfo.name || 'sekolah')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `backup-tabsi-${cleanSchoolName}-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Record event
  recordBackupEvent({
    type: 'full_json',
    fileName,
    totalStudents: students.length,
    totalTransactions: transactions.length,
    totalBalance: payload.metadata.totalBalance,
    adminName,
  });

  return { fileName, payload };
}

/**
 * Validate and parse an uploaded JSON backup file
 */
export function validateAndParseBackupFile(jsonString: string): {
  isValid: boolean;
  message: string;
  data?: BackupPayload;
} {
  try {
    const data = JSON.parse(jsonString);

    if (!data || typeof data !== 'object') {
      return { isValid: false, message: 'Format file tidak valid (bukan JSON terstruktur).' };
    }

    if (!Array.isArray(data.students)) {
      return { isValid: false, message: 'File backup tidak memuat daftar data siswa (students).' };
    }

    if (!Array.isArray(data.transactions)) {
      return { isValid: false, message: 'File backup tidak memuat data transaksi (transactions).' };
    }

    if (!data.schoolInfo || typeof data.schoolInfo !== 'object') {
      return { isValid: false, message: 'File backup tidak memuat informasi sekolah (schoolInfo).' };
    }

    return {
      isValid: true,
      message: `File backup valid. Memuat ${data.students.length} siswa, ${data.classes?.length || 0} kelas, dan ${data.transactions.length} transaksi.`,
      data: data as BackupPayload,
    };
  } catch (err: any) {
    return {
      isValid: false,
      message: `Gagal membaca file JSON: ${err?.message || 'Format rusak'}`,
    };
  }
}
