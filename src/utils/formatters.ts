import { SavingsBreakdown } from '../types';

export const SAVINGS_LOCK_RATIO = 0.20; // 20% terkunci / dana cadangan
export const SAVINGS_USABLE_RATIO = 0.80; // 80% bisa digunakan / ditarik

export function getSavingsBreakdown(balance: number): SavingsBreakdown {
  const total = Math.max(0, Math.round(balance || 0));
  const locked = Math.round(total * SAVINGS_LOCK_RATIO);
  const available = total - locked; // 80%
  return {
    total,
    available,
    locked,
    usablePercentage: 80,
    lockedPercentage: 20,
  };
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

export function formatDateCustom(dateStr: string, format: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD MMM YYYY' = 'DD/MM/YYYY'): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const day = String(d.getDate()).padStart(2, '0');
  const monthNum = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

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
