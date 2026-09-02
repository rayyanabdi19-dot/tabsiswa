import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Transaction, SchoolInfo, ClassInfo } from '../types';
import { formatRupiah } from '../utils/formatters';
import { TabsiLogo } from './TabsiLogo';
import {
  APP_VERSION,
  APP_BRAND_NAME,
  APP_HELPDESK_EMAIL,
  APP_HELPDESK_PHONE,
  APP_HELPDESK_WA_URL,
} from './AppAboutModal';

interface UserGuideViewProps {
  isAdmin: boolean;
  students: Student[];
  transactions: Transaction[];
  classes: ClassInfo[];
  schoolInfo: SchoolInfo;
  onNavigateTab: (tab: string) => void;
  onOpenNewTransaction?: () => void;
  onOpenSettings?: () => void;
}

export const UserGuideView: React.FC<UserGuideViewProps> = ({
  isAdmin,
  students,
  transactions,
  classes,
  schoolInfo,
  onNavigateTab,
  onOpenNewTransaction,
  onOpenSettings,
}) => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'student'>(isAdmin ? 'admin' : 'student');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>('guide-admin-1');
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [faqFilterCategory, setFaqFilterCategory] = useState('all');
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(0);

  // Dynamic system status and real-time statistics
  const dynamicStats = useMemo(() => {
    const totalBalance = students.reduce((acc, s) => acc + s.balance, 0);
    const deposits = transactions.filter((t) => t.type === 'deposit');
    const withdrawals = transactions.filter((t) => t.type === 'withdrawal');
    
    // Inactive students calculation (> 30 days)
    const nowTime = Date.now();
    let inactiveCount = 0;
    students.forEach((student) => {
      const studentDeposits = transactions.filter(
        (t) => t.type === 'deposit' && (t.studentNisn === student.nisn || t.studentId === student.id)
      );
      if (studentDeposits.length > 0) {
        const sorted = [...studentDeposits].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const lastDepositTime = new Date(sorted[0].date).getTime();
        const diffDays = Math.floor((nowTime - lastDepositTime) / (1000 * 60 * 60 * 24));
        if (diffDays >= 30) inactiveCount++;
      } else {
        inactiveCount++;
      }
    });

    return {
      studentCount: students.length,
      classCount: classes.length,
      txCount: transactions.length,
      totalDepositCount: deposits.length,
      totalWithdrawalCount: withdrawals.length,
      totalBalanceFormatted: formatRupiah(totalBalance),
      inactiveCount,
      lastUpdated: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      activeModules: [
        { name: 'Kasir Setoran & Penarikan', status: 'Aktif & Siap', icon: 'swap_horiz', color: 'text-emerald-700 bg-emerald-50' },
        { name: 'Pengingat Siswa Pasif & WA', status: `${inactiveCount} Siswa Terdeteksi`, icon: 'notifications_active', color: 'text-amber-700 bg-amber-50' },
        { name: 'Ekspor Laporan PDF Resmi A4', status: 'Format Standar Kop Surat', icon: 'picture_as_pdf', color: 'text-blue-700 bg-blue-50' },
        { name: 'Upload Foto Galeri / Avatar', status: 'Kompresi Otomatis Aktif', icon: 'photo_camera', color: 'text-purple-700 bg-purple-50' },
        { name: 'Manajemen Kelas & Mutasi', status: `${classes.length} Kelas Terdaftar`, icon: 'meeting_room', color: 'text-teal-700 bg-teal-50' },
        { name: 'Google Cloud Sync & Backup', status: 'Koneksi Aman Terverifikasi', icon: 'cloud_done', color: 'text-indigo-700 bg-indigo-50' },
      ],
    };
  }, [students, transactions, classes]);

  // Admin Guides List
  const adminGuides = useMemo(
    () => [
      {
        id: 'guide-admin-1',
        category: 'transaksi',
        title: '1. Input Mutasi Setoran & Penarikan Kasir',
        description: 'Panduan pencatatan setoran uang tabungan atau penarikan kas siswa secara cepat dan akurat.',
        icon: 'point_of_sale',
        badge: 'Fitur Utama',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        steps: [
          'Buka menu "Kasir & Transaksi" atau klik tombol "Input Transaksi Kasir" di sidebar.',
          'Pilih jenis mutasi: "Setor Tabungan (+)" atau "Tarik Saldo (-)".',
          'Pilih nama atau NISN siswa dari daftar pencarian cerdas.',
          'Ketik nominal uang tabungan atau gunakan tombol cepat nominal (Rp 10.000, Rp 20.000, Rp 50.000, dst).',
          'Tulis catatan transaksi (opsional, contoh: "Tabungan Mingguan")',
          'Klik "Simpan Transaksi Kasir". Sistem otomatis memperbarui saldo siswa, merekam mutasi, dan mencetak struk transaksi resmi.',
        ],
        actionLabel: 'Buka Kasir Transaksi',
        actionTab: 'transactions',
      },
      {
        id: 'guide-admin-2',
        category: 'notifikasi',
        title: '2. Fitur Pengingat Siswa Pasif & Reminder WhatsApp',
        description: 'Cara mendeteksi dan mengirim pengingat ke orang tua/wali siswa yang belum menabung > 30 hari.',
        icon: 'notifications_active',
        badge: 'Fitur Pintar',
        badgeColor: 'bg-amber-100 text-amber-800',
        steps: [
          'Periksa banner notifikasi berwarna kuning di bagian atas "Dashboard Kas".',
          'Sistem secara otomatis menghitung berapa hari sejak setoran terakhir setiap siswa.',
          'Klik tombol "Lihat Siswa" untuk membuka daftar siswa yang pasif.',
          'Gunakan filter rentang waktu (> 30 hari, > 60 hari, > 90 hari) atau filter per kelas.',
          'Klik tombol "Ingatkan WA" pada baris siswa untuk membuka draf pesan santun dan resmi ke nomor WhatsApp wali murid.',
          'Nomor HP dan nama siswa otomatis terisi tanpa perlu mengetik manual.',
        ],
        actionLabel: 'Lihat Pengingat di Dashboard',
        actionTab: 'dashboard',
      },
      {
        id: 'guide-admin-3',
        category: 'siswa',
        title: '3. Kelola Data Siswa & Ambil Foto dari Galeri',
        description: 'Menambah siswa baru, mengedit data, upload foto profil dari galeri HP/laptop, dan impor data massal.',
        icon: 'groups',
        badge: 'Manajemen Data',
        badgeColor: 'bg-indigo-100 text-indigo-800',
        steps: [
          'Buka menu "Data Siswa" di bilah navigasi.',
          'Untuk menambah siswa baru, klik tombol "+ Tambah Siswa Baru".',
          'Isi Nama Siswa, NISN, Kelas, Nomor HP Wali Murid, dan Alamat.',
          'Pada bagian Foto Siswa, klik "Ambil dari Galeri / File" untuk memilih foto dari penyimpanan galeri perangkat Anda.',
          'Foto akan otomatis dikompresi agar sistem tetap ringan dan cepat.',
          'Anda juga dapat menggunakan fitur "Import Data Siswa" untuk mengunggah daftar siswa dari file Excel / CSV.',
        ],
        actionLabel: 'Buka Menu Data Siswa',
        actionTab: 'students',
      },
      {
        id: 'guide-admin-4',
        category: 'laporan',
        title: '4. Ekspor Laporan Rekapitulasi ke Format PDF & Excel',
        description: 'Mencetak laporan keuangan resmi dengan Kop Surat Sekolah, tanda tangan Kepala Sekolah & Bendahara.',
        icon: 'picture_as_pdf',
        badge: 'Dokumen Resmi',
        badgeColor: 'bg-rose-100 text-rose-800',
        steps: [
          'Buka menu "Laporan Rekapitulasi" atau buka menu "Riwayat Transaksi".',
          'Pilih filter rentang tanggal, filter kelas tertentu, atau pilih semua kelas.',
          'Klik tombol "Export PDF (Kop Surat)" untuk mengunduh dokumen laporan A4 siap cetak.',
          'Dokumen PDF berisi: Kop Surat Sekolah Resmi, Ringkasan Pemasukan & Pengeluaran, Tabel Transaksi Terperinci, serta Lembar Pengesahan Tanda Tangan.',
          'Anda juga dapat mengunduh laporan dalam format CSV / Excel untuk keperluan pembukuan internal.',
        ],
        actionLabel: 'Buka Menu Laporan',
        actionTab: 'report',
      },
      {
        id: 'guide-admin-5',
        category: 'kelas',
        title: '5. Manajemen Kelas & Wali Kelas',
        description: 'Mengelompokkan siswa per rombongan belajar (rombel) dan memantau saldo akumulatif per kelas.',
        icon: 'meeting_room',
        badge: 'Struktur Akademik',
        badgeColor: 'bg-teal-100 text-teal-800',
        steps: [
          'Buka menu "Menu Kelas" pada sidebar navigasi.',
          'Lihat kartu ringkasan tiap kelas yang memuat: Nama Wali Kelas, Total Siswa, Total Saldo Kelas, dan Rata-rata Tabungan.',
          'Klik "+ Tambah Kelas Baru" untuk membuat rombongan belajar baru.',
          'Klik "Detail Siswa" pada kartu kelas untuk memfilter daftar siswa dan mengelola tabungan kelas tersebut.',
        ],
        actionLabel: 'Buka Menu Kelas',
        actionTab: 'classes',
      },
      {
        id: 'guide-admin-6',
        category: 'keamanan',
        title: '6. Sinkronisasi Cloud Google & Keamanan Data',
        description: 'Menghubungkan aplikasi dengan Google Workspace / Google Spreadsheet tanpa ekspos data sensitif.',
        icon: 'security',
        badge: 'Privasi & Cloud',
        badgeColor: 'bg-slate-100 text-slate-800',
        steps: [
          'Buka modal "Pengaturan & Cloud" di bagian bawah navigasi.',
          'Data tabungan dapat disinkronkan secara aman ke Google Spreadsheet melalui Google Apps Script Web App.',
          'Aplikasi dirancang dengan enkripsi aman; tidak ada alamat IP internal yang dibocorkan ke pengguna publik.',
          'Setiap akses data siswa diproteksi dengan verifikasi peran (Role-Based Access Control).',
        ],
        actionLabel: 'Buka Pengaturan Cloud',
        actionCustom: () => onOpenSettings && onOpenSettings(),
      },
      {
        id: 'guide-admin-7',
        category: 'akun',
        title: '7. Pendaftaran Akun Baru & Isolasi Data Multi-Tenant',
        description: 'Cara mendaftar akun sekolah baru dengan proteksi dan isolasi data penuh antar akun.',
        icon: 'person_add',
        badge: 'Isolasi Data',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        steps: [
          'Pada halaman login, pilih tab "Daftar Akun Baru".',
          'Isi Nama Lengkap Bendahara, Nama Sekolah/Instansi, Email, dan Kata Sandi.',
          'Sistem otomatis membuat ruang kerja (workspace) terisolasi untuk sekolah Anda.',
          'Seluruh data siswa, kelas, saldo, dan riwayat transaksi tersimpan secara eksklusif dan tidak dapat diakses oleh sekolah/akun lain.',
        ],
        actionLabel: 'Lihat Info Akun',
        actionCustom: () => onOpenSettings && onOpenSettings(),
      },
      {
        id: 'guide-admin-8',
        category: 'notifikasi',
        title: '8. Notifikasi & Struk WhatsApp Real-Time ke Orang Tua',
        description: 'Mengirimkan rincian setoran/penarikan dan alokasi saldo 80/20 langsung ke WhatsApp wali murid.',
        icon: 'chat',
        badge: 'WhatsApp Realtime',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        steps: [
          'Setelah menyelesaikan input transaksi kasir, modal WhatsApp otomatis terbuka.',
          'Rincian pesan mencakup: Nama Siswa, NISN, Nominal Mutasi, Saldo 80% Bisa Dipakai & 20% Terkunci, serta Nama Bendahara.',
          'Klik tombol "Kirim Struk ke WhatsApp Sekarang" untuk membuka WhatsApp dengan pesan yang sudah terformat rapi.',
          'Anda juga dapat menyalin teks rincian struk untuk dikirimkan melalui saluran lain.',
        ],
        actionLabel: 'Buka Input Transaksi',
        actionTab: 'transactions',
      },
    ],
    [onOpenSettings]
  );

  // Student Guides List
  const studentGuides = useMemo(
    () => [
      {
        id: 'guide-std-1',
        category: 'saldo',
        title: '1. Memahami Saldo 80% Bebas & 20% Terkunci',
        description: 'Cara kerja pembagian tabungan cerdas untuk melatih kedisiplinan dan masa depan siswa.',
        icon: 'account_balance_wallet',
        badge: 'Edukasi Finansial',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        steps: [
          'Masuk ke portal siswa menggunakan NISN Anda.',
          'Pada menu "Saldo & Tabungan Saya", saldo Anda dibagi menjadi dua pos:',
          '1. Saldo Tersedia (80%): Dapat ditarik sewaktu-waktu untuk kebutuhan mendesak atau perlengkapan sekolah.',
          '2. Saldo Terkunci (20%): Tabungan pokok jangka panjang yang aman dan tidak dapat ditarik sembarangan.',
          'Konsep ini melatih siswa memiliki dana cadangan masa depan yang selalu terlindungi.',
        ],
        actionLabel: 'Cek Saldo Saya',
        actionTab: 'student-portal-balance',
      },
      {
        id: 'guide-std-2',
        category: 'target',
        title: '2. Memantau Target Tabungan (Finansial Goals)',
        description: 'Melihat progres capaian target tabungan impian (contoh: Biaya Studi Tur, Beli Sepeda, Laptop).',
        icon: 'emoji_events',
        badge: 'Motivasi',
        badgeColor: 'bg-amber-100 text-amber-800',
        steps: [
          'Lihat kartu "Target Tabungan Saya" di beranda portal siswa.',
          'Pantau persentase capaian target serta sisa nominal yang perlu ditabung.',
          'Saat target mencapai 100%, sistem akan merayakan keberhasilan Anda dengan notifikasi spesial!',
        ],
        actionLabel: 'Lihat Target Tabungan',
        actionTab: 'student-portal-balance',
      },
      {
        id: 'guide-std-3',
        category: 'buku',
        title: '3. Cetak E-Buku Tabungan & Riwayat Mutasi',
        description: 'Melihat buku tabungan digital yang mirip dengan buku tabungan bank konvensional.',
        icon: 'menu_book',
        badge: 'Buku Tabungan',
        badgeColor: 'bg-blue-100 text-blue-800',
        steps: [
          'Buka menu "Saldo & Tabungan Saya" atau "Riwayat Transaksi Saya".',
          'Klik tombol "Cetak E-Buku Tabungan".',
          'Sistem akan menampilkan format buku tabungan lengkap dengan baris Debit, Kredit, Saldo Kumulatif, dan Validasi Bendahara.',
          'Anda dapat mencetak atau menyimpannya sebagai file PDF.',
        ],
        actionLabel: 'Buka Riwayat Tabungan',
        actionTab: 'student-portal-history',
      },
      {
        id: 'guide-std-4',
        category: 'profil',
        title: '4. Keamanan Akun & Pengaturan PIN Rekening',
        description: 'Menjaga kerahasiaan nomor rekening dan mengganti PIN keamanan rekening tabungan.',
        icon: 'lock',
        badge: 'Keamanan',
        badgeColor: 'bg-purple-100 text-purple-800',
        steps: [
          'Buka menu "Profil Rekening & PIN".',
          'Periksa data pribadi, kelas, nomor rekening tabungan, dan nama wali murid.',
          'Anda dapat memperbarui PIN 6 digit rekening secara berkala.',
          'Jangan pernah membagikan PIN rekening Anda kepada orang lain selain orang tua / wali.',
        ],
        actionLabel: 'Buka Profil & PIN',
        actionTab: 'student-portal-profile',
      },
    ],
    []
  );

  const currentGuides = selectedRole === 'admin' ? adminGuides : studentGuides;

  // Filtered guides by search & category
  const filteredGuides = useMemo(() => {
    return currentGuides.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.steps.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [currentGuides, searchQuery, activeCategory]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Hero */}
      <div className="bg-gradient-to-r from-[#006130] to-[#107c41] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Subtle Decorative Background Pattern */}
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-8 w-48 h-48 bg-white/5 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/95 p-2 rounded-2xl shadow-sm">
                <TabsiLogo size="sm" variant="modern" showByline={false} showSubtext={false} />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20">
                <span className="material-symbols-outlined text-sm">menu_book</span>
                <span>Buku Panduan &amp; Dokumentasi</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
                <span className="text-[10px] text-emerald-200">Terupdate Otomatis</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Panduan Penggunaan {schoolInfo.name}
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-2 leading-relaxed">
              Panduan lengkap tata cara operasional administrasi tabungan sekolah, pencatatan mutasi kasir, notifikasi WhatsApp wali murid, hingga portal siswa mandiri.
            </p>
          </div>

          {/* Role Mode Switcher for Guide */}
          <div className="bg-white/15 p-1 rounded-2xl backdrop-blur-md border border-white/20 flex shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('admin');
                setActiveCategory('all');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                selectedRole === 'admin'
                  ? 'bg-white text-[#006130] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
              <span>Panduan Bendahara</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('student');
                setActiveCategory('all');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                selectedRole === 'student'
                  ? 'bg-white text-[#006130] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-sm">school</span>
              <span>Panduan Siswa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live System Capabilities & Auto-Updating Status Box */}
      <div className="bg-white rounded-2xl border border-[#becabd]/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#becabd]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#006130]/10 text-[#006130] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1a1c1c] flex items-center gap-2">
                <span>Status & Kapabilitas Sistem Terkini</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                  Realtime Sync
                </span>
              </h3>
              <p className="text-[11px] text-[#6f7a6f]">
                Statistik dan status fitur berikut diperbarui secara langsung mengikuti data aktif di aplikasi.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#3f4940] bg-[#faf9f8] px-3 py-1 rounded-lg border border-[#becabd]/60 self-start sm:self-auto">
            Terakhir Sinkron: {dynamicStats.lastUpdated}
          </span>
        </div>

        {/* Live Modules Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          {dynamicStats.activeModules.map((mod, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-gray-100 bg-[#faf9f8] hover:border-[#006130]/40 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`material-symbols-outlined text-lg p-1 rounded-lg ${mod.color}`}>
                  {mod.icon}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#1a1c1c] leading-tight line-clamp-1">{mod.name}</h4>
                <p className="text-[10px] text-[#6f7a6f] font-medium mt-0.5">{mod.status}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Realtime Data Badges */}
        <div className="mt-4 pt-3 border-t border-[#becabd]/30 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-gray-500 font-medium">Data Terkini:</span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200">
            👥 {dynamicStats.studentCount} Siswa Terdaftar
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-bold border border-teal-200">
            🏫 {dynamicStats.classCount} Kelas
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
            💰 {dynamicStats.txCount} Riwayat Transaksi
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
            ⚠️ {dynamicStats.inactiveCount} Siswa Pasif (&gt; 30 Hari)
          </span>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#becabd]/80 shadow-2xs">
        {/* Search Input */}
        <div className="w-full sm:w-80 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">
            search
          </span>
          <input
            type="text"
            placeholder="Cari topik panduan, kata kunci, fitur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#faf9f8] border border-[#becabd]/60 rounded-xl text-xs focus:outline-none focus:border-[#006130] focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-sm">cancel</span>
            </button>
          )}
        </div>

        <div className="text-xs text-[#6f7a6f] font-semibold self-end sm:self-center">
          Menampilkan {filteredGuides.length} panduan untuk{' '}
          <strong className="text-[#006130]">
            {selectedRole === 'admin' ? 'Bendahara / Admin' : 'Siswa & Wali Murid'}
          </strong>
        </div>
      </div>

      {/* Guides Accordion List */}
      <div className="space-y-3.5">
        {filteredGuides.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#becabd]/80 p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">
              search_off
            </span>
            <h4 className="font-bold text-sm text-[#1a1c1c]">Panduan Tidak Ditemukan</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Tidak ada modul panduan yang cocok dengan kata kunci &quot;{searchQuery}&quot;. Coba gunakan kata kunci umum seperti &quot;setor&quot;, &quot;PDF&quot;, atau &quot;saldo&quot;.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3 py-1.5 bg-[#006130] text-white text-xs font-bold rounded-lg hover:bg-[#107c41] transition-colors"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          filteredGuides.map((guide, idx) => {
            const isExpanded = expandedSectionId === guide.id;

            return (
              <motion.div
                key={guide.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                className="bg-white rounded-2xl border border-[#becabd]/70 overflow-hidden shadow-2xs transition-all hover:border-[#006130]/40"
              >
                {/* Header Bar of the Guide Card */}
                <div
                  onClick={() => setExpandedSectionId(isExpanded ? null : guide.id)}
                  className={`p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isExpanded ? 'bg-[#faf9f8]' : 'hover:bg-[#faf9f8]/60'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isExpanded ? 'bg-[#006130] text-white shadow-xs' : 'bg-[#006130]/10 text-[#006130]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">{guide.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-extrabold text-sm sm:text-base text-[#1a1c1c]">
                          {guide.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${guide.badgeColor}`}
                        >
                          {guide.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#6f7a6f] line-clamp-1">{guide.description}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Expand"
                    className="p-1 text-gray-400 hover:text-gray-700 shrink-0"
                  >
                    <span className="material-symbols-outlined text-xl transition-transform duration-200">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>

                {/* Expanded Content with Step-by-Step Instructions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-[#becabd]/50 p-4 sm:p-6 bg-white space-y-4"
                    >
                      <p className="text-xs text-[#3f4940] leading-relaxed">
                        {guide.description} Ikuti langkah-langkah mudah di bawah ini:
                      </p>

                      {/* Numbered Steps */}
                      <div className="space-y-2.5">
                        {guide.steps.map((step, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex items-start gap-3 p-3 rounded-xl bg-[#faf9f8] border border-gray-100"
                          >
                            <div className="w-6 h-6 rounded-full bg-[#006130] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              {sIdx + 1}
                            </div>
                            <span className="text-xs text-[#1a1c1c] font-medium leading-relaxed">
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Action CTA Button to Jump to the Feature */}
                      <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-gray-100">
                        <span className="text-[11px] text-[#6f7a6f] italic">
                          Ingin mencoba langkah di atas secara langsung?
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            if (guide.actionCustom) {
                              guide.actionCustom();
                            } else if (guide.actionTab) {
                              onNavigateTab(guide.actionTab);
                            }
                          }}
                          className="px-4 py-2 bg-[#006130] hover:bg-[#107c41] text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                        >
                          <span>{guide.actionLabel}</span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ================= PUSAT TANYA JAWAB (Q&A / FAQ) ================= */}
      <div className="bg-[#ffffff] rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-[#becabd]/70 shadow-xs space-y-5">
        {/* Header Q&A */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#becabd]/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006130]/10 text-[#006130] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">quiz</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#1a1c1c]">Tanya Jawab &amp; Bantuan Cepat (Q&amp;A)</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#006130]/10 text-[#006130] text-[10px] font-black">
                  FAQ Resmi
                </span>
              </div>
              <p className="text-xs text-[#6f7a6f] mt-0.5">
                Jawaban praktis untuk pertanyaan paling umum seputar sistem kas tabungan TABSI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#6f7a6f] hidden md:inline">Butuh respon kilat?</span>
            <a
              href={APP_HELPDESK_WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-emerald-700">chat</span>
              <span>Hubungi WA Helpdesk</span>
            </a>
          </div>
        </div>

        {/* Search Bar & Category Filter */}
        <div className="space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f7a6f] text-lg">
              search
            </span>
            <input
              type="text"
              value={faqSearchQuery}
              onChange={(e) => setFaqSearchQuery(e.target.value)}
              placeholder="Ketik kata kunci pertanyaan (contoh: saldo 80/20, lupa PIN, backup data, cetak kuitansi, WA)..."
              className="w-full pl-10 pr-10 py-2.5 bg-[#f4f3f2] rounded-xl border border-[#becabd]/60 text-xs text-[#1a1c1c] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006130]"
            />
            {faqSearchQuery && (
              <button
                onClick={() => setFaqSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6f7a6f] hover:text-[#1a1c1c] p-1"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'Semua Pertanyaan', icon: 'apps' },
              { id: 'saldo', label: 'Aturan Saldo 80/20', icon: 'savings' },
              { id: 'pin', label: 'Login & PIN Siswa', icon: 'key' },
              { id: 'transaksi', label: 'Kasir & Setor Tarik', icon: 'point_of_sale' },
              { id: 'backup', label: 'Backup & Keamanan', icon: 'settings_backup_restore' },
              { id: 'laporan', label: 'Laporan & WhatsApp', icon: 'print' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFaqFilterCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  faqFilterCategory === cat.id
                    ? 'bg-[#006130] text-white shadow-2xs'
                    : 'bg-[#faf9f8] text-[#3f4940] hover:bg-[#e9e8e7] border border-[#becabd]/60'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Q&A Accordion Items */}
        <div className="space-y-2.5">
          {[
            {
              id: 0,
              cat: 'saldo',
              categoryLabel: 'Aturan Saldo 80/20',
              q: 'Bagaimana pembagian persentase saldo 80% dan 20% bekerja secara otomatis?',
              a: 'Ketika siswa melakukan setoran tabungan (misal Rp 100.000), sistem TABSI secara cerdas membaginya ke dalam 2 pos dana:\n\n1. 80% Saldo Likuid (Bisa Ditarik = Rp 80.000): Saldo ini bebas ditarik oleh siswa/orang tua sewaktu-waktu untuk uang saku, kegiatan sekolah, atau kebutuhan harian.\n2. 20% Saldo Terkunci (Cadangan = Rp 20.000): Saldo ini otomatis diproteksi sebagai tabungan simpanan masa depan, kelulusan, atau uang pangkal jenjang berikutnya.\n\nCatatan: Penarikan normal hanya memotong saldo likuid. Apabila siswa lulus atau membutuhkan penarikan darurat total, bendahara dapat memilih opsi penarikan khusus di kasir.',
            },
            {
              id: 1,
              cat: 'pin',
              categoryLabel: 'Login & PIN Siswa',
              q: 'Bagaimana cara siswa masuk ke portal dan apa yang harus dilakukan jika lupa PIN?',
              a: 'Siswa atau wali murid dapat login melalui halaman Login dengan memilih peran "Siswa/Orang Tua", lalu memasukkan nomor NISN dan PIN 6 digit (PIN awal bawaan: 123456).\n\nJika siswa lupa PIN, Bendahara atau Wali Kelas dapat membuka menu "Data Siswa", klik nama siswa tersebut, lalu pada tab "Pengaturan PIN Siswa" klik "Reset ke Default (123456)" atau "Buat PIN Baru", dan klik tombol "Salin Kredensial WA" untuk mengirimkannya ke nomor orang tua.',
            },
            {
              id: 2,
              cat: 'transaksi',
              categoryLabel: 'Kasir & Setor Tarik',
              q: 'Bagaimana cara melayani setoran dan penarikan cepat di kasir sekolah?',
              a: 'Buka menu "Kasir Transaksi" (atau tombol Cepat Setor/Tarik di dashboard).\n1. Ketik nama atau nomor NISN siswa pada kolom pencarian.\n2. Pilih jenis transaksi "Setor Tunai" atau "Tarik Tunai".\n3. Masukkan nominal rupiah (sistem akan otomatis memvalidasi apakah saldo likuid mencukupi jika transaksi adalah penarikan).\n4. Klik "Simpan Transaksi". Struk digital akan muncul dan siap dicetak ke printer thermal/A4 atau dikirim ke WhatsApp.',
            },
            {
              id: 3,
              cat: 'laporan',
              categoryLabel: 'Laporan & WhatsApp',
              q: 'Bagaimana format pengiriman notifikasi setoran tabungan ke WhatsApp orang tua?',
              a: 'Setiap transaksi selesai dicatat, klik tombol "Format WhatsApp" (ikon chat WA). Aplikasi akan otomatis menyusun teks konfirmasi rapi yang memuat: Nama Siswa, NISN, Kelas, Jenis Transaksi, Nominal, Saldo Likuid & Saldo Kunci Terbaru, Tanggal & Jam, serta Nama Bendahara Bertugas. Anda tinggal menempelkan (paste) pesan tersebut ke WhatsApp orang tua.',
            },
            {
              id: 4,
              cat: 'backup',
              categoryLabel: 'Backup & Keamanan',
              q: 'Bagaimana cara mengamankan data kas tabungan agar tidak hilang saat ganti perangkat?',
              a: 'Sangat disarankan untuk melakukan backup rutin setiap pekan (1 minggu 1 kali). Buka menu "Pengaturan" -> pilih tab "Backup & Restore" -> klik tombol "Unduh Cadangan Kas (JSON)". Simpan berkas tersebut di Google Drive atau flashdisk sekolah. Jika sewaktu-waktu Anda menggunakan laptop/komputer baru, cukup unggah kembali berkas JSON tersebut untuk mengembalikan seluruh siswa dan mutasi.',
            },
            {
              id: 5,
              cat: 'laporan',
              categoryLabel: 'Laporan & WhatsApp',
              q: 'Bagaimana cara mencetak rekapitulasi pembukuan kas bulanan dan buku tabungan?',
              a: 'Masuk ke menu "Laporan Keuangan", pilih jenis dokumen:\n• Rekapitulasi Kasir Keseluruhan (Penerimaan & Pengeluaran)\n• Rekapitulasi Per Rombel/Kelas\n• Mutasi Buku Tabungan Fisik Siswa\n\nSetelah memilih periode tanggal, klik tombol "Cetak PDF (A4)". Format laporan telah disesuaikan dengan Kop Surat Sekolah dan lembar tanda tangan bendahara/kepala sekolah.',
            },
            {
              id: 6,
              cat: 'transaksi',
              categoryLabel: 'Kasir & Setor Tarik',
              q: 'Bagaimana cara mendeteksi siswa yang pasif atau sudah lama tidak menabung?',
              a: 'Sistem TABSI memiliki panel otomatis "Notifikasi Siswa Pasif" di dashboard. Sistem memindai siswa yang tidak melakukan setoran selama lebih dari 30 hari dan menyediakan tombol "Kirim Pengingat WhatsApp" untuk memotivasi siswa dan wali murid agar terus gemar menabung.',
            },
            {
              id: 7,
              cat: 'backup',
              categoryLabel: 'Helpdesk & Dukungan',
              q: 'Apakah aplikasi TABSI dapat diintegrasikan dengan Google Sheets sekolah?',
              a: 'Ya, TABSI mendukung integrasi Google Sheets. Anda dapat menghubungkan Google Account di menu Pengaturan untuk mengekspor data mutasi atau melakukan sinkronisasi berkala ke spreadsheet sekolah.',
            },
          ]
            .filter((item) => {
              const matchCat = faqFilterCategory === 'all' || item.cat === faqFilterCategory;
              const matchSearch =
                item.q.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
                item.a.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
                item.categoryLabel.toLowerCase().includes(faqSearchQuery.toLowerCase());
              return matchCat && matchSearch;
            })
            .map((item) => {
              const isExpanded = expandedFaqId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'bg-emerald-50/25 border-[#006130]/40 shadow-xs'
                      : 'bg-white border-[#becabd]/60 hover:border-[#becabd]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaqId(isExpanded ? null : item.id)}
                    className="w-full text-left p-4 sm:p-4.5 flex items-start justify-between gap-3.5 cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-[#006130]/10 text-[#006130] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        Q
                      </span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#006130] block mb-0.5">
                          {item.categoryLabel}
                        </span>
                        <h4 className="font-bold text-xs sm:text-sm text-[#1a1c1c] leading-snug">
                          {item.q}
                        </h4>
                      </div>
                    </div>
                    <span
                      className={`material-symbols-outlined text-xl text-[#6f7a6f] shrink-0 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-[#006130]' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 sm:px-5 pb-5 pt-2 text-xs text-[#3f4940] border-t border-[#006130]/10 flex items-start gap-3 bg-white/80">
                          <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            A
                          </span>
                          <div className="leading-relaxed whitespace-pre-line text-xs sm:text-[13px] text-[#2c342c] font-normal">
                            {item.a}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
        </div>
      </div>

      {/* Security & Privacy Commitment Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-sm border border-slate-700">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Keamanan & Privasi Data Tabungan Terjamin</span>
              <span className="px-2 py-0.2 rounded-full bg-emerald-900/60 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                Data Protected
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Sistem Tabungan Pintar menjaga integritas seluruh data transaksi keuangan sekolah secara ketat. Tidak ada alamat IP server internal yang ditampilkan kepada publik. PIN dan informasi sensitif murid terproteksi dengan isolasi otentikasi peran (RBAC) dan enkripsi standar perbankan.
            </p>
          </div>
        </div>
      </div>

      {/* Official Helpdesk & Support Card */}
      <div className="bg-[#ffffff] rounded-2xl p-5 sm:p-6 border border-[#becabd]/70 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#006130]/10 text-[#006130] material-symbols-outlined text-base">
                support_agent
              </span>
              <h4 className="text-sm font-black text-[#1a1c1c]">Butuh Bantuan Langsung dari Pengembang?</h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006130] text-[10px] font-extrabold">
                {APP_BRAND_NAME} • {APP_VERSION}
              </span>
            </div>
            <p className="text-xs text-[#3f4940] mt-1">
              Tim helpdesk siap membantu kendala operasional kasir, reset akun bendahara, maupun ekspor laporan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <a
              href={APP_HELPDESK_WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
              <span>WhatsApp: {APP_HELPDESK_PHONE}</span>
            </a>
            <a
              href={`mailto:${APP_HELPDESK_EMAIL}?subject=Helpdesk%20TABSI`}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-[#005db5]">mail</span>
              <span>{APP_HELPDESK_EMAIL}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
