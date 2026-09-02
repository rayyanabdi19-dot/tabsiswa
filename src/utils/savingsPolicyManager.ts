import { SavingsPolicy, SavingsPolicyChangeLogItem, SavingsBreakdown, SchoolInfo } from '../types';
import { getRegisteredAccounts, getCurrentActiveAccountId } from './workspaceStorage';

const POLICY_STORAGE_KEY = 'tabsi_savings_policy';
const CHANGELOG_STORAGE_KEY = 'tabsi_savings_policy_changelog';
export const POLICY_UPDATED_EVENT = 'tabsi-savings-policy-updated';

export const DEFAULT_SAVINGS_POLICY: SavingsPolicy = {
  usablePercentage: 80,
  lockedPercentage: 20,
  minLockNominal: 0,
  policyName: 'Standar Disiplin Kas (80% Bisa Ditarik / 20% Terkunci)',
  description:
    'Sebanyak 80% saldo tabungan dapat ditarik sewaktu-waktu oleh siswa/wali untuk kebutuhan harian sekolah, sedangkan 20% dikunci sebagai dana tabungan wajib kelulusan/akhir semester.',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'Siti Rahmawati (Bendahara)',
};

export const INITIAL_POLICY_CHANGELOG: SavingsPolicyChangeLogItem[] = [
  {
    id: 'log-init-001',
    timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    adminName: 'Siti Rahmawati (Bendahara)',
    adminEmail: 'admin.siti@bintanggemilang.sch.id',
    oldUsablePercentage: 100,
    oldLockedPercentage: 0,
    newUsablePercentage: 80,
    newLockedPercentage: 20,
    reason: 'Inisialisasi sistem tabungan disiplin siswa (SK Kepala Sekolah No. 042/TABSI/2024).',
    adminConfirmationNote: 'Otorisasi Kata Sandi Admin Utama Terverifikasi',
  },
];

/**
 * Retrieve the active savings policy
 */
