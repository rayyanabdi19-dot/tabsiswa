import { SavingsBreakdown, SavingsPolicy } from '../types';
import { calculateSavingsBreakdown, getStoredSavingsPolicy } from './savingsPolicyManager';

export {
  calculateSavingsBreakdown,
  getStoredSavingsPolicy,
  getStoredPolicyChangeLog,
  verifyAdminPassword,
  updateSavingsPolicyWithAudit,
  POLICY_UPDATED_EVENT,
  DEFAULT_SAVINGS_POLICY,
} from './savingsPolicyManager';

export function getSavingsBreakdown(
  balance: number,
  customPolicy?: Partial<SavingsPolicy> | null
): SavingsBreakdown {
  return calculateSavingsBreakdown(balance, customPolicy);
}

export function formatRupiah(amount: number, prefix: boolean = true): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(amount);

  return prefix ? `Rp ${formatted}` : formatted;
}

export function formatShortRupiah(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}K`;
  }
  return `Rp ${amount}`;
}

export function formatDateCustom(
  dateStr: string,
  format: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD MMM YYYY' | 'DD MMM YYYY, HH:mm' = 'DD/MM/YYYY'
): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const day = String(d.getDate()).padStart(2, '0');
  const monthNum = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const monthName = monthNames[d.getMonth()];

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${monthNum}-${day}`;
    case 'DD MMM YYYY':
      return `${day} ${monthName} ${year}`;
    case 'DD MMM YYYY, HH:mm':
      return `${day} ${monthName} ${year}, ${hours}:${minutes}`;
    case 'DD/MM/YYYY':
    default:
      return `${day}/${monthNum}/${year}`;
  }
}

export function exportToCSV(filename: string, rows: (string | number)[][]) {
  const processRow = (row: (string | number)[]) => {
    return row.map(val => {
      const stringVal = String(val ?? '');
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    }).join(',');
  };

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(processRow).join('\r\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function terbilang(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Nol Rupiah';
  if (amount < 0) return 'Minus ' + terbilang(Math.abs(amount));

  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  function convert(num: number): string {
    if (num < 12) {
      return satuan[num];
    } else if (num < 20) {
      return convert(num - 10) + ' Belas';
    } else if (num < 100) {
      const rest = num % 10;
      return convert(Math.floor(num / 10)) + ' Puluh' + (rest !== 0 ? ' ' + convert(rest) : '');
    } else if (num < 200) {
      const rest = num - 100;
      return 'Seratus' + (rest !== 0 ? ' ' + convert(rest) : '');
    } else if (num < 1000) {
      const rest = num % 100;
      return convert(Math.floor(num / 100)) + ' Ratus' + (rest !== 0 ? ' ' + convert(rest) : '');
    } else if (num < 2000) {
      const rest = num - 1000;
      return 'Seribu' + (rest !== 0 ? ' ' + convert(rest) : '');
    } else if (num < 1000000) {
      const rest = num % 1000;
      return convert(Math.floor(num / 1000)) + ' Ribu' + (rest !== 0 ? ' ' + convert(rest) : '');
    } else if (num < 1000000000) {
      const rest = num % 1000000;
      return convert(Math.floor(num / 1000000)) + ' Juta' + (rest !== 0 ? ' ' + convert(rest) : '');
    } else if (num < 1000000000000) {
      const rest = num % 1000000000;
      return convert(Math.floor(num / 1000000000)) + ' Miliar' + (rest !== 0 ? ' ' + convert(rest) : '');
    } else {
      const rest = num % 1000000000000;
      return convert(Math.floor(num / 1000000000000)) + ' Triliun' + (rest !== 0 ? ' ' + convert(rest) : '');
    }
  }

  const words = convert(Math.floor(amount)).trim();
  return words ? `${words} Rupiah` : 'Nol Rupiah';
}
