import { Student, Transaction, SchoolInfo, ClassInfo } from '../types';

export const DEFAULT_SCRIPT_ID = '1vPviV_hD73EF6C_EVRBnoRjnZkpyNnSuAV0n9Jm9PG-rFQfGreNvP7o4';

export interface AppsScriptConfig {
  scriptId: string;
  webAppUrl: string;
  autoSync: boolean;
  spreadsheetUrl?: string;
  spreadsheetId?: string;
}

export const getStoredAppsScriptConfig = (): AppsScriptConfig => {
  const saved = localStorage.getItem('tp_appsscript_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
  }
  return {
    scriptId: DEFAULT_SCRIPT_ID,
    webAppUrl: `https://script.google.com/macros/s/${DEFAULT_SCRIPT_ID}/exec`,
    autoSync: true,
  };
};

export const saveAppsScriptConfig = (config: AppsScriptConfig) => {
  localStorage.setItem('tp_appsscript_config', JSON.stringify(config));
};

export interface SyncResponse {
  success: boolean;
  message?: string;
  spreadsheetUrl?: string;
  spreadsheetId?: string;
  data?: {
    students?: Student[];
    transactions?: Transaction[];
    classes?: ClassInfo[];
    schoolInfo?: SchoolInfo;
  };
}

/**
 * Helper to send POST payload to Apps Script Web App without CORS issues
 */
async function sendToAppsScript(url: string, payload: any): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { success: true, message: text || 'Berhasil terkirim' };
  }
}

/**
 * Fetch all data from Google Apps Script backend
 */
export async function fetchFromAppsScript(config?: AppsScriptConfig): Promise<SyncResponse> {
  const currentConfig = config || getStoredAppsScriptConfig();
  if (!currentConfig.webAppUrl) {
    return { success: false, message: 'URL Web App Apps Script belum dikonfigurasi.' };
  }

  try {
    const url = new URL(currentConfig.webAppUrl);
    url.searchParams.set('action', 'getAllData');
    url.searchParams.set('t', Date.now().toString()); // prevent caching

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.spreadsheetUrl) {
      currentConfig.spreadsheetUrl = json.spreadsheetUrl;
      currentConfig.spreadsheetId = json.spreadsheetId;
      saveAppsScriptConfig(currentConfig);
    }

    return {
      success: true,
      message: 'Data berhasil disinkronkan dari Google Apps Script.',
      spreadsheetUrl: json.spreadsheetUrl,
      spreadsheetId: json.spreadsheetId,
      data: json.data || json,
    };
  } catch (error: any) {
    console.warn('Apps Script fetch note:', error);
    return {
      success: false,
      message: error.message || 'Gagal menghubungi backend Google Apps Script. Pastikan Web App dideploy dengan akses "Anyone".',
    };
  }
}

/**
 * Save new transaction to Google Apps Script backend
 */
export async function saveTransactionToAppsScript(
  tx: Transaction,
  config?: AppsScriptConfig
): Promise<SyncResponse> {
  const currentConfig = config || getStoredAppsScriptConfig();
  if (!currentConfig.webAppUrl) {
    return { success: false, message: 'URL Apps Script belum diatur.' };
  }

  try {
    const payload = {
      action: 'saveTransaction',
      transaction: tx,
      timestamp: new Date().toISOString(),
    };

    const res = await sendToAppsScript(currentConfig.webAppUrl, payload);
    return {
      success: res.success !== false,
      message: res.message || 'Transaksi berhasil otomatis disimpan ke Google Sheets!',
      data: res,
    };
  } catch (error: any) {
    console.warn('Apps Script save transaction error:', error);
    return {
      success: false,
      message: error.message || 'Gagal menyimpan transaksi ke Google Sheets.',
    };
  }
}

/**
 * Save or update student in Google Apps Script backend
 */
export async function saveStudentToAppsScript(
  student: Student,
  config?: AppsScriptConfig
): Promise<SyncResponse> {
  const currentConfig = config || getStoredAppsScriptConfig();
  if (!currentConfig.webAppUrl) {
    return { success: false, message: 'URL Apps Script belum diatur.' };
  }

  try {
    const payload = {
      action: 'saveStudent',
      student: student,
      timestamp: new Date().toISOString(),
    };

    const res = await sendToAppsScript(currentConfig.webAppUrl, payload);
    return {
      success: res.success !== false,
      message: res.message || 'Data siswa berhasil disimpan ke Google Sheets!',
      data: res,
    };
  } catch (error: any) {
    console.warn('Apps Script save student error:', error);
    return {
      success: false,
      message: error.message || 'Gagal menyimpan siswa ke Google Sheets.',
    };
  }
}