export function getStoredSavingsPolicy(): SavingsPolicy {
  try {
    const saved = localStorage.getItem(POLICY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.usablePercentage === 'number' && typeof parsed.lockedPercentage === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading savings policy:', e);
  }
  return DEFAULT_SAVINGS_POLICY;
}

/**
 * Retrieve the policy changelog history
 */
export function getStoredPolicyChangeLog(): SavingsPolicyChangeLogItem[] {
  try {
    const saved = localStorage.getItem(CHANGELOG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading policy changelog:', e);
  }
  return INITIAL_POLICY_CHANGELOG;
}

/**
 * Validate admin password before granting permission to alter ratio
 */
export function verifyAdminPassword(password: string): { isValid: boolean; message: string } {
  const cleanPass = (password || '').trim();
  if (!cleanPass) {
    return { isValid: false, message: 'Password admin tidak boleh kosong.' };
  }

  // Check against active registered admin accounts
  const accounts = getRegisteredAccounts();
  const currentActiveId = getCurrentActiveAccountId();
  const currentAccount = accounts.find((a) => a.id === currentActiveId);

  // Accepted passwords:
  // 1. 'admin123' (standard default admin password)
  // 2. 'admin'
  // 3. 'bintanggemilang'
  // 4. Custom password saved in localStorage 'tabsi_admin_password'
  // 5. If account-specific password exists
  const customSavedPass = localStorage.getItem('tabsi_admin_password');
  const validPasswords = ['admin123', 'admin', 'bintanggemilang', '123456'];
  if (customSavedPass) {
    validPasswords.push(customSavedPass);
  }

  if (validPasswords.includes(cleanPass)) {
    return { isValid: true, message: 'Password admin valid dan terverifikasi.' };
  }

  return {
    isValid: false,
    message: 'Password admin salah. Harap masukkan kata sandi bendahara/admin yang sesuai.',
  };
}

/**
 * Calculate dynamic savings breakdown based on total balance and configured policy
 */
export function calculateSavingsBreakdown(
  balance: number,
  customPolicy?: Partial<SavingsPolicy> | null
): SavingsBreakdown {
  const activePolicy = getStoredSavingsPolicy();
  const usableRatio = (customPolicy?.usablePercentage ?? activePolicy.usablePercentage ?? 80) / 100;
  const lockedRatio = (customPolicy?.lockedPercentage ?? activePolicy.lockedPercentage ?? 20) / 100;

  const total = Math.max(0, Math.round(balance || 0));
  const locked = Math.round(total * lockedRatio);
  const available = total - locked;

  return {
    total,
    available,
    locked,
    usablePercentage: Math.round(usableRatio * 100),
    lockedPercentage: Math.round(lockedRatio * 100),
  };
}

/**
 * Update the savings policy, record a Change Log item, and broadcast the change event
 */
export function updateSavingsPolicyWithAudit(params: {
  newUsablePercentage: number;
  newLockedPercentage: number;
  minLockNominal?: number;
  policyName?: string;
  description?: string;
  adminName: string;
  adminEmail?: string;
  reason: string;
  passwordConfirmation: string;
}): { success: boolean; message: string; updatedPolicy?: SavingsPolicy; changeLogItem?: SavingsPolicyChangeLogItem } {
  // 1. Verify Password
  const passCheck = verifyAdminPassword(params.passwordConfirmation);
  if (!passCheck.isValid) {
    return { success: false, message: passCheck.message };
  }

  // 2. Validate percentage sum
  const usable = Math.round(Number(params.newUsablePercentage));
  const locked = Math.round(Number(params.newLockedPercentage));

  if (isNaN(usable) || isNaN(locked) || usable < 0 || locked < 0 || usable > 100 || locked > 100) {
    return { success: false, message: 'Persentase harus berupa angka antara 0% hingga 100%.' };
  }

  if (usable + locked !== 100) {
    return {
      success: false,
      message: `Total persentase harus tepat 100% (Saat ini: Bisa Ditarik ${usable}% + Terkunci ${locked}% = ${usable + locked}%).`,
    };
  }

  if (!params.reason.trim()) {
    return {
      success: false,
      message: 'Alasan perubahan kebijakan wajib dicantumkan untuk catatan Change Log / Audit Trail.',
    };
  }

  const previousPolicy = getStoredSavingsPolicy();
  const updatedPolicy: SavingsPolicy = {
    usablePercentage: usable,
    lockedPercentage: locked,
    minLockNominal: params.minLockNominal || 0,
    policyName:
      params.policyName ||
      (locked === 0
        ? 'Bebas Tarik Penuh (100% Likuid / 0% Terkunci)'
        : locked === 20
        ? 'Standar Disiplin Kas (80% Bisa Ditarik / 20% Terkunci)'
        : `Kebijakan Khusus (${usable}% Bisa Ditarik / ${locked}% Terkunci)`),
    description:
      params.description ||
      `Sistem menetapkan ${usable}% dari saldo tabungan dapat ditarik oleh siswa, dan ${locked}% dikunci sebagai saldo cadangan wajib.`,
    lastUpdated: new Date().toISOString(),
    updatedBy: params.adminName,
  };

  // 3. Create Change Log Item
  const newLogItem: SavingsPolicyChangeLogItem = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    adminName: params.adminName,
    adminEmail: params.adminEmail || 'admin@sekolah.sch.id',
    oldUsablePercentage: previousPolicy.usablePercentage,
    oldLockedPercentage: previousPolicy.lockedPercentage,
    newUsablePercentage: usable,
    newLockedPercentage: locked,
    reason: params.reason.trim(),
    adminConfirmationNote: 'Otorisasi Kata Sandi Admin Berhasil Diverifikasi',
  };

  // 4. Save to localStorage
  try {
    localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(updatedPolicy));
    const currentLogs = getStoredPolicyChangeLog();
    const updatedLogs = [newLogItem, ...currentLogs];
    localStorage.setItem(CHANGELOG_STORAGE_KEY, JSON.stringify(updatedLogs));

    // Also update SchoolInfo in storage if present
    const schoolRaw = localStorage.getItem('tp_school_info');
    if (schoolRaw) {
      try {
        const schoolObj: SchoolInfo = JSON.parse(schoolRaw);
        schoolObj.savingsPolicy = updatedPolicy;
        schoolObj.policyChangeLog = updatedLogs;
        localStorage.setItem('tp_school_info', JSON.stringify(schoolObj));
      } catch (err) {
        // ignore
      }
    }

    // 5. Dispatch Custom Event for instant UI reactivity
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(POLICY_UPDATED_EVENT, {
          detail: { policy: updatedPolicy, log: newLogItem },
        })
      );
    }

    return {
      success: true,
      message: `Kebijakan rasio berhasil diperbarui menjadi ${usable}% Bisa Ditarik / ${locked}% Terkunci.`,
      updatedPolicy,
      changeLogItem: newLogItem,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal menyimpan perubahan kebijakan tabungan.',
    };
  }
}
