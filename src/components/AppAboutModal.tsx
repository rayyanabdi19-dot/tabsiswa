import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TabsiLogo } from './TabsiLogo';

export const APP_VERSION = 'v2.5.0 Enterprise';
export const APP_RELEASE_DATE = 'September 2026';
export const APP_BRAND_NAME = 'TABSI by MD2R';
export const APP_HELPDESK_EMAIL = 'digitalserviceprint.io@gmail.com';
export const APP_HELPDESK_PHONE = '082186371356';
export const APP_HELPDESK_WA_URL = 'https://wa.me/6282186371356?text=Halo%20Tim%20Helpdesk%20TABSI%20MD2R,%20saya%20butuh%20bantuan%20terkait%20aplikasi%20tabungan%20siswa.';

interface AppAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppAboutModal: React.FC<AppAboutModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'about' | 'qa' | 'helpdesk' | 'features'>('about');
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const FAQ_ITEMS = [
    {
      id: 0,
      category: 'saldo',
      question: 'Bagaimana cara kerja sistem pembagian saldo 80% dan 20%?',
      answer: 'Setiap kali siswa menabung, TABSI secara otomatis membagi saldo menjadi dua pos dana cerdas:\n• 80% Saldo Likuid (Bisa Ditarik): Dana fleksibel yang dapat ditarik oleh siswa/orang tua sewaktu-waktu untuk kebutuhan sekolah harian.\n• 20% Saldo Terkunci (Cadangan): Dana proteksi yang disimpan khusus sebagai tabungan akhir semester, kelulusan, atau kebutuhan darurat dengan otorisasi bendahara.',
    },
    {
      id: 1,
      category: 'login',
      question: 'Bagaimana jika siswa atau wali murid lupa PIN 6-digit untuk login?',
      answer: 'Siswa atau wali murid dapat menghubungi Bendahara/Wali Kelas. Bendahara dapat membuka menu "Data Siswa" -> klik siswa terkait -> buka tab "Pengaturan PIN Siswa" untuk melihat PIN, mereset ke default (123456), membuat PIN acak baru, atau langsung membagikan format kredensial via WhatsApp.',
    },
    {
      id: 2,
      category: 'kasir',
      question: 'Bagaimana cara melakukan transaksi setor dan tarik tunai di kasir?',
      answer: 'Buka menu "Kasir Transaksi" (atau tombol Cepat Setor/Tarik di dashboard). Cari nama/NISN siswa, pilih opsi Setor atau Tarik, masukkan nominal, dan pilih metode (Tunai/Transfer). Sistem langsung memperbarui saldo siswa, memverifikasi batas saldo tarik, dan menyediakan opsi Cetak Struk/Kuitansi.',
    },
    {
      id: 3,
      category: 'laporan',
      question: 'Bagaimana cara membagikan bukti transaksi ke WhatsApp orang tua?',
      answer: 'Setelah transaksi tersimpan di kasir atau dari daftar riwayat transaksi, klik tombol "Format WhatsApp" (ikon WA). Sistem akan menyusun draf pesan resmi lengkap dengan nomor kuitansi, tanggal, nominal, saldo akhir (likuid & terkunci), dan nama bendahara sekolah yang siap dikirim.',
    },
    {
      id: 4,
      category: 'keamanan',
      question: 'Apakah data tabungan sekolah aman dan bagaimana cara mencadangkannya?',
      answer: 'Sangat aman. TABSI menerapkan sistem isolasi data kasir (*workspace data isolation*). Untuk mengantisipasi perangkat rusak atau pergantian laptop, gunakan fitur "Backup & Restore" di menu Pengaturan. Aplikasi juga memberikan notifikasi pengingat unduh backup JSON setiap 1 minggu sekali.',
    },
    {
      id: 5,
      category: 'laporan',
      question: 'Bagaimana cara mencetak buku tabungan dan laporan pembukuan PDF?',
      answer: 'Buka menu "Laporan Keuangan", pilih jenis laporan (Rekap Transaksi Kasir, Mutasi Per Kelas, atau Buku Tabungan Fisik Siswa), tentukan filter tanggal, lalu klik tombol "Cetak PDF (A4)". Dokumen sudah terformat standar resmi dengan Kop Surat Sekolah dan kolom tanda tangan bendahara.',
    },
    {
      id: 6,
      category: 'kasir',
      question: 'Bagaimana cara menambahkan siswa baru atau impor massal dari Excel?',
      answer: 'Buka menu "Data Siswa", lalu klik tombol "+ Tambah Siswa" untuk input manual satu per satu, atau klik "Impor Siswa (CSV/Excel)" untuk mengunggah berkas daftar siswa secara serentak.',
    },
    {
      id: 7,
      category: 'helpdesk',
      question: 'Bagaimana cara menghubungi tim helpdesk jika menemui kendala teknis?',
      answer: 'Tim Helpdesk resmi TABSI by MD2R siap melayani setiap hari kerja (Senin - Sabtu, 08.00 - 17.00 WIB) melalui WhatsApp di 082186371356 atau email di digitalserviceprint.io@gmail.com.',
    },
  ];

  const filteredFaq = FAQ_ITEMS.filter((item) => {
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchQuery =
      item.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      item.answer.toLowerCase().includes(faqSearch.toLowerCase());
    return matchCategory && matchQuery;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="bg-[#ffffff] rounded-2xl sm:rounded-3xl border border-[#becabd]/80 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Branding */}
        <div className="bg-gradient-to-br from-[#006130] via-[#004d26] to-[#00381b] p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>

          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-white rounded-2xl shadow-md shrink-0">
              <TabsiLogo size="md" variant="modern" showByline={true} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                  Aplikasi Resmi
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black backdrop-blur-xs">
                  {APP_VERSION}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Tabungan Pintar Siswa (TABSI)
              </h3>
              <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                Solusi Manajemen Finansial &amp; Edukasi Gemar Menabung Sekolah
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#becabd]/60 bg-[#faf9f8] px-4 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'about'
                ? 'border-[#006130] text-[#006130]'
                : 'border-transparent text-[#3f4940] hover:text-[#1a1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-base">info</span>
            <span>Tentang Aplikasi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'qa'
                ? 'border-[#006130] text-[#006130]'
                : 'border-transparent text-[#3f4940] hover:text-[#1a1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-base">quiz</span>
            <span>Tanya Jawab (Q&amp;A)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#006130]/10 text-[#006130] text-[9px] font-black">
              {FAQ_ITEMS.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('helpdesk')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'helpdesk'
                ? 'border-[#006130] text-[#006130]'
                : 'border-transparent text-[#3f4940] hover:text-[#1a1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-base">support_agent</span>
            <span>Helpdesk &amp; Layanan Bantuan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'features'
                ? 'border-[#006130] text-[#006130]'
                : 'border-transparent text-[#3f4940] hover:text-[#1a1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-base">verified</span>
            <span>Fitur Unggulan</span>
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-[#1a1c1c]">
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="bg-[#f4f3f2] p-4 rounded-2xl border border-[#becabd]/50 leading-relaxed">
                <p className="font-semibold text-sm text-[#1a1c1c] mb-1">
                  Membangun Karakter Generasi Gemar Menabung
                </p>
                <p className="text-xs text-[#3f4940]">
                  <strong>TABSI (Tabungan Pintar Siswa)</strong> adalah platform modern digitalisasi kas tabungan sekolah yang dirancang khusus untuk memudahkan bendahara/wali kelas dalam mengelola simpanan siswa secara transparan, akurat, dan dapat dipantau oleh wali murid secara real-time.
                </p>
              </div>

              {/* Version & Metadata Specification Table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-3 rounded-xl bg-white border border-[#becabd]/60 shadow-2xs">
                  <span className="text-[#6f7a6f] block font-semibold text-[10px]">VERSI APLIKASI</span>
                  <span className="font-black text-[#006130] text-xs">{APP_VERSION}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#becabd]/60 shadow-2xs">
                  <span className="text-[#6f7a6f] block font-semibold text-[10px]">BRAND &amp; PENGEMBANG</span>
                  <span className="font-black text-[#005db5] text-xs">MD2R Digital</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#becabd]/60 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-[#6f7a6f] block font-semibold text-[10px]">RILIS TERBARU</span>
                  <span className="font-black text-[#1a1c1c] text-xs">{APP_RELEASE_DATE}</span>
                </div>
              </div>

              {/* Security and Integrity Specs */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#006130]">
                  <span className="material-symbols-outlined text-sm">shield</span>
                  <span>Integritas &amp; Keamanan Data Kas</span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Data tabungan diproteksi dengan isolasi data tingkat sekolah (*workspace isolation*), sistem pembagian saldo likuid 80% dan kunci 20%, verifikasi PIN 6-digit siswa, serta pencadangan berkala otomatis.
                </p>
              </div>
            </div>
          )}

          {/* Q&A / FAQ TAB */}
          {activeTab === 'qa' && (
            <div className="space-y-3.5">
              {/* Search & Category Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6f7a6f]">
                    search
                  </span>
                  <input
                    type="text"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Cari pertanyaan (misal: saldo, PIN, backup, WhatsApp, kuitansi)..."
                    className="w-full pl-9 pr-8 py-2 bg-[#f4f3f2] rounded-xl border border-[#becabd]/70 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006130]"
                  />
                  {faqSearch && (
                    <button
                      onClick={() => setFaqSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6f7a6f] hover:text-[#1a1c1c] text-xs"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
                  {[
                    { id: 'all', label: 'Semua Topik' },
                    { id: 'saldo', label: 'Saldo 80/20' },
                    { id: 'login', label: 'Login & PIN' },
                    { id: 'kasir', label: 'Kasir & Setoran' },
                    { id: 'laporan', label: 'Laporan & WA' },
                    { id: 'keamanan', label: 'Keamanan' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-[#006130] text-white shadow-2xs'
                          : 'bg-[#faf9f8] text-[#3f4940] hover:bg-[#e9e8e7] border border-[#becabd]/60'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accordion Questions List */}
              <div className="space-y-2">
                {filteredFaq.length > 0 ? (
                  filteredFaq.map((item) => {
                    const isExpanded = expandedFaq === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                          isExpanded
                            ? 'bg-emerald-50/30 border-[#006130]/40 shadow-xs'
                            : 'bg-white border-[#becabd]/60 hover:border-[#becabd]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(isExpanded ? null : item.id)}
                          className="w-full text-left p-3.5 flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-[#006130]/10 text-[#006130] font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              Q
                            </span>
                            <span className="font-bold text-xs text-[#1a1c1c] leading-snug">
                              {item.question}
                            </span>
                          </div>
                          <span
                            className={`material-symbols-outlined text-base text-[#6f7a6f] shrink-0 transition-transform duration-200 ${
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
                              transition={{ duration: 0.18 }}
                            >
                              <div className="px-3.5 pb-3.5 pt-1 text-xs text-[#3f4940] border-t border-[#006130]/10 flex items-start gap-2 bg-white/70">
                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                  A
                                </span>
                                <div className="leading-relaxed whitespace-pre-line text-[11px] text-[#2c342c]">
                                  {item.answer}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center bg-[#faf9f8] rounded-xl border border-dashed border-[#becabd]">
                    <span className="material-symbols-outlined text-2xl text-[#6f7a6f] mb-1">help_center</span>
                    <p className="font-bold text-xs text-[#1a1c1c]">Pertanyaan Tidak Ditemukan</p>
                    <p className="text-[11px] text-[#6f7a6f] mt-0.5">
                      Silakan hubungi helpdesk WhatsApp kami jika membutuhkan bantuan lebih lanjut.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Quick Help Banner */}
              <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2 text-emerald-950 font-medium">
                  <span className="material-symbols-outlined text-base text-emerald-700">support_agent</span>
                  <span>Punya pertanyaan lain yang belum terjawab?</span>
                </div>
                <a
                  href={APP_HELPDESK_WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[10px] hover:bg-emerald-800 transition-colors shrink-0 shadow-2xs"
                >
                  Tanya di WA
                </a>
              </div>
            </div>
          )}

          {activeTab === 'helpdesk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-200 text-blue-950">
                <div className="flex items-center gap-2 font-black text-sm text-[#005db5] mb-1">
                  <span className="material-symbols-outlined">headset_mic</span>
                  <span>Pusat Bantuan &amp; Helpdesk 24/7</span>
                </div>
                <p className="text-xs text-blue-900 leading-relaxed">
                  Apabila Anda memerlukan panduan penggunaan, integrasi database, aktivasi akun bendahara, atau kendala teknis lainnya, silakan hubungi tim helpdesk resmi kami:
                </p>
              </div>

              {/* Direct Contact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* WhatsApp Helpdesk */}
                <a
                  href={APP_HELPDESK_WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-2 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">chat</span>
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                        Fast Response
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800 font-semibold">Kontak WhatsApp Helpdesk</div>
                    <div className="text-sm font-black text-emerald-950 mt-0.5">{APP_HELPDESK_PHONE}</div>
                    <p className="text-[10px] text-emerald-700 mt-1">Konsultasi cepat via chat WhatsApp</p>
                  </div>
                  <div className="mt-3 text-xs font-bold text-emerald-800 group-hover:text-emerald-900 flex items-center gap-1">
                    <span>Chat Sekarang</span>
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </a>

                {/* Email Helpdesk */}
                <a
                  href={`mailto:${APP_HELPDESK_EMAIL}?subject=Pertanyaan%20Aplikasi%20TABSI%20MD2R`}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-2 rounded-xl bg-[#005db5] text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">mail</span>
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        Email Resmi
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-semibold">Email Layanan Helpdesk</div>
                    <div className="text-xs font-black text-slate-900 mt-0.5 break-all">{APP_HELPDESK_EMAIL}</div>
                    <p className="text-[10px] text-slate-500 mt-1">Dukungan dokumen &amp; kerjasama instansi</p>
                  </div>
                  <div className="mt-3 text-xs font-bold text-[#005db5] group-hover:text-[#004a93] flex items-center gap-1">
                    <span>Kirim Email</span>
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </a>
              </div>

              {/* Service Level Agreement info */}
              <div className="p-3 bg-[#faf9f8] rounded-xl border border-[#becabd]/40 text-[11px] text-[#6f7a6f] flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#006130]">schedule</span>
                <span>Jam Operasional Bantuan: <strong>Senin - Sabtu (08.00 - 17.00 WIB)</strong></span>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-2.5">
              {[
                { title: 'Kasir Setor & Tarik Instan', desc: 'Pencatatan kasir cepat dengan cetak struk dan format notifikasi WhatsApp.', icon: 'point_of_sale' },
                { title: 'Sistem Saldo 80/20 Smart Lock', desc: '80% saldo fleksibel ditarik kapan saja dan 20% terkunci untuk cadangan kelulusan.', icon: 'lock_open' },
                { title: 'Portal Siswa & Orang Tua', desc: 'Login mandiri dengan NISN dan PIN 6 digit untuk memantau tabungan real-time.', icon: 'badge' },
                { title: 'Laporan Rekapitulasi PDF Resmi', desc: 'Cetak pembukuan A4 standar kop surat per kelas, periode, atau mutasi keseluruhan.', icon: 'picture_as_pdf' },
                { title: 'Backup & Restore Mingguan', desc: 'Proteksi data dengan pengingat backup 1 minggu 1 kali dan ekspor berkas JSON.', icon: 'settings_backup_restore' },
              ].map((f, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-[#faf9f8] border border-[#becabd]/40">
                  <span className="p-2 rounded-lg bg-[#006130]/10 text-[#006130] material-symbols-outlined text-base shrink-0 mt-0.5">
                    {f.icon}
                  </span>
                  <div>
                    <h5 className="font-bold text-xs text-[#1a1c1c]">{f.title}</h5>
                    <p className="text-[11px] text-[#3f4940] mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info in Modal */}
        <div className="bg-[#f4f3f2] p-4 border-t border-[#becabd]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#6f7a6f] text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{APP_BRAND_NAME} • {APP_VERSION}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={APP_HELPDESK_WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#006130] text-white font-bold text-xs hover:bg-[#107c41] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
              <span>Hubungi WA</span>
            </a>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-[#becabd]/80 hover:bg-[#e9e8e7] text-[#1a1c1c] font-bold text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