/**
 * Delete student in Google Apps Script backend
 */
export async function deleteStudentFromAppsScript(
  studentId: string,
  nisn: string,
  config?: AppsScriptConfig
): Promise<SyncResponse> {
  const currentConfig = config || getStoredAppsScriptConfig();
  if (!currentConfig.webAppUrl) {
    return { success: false, message: 'URL Apps Script belum diatur.' };
  }

  try {
    const payload = {
      action: 'deleteStudent',
      studentId,
      nisn,
      timestamp: new Date().toISOString(),
    };

    const res = await sendToAppsScript(currentConfig.webAppUrl, payload);
    return {
      success: res.success !== false,
      message: res.message || 'Data siswa berhasil dihapus dari Google Sheets.',
    };
  } catch (error: any) {
    console.warn('Apps Script delete student error:', error);
    return {
      success: false,
      message: error.message || 'Gagal menghapus siswa dari Google Sheets.',
    };
  }
}

/**
 * Save class to Google Apps Script backend
 */
export async function saveClassToAppsScript(
  classInfo: ClassInfo,
  config?: AppsScriptConfig
): Promise<SyncResponse> {
  const currentConfig = config || getStoredAppsScriptConfig();
  if (!currentConfig.webAppUrl) {
    return { success: false, message: 'URL Apps Script belum diatur.' };
  }

  try {
    const payload = {
      action: 'saveClass',
      classInfo,
      timestamp: new Date().toISOString(),
    };

    const res = await sendToAppsScript(currentConfig.webAppUrl, payload);
    return {
      success: res.success !== false,
      message: res.message || 'Data kelas berhasil disimpan ke Google Sheets.',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Gagal menyimpan kelas ke Google Sheets.',
    };
  }
}

/**
 * Sync initial seed / full dataset to Apps Script backend (for initialization & backup)
 */
export async function syncAllToAppsScript(
  payloadData: {
    students: Student[];
    transactions: Transaction[];
    classes?: ClassInfo[];
    schoolInfo: SchoolInfo;
  },
  config?: AppsScriptConfig
): Promise<SyncResponse> {
  const currentConfig = config || getStoredAppsScriptConfig();
  if (!currentConfig.webAppUrl) {
    return { success: false, message: 'URL Apps Script belum diatur.' };
  }

  try {
    const payload = {
      action: 'syncAll',
      ...payloadData,
      timestamp: new Date().toISOString(),
    };

    const res = await sendToAppsScript(currentConfig.webAppUrl, payload);
    return {
      success: res.success !== false,
      message: res.message || 'Semua data siswa, transaksi & kelas berhasil disinkronkan ke Google Spreadsheet!',
      spreadsheetUrl: res.spreadsheetUrl,
      data: res,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Gagal sinkronisasi data ke Apps Script.',
    };
  }
}

/**
 * Generates the full Google Apps Script backend code (Code.gs)
 * to be pasted into the Apps Script editor (ID: 1vPviV_hD73EF6C_EVRBnoRjnZkpyNnSuAV0n9Jm9PG-rFQfGreNvP7o4)
 */
