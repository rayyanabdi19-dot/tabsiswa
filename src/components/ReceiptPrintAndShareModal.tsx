import React, { useState } from 'react';
import { SchoolInfo, WhatsAppReceiptPayload } from '../types';
import { formatRupiah, terbilang } from '../utils/formatters';
import { exportReceiptToPDF, ReceiptPrinterType } from '../utils/pdfGenerator';
import { showToast } from './Toast';

interface ReceiptPrintAndShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: WhatsAppReceiptPayload | null;
  schoolInfo?: SchoolInfo;
}

export const ReceiptPrintAndShareModal: React.FC<ReceiptPrintAndShareModalProps> = ({
  isOpen,
  onClose,
  payload,
  schoolInfo,
}) => {
  if (!isOpen || !payload) return null;

  const [activeTab, setActiveTab] = useState<'receipt' | 'whatsapp'>('receipt');
  const [printerType, setPrinterType] = useState<ReceiptPrinterType>('thermal_80mm');
  const [phone, setPhone] = useState(payload.guardianPhone || '');
  const [customNote, setCustomNote] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const school: SchoolInfo = schoolInfo || {
    name: payload.schoolName || 'SMA BINTANG GEMILANG',
    address: 'Jl. Merdeka Belajar No. 45, Jakarta Pusat',
    phone: '(021) 7890-1234',
    email: 'info@bintanggemilang.sch.id',
    principalName: 'Drs. H. Bambang Subagyo, M.Pd.',
    treasurerName: payload.adminName || 'Siti Rahmawati, S.E.',
    logoUrl: '',
  };

  const isDeposit = payload.type === 'deposit';
  const typeLabel = isDeposit ? 'SETORAN TABUNGAN' : 'PENARIKAN KAS';
  const typeBadgeColor = isDeposit ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white';
  const usablePercentage = payload.usablePercentage ?? 80;
  const lockedPercentage = payload.lockedPercentage ?? 20;

  // Sanitize phone number to international format 62...
  const formatPhoneNumber = (input: string) => {
    let cleaned = input.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  };

  // Generate clean WhatsApp message
  const generateWhatsAppMessage = () => {
    const mutationIcon = isDeposit ? '🟢 *SETORAN TABUNGAN (+)*' : '🔴 *PENARIKAN KAS TABUNGAN (-)*';
    return (
      `*BUKTI TRANSAKSI TABUNGAN SISWA (TABSI)*\n` +
      `*${school.name.toUpperCase()}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Yth. Bapak/Ibu Wali Murid dari *${payload.studentName}*,\n\n` +
      `Berikut adalah rincian transaksi tabungan sekolah yang baru saja dicatat:\n\n` +
      `📄 *No. Transaksi:* \`${payload.transactionId}\`\n` +
      `⏰ *Waktu:* ${payload.date} ${payload.time ? `(${payload.time.replace(/Hari ini,\s*/i, '')})` : ''}\n` +
      `👤 *Nama Siswa:* ${payload.studentName}\n` +
      `🆔 *NISN/NIS:* ${payload.studentNisn}\n` +
      `🏫 *Kelas:* ${payload.className}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *Jenis Mutasi:* ${mutationIcon}\n` +
      `💰 *Nominal Transaksi:* *${formatRupiah(payload.amount)}*\n` +
      `🔤 *Terbilang:* _${terbilang(payload.amount)}_\n` +
      `📝 *Keterangan:* ${payload.notes || (isDeposit ? 'Setoran Tabungan Siswa' : `Penarikan Kas Siswa (Maks ${usablePercentage}%)`)}\n` +
      (customNote ? `💬 *Catatan Khusus:* ${customNote}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 *POSISI SALDO TERKINI:*\n` +
      `• *Total Saldo:* ${formatRupiah(payload.totalBalance)}\n` +
      `• *Saldo Bisa Dipakai (${usablePercentage}%):* ${formatRupiah(payload.availableBalance)}\n` +
      `• *Saldo Terkunci Wajib (${lockedPercentage}%):* ${formatRupiah(payload.lockedBalance)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Petugas Kasir: *${payload.adminName}*\n\n` +
      `_Simpan pesan ini sebagai bukti transaksi resmi yang sah._\n` +
      `_Sistem Tabungan Siswa Pintar (TABSI) by MD2R._`
    );
  };

  const handleSendWhatsApp = () => {
    const targetPhone = formatPhoneNumber(phone);
    if (!targetPhone || targetPhone.length < 9) {
      showToast('Nomor WA Tidak Valid', 'Harap masukkan nomor WhatsApp yang benar (contoh: 08123456789).', 'error');
      return;
    }

    const message = generateWhatsAppMessage();
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${targetPhone}?text=${encoded}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showToast('Membuka WhatsApp', `Mengirim bukti transaksi ke nomor +${targetPhone}...`);
  };

  const handleCopyWhatsAppMessage = () => {
    const message = generateWhatsAppMessage();
    navigator.clipboard.writeText(message);
    showToast('Tersalin ke Clipboard', 'Format pesan struk WhatsApp berhasil disalin.');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    setIsExportingPDF(true);
    try {
      exportReceiptToPDF(
        {
          transactionId: payload.transactionId,
          studentName: payload.studentName,
          studentNisn: payload.studentNisn,
          className: payload.className,
          guardianName: payload.guardianName,
          guardianPhone: payload.guardianPhone,
          type: payload.type,
          amount: payload.amount,
          date: payload.date,
          time: payload.time,
          notes: payload.notes,
          totalBalance: payload.totalBalance,
          availableBalance: payload.availableBalance,
          lockedBalance: payload.lockedBalance,
          adminName: payload.adminName,
          schoolName: school.name,
        },
        printerType,
        school
      );
      showToast('PDF Struk Berhasil Dibuat', `Struk format ${printerType.replace('_', ' ').toUpperCase()} telah diunduh.`);
    } catch (e: any) {
      showToast('Gagal Buat PDF', e.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-300 flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-[#006130] to-[#107c41] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 text-white shrink-0">
              <span className="material-symbols-outlined text-2xl font-bold">receipt_long</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-tight">
                Struk &amp; Kuitansi Transaksi
              </h3>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                Support printer thermal (58/80mm), printer biasa (A4/A5), &amp; WhatsApp orang tua
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Navigation Tabs (Struk Printer vs Kirim WhatsApp) */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('receipt')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'receipt'
                ? 'border-[#006130] text-[#006130] bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>Cetak Struk Printer</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'border-[#25D366] text-emerald-800 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base text-[#25D366]">chat</span>
            <span>Kirim WhatsApp Orang Tua</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {activeTab === 'receipt' && (
            <div className="space-y-4">
              {/* Printer Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#006130]">tune</span>
                    <span>Pilih Jenis &amp; Ukuran Printer:</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Otomatis menyesuaikan tata letak cetak
                  </span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Thermal 58mm */}
                  <button
                    type="button"
                    onClick={() => setPrinterType('thermal_58mm')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      printerType === 'thermal_58mm'
                        ? 'border-[#006130] bg-[#006130]/10 ring-2 ring-[#006130]/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg text-slate-700">receipt</span>
                      <span className="text-xs font-extrabold text-slate-800">Thermal 58mm</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">POS Bluetooth / Mini</span>
                  </button>

                  {/* Thermal 80mm */}
                  <button
                    type="button"
                    onClick={() => setPrinterType('thermal_80mm')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      printerType === 'thermal_80mm'
                        ? 'border-[#006130] bg-[#006130]/10 ring-2 ring-[#006130]/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg text-[#006130]">point_of_sale</span>
                      <span className="text-xs font-extrabold text-slate-800">Thermal 80mm</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">Kasir Kas Standar</span>
                  </button>

                  {/* Regular A4 */}
                  <button
                    type="button"
                    onClick={() => setPrinterType('regular_a4')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      printerType === 'regular_a4'
                        ? 'border-[#006130] bg-[#006130]/10 ring-2 ring-[#006130]/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg text-blue-600">article</span>
                      <span className="text-xs font-extrabold text-slate-800">Biasa (A4)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">Kuitansi Dokumen Resmi</span>
                  </button>

                  {/* Regular A5 */}
                  <button
                    type="button"
                    onClick={() => setPrinterType('regular_a5')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      printerType === 'regular_a5'
                        ? 'border-[#006130] bg-[#006130]/10 ring-2 ring-[#006130]/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg text-indigo-600">description</span>
                      <span className="text-xs font-extrabold text-slate-800">Biasa (A5)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">Format Ringkas Hemat</span>
                  </button>
                </div>
              </div>

              {/* Visual Live Preview of Selected Printer Struk */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Pratinjau Struk Sesuai Kertas Printer:</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {printerType === 'thermal_58mm' && 'Lebar Kertas Roll: 58 mm'}
                    {printerType === 'thermal_80mm' && 'Lebar Kertas Roll: 80 mm'}
                    {printerType === 'regular_a4' && 'Ukuran Kertas: A4 (210 x 297 mm)'}
                    {printerType === 'regular_a5' && 'Ukuran Kertas: A5 Landscape (210 x 148 mm)'}
                  </span>
                </div>

                {/* Printable container with ID for window.print */}
                <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex justify-center items-center overflow-x-auto">
                  <div
                    id="receipt-print-area"
                    className={`bg-white shadow-md border border-slate-300 text-slate-900 transition-all ${
                      printerType === 'thermal_58mm'
                        ? 'w-[230px] p-3 text-[11px] font-mono leading-tight rounded-md'
                        : printerType === 'thermal_80mm'
                        ? 'w-[320px] p-4 text-xs font-mono leading-normal rounded-lg'
                        : printerType === 'regular_a5'
                        ? 'w-full max-w-xl p-5 text-xs font-sans rounded-xl'
                        : 'w-full max-w-xl p-6 text-xs font-sans rounded-xl'
                    }`}
                  >
                    {/* THERMAL 58MM FORMAT */}
                    {printerType === 'thermal_58mm' && (
                      <div className="space-y-2 text-center">
                        <div className="font-bold text-xs uppercase">{school.name}</div>
                        <div className="text-[9px] text-slate-600">TABUNGAN SISWA PINTAR</div>
                        <div className="text-[9px] text-slate-500">{school.phone}</div>
                        <div className="border-b border-dashed border-slate-400 my-1.5"></div>
                        <div className="font-black text-xs uppercase tracking-wider">{typeLabel}</div>
                        <div className="border-b border-dashed border-slate-400 my-1.5"></div>
                        
                        <div className="text-left space-y-0.5 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">No.Tx:</span>
                            <span className="font-bold">{payload.transactionId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Waktu:</span>
                            <span>{payload.date}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Kasir:</span>
                            <span className="truncate max-w-[120px]">{payload.adminName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Siswa:</span>
                            <span className="font-bold truncate max-w-[120px]">{payload.studentName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">NISN:</span>
                            <span>{payload.studentNisn} ({payload.className})</span>
                          </div>
                        </div>

                        <div className="border-b border-dashed border-slate-400 my-1.5"></div>

                        <div className="text-left space-y-1">
                          <div className="text-[10px] text-slate-500">NOMINAL TRANSAKSI:</div>
                          <div className="text-sm font-black text-slate-900">{formatRupiah(payload.amount)}</div>
                          {payload.notes && (
                            <div className="text-[9px] text-slate-600 italic">Ket: {payload.notes}</div>
                          )}
                        </div>

                        <div className="border-b border-dashed border-slate-400 my-1.5"></div>

                        <div className="text-left space-y-0.5 text-[10px]">
                          <div className="flex justify-between font-bold">
                            <span>TOTAL SALDO:</span>
                            <span>{formatRupiah(payload.totalBalance)}</span>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-600">
                            <span>- Bisa Ditarik ({usablePercentage}%):</span>
                            <span>{formatRupiah(payload.availableBalance)}</span>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-600">
                            <span>- Terkunci ({lockedPercentage}%):</span>
                            <span>{formatRupiah(payload.lockedBalance)}</span>
                          </div>
                        </div>

                        <div className="border-b border-dashed border-slate-400 my-1.5"></div>
                        <div className="text-[9px] text-slate-500 pt-1">Simpan struk ini sebagai bukti sah.</div>
                        <div className="text-[9px] font-bold text-slate-700">** TABSI by MD2R **</div>
                      </div>
                    )}

                    {/* THERMAL 80MM FORMAT */}
                    {printerType === 'thermal_80mm' && (
                      <div className="space-y-2.5 text-center">
                        <div>
                          <div className="font-extrabold text-sm uppercase text-[#006130]">{school.name}</div>
                          <div className="text-[10px] text-slate-600">SISTEM TABUNGAN SISWA PINTAR (TABSI)</div>
                          <div className="text-[9px] text-slate-500">{school.address} • Telp: {school.phone}</div>
                        </div>

                        <div className="border-b-2 border-slate-800 my-2"></div>

                        <div className="inline-block px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-900 text-white">
                          STRUK BUKTI {typeLabel}
                        </div>

                        <div className="text-left space-y-1 text-xs pt-1">
                          <div className="flex justify-between border-b border-slate-200 pb-0.5">
                            <span className="text-slate-500">No. Transaksi:</span>
                            <span className="font-bold font-mono">{payload.transactionId}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-0.5">
                            <span className="text-slate-500">Tanggal/Waktu:</span>
                            <span>{payload.date} {payload.time ? payload.time.replace(/Hari ini,\s*/i, '') : ''}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-0.5">
                            <span className="text-slate-500">Petugas Kasir:</span>
                            <span>{payload.adminName}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-0.5">
                            <span className="text-slate-500">Nama Siswa:</span>
                            <span className="font-bold text-slate-900">{payload.studentName}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-0.5">
                            <span className="text-slate-500">NISN / Kelas:</span>
                            <span className="font-mono">{payload.studentNisn} ({payload.className})</span>
                          </div>
                        </div>

                        {/* Amount Box */}
                        <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-left space-y-1">
                          <div className="text-[10px] font-bold text-slate-600 uppercase">
                            {isDeposit ? 'JUMLAH SETORAN (+)' : 'JUMLAH PENARIKAN (-)'}
                          </div>
                          <div className="text-base font-black text-slate-900">
                            {formatRupiah(payload.amount)}
                          </div>
                          <div className="text-[10px] text-slate-600 italic">
                            Terbilang: {terbilang(payload.amount)}
                          </div>
                        </div>

                        {/* Balance Breakdown */}
                        <div className="text-left space-y-1 text-xs pt-1">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>TOTAL SALDO BARU:</span>
                            <span>{formatRupiah(payload.totalBalance)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-emerald-800">
                            <span>• Saldo Bisa Ditarik ({usablePercentage}%):</span>
                            <span className="font-bold">{formatRupiah(payload.availableBalance)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-rose-800">
                            <span>• Saldo Terkunci Wajib ({lockedPercentage}%):</span>
                            <span className="font-bold">{formatRupiah(payload.lockedBalance)}</span>
                          </div>
                        </div>

                        <div className="border-b border-dashed border-slate-400 my-2"></div>

                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          <div>Simpan bukti ini sebagai tanda terima sah tabungan.</div>
                          <div>Helpdesk WA: 0821-8637-1356 | TABSI by MD2R</div>
                        </div>
                      </div>
                    )}

                    {/* REGULAR A4 & A5 FORMAT */}
                    {(printerType === 'regular_a4' || printerType === 'regular_a5') && (
                      <div className="space-y-4">
                        {/* Kop Surat Resmi */}
                        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[#006130] text-white flex items-center justify-center font-black text-lg">
                              TS
                            </div>
                            <div>
                              <h2 className="font-black text-sm sm:text-base text-slate-900 uppercase tracking-tight">
                                {school.name}
                              </h2>
                              <p className="text-[11px] text-slate-600 leading-tight">
                                {school.address}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Telp: {school.phone} | Email: {school.email}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${typeBadgeColor}`}>
                              {typeLabel}
                            </span>
                            <div className="text-[10px] font-mono text-slate-500 mt-1">
                              Ref: {payload.transactionId}
                            </div>
                          </div>
                        </div>

                        {/* Judul Kuitansi */}
                        <div className="text-center py-1">
                          <h3 className="font-black text-xs sm:text-sm uppercase text-slate-900 tracking-wide">
                            KUITANSI BUKTI {typeLabel}
                          </h3>
                          <p className="text-[10px] text-slate-500">
                            Waktu Transaksi: {payload.date} {payload.time ? `(${payload.time})` : ''}
                          </p>
                        </div>

                        {/* Tabel Data & Rincian */}
                        <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
                          <tbody className="divide-y divide-slate-200">
                            <tr className="bg-slate-50">
                              <td className="p-2 font-bold text-slate-700 w-1/3">Nama Siswa</td>
                              <td className="p-2 font-extrabold text-slate-900">{payload.studentName}</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-bold text-slate-700">NISN / Kelas</td>
                              <td className="p-2 font-mono">{payload.studentNisn} — Kelas {payload.className}</td>
                            </tr>
                            <tr className="bg-slate-50">
                              <td className="p-2 font-bold text-slate-700">Wali Murid / No. HP</td>
                              <td className="p-2">{payload.guardianName || '-'} ({payload.guardianPhone || '-'})</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-bold text-slate-700">Nominal Transaksi</td>
                              <td className="p-2">
                                <span className="font-black text-sm text-[#006130]">{formatRupiah(payload.amount)}</span>
                                <div className="text-[10px] text-slate-500 italic mt-0.5">
                                  Terbilang: {terbilang(payload.amount)}
                                </div>
                              </td>
                            </tr>
                            <tr className="bg-slate-50">
                              <td className="p-2 font-bold text-slate-700">Keterangan Transaksi</td>
                              <td className="p-2">{payload.notes || (isDeposit ? 'Setoran Tabungan Siswa' : 'Penarikan Kas Siswa')}</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-bold text-slate-700">Posisi Saldo Terkini</td>
                              <td className="p-2 space-y-0.5">
                                <div className="font-bold text-slate-900">Total: {formatRupiah(payload.totalBalance)}</div>
                                <div className="text-[11px] text-emerald-700 font-semibold">
                                  • Saldo Bisa Digunakan ({usablePercentage}%): {formatRupiah(payload.availableBalance)}
                                </div>
                                <div className="text-[11px] text-rose-700 font-semibold">
                                  • Dana Cadangan Terkunci ({lockedPercentage}%): {formatRupiah(payload.lockedBalance)}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Dual Tanda Tangan */}
                        <div className="grid grid-cols-2 gap-6 pt-4 text-center text-xs">
                          <div>
                            <p className="text-slate-600 text-[11px]">Penyetor / Wali Murid,</p>
                            <div className="h-14"></div>
                            <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[140px]">
                              {payload.guardianName || payload.studentName}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-600 text-[11px]">
                              Petugas Kasir / Bendahara,
                            </p>
                            <div className="h-14 flex items-center justify-center">
                              <span className="text-[10px] font-black text-[#006130] border border-[#006130] px-2 py-0.5 rounded uppercase tracking-wider rotate-[-6deg] opacity-75">
                                TERVERIFIKASI
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[140px]">
                              {payload.adminName}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              {/* WhatsApp Quick Summary Card */}
              <div className="p-3.5 rounded-2xl bg-[#faf9f8] border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs ${
                      isDeposit ? 'bg-[#006130]' : 'bg-[#ba1a1a]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isDeposit ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{payload.studentName}</div>
                    <div className="text-[11px] text-slate-500">
                      {payload.className} • NISN: {payload.studentNisn}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-black ${
                      isDeposit ? 'text-[#006130]' : 'text-[#ba1a1a]'
                    }`}
                  >
                    {isDeposit ? '+' : '-'} {formatRupiah(payload.amount)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">{payload.date}</div>
                </div>
              </div>

              {/* Recipient Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Nomor WhatsApp Wali Murid / Orang Tua:</span>
                  <span className="text-[11px] font-normal text-[#006130]">
                    {payload.guardianName ? `Wali: ${payload.guardianName}` : 'Format: 08... atau 628...'}
                  </span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                    phone_android
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#006130] focus:bg-white"
                  />
                </div>
              </div>

              {/* Optional Custom Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Catatan Tambahan untuk Orang Tua (Opsional):</label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Contoh: Titipan uang saku dari Ibu / Tabungan bulanan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#006130] focus:bg-white"
                />
              </div>

              {/* Live Preview WhatsApp Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#25D366]">chat</span>
                    <span>Draf Pesan WhatsApp Real-Time:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppMessage}
                    className="text-[11px] font-bold text-[#006130] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">content_copy</span>
                    <span>Salin Pesan</span>
                  </button>
                </div>
                <div className="p-3.5 bg-[#dcf8c6]/30 border border-[#25D366]/30 rounded-2xl text-[11px] text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
                  {generateWhatsAppMessage()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'receipt' ? (
              <>
                {/* Download PDF Button */}
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isExportingPDF}
                  className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base text-rose-600">picture_as_pdf</span>
                  <span>{isExportingPDF ? 'Membuat PDF...' : 'Unduh PDF Struk'}</span>
                </button>

                {/* Print Direct Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-[#006130] hover:bg-[#107c41] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  <span>Cetak Struk Sekarang</span>
                </button>

                {/* Switch to WA Button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('whatsapp')}
                  className="px-3.5 py-2 bg-[#25D366] hover:bg-[#1ebd59] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>Kirim WhatsApp</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCopyWhatsAppMessage}
                  className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base text-slate-600">content_copy</span>
                  <span>Salin Teks</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-5 py-2 bg-[#25D366] hover:bg-[#1ebd59] text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>Kirim via WhatsApp Sekarang</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
