import { Student } from '../types';
import { exportToCSV } from './formatters';
import { validateNisnFormat } from './workspaceStorage';

/**
 * Export student list to Excel/CSV with clean Indonesian column headers
 */
export function exportStudentsToCSV(students: Student[], filename: string = 'data-siswa-tabungan.csv') {
  const headers = [
    'NISN',
    'Nama Lengkap',
    'Kelas',
    'Saldo Tabungan (Rp)',
    'Nama Orang Tua / Wali',
    'No. HP Wali',
    'Alamat Siswa',
    'Tanggal Mulai Menabung',
  ];

  const rows = students.map((s) => [
    s.nisn,
    s.name,
    s.className,
    s.balance,
    s.guardianName || '-',
    s.guardianPhone || '-',
    s.address || '-',
    s.initialDepositDate || '2023-07-15',
  ]);

  exportToCSV(filename, [headers, ...rows]);
}

/**
 * Export student list to JSON file
 */
export function exportStudentsToJSON(students: Student[], filename: string = 'data-siswa-tabungan.json') {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(students, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Download sample CSV Template for student import
 */
export function downloadStudentCSVTemplate() {
  const headers = [
    'NISN',
    'Nama Lengkap',
    'Kelas',
    'Saldo Awal (Rp)',
    'Nama Orang Tua / Wali',
    'No HP Wali',
    'Alamat Siswa',
    'Tanggal Mulai (YYYY-MM-DD)',
  ];

  const sampleRows = [
    [
      '0041234567',
      'Budi Santoso',
      'Class 10A Science',
      '2450000',
      'Hendra Santoso',
      '0812-3456-7890',
      'Jl. Merpati No. 12, Jakarta',
      '2023-07-15',
    ],
    [
      '0041234568',
      'Siti Nurhaliza',
      'Class 10A Science',
      '3820000',
      'Ahmad Nurhalim',
      '0813-8888-9999',
      'Jl. Anggrek No. 4, Jakarta',
      '2023-07-15',
    ],
    [
      '0041234569',
      'Ahmad Rizki',
      'Class 10B Science',
      '1500000',
      'Supriadi',
      '0856-1122-3344',
      'Jl. Melati No. 8, Jakarta',
      '2023-08-01',
    ],
  ];

  exportToCSV('template-import-siswa-tabungan.csv', [headers, ...sampleRows]);
}

/**
 * Parse CSV text into Student objects with robust NISN validation & anti-duplication
 */
export function parseStudentCSV(csvText: string): {
  valid: Student[];
  errors: string[];
  rawCount: number;
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return { valid: [], errors: ['File CSV kosong atau hanya berisi baris judul.'], rawCount: 0 };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase().trim());

  // Find column indices
  const nisnIdx = headers.findIndex((h) => h.includes('nisn') || h.includes('nis') || h.includes('nomor induk'));
  const nameIdx = headers.findIndex((h) => h.includes('nama') || h.includes('name') || h.includes('siswa'));
  const classIdx = headers.findIndex((h) => h.includes('kelas') || h.includes('class') || h.includes('tingkat'));
  const balanceIdx = headers.findIndex((h) => h.includes('saldo') || h.includes('balance') || h.includes('tabungan') || h.includes('jumlah'));
  const guardianIdx = headers.findIndex((h) => h.includes('wali') || h.includes('orang tua') || h.includes('parent') || h.includes('guardian'));
  const phoneIdx = headers.findIndex((h) => h.includes('hp') || h.includes('telepon') || h.includes('phone') || h.includes('kontak') || h.includes('wa'));
  const addressIdx = headers.findIndex((h) => h.includes('alamat') || h.includes('address') || h.includes('domisili'));
  const dateIdx = headers.findIndex((h) => h.includes('tgl') || h.includes('tanggal') || h.includes('date') || h.includes('mulai'));

  const valid: Student[] = [];
  const errors: string[] = [];
  const seenNisns = new Set<string>();
  let rowCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    rowCount++;
    const cols = parseCSVLine(rawLine);

    const rawNisn = (cols[nisnIdx >= 0 ? nisnIdx : 0] || '').trim();
    const name = (cols[nameIdx >= 0 ? nameIdx : 1] || '').trim();
    const className = (cols[classIdx >= 0 ? classIdx : 2] || 'Class 10A Science').trim();
    const rawBalance = cols[balanceIdx >= 0 ? balanceIdx : 3] || '0';
    const guardianName = (cols[guardianIdx >= 0 ? guardianIdx : 4] || '-').trim();
    const guardianPhone = (cols[phoneIdx >= 0 ? phoneIdx : 5] || '-').trim();
    const address = (cols[addressIdx >= 0 ? addressIdx : 6] || '-').trim();
    const initialDepositDate = (cols[dateIdx >= 0 ? dateIdx : 7] || new Date().toISOString().split('T')[0]).trim();

    if (!rawNisn && !name) {
      errors.push(`Baris ${i + 1}: NISN dan Nama kosong, baris dilewati.`);
      continue;
    }

    if (!name) {
      errors.push(`Baris ${i + 1}: Nama siswa tidak boleh kosong (NISN: ${rawNisn || 'Kosong'}).`);
      continue;
    }

    // NISN Format & Duplicate Validation
    const nisnCheck = validateNisnFormat(rawNisn);
    if (!nisnCheck.isValid) {
      errors.push(`Baris ${i + 1} (${name}): ${nisnCheck.message}`);
      continue;
    }

    const cleanNisn = nisnCheck.cleanNisn;
    if (seenNisns.has(cleanNisn)) {
      errors.push(`Baris ${i + 1} (${name}): Duplikasi NISN "${cleanNisn}" ditemukan dalam berkas impor yang sama.`);
      continue;
    }

    seenNisns.add(cleanNisn);

    // Sanitize balance
    const cleanBalanceNum = Number(String(rawBalance).replace(/[^0-9.-]+/g, '')) || 0;

    const student: Student = {
      id: `s-${cleanNisn}`,
      nisn: cleanNisn,
      name,
      className: className || 'Kelas Umum',
      balance: Math.max(0, cleanBalanceNum),
      guardianName: guardianName || '-',
      guardianPhone: guardianPhone || '-',
      address: address || '-',
      initialDepositDate: initialDepositDate || new Date().toISOString().split('T')[0],
      avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + (i % 20)}?w=150&auto=format&fit=crop&q=80`,
    };

    valid.push(student);
  }

  return { valid, errors, rawCount: rowCount };
}

/**
 * Parse single CSV line accounting for quotes
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse JSON text for student array with NISN validation & anti-duplication
 */
export function parseStudentJSON(jsonText: string): { valid: Student[]; errors: string[] } {
  try {
    const data = JSON.parse(jsonText);
    const arr = Array.isArray(data) ? data : data.students && Array.isArray(data.students) ? data.students : null;

    if (!arr) {
      return { valid: [], errors: ['Format JSON tidak valid. Harus berupa Array data siswa atau objek { students: [...] }'] };
    }

    const valid: Student[] = [];
    const errors: string[] = [];
    const seenNisns = new Set<string>();

    arr.forEach((item: any, idx: number) => {
      const name = String(item.name || item.nama || item.Nama || '').trim();
      if (!name) {
        errors.push(`Data #${idx + 1}: Nama siswa tidak ditemukan.`);
        return;
      }

      const rawNisn = String(item.nisn || item.NISN || item.nis || item.NIS || '').trim();
      const nisnCheck = validateNisnFormat(rawNisn);
      if (!nisnCheck.isValid) {
        errors.push(`Data #${idx + 1} (${name}): ${nisnCheck.message}`);
        return;
      }

      const cleanNisn = nisnCheck.cleanNisn;
      if (seenNisns.has(cleanNisn)) {
        errors.push(`Data #${idx + 1} (${name}): Duplikasi NISN "${cleanNisn}" di dalam berkas JSON.`);
        return;
      }

      seenNisns.add(cleanNisn);

      const s: Student = {
        id: item.id || `s-${cleanNisn}`,
        nisn: cleanNisn,
        name: name,
        className: String(item.className || item.kelas || item.Kelas || 'Class 10A Science'),
        balance: Number(item.balance || item.saldo || item.Saldo) || 0,
        guardianName: String(item.guardianName || item.wali || item.namaWali || '-'),
        guardianPhone: String(item.guardianPhone || item.noHp || item.telepon || '-'),
        address: String(item.address || item.alamat || '-'),
        initialDepositDate: String(item.initialDepositDate || item.tglMulai || new Date().toISOString().split('T')[0]),
        avatarUrl: item.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        goal: item.goal,
      };

      valid.push(s);
    });

    return { valid, errors };
  } catch (err: any) {
    return { valid: [], errors: [`Gagal memproses JSON: ${err.message}`] };
  }
}