export function getAppsScriptBackendCode(): string {
  return `/**
 * ============================================================================
 * TABUNGAN PINTAR - GOOGLE APPS SCRIPT DATABASE BACKEND (Code.gs)
 * Script ID: 1vPviV_hD73EF6C_EVRBnoRjnZkpyNnSuAV0n9Jm9PG-rFQfGreNvP7o4
 * ============================================================================
 * 
 * PETUNJUK DEPLOYMENT:
 * 1. Buka Apps Script Editor:
 *    https://script.google.com/home/projects/1vPviV_hD73EF6C_EVRBnoRjnZkpyNnSuAV0n9Jm9PG-rFQfGreNvP7o4/edit
 * 2. Hapus seluruh isi Code.gs dan tempel (paste) kode ini.
 * 3. Klik tombol "Simpan" (Ctrl+S / Command+S).
 * 4. Klik tombol "Deploy" -> "New deployment" (Terapkan -> Penerapan baru).
 * 5. Pilih jenis (roda gigi): "Web app" (Aplikasi Web).
 * 6. Isi konfigurasi:
 *    - Description: Tabungan Pintar Database v2
 *    - Execute as: Me (email Google Anda)
 *    - Who has access: Anyone (Siapa saja)  <-- PENTING!
 * 7. Klik "Deploy", lalu klik "Authorize access" (Beri Izin) dengan akun Google Anda.
 * 8. Salin URL "Web app URL" (akhiran /exec) dan tempel di menu Pengaturan aplikasi!
 * ============================================================================
 */

const SHEET_NAMES = {
  STUDENTS: 'Siswa',
  TRANSACTIONS: 'Transaksi',
  CLASSES: 'Kelas',
  SETTINGS: 'Pengaturan'
};

/**
 * Mengambil atau membuat Spreadsheet Database tunggal yang tersimpan permanen
 */
function getOrCreateDatabaseSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('SPREADSHEET_ID');
  let ss = null;

  // Coba ambil dari active container jika script terpasang pada sheet
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      props.setProperty('SPREADSHEET_ID', ss.getId());
      return ss;
    }
  } catch (e) {}

  // Coba buka berdasarkan ID yang tersimpan di ScriptProperties
  if (spreadsheetId) {
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
      if (ss) return ss;
    } catch (e) {
      // Spreadsheet ID mungkin terhapus, buat baru
    }
  }

  // Buat spreadsheet baru dan simpan ID-nya permanen
  ss = SpreadsheetApp.create('Database Tabungan Siswa - Sistem Sekolah');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  initSheetsIfMissing(ss);
  return ss;
}

/**
 * Handle GET Requests (Read Data, Ping, Info)
 */
function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action ? e.parameter.action : 'getAllData';
    const ss = getOrCreateDatabaseSpreadsheet();
    initSheetsIfMissing(ss);

    let responseData = {};

    if (action === 'getAllData') {
      responseData = {
        success: true,
        message: 'Data berhasil diambil dari Google Sheets',
        spreadsheetUrl: ss.getUrl(),
        spreadsheetId: ss.getId(),
        data: {
          students: getStudentsData(ss),
          transactions: getTransactionsData(ss),
          classes: getClassesData(ss),
          schoolInfo: getSchoolInfoData(ss)
        }
      };
    } else if (action === 'ping' || action === 'getInfo') {
      responseData = {
        success: true,
        message: 'Google Apps Script Backend Tabungan Pintar Aktif & Terhubung!',
        scriptId: '1vPviV_hD73EF6C_EVRBnoRjnZkpyNnSuAV0n9Jm9PG-rFQfGreNvP7o4',
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        spreadsheetId: ss.getId(),
        timestamp: new Date().toISOString()
      };
    } else {
      responseData = { success: false, message: 'Action GET tidak dikenali: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString(),
      message: 'Terjadi kesalahan saat memproses permintaan GET: ' + err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST Requests (Simpan Transaksi Otomatis, Simpan Siswa, Sync All)
 */
function doPost(e) {
  try {
    const ss = getOrCreateDatabaseSpreadsheet();
    initSheetsIfMissing(ss);

    let postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (errParse) {
        postData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      postData = e.parameter;
    }

    const action = postData.action || 'saveTransaction';
    let result = { success: true, spreadsheetUrl: ss.getUrl() };

    if (action === 'saveTransaction') {
      const tx = postData.transaction || postData;
      result = saveTransactionRecord(ss, tx);
    } else if (action === 'saveStudent') {
      const student = postData.student || postData;
      result = saveStudentRecord(ss, student);
    } else if (action === 'deleteStudent') {
      result = deleteStudentRecord(ss, postData.studentId, postData.nisn);
    } else if (action === 'saveClass') {
      result = saveClassRecord(ss, postData.classInfo || postData);
    } else if (action === 'syncAll') {
      result = syncAllDatabase(ss, postData);
    } else {
      result = { success: false, message: 'Action POST tidak valid: ' + action };
    }

    result.spreadsheetUrl = ss.getUrl();
    result.spreadsheetId = ss.getId();

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString(),
      message: 'Gagal memproses POST: ' + err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Inisialisasi Sheet & Struktur Tabel jika belum ada
 */
function initSheetsIfMissing(ss) {
  // 1. Sheet Siswa
  let sSheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
  if (!sSheet) {
    sSheet = ss.insertSheet(SHEET_NAMES.STUDENTS);
    sSheet.appendRow([
      'ID Siswa', 'NISN', 'Nama Lengkap', 'Kelas', 'Saldo (Rp)', 
      'Nama Wali', 'No. HP Wali', 'Alamat', 'Tgl Mulai', 'Target Impian', 'Tabungan Rutin (Rp)'
    ]);
    const headerRange = sSheet.getRange(1, 1, 1, 11);
    headerRange.setFontWeight('bold').setBackground('#006130').setFontColor('#FFFFFF');
    sSheet.setFrozenRows(1);
    sSheet.getRange('E2:E1000').setNumberFormat('#,##0');
    sSheet.getRange('K2:K1000').setNumberFormat('#,##0');
  }

  // 2. Sheet Transaksi
  let tSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
  if (!tSheet) {
    tSheet = ss.insertSheet(SHEET_NAMES.TRANSACTIONS);
    tSheet.appendRow([
      'ID Transaksi', 'ID Siswa', 'NISN', 'Nama Siswa', 'Kelas', 
      'Tipe Transaksi', 'Nominal (Rp)', 'Tanggal', 'Waktu', 'Status', 
      'Petugas Admin', 'Catatan', 'Waktu Input System'
    ]);
    const headerRange = tSheet.getRange(1, 1, 1, 13);
    headerRange.setFontWeight('bold').setBackground('#005db5').setFontColor('#FFFFFF');
    tSheet.setFrozenRows(1);
    tSheet.getRange('G2:G5000').setNumberFormat('#,##0');
  }

  // 3. Sheet Kelas
  let cSheet = ss.getSheetByName(SHEET_NAMES.CLASSES);
  if (!cSheet) {
    cSheet = ss.insertSheet(SHEET_NAMES.CLASSES);
    cSheet.appendRow(['ID Kelas', 'Nama Kelas', 'Tingkat', 'Wali Kelas', 'No. HP Wali', 'Tahun Ajaran', 'Keterangan']);
    const headerRange = cSheet.getRange(1, 1, 1, 7);
    headerRange.setFontWeight('bold').setBackground('#006130').setFontColor('#FFFFFF');
    cSheet.setFrozenRows(1);
  }

  // 4. Sheet Pengaturan Sekolah
  let pSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (!pSheet) {
    pSheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
    pSheet.appendRow(['Parameter', 'Nilai Konfigurasi']);
    pSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#2d312e').setFontColor('#FFFFFF');
    pSheet.appendRow(['Nama Sekolah', 'SMA Bintang Gemilang']);
    pSheet.appendRow(['Kepala Sekolah', 'Drs. H. Bambang Subagyo, M.Pd.']);
    pSheet.appendRow(['Alamat Sekolah', 'Jl. Merdeka Belajar No. 45, Jakarta Pusat']);
    pSheet.appendRow(['Nomor Telepon', '(021) 7890-1234']);
    pSheet.appendRow(['Email Sekolah', 'info@bintanggemilang.sch.id']);
    pSheet.setFrozenRows(1);
  }
}

/**
 * FUNGSI OTOMATIS: Simpan Transaksi Baru & Perbarui Saldo Siswa
 */
function saveTransactionRecord(ss, tx) {
  if (!tx) {
    return { success: false, message: 'Data transaksi kosong' };
  }

  const tSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
  const sSheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

  const txId = String(tx.id || 'tx-' + new Date().getTime());
  const amount = Number(tx.amount) || 0;
  const isDeposit = tx.type === 'deposit' || String(tx.type).toLowerCase() === 'setoran';
  const typeText = isDeposit ? 'Setoran' : 'Penarikan';
  const now = new Date();
  const dateStr = tx.date || Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd');
  const timeStr = tx.time || Utilities.formatDate(now, 'GMT+7', 'HH:mm:ss') + ' WIB';

  // 1. Sisipkan / Append Transaksi Baru
  tSheet.appendRow([
    txId,
    String(tx.studentId || ''),
    String(tx.studentNisn || ''),
    String(tx.studentName || ''),
    String(tx.className || ''),
    typeText,
    amount,
    dateStr,
    timeStr,
    String(tx.status || 'success'),
    String(tx.adminName || 'Admin Bendahara'),
    String(tx.notes || '-'),
    Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss')
  ]);

  // 2. Cari Siswa dan Perbarui Saldo di Sheet Siswa
  let foundStudent = false;
  let updatedBalance = 0;
  const sRows = sSheet.getDataRange().getValues();

  for (let i = 1; i < sRows.length; i++) {
    const rowNisn = String(sRows[i][1]).trim();
    const rowId = String(sRows[i][0]).trim();
    const txNisn = String(tx.studentNisn || '').trim();
    const txStudentId = String(tx.studentId || '').trim();

    if ((txNisn && rowNisn === txNisn) || (txStudentId && rowId === txStudentId)) {
      const currentBalance = Number(sRows[i][4]) || 0;
      updatedBalance = isDeposit ? currentBalance + amount : Math.max(0, currentBalance - amount);
      sSheet.getRange(i + 1, 5).setValue(updatedBalance);
      foundStudent = true;
      break;
    }
  }

  // Jika siswa belum ada di sheet Siswa, buatkan baris data baru otomatis
  if (!foundStudent && tx.studentNisn) {
    updatedBalance = isDeposit ? amount : 0;
    sSheet.appendRow([
      String(tx.studentId || 's' + new Date().getTime()),
      String(tx.studentNisn),
      String(tx.studentName || 'Siswa Baru'),
      String(tx.className || 'Kelas 10A'),
      updatedBalance,
      '-',
      '-',
      '-',
      dateStr,
      '-',
      0
    ]);
  }

  return {
    success: true,
    message: 'Transaksi sebesar Rp ' + amount.toLocaleString('id-ID') + ' (' + typeText + ') berhasil dicatat ke Google Sheets!',
    transactionId: txId,
    newBalance: updatedBalance
  };
}

/**
 * FUNGSI OTOMATIS: Simpan atau Edit Siswa ke Google Sheets
 */
function saveStudentRecord(ss, student) {
  if (!student || !student.name) {
    return { success: false, message: 'Data siswa tidak valid' };
  }

  const sSheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
  const sRows = sSheet.getDataRange().getValues();
  let foundRow = -1;

  for (let i = 1; i < sRows.length; i++) {
    const rowNisn = String(sRows[i][1]).trim();
    const rowId = String(sRows[i][0]).trim();
    const stNisn = String(student.nisn || '').trim();
    const stId = String(student.id || '').trim();

    if ((stNisn && rowNisn === stNisn) || (stId && rowId === stId)) {
      foundRow = i + 1;
      break;
    }
  }

  const recurringAmount = student.recurringSavings && student.recurringSavings.isEnabled ? student.recurringSavings.amount : 0;
  const goalTitle = student.goal ? student.goal.title : '-';

  if (foundRow > 0) {
    // Update baris siswa yang sudah ada
    sSheet.getRange(foundRow, 1, 1, 11).setValues([[
      student.id || ('s' + foundRow),
      String(student.nisn || ''),
      String(student.name || ''),
      String(student.className || ''),
      Number(student.balance) || 0,
      String(student.guardianName || '-'),
      String(student.guardianPhone || '-'),
      String(student.address || '-'),
      String(student.initialDepositDate || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd')),
      goalTitle,
      recurringAmount
    ]]);
    return { success: true, message: 'Data siswa ' + student.name + ' berhasil diperbarui di Google Sheets.' };
  } else {
    // Tambah baris siswa baru
    sSheet.appendRow([
      student.id || ('s' + new Date().getTime()),
      String(student.nisn || ''),
      String(student.name || ''),
      String(student.className || ''),
      Number(student.balance) || 0,
      String(student.guardianName || '-'),
      String(student.guardianPhone || '-'),
      String(student.address || '-'),
      String(student.initialDepositDate || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd')),
      goalTitle,
      recurringAmount
    ]);
    return { success: true, message: 'Siswa baru ' + student.name + ' berhasil didaftarkan ke Google Sheets.' };
  }
}

/**
 * FUNGSI OTOMATIS: Hapus Siswa dari Sheet
 */
function deleteStudentRecord(ss, studentId, nisn) {
  const sSheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
  const sRows = sSheet.getDataRange().getValues();

  for (let i = 1; i < sRows.length; i++) {
    const rowId = String(sRows[i][0]).trim();
    const rowNisn = String(sRows[i][1]).trim();
    if ((studentId && rowId === String(studentId).trim()) || (nisn && rowNisn === String(nisn).trim())) {
      sSheet.deleteRow(i + 1);
      return { success: true, message: 'Siswa berhasil dihapus dari Google Sheets.' };
    }
  }
  return { success: false, message: 'Data siswa tidak ditemukan di sheet.' };
}

/**
 * FUNGSI OTOMATIS: Simpan Kelas ke Sheet
 */
function saveClassRecord(ss, cInfo) {
  if (!cInfo || !cInfo.name) return { success: false, message: 'Data kelas tidak valid' };
  const cSheet = ss.getSheetByName(SHEET_NAMES.CLASSES);
  const rows = cSheet.getDataRange().getValues();
  let foundRow = -1;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(cInfo.id).trim() || String(rows[i][1]).trim() === String(cInfo.name).trim()) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow > 0) {
    cSheet.getRange(foundRow, 1, 1, 7).setValues([[
      cInfo.id, cInfo.name, cInfo.level || 'Kelas 10', cInfo.homeroomTeacher || '-', cInfo.teacherPhone || '-', cInfo.academicYear || '2023/2024', cInfo.notes || '-'
    ]]);
  } else {
    cSheet.appendRow([
      cInfo.id || ('c-' + new Date().getTime()), cInfo.name, cInfo.level || 'Kelas 10', cInfo.homeroomTeacher || '-', cInfo.teacherPhone || '-', cInfo.academicYear || '2023/2024', cInfo.notes || '-'
    ]);
  }
  return { success: true, message: 'Kelas ' + cInfo.name + ' berhasil disimpan di Google Sheets.' };
}

/**
 * Ambil Data Siswa untuk Sync
 */
function getStudentsData(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[1] && !r[2]) continue;
    const balance = Number(r[4]) || 0;
    const recurringAmount = Number(r[10]) || 0;
    
    list.push({
      id: r[0] ? String(r[0]) : 's' + i,
      nisn: String(r[1]),
      name: String(r[2]),
      className: String(r[3] || 'Class 10A Science'),
      balance: balance,
      guardianName: String(r[5] || '-'),
      guardianPhone: String(r[6] || '-'),
      address: String(r[7] || '-'),
      initialDepositDate: r[8] ? String(r[8]) : '2023-07-15',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      goal: r[9] && r[9] !== '-' ? {
        id: 'g-' + i,
        title: String(r[9]),
        targetAmount: Math.max(1000000, balance * 1.5),
        currentAmount: balance,
        targetDate: '2024-12-31',
        status: balance >= 1000000 ? 'completed' : 'active'
      } : undefined,
      recurringSavings: recurringAmount > 0 ? {
        id: 'rec-' + i,
        isEnabled: true,
        amount: recurringAmount,
        debitDate: 5,
        sourceAccount: 'bank_transfer',
        sourceName: 'Virtual Account Bank',
        frequency: 'monthly',
        notificationReminder: true
      } : undefined
    });
  }
  return list;
}

/**
 * Ambil Data Transaksi untuk Sync
 */
function getTransactionsData(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[6]) continue;
    const rawType = String(r[5]).toLowerCase();
    const type = rawType.includes('penarikan') || rawType.includes('tarik') || rawType.includes('withdr') ? 'withdrawal' : 'deposit';

    list.push({
      id: String(r[0] || 'tx-' + i),
      studentId: String(r[1] || ''),
      studentNisn: String(r[2] || ''),
      studentName: String(r[3] || ''),
      className: String(r[4] || ''),
      type: type,
      amount: Number(r[6]) || 0,
      date: String(r[7] || ''),
      time: String(r[8] || '08:00 WIB'),
      status: String(r[9]).toLowerCase() === 'pending' ? 'pending' : 'success',
      adminName: String(r[10] || 'Bendahara Sekolah'),
      notes: String(r[11] || '-')
    });
  }
  return list.reverse(); // Terbaru di atas
}

/**
 * Ambil Data Kelas untuk Sync
 */
function getClassesData(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.CLASSES);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[1]) continue;
    list.push({
      id: String(r[0] || 'c-' + i),
      name: String(r[1]),
      level: String(r[2] || 'Kelas 10'),
      homeroomTeacher: String(r[3] || '-'),
      teacherPhone: String(r[4] || '-'),
      academicYear: String(r[5] || '2023/2024'),
      notes: String(r[6] || '-')
    });
  }
  return list;
}

/**
 * Ambil Info Sekolah
 */
function getSchoolInfoData(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (!sheet) return null;
  const rows = sheet.getDataRange().getValues();
  const info = {};
  for (let i = 1; i < rows.length; i++) {
    const k = String(rows[i][0]).toLowerCase();
    const v = rows[i][1];
    if (k.includes('nama sekolah') || k.includes('lembaga')) info.name = String(v);
    if (k.includes('kepala')) info.principalName = String(v);
    if (k.includes('alamat')) info.address = String(v);
    if (k.includes('telepon') || k.includes('hp')) info.phone = String(v);
    if (k.includes('email')) info.email = String(v);
  }
  return info;
}

/**
 * Sinkronisasi Penuh (Sync All / Restore Database)
 */
function syncAllDatabase(ss, data) {
  // 1. Siswa
  if (data.students && Array.isArray(data.students)) {
    let sSheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
    if (!sSheet) sSheet = ss.insertSheet(SHEET_NAMES.STUDENTS);
    sSheet.clear();
    sSheet.appendRow([
      'ID Siswa', 'NISN', 'Nama Lengkap', 'Kelas', 'Saldo (Rp)', 
      'Nama Wali', 'No. HP Wali', 'Alamat', 'Tgl Mulai', 'Target Impian', 'Tabungan Rutin (Rp)'
    ]);
    sSheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#006130').setFontColor('#FFFFFF');
    sSheet.setFrozenRows(1);
    sSheet.getRange('E2:E1000').setNumberFormat('#,##0');
    sSheet.getRange('K2:K1000').setNumberFormat('#,##0');

    data.students.forEach(function(s) {
      const recurring = s.recurringSavings && s.recurringSavings.isEnabled ? s.recurringSavings.amount : 0;
      const goal = s.goal ? s.goal.title : '-';
      sSheet.appendRow([
        s.id, s.nisn, s.name, s.className, Number(s.balance) || 0,
        s.guardianName || '-', s.guardianPhone || '-', s.address || '-',
        s.initialDepositDate || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'),
        goal, recurring
      ]);
    });
  }

  // 2. Transaksi
  if (data.transactions && Array.isArray(data.transactions)) {
    let tSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
    if (!tSheet) tSheet = ss.insertSheet(SHEET_NAMES.TRANSACTIONS);
    tSheet.clear();
    tSheet.appendRow([
      'ID Transaksi', 'ID Siswa', 'NISN', 'Nama Siswa', 'Kelas', 
      'Tipe Transaksi', 'Nominal (Rp)', 'Tanggal', 'Waktu', 'Status', 
      'Petugas Admin', 'Catatan', 'Waktu Input System'
    ]);
    tSheet.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#005db5').setFontColor('#FFFFFF');
    tSheet.setFrozenRows(1);
    tSheet.getRange('G2:G5000').setNumberFormat('#,##0');

    data.transactions.forEach(function(tx) {
      const typeText = tx.type === 'deposit' ? 'Setoran' : 'Penarikan';
      tSheet.appendRow([
        tx.id, tx.studentId, tx.studentNisn, tx.studentName, tx.className,
        typeText, Number(tx.amount) || 0, tx.date, tx.time || '', tx.status || 'success',
        tx.adminName || 'Admin', tx.notes || '-', Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss')
      ]);
    });
  }

  // 3. Kelas
  if (data.classes && Array.isArray(data.classes)) {
    let cSheet = ss.getSheetByName(SHEET_NAMES.CLASSES);
    if (!cSheet) cSheet = ss.insertSheet(SHEET_NAMES.CLASSES);
    cSheet.clear();
    cSheet.appendRow(['ID Kelas', 'Nama Kelas', 'Tingkat', 'Wali Kelas', 'No. HP Wali', 'Tahun Ajaran', 'Keterangan']);
    cSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#006130').setFontColor('#FFFFFF');
    cSheet.setFrozenRows(1);

    data.classes.forEach(function(c) {
      cSheet.appendRow([
        c.id, c.name, c.level || 'Kelas 10', c.homeroomTeacher || '-', c.teacherPhone || '-', c.academicYear || '2023/2024', c.notes || '-'
      ]);
    });
  }

  return {
    success: true,
    message: 'Semua data (' + (data.students ? data.students.length : 0) + ' Siswa, ' + (data.transactions ? data.transactions.length : 0) + ' Transaksi) berhasil disinkronkan ke Google Spreadsheet!',
    spreadsheetUrl: ss.getUrl()
  };
}
`;
}
