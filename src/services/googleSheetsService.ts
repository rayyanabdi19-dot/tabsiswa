import { Student, Transaction, SchoolInfo, ClassInfo } from '../types';
import { getGoogleAccessToken } from './googleAuth';

export interface GoogleSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * List spreadsheets from user's Google Drive
 */
export async function listUserSpreadsheets(): Promise<GoogleSpreadsheetItem[]> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Token otorisasi Google tidak ditemukan. Silakan hubungkan akun Google Anda.');

  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=20`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Gagal mengambil daftar spreadsheet (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Create a new dedicated Google Sheet for Tabungan Siswa
 */
export async function createTabunganSpreadsheet(
  title: string,
  students: Student[],
  transactions: Transaction[],
  classes: ClassInfo[],
  schoolInfo: SchoolInfo
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Token otorisasi Google tidak ditemukan.');

  const resource = {
    properties: {
      title: title || `Tabungan Siswa - ${schoolInfo.name || 'Sekolah'} (${new Date().toLocaleDateString('id-ID')})`,
    },
    sheets: [
      { properties: { title: 'DATA_SISWA', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'TRANSAKSI', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'KELAS', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'RINGKASAN_KAS', gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resource),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || `Gagal membuat spreadsheet baru (${createRes.status})`);
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  // Populate data
  await exportAllDataToSheet(spreadsheetId, students, transactions, classes, schoolInfo);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Export current local state to specified Google Sheet
 */
export async function exportAllDataToSheet(
  spreadsheetId: string,
  students: Student[],
  transactions: Transaction[],
  classes: ClassInfo[],
  schoolInfo: SchoolInfo
): Promise<boolean> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Token otorisasi Google tidak ditemukan.');

  // 1. DATA_SISWA
  const studentRows = [
    ['NISN', 'NAMA_SISWA', 'KELAS', 'TOTAL_SALDO', 'LIKUID_80_PERSEN', 'TERKUNCI_20_PERSEN', 'WALI_MURID', 'KONTAK_WALI', 'AUTODEBET_AKTIF', 'NOMINAL_AUTODEBET', 'TGL_DEBET', 'TGL_MULAI'],
    ...students.map((s) => {
      const avail = Math.round(s.balance * 0.8);
      const locked = s.balance - avail;
      return [
        s.nisn,
        s.name,
        s.className,
        s.balance,
        avail,
        locked,
        s.guardianName || '',
        s.guardianPhone || '',
        s.recurringSavings?.isEnabled ? 'YA' : 'TIDAK',
        s.recurringSavings?.amount || 0,
        s.recurringSavings?.debitDate || 1,
        s.initialDepositDate || '',
      ];
    }),
  ];

  // 2. TRANSAKSI
  const transactionRows = [
    ['ID_TRANSAKSI', 'TANGGAL', 'NISN', 'NAMA_SISWA', 'KELAS', 'JENIS', 'NOMINAL', 'CATATAN', 'STATUS', 'ADMIN'],
    ...transactions.map((t) => [
      t.id,
      t.date,
      t.studentNisn,
      t.studentName,
      t.className,
      t.type === 'deposit' ? 'SETORAN' : 'PENARIKAN',
      t.amount,
      t.notes || '',
      t.status || 'success',
      t.adminName || 'Admin Bendahara',
    ]),
  ];

  // 3. KELAS
  const classRows = [
    ['ID_KELAS', 'NAMA_KELAS', 'TINGKAT', 'WALI_KELAS', 'KONTAK_WALI_KELAS', 'TOTAL_SISWA', 'TOTAL_SALDO_KELAS'],
    ...classes.map((c) => {
      const clsStudents = students.filter((s) => s.className === c.name);
      const totalClsBalance = clsStudents.reduce((sum, s) => sum + s.balance, 0);
      return [c.id, c.name, c.level || '', c.homeroomTeacher || '', c.teacherPhone || '', clsStudents.length, totalClsBalance];
    }),
  ];

  // 4. RINGKASAN_KAS
  const totalKas = students.reduce((sum, s) => sum + s.balance, 0);
  const totalLikuid = Math.round(totalKas * 0.8);
  const totalCadangan = totalKas - totalLikuid;
  const summaryRows = [
    ['PARAMETER', 'NILAI', 'KETERANGAN'],
    ['NAMA_SEKOLAH', schoolInfo.name, 'Identitas Sekolah'],
    ['TOTAL_SISWA_TERDAFTAR', students.length, 'Total rekening tabungan'],
    ['TOTAL_SALDO_KAS_SELURUHNYA', totalKas, 'Akumulasi seluruh dana'],
    ['DANA_LIKUID_80_PERSEN', totalLikuid, 'Dapat ditarik sewaktu-waktu oleh siswa'],
    ['DANA_CADANGAN_ABADI_20_PERSEN', totalCadangan, 'Terkunci permanen hingga lulus'],
    ['TOTAL_TRANSAKSI_TERCATAT', transactions.length, 'Jumlah histori mutasi kas'],
    ['TANGGAL_UPDATE_TERAKHIR', new Date().toLocaleString('id-ID'), 'Sinkronisasi Google Sheets'],
  ];

  const dataPayload = [
    { range: 'DATA_SISWA!A1', values: studentRows },
    { range: 'TRANSAKSI!A1', values: transactionRows },
    { range: 'KELAS!A1', values: classRows },
    { range: 'RINGKASAN_KAS!A1', values: summaryRows },
  ];

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: dataPayload,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gagal memperbarui data ke Google Sheet.');
  }

  return true;
}

/**
 * Import data from specified Google Sheet into local state
 */
export async function importDataFromGoogleSheet(spreadsheetId: string): Promise<{
  students: Student[];
  transactions: Transaction[];
}> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Token otorisasi Google tidak ditemukan.');

  // Read DATA_SISWA and TRANSAKSI
  const ranges = ['DATA_SISWA!A2:L2000', 'TRANSAKSI!A2:J2000'];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges.join('&ranges=')}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gagal membaca isi data Google Sheet.');
  }

  const result = await res.json();
  const valueRanges = result.valueRanges || [];

  const studentRows = valueRanges[0]?.values || [];
  const txRows = valueRanges[1]?.values || [];

  const importedStudents: Student[] = studentRows.map((r: any[], idx: number) => {
    const nisn = String(r[0] || `NISN-${idx + 1}`);
    const name = String(r[1] || 'Siswa');
    const className = String(r[2] || 'Kelas Umum');
    const balance = Number(String(r[3] || '0').replace(/[^0-9.-]+/g, '')) || 0;
    const guardianName = r[6] || '';
    const guardianPhone = r[7] || '';
    const isAutodebit = String(r[8] || '').toUpperCase() === 'YA';
    const autodebitAmt = Number(String(r[9] || '0').replace(/[^0-9.-]+/g, '')) || 50000;
    const autodebitDate = Number(r[10]) || 5;
    const initialDate = r[11] || '2023-07-15';

    return {
      id: `imp-s-${idx + 1}`,
      nisn,
      name,
      className,
      address: 'Jl. Sekolah No. 1',
      guardianName,
      guardianPhone,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      balance,
      initialDepositDate: initialDate,
      recurringSavings: {
        id: `rec-imp-${idx + 1}`,
        isEnabled: isAutodebit,
        amount: autodebitAmt,
        debitDate: autodebitDate,
        sourceAccount: 'bank_transfer',
        sourceName: 'Sinkronisasi Google Sheet',
        frequency: 'monthly',
        notificationReminder: true,
      },
    };
  });

  const importedTransactions: Transaction[] = txRows.map((r: any[], idx: number) => {
    const id = String(r[0] || `tx-imp-${idx + 1}`);
    const date = String(r[1] || new Date().toISOString().split('T')[0]);
    const studentNisn = String(r[2] || '');
    const studentName = String(r[3] || '');
    const className = String(r[4] || '');
    const typeStr = String(r[5] || '').toUpperCase();
    const type: 'deposit' | 'withdrawal' = typeStr.includes('TARIK') || typeStr.includes('WITHDRAWAL') ? 'withdrawal' : 'deposit';
    const amount = Number(String(r[6] || '0').replace(/[^0-9.-]+/g, '')) || 0;
    const notes = String(r[7] || '');
    const status = (r[7] || 'success') as any;
    const adminName = String(r[8] || 'Admin');

    return {
      id,
      date,
      studentId: `s-${idx + 1}`,
      studentNisn,
      studentName,
      className,
      type,
      amount,
      notes,
      status: status === 'pending' || status === 'cancelled' ? status : 'success',
      adminName,
    };
  });

  return {
    students: importedStudents,
    transactions: importedTransactions,
  };
}

/**
 * Append a single transaction row to Google Sheet
 */
export async function appendTransactionToSheet(spreadsheetId: string, tx: Transaction): Promise<boolean> {
  const token = await getGoogleAccessToken();
  if (!token) return false;

  const row = [
    tx.id,
    tx.date,
    tx.studentNisn,
    tx.studentName,
    tx.className,
    tx.type === 'deposit' ? 'SETORAN' : 'PENARIKAN',
    tx.amount,
    tx.notes || '',
    tx.status || 'success',
    tx.adminName || 'Admin Bendahara',
  ];

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TRANSAKSI!A1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    });
    return res.ok;
  } catch (e) {
    console.warn('Gagal append ke sheet:', e);
    return false;
  }
}
