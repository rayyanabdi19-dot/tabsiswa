import React, { useState, useEffect } from 'react';
import { SchoolInfo, Student, Transaction, ClassInfo } from '../types';
import { showToast } from './Toast';
import {
  DEFAULT_SCRIPT_ID,
  getStoredAppsScriptConfig,
  saveAppsScriptConfig,
  AppsScriptConfig,
  fetchFromAppsScript,
  syncAllToAppsScript,
  getAppsScriptBackendCode,
} from '../services/appsScriptApi';
import {
  signInWithGoogleWorkspace,
  logoutGoogle,
  initGoogleAuth,
  getGoogleAccessToken,
} from '../services/googleAuth';
import {
  listUserSpreadsheets,
  createTabunganSpreadsheet,
  exportAllDataToSheet,
  importDataFromGoogleSheet,
  GoogleSpreadsheetItem,
} from '../services/googleSheetsService';
import { User } from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolInfo: SchoolInfo;
  onUpdateSchoolInfo: (info: SchoolInfo) => void;
  onResetData: () => void;
  students?: Student[];
  transactions?: Transaction[];
  classes?: ClassInfo[];
  onDataSynced?: (data: { students?: Student[]; transactions?: Transaction[]; schoolInfo?: SchoolInfo }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  schoolInfo,
  onUpdateSchoolInfo,
  onResetData,
  students = [],
  transactions = [],
  classes = [],
  onDataSynced,
}) => {
  const [activeTab, setActiveTab] = useState<'googlesheets' | 'appsscript' | 'school'>('googlesheets');
  const [formData, setFormData] = useState<SchoolInfo>(schoolInfo);
  const [appsScriptConfig, setAppsScriptConfig] = useState<AppsScriptConfig>(getStoredAppsScriptConfig());
  
  // Google Sheets integration state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheetItem[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>(() => {
    return localStorage.getItem('tp_active_sheet_id') || '';
  });
  const [activeSheetName, setActiveSheetName] = useState<string>(() => {
    return localStorage.getItem('tp_active_sheet_name') || '';
  });
  const [activeSheetUrl, setActiveSheetUrl] = useState<string>(() => {
    return localStorage.getItem('tp_active_sheet_url') || '';
  });

  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isExportingSheet, setIsExportingSheet] = useState(false);
  const [isImportingSheet, setIsImportingSheet] = useState(false);

  // Apps Script states
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      initGoogleAuth(
        (user, token) => {
          setGoogleUser(user);
          setHasToken(!!token);
        },
        () => {
          setGoogleUser(null);
          setHasToken(false);
        }
      );
    }
  }, [isOpen]);

  const handleGoogleLogin = async () => {
    setIsSigningInGoogle(true);
    try {
      const result = await signInWithGoogleWorkspace();
      if (result) {
        setGoogleUser(result.user);
        setHasToken(true);
        showToast('Google Terhubung', `Berhasil login dengan ${result.user.email}`);
        await handleFetchSpreadsheets();
      } else {
        // User closed or cancelled the popup dialog
        showToast('Login Dibatalkan', 'Jendela login Google ditutup.', 'info');
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        showToast('Login Dibatalkan', 'Jendela login Google ditutup.', 'info');
        return;
      }
      console.error('Google login error:', err);
      showToast('Gagal Login Google', err.message || 'Otorisasi Google Sheets dibatalkan.', 'error');
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setHasToken(false);
    setSpreadsheets([]);
    showToast('Keluar dari Google', 'Koneksi Google Workspace telah diputuskan.');
  };

  const handleFetchSpreadsheets = async () => {
    setIsLoadingSheets(true);
    try {
      const list = await listUserSpreadsheets();
      setSpreadsheets(list);
    } catch (err: any) {
      showToast('Gagal Memuat Sheets', err.message, 'error');
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!window.confirm('Buat Google Spreadsheet baru untuk database Tabungan Siswa dan ekspor data saat ini?')) {
      return;
    }

    setIsCreatingSheet(true);
    showToast('Membuat Spreadsheet', 'Menginisialisasi tabungan di Google Drive Anda...');
    try {
      const res = await createTabunganSpreadsheet(
        `Tabungan Siswa - ${schoolInfo.name}`,
        students,
        transactions,
        classes,
        schoolInfo
      );
      setSelectedSheetId(res.spreadsheetId);
      setActiveSheetName(`Tabungan Siswa - ${schoolInfo.name}`);
      setActiveSheetUrl(res.spreadsheetUrl);

      localStorage.setItem('tp_active_sheet_id', res.spreadsheetId);
      localStorage.setItem('tp_active_sheet_name', `Tabungan Siswa - ${schoolInfo.name}`);
      localStorage.setItem('tp_active_sheet_url', res.spreadsheetUrl);

      showToast('Google Sheet Dibuat!', 'Spreadsheet baru telah berhasil dibuat dan disinkronkan.');
      await handleFetchSpreadsheets();
    } catch (err: any) {
      showToast('Gagal Membuat Sheet', err.message, 'error');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleExportToActiveSheet = async () => {
    if (!selectedSheetId) {
      showToast('Pilih Sheet Dulu', 'Pilih Google Spreadsheet target terlebih dahulu.', 'error');
      return;
    }

    if (!window.confirm('Timpa data di Google Sheet terpilih dengan data tabungan siswa saat ini?')) {
      return;
    }

    setIsExportingSheet(true);
    showToast('Menyinkronkan ke Sheet', 'Mengirim seluruh data siswa, transaksi, dan kelas...');
    try {
      await exportAllDataToSheet(selectedSheetId, students, transactions, classes, schoolInfo);
      showToast('Ekspor Berhasil!', 'Data telah terupdate langsung di Google Sheet Anda.');
    } catch (err: any) {
      showToast('Ekspor Gagal', err.message, 'error');
    } finally {
      setIsExportingSheet(false);
    }
  };

  const handleImportFromActiveSheet = async () => {
    if (!selectedSheetId) {
      showToast('Pilih Sheet Dulu', 'Pilih Google Spreadsheet target terlebih dahulu.', 'error');
      return;
    }

    if (!window.confirm('Impor data dari Google Sheet ini dan perbarui data aplikasi saat ini?')) {
      return;
    }

    setIsImportingSheet(true);
    showToast('Membaca Sheet', 'Mengimpor data siswa dan histori transaksi dari Google Sheet...');
    try {
      const data = await importDataFromGoogleSheet(selectedSheetId);
      if (onDataSynced) {
        onDataSynced(data);
      }
      showToast('Impor Berhasil!', `Dimuat ${data.students.length} siswa dan ${data.transactions.length} transaksi.`);
    } catch (err: any) {
      showToast('Impor Gagal', err.message, 'error');
    } finally {
      setIsImportingSheet(false);
    }
  };

  const handleSelectSheet = (sheet: GoogleSpreadsheetItem) => {
    setSelectedSheetId(sheet.id);
    setActiveSheetName(sheet.name);
    setActiveSheetUrl(sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`);

    localStorage.setItem('tp_active_sheet_id', sheet.id);
    localStorage.setItem('tp_active_sheet_name', sheet.name);
    localStorage.setItem('tp_active_sheet_url', sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`);
    showToast('Sheet Dipilih', `Google Sheet aktif: ${sheet.name}`);
  };

  if (!isOpen) return null;

  const handleSubmitSchool = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchoolInfo(formData);
    showToast('Pengaturan Disimpan', 'Informasi identitas sekolah dan kepala sekolah telah diperbarui.');
    onClose();
  };

  const handleSaveAppsScriptConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveAppsScriptConfig(appsScriptConfig);
    showToast('Backend Disimpan', `Konfigurasi Google Apps Script (ID: ${appsScriptConfig.scriptId}) berhasil disimpan.`);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    showToast('Menguji Koneksi', 'Menghubungi Google Apps Script backend...');
    const result = await fetchFromAppsScript(appsScriptConfig);
    setIsTesting(false);

    if (result.success) {
      showToast('Koneksi Berhasil!', result.message || 'Terhubung dengan Google Apps Script.');
      if (result.spreadsheetUrl) {
        setAppsScriptConfig((prev) => ({
          ...prev,
          spreadsheetUrl: result.spreadsheetUrl,
          spreadsheetId: result.spreadsheetId,
        }));
      }
      if (result.data && onDataSynced) {
        onDataSynced(result.data);
      }
    } else {
      showToast('Koneksi Gagal', result.message || 'Periksa URL Web App dan izin deployment Google Apps Script.', 'error');
    }
  };

  const handlePushAllData = async () => {
    setIsSyncing(true);
    showToast('Mengunggah Data', 'Mengirim data siswa dan transaksi ke Google Sheets Apps Script...');
    const result = await syncAllToAppsScript(
      {
        students,
        transactions,
        schoolInfo: formData,
      },
      appsScriptConfig
    );
    setIsSyncing(false);

    if (result.success) {
      if (result.spreadsheetUrl) {
        setAppsScriptConfig((prev) => ({
          ...prev,
          spreadsheetUrl: result.spreadsheetUrl,
          spreadsheetId: result.spreadsheetId,
        }));
      }
      showToast('Sinkronisasi Sukses', 'Semua data lokal berhasil disimpan ke Google Sheets Apps Script!');
    } else {
      showToast('Sinkronisasi Gagal', result.message || 'Gagal mengirim data ke Apps Script.', 'error');
    }
  };

  const handleCopyCode = () => {
    const code = getAppsScriptBackendCode();
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    showToast('Kode Disalin!', 'Kode Google Apps Script telah disalin ke clipboard.');
    setTimeout(() => setCodeCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div
        className="bg-[#ffffff] rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-[#becabd] max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[#becabd]/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006130] text-2xl">tune</span>
            <h3 className="text-lg font-bold text-[#1a1c1c]">Pengaturan & Integrasi Google Sheets</h3>
          </div>
          <button onClick={onClose} className="text-[#6f7a6f] hover:text-[#1a1c1c] p-1 rounded-full cursor-pointer">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#becabd]/60 mt-3 mb-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('googlesheets')}
            className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'googlesheets'
                ? 'border-[#006130] text-[#006130] bg-[#006130]/5'
                : 'border-transparent text-[#3f4940] hover:text-[#1a1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-base">table_chart</span>
            <span>Google Sheets (Direct Sync)</span>
            <span className="bg-[#96f7af] text-[#00210c] text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              {hasToken ? 'Terhubung' : 'OAuth'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appsscript')}
            className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'appsscript'
                ? 'border-[#006130] text-[#006130] bg-[#006130]/5'
                : 'border-transparent text-[#3f4940] hover:text-[#1a1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-base">cloud_sync</span>
            <span>Google Apps Script</span>
            <span className="bg-[#e9e8e7] text-[#3f4940] text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              ID: {appsScriptConfig.scriptId.substring(0, 6)}...
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('school')}
            className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'school'
                ? 'border-[#006130] text-[#006130] bg-[#006130]/5'
                : 'border-transparent text-[#3f4940] hover:text-[#1a1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-base">school</span>
            <span>Identitas Sekolah</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {/* TAB 1: GOOGLE SHEETS DIRECT SYNC */}
          {activeTab === 'googlesheets' && (
            <div className="space-y-4 text-xs">
              {/* Account Connection Card */}
              <div className="p-4 bg-[#f4f3f2] rounded-xl border border-[#becabd]/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#006130] text-white flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-2xl">table_view</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#1a1c1c] text-sm">Google Sheets & Drive Integration</h4>
                    <p className="text-[#3f4940] text-[11px]">
                      {hasToken && googleUser
                        ? `Terhubung sebagai: ${googleUser.email || googleUser.displayName}`
                        : 'Hubungkan akun Google untuk membaca & menulis data ke Spreadsheet Anda.'}
                    </p>
                  </div>
                </div>

                <div>
                  {hasToken ? (
                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="px-3.5 py-1.5 bg-white border border-[#ba1a1a] text-[#ba1a1a] font-bold text-xs rounded-lg hover:bg-[#ffdad6] transition-colors"
                    >
                      Putuskan Akun
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSigningInGoogle}
                      onClick={handleGoogleLogin}
                      className="px-4 py-2 bg-[#006130] hover:bg-[#107c41] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#ffffff"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#ffffff"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#ffffff"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#ffffff"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>{isSigningInGoogle ? 'Menghubungkan...' : 'Sign in with Google'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Selected Sheet Banner */}
              {selectedSheetId && (
                <div className="p-3.5 bg-[#96f7af]/30 border border-[#006130]/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006130]">check_circle</span>
                    <div>
                      <h5 className="font-bold text-[#00210c] text-xs">Spreadsheet Aktif: {activeSheetName || selectedSheetId}</h5>
                      <p className="text-[10px] text-[#006130] font-mono">ID: {selectedSheetId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSheetUrl && (
                      <a
                        href={activeSheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-white border border-[#006130] text-[#006130] rounded-lg font-bold text-[11px] flex items-center gap-1 hover:bg-[#faf9f8]"
                      >
                        <span>Buka Sheet</span>
                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions (Create / Sync / Import) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={!hasToken || isCreatingSheet}
                  onClick={handleCreateNewSheet}
                  className="p-3.5 bg-white border border-[#006130] text-[#006130] hover:bg-[#006130]/5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-2xl text-[#006130]">add_circle</span>
                  <span className="text-xs">{isCreatingSheet ? 'Membuat...' : 'Buat Google Sheet Baru'}</span>
                  <span className="text-[10px] text-[#3f4940] font-normal text-center">Otomatis buat 4 sheet & isi data</span>
                </button>

                <button
                  type="button"
                  disabled={!hasToken || !selectedSheetId || isExportingSheet}
                  onClick={handleExportToActiveSheet}
                  className="p-3.5 bg-white border border-[#005db5] text-[#005db5] hover:bg-[#005db5]/5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-2xl text-[#005db5]">upload</span>
                  <span className="text-xs">{isExportingSheet ? 'Mengirim...' : 'Sinkronkan Data ke Sheet'}</span>
                  <span className="text-[10px] text-[#3f4940] font-normal text-center">Ekspor data siswa & transaksi</span>
                </button>

                <button
                  type="button"
                  disabled={!hasToken || !selectedSheetId || isImportingSheet}
                  onClick={handleImportFromActiveSheet}
                  className="p-3.5 bg-white border border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ba1a1a]/5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-2xl text-[#ba1a1a]">download</span>
                  <span className="text-xs">{isImportingSheet ? 'Mengimpor...' : 'Tarik Data dari Sheet'}</span>
                  <span className="text-[10px] text-[#3f4940] font-normal text-center">Muat data dari spreadsheet</span>
                </button>
              </div>

              {/* List of User's Spreadsheets in Google Drive */}
              {hasToken && (
                <div className="space-y-2 pt-2 border-t border-[#becabd]/60">
                  <div className="flex justify-between items-center">
                    <h5 className="font-bold text-[#1a1c1c] text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#006130] text-sm">folder_open</span>
                      <span>Daftar Google Spreadsheet di Drive Anda</span>
                    </h5>
                    <button
                      type="button"
                      disabled={isLoadingSheets}
                      onClick={handleFetchSpreadsheets}
                      className="text-[11px] text-[#005db5] font-bold hover:underline flex items-center gap-1"
                    >
                      <span className={`material-symbols-outlined text-xs ${isLoadingSheets ? 'animate-spin' : ''}`}>
                        refresh
                      </span>
                      <span>{isLoadingSheets ? 'Memuat...' : 'Segarkan Daftar'}</span>
                    </button>
                  </div>

                  <div className="max-h-44 overflow-y-auto border border-[#becabd] rounded-xl divide-y divide-[#becabd]/40 bg-white">
                    {spreadsheets.length === 0 ? (
                      <div className="p-4 text-center text-[#6f7a6f]">
                        {isLoadingSheets
                          ? 'Sedang mencari spreadsheet di Google Drive...'
                          : 'Klik "Segarkan Daftar" atau "Buat Google Sheet Baru" di atas.'}
                      </div>
                    ) : (
                      spreadsheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          onClick={() => handleSelectSheet(sheet)}
                          className={`p-2.5 flex items-center justify-between hover:bg-[#faf9f8] cursor-pointer transition-colors ${
                            selectedSheetId === sheet.id ? 'bg-[#96f7af]/20 font-bold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="material-symbols-outlined text-[#006130] text-lg">description</span>
                            <div className="truncate">
                              <p className="text-xs text-[#1a1c1c] truncate">{sheet.name}</p>
                              <p className="text-[10px] text-[#6f7a6f] font-mono">ID: {sheet.id}</p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              selectedSheetId === sheet.id
                                ? 'bg-[#006130] text-white'
                                : 'bg-[#e9e8e7] text-[#3f4940]'
                            }`}
                          >
                            {selectedSheetId === sheet.id ? 'Terpilih' : 'Gunakan'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: APPS SCRIPT BACKEND */}
          {activeTab === 'appsscript' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#f4f3f2] rounded-xl border border-[#becabd]/80 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#006130]/10 flex items-center justify-center flex-shrink-0 text-[#006130]">
                  <span className="material-symbols-outlined text-2xl">integration_instructions</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[#1a1c1c] text-sm">Google Apps Script Backend</h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d6e3ff] text-[#00376f]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#005db5] animate-pulse"></span>
                      Script ID: {appsScriptConfig.scriptId.substring(0, 8)}...
                    </span>
                  </div>
                  <p className="text-[#3f4940] text-[11px] mt-0.5">
                    Data transaksi & tabungan siswa otomatis tersinkronisasi dengan Google Spreadsheet melalui Google Apps Script Web App.
                  </p>
                </div>
              </div>

              {appsScriptConfig.spreadsheetUrl && (
                <div className="p-3 bg-[#96f7af]/30 border border-[#006130]/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006130] text-lg">check_circle</span>
                    <div>
                      <h5 className="font-bold text-[#00210c] text-xs">Spreadsheet Database Terhubung</h5>
                      <p className="text-[10px] text-[#006130] truncate max-w-xs sm:max-w-md">
                        {appsScriptConfig.spreadsheetUrl}
                      </p>
                    </div>
                  </div>
                  <a
                    href={appsScriptConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-white border border-[#006130] text-[#006130] rounded-lg font-bold text-[11px] flex items-center gap-1 hover:bg-[#faf9f8] shadow-2xs whitespace-nowrap"
                  >
                    <span>Buka Spreadsheet</span>
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                  </a>
                </div>
              )}

              <form onSubmit={handleSaveAppsScriptConfig} className="space-y-3">
                <div>
                  <label className="font-bold text-[#1a1c1c] block mb-1">
                    Script ID Google Apps Script
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={appsScriptConfig.scriptId}
                      onChange={(e) => {
                        const sId = e.target.value.trim();
                        setAppsScriptConfig({
                          ...appsScriptConfig,
                          scriptId: sId,
                          webAppUrl: `https://script.google.com/macros/s/${sId}/exec`,
                        });
                      }}
                      className="flex-1 bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs font-mono text-[#1a1c1c] focus:border-[#006130] outline-none"
                    />
                    <a
                      href={`https://script.google.com/d/${appsScriptConfig.scriptId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-[#f4f3f2] hover:bg-[#e9e8e7] border border-[#becabd] text-[#005db5] font-bold text-xs rounded-lg flex items-center gap-1 whitespace-nowrap transition-colors"
                    >
                      <span>Buka Editor Script</span>
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </a>
                  </div>
                  <p className="text-[10px] text-[#6f7a6f] mt-1 font-mono">
                    Default ID: {DEFAULT_SCRIPT_ID}
                  </p>
                </div>

                <div>
                  <label className="font-bold text-[#1a1c1c] block mb-1">
                    Web App Deployment Exec URL
                  </label>
                  <input
                    type="text"
                    required
                    value={appsScriptConfig.webAppUrl}
                    onChange={(e) =>
                      setAppsScriptConfig({ ...appsScriptConfig, webAppUrl: e.target.value.trim() })
                    }
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs font-mono text-[#1a1c1c] focus:border-[#006130] outline-none"
                  />
                  <p className="text-[11px] text-[#3f4940] mt-1">
                    Pastikan deployment di Apps Script disetel dengan: <strong>Execute as: Me</strong> dan <strong>Who has access: Anyone</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-[#1a1c1c]">
                    <input
                      type="checkbox"
                      checked={appsScriptConfig.autoSync}
                      onChange={(e) =>
                        setAppsScriptConfig({ ...appsScriptConfig, autoSync: e.target.checked })
                      }
                      className="rounded border-[#becabd] text-[#006130] focus:ring-[#006130]"
                    />
                    <span>Otomatis Sinkronkan Setiap Input Transaksi Baru</span>
                  </label>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#006130] hover:bg-[#107c41] text-[#ffffff] font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">save</span>
                    <span>Simpan Pengaturan Backend</span>
                  </button>

                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={handleTestConnection}
                    className="px-3.5 py-2 bg-[#f4f3f2] hover:bg-[#e9e8e7] text-[#005db5] border border-[#becabd] font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-base ${isTesting ? 'animate-spin' : ''}`}>
                      {isTesting ? 'progress_activity' : 'network_check'}
                    </span>
                    <span>{isTesting ? 'Menguji...' : 'Uji Koneksi'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handlePushAllData}
                    className="px-3.5 py-2 bg-[#f4f3f2] hover:bg-[#e9e8e7] text-[#3f4940] border border-[#becabd] font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin' : ''}`}>
                      {isSyncing ? 'sync' : 'upload'}
                    </span>
                    <span>{isSyncing ? 'Mengunggah...' : 'Upload Data Awal'}</span>
                  </button>
                </div>
              </form>

              <div className="mt-4 pt-4 border-t border-[#becabd]/60">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-bold text-[#1a1c1c] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#006130]">code</span>
                    <span>Kode Backend Google Apps Script (Code.gs)</span>
                  </h5>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCode(!showCode)}
                      className="text-[11px] font-semibold text-[#005db5] hover:underline"
                    >
                      {showCode ? 'Sembunyikan Kode' : 'Lihat Kode'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-2.5 py-1 bg-[#006130] hover:bg-[#107c41] text-[#ffffff] text-[11px] font-bold rounded-md flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {codeCopied ? 'check' : 'content_copy'}
                      </span>
                      <span>{codeCopied ? 'Tersalin!' : 'Salin Kode'}</span>
                    </button>
                  </div>
                </div>

                {showCode && (
                  <div className="relative mt-2">
                    <pre className="bg-[#1a1c1c] text-[#96f7af] p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48 custom-scrollbar leading-relaxed">
                      {getAppsScriptBackendCode()}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: IDENTITAS SEKOLAH */}
          {activeTab === 'school' && (
            <form onSubmit={handleSubmitSchool} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#3f4940] block mb-1">Nama Lembaga / Sekolah</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#3f4940] block mb-1">
                  Nama Kepala Sekolah (Untuk Tanda Tangan Laporan)
                </label>
                <input
                  type="text"
                  required
                  value={formData.principalName}
                  onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                  className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#3f4940] block mb-1">Alamat Sekolah</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#3f4940] block mb-1">Nomor Telepon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#3f4940] block mb-1">Email Resmi</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#faf9f8] border border-[#becabd] rounded-lg p-2.5 text-xs text-[#1a1c1c] focus:border-[#006130] outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#becabd]/60 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Apakah Anda yakin ingin mengatur ulang data transaksi ke data bawaan?')) {
                      onResetData();
                      showToast('Data Direset', 'Semua data telah dikembalikan ke kondisi awal.');
                      onClose();
                    }
                  }}
                  className="text-left text-[#ba1a1a] hover:underline text-xs flex items-center gap-1 font-semibold"
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                  <span>Reset Data Contoh ke Awal</span>
                </button>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-[#becabd] text-[#3f4940] font-semibold rounded-lg hover:bg-[#e9e8e7]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#006130] text-[#ffffff] font-semibold rounded-lg hover:bg-[#107c41] transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
