import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, SchoolInfo } from '../types';
import { formatRupiah, formatDateCustom } from './formatters';

export interface PDFExportOptions {
  schoolInfo?: SchoolInfo;
  title?: string;
  startDate?: string;
  endDate?: string;
  selectedClass?: string;
  selectedType?: string;
  adminName?: string;
  filename?: string;
}

export function exportTransactionsToPDF(
  transactions: Transaction[],
  options?: PDFExportOptions
) {
  const school: SchoolInfo = options?.schoolInfo || {
    name: 'SMA Bintang Gemilang',
    address: 'Jl. Merdeka Belajar No. 45, Jakarta Pusat',
    phone: '(021) 7890-1234',
    email: 'info@bintanggemilang.sch.id',
    principalName: 'Drs. H. Bambang Subagyo, M.Pd.',
    treasurerName: 'Siti Rahmawati, S.E.',
    logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=120&auto=format&fit=crop&q=80',
  };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. KOP SURAT SEKOLAH
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 97, 48); // #006130
  doc.text(school.name.toUpperCase(), pageWidth / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(school.address, pageWidth / 2, 21, { align: 'center' });
  doc.text(`Telp: ${school.phone} | Email: ${school.email}`, pageWidth / 2, 25.5, { align: 'center' });

  // Garis Pembatas Kop Surat
  doc.setDrawColor(0, 97, 48);
  doc.setLineWidth(0.8);
  doc.line(14, 28.5, pageWidth - 14, 28.5);
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.2);
  doc.line(14, 29.5, pageWidth - 14, 29.5);

  // 2. JUDUL LAPORAN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(26, 28, 28);
  const titleText = options?.title || 'LAPORAN RIWAYAT TRANSAKSI KAS TABUNGAN SISWA';
  doc.text(titleText, pageWidth / 2, 37, { align: 'center' });

  // 3. META FILTER & PERIODE
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);

  const periodeText = `Periode: ${options?.startDate ? formatDateCustom(options.startDate, 'DD MMM YYYY') : 'Semua'} s.d. ${options?.endDate ? formatDateCustom(options.endDate, 'DD MMM YYYY') : 'Sekarang'}`;
  const filterClassText = `Kelas: ${options?.selectedClass && options.selectedClass !== 'All Classes' ? options.selectedClass : 'Semua Kelas'}`;
  const filterTypeText = `Jenis: ${options?.selectedType && options.selectedType !== 'All Types' ? options.selectedType : 'Semua Transaksi'}`;

  doc.text(periodeText, 14, 44);
  doc.text(`${filterClassText}  |  ${filterTypeText}`, 14, 49);

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Waktu Unduh: ${todayStr}`, pageWidth - 14, 44, { align: 'right' });
  doc.text(`Total Catatan: ${transactions.length} Transaksi`, pageWidth - 14, 49, { align: 'right' });

  // 4. HITUNG STATISTIK & KOTAK RINGKASAN
  const totalDeposit = transactions
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawal = transactions
    .filter((t) => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashflow = totalDeposit - totalWithdrawal;

  const boxY = 53;
  const boxWidth = (pageWidth - 28 - 6) / 3;
  const boxHeight = 16;

  // Box 1: Total Setoran (Pemasukan)
  doc.setFillColor(240, 248, 240); // Soft green
  doc.setDrawColor(0, 97, 48);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, boxY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 97, 48);
  doc.text('TOTAL PEMASUKAN (SETOR)', 14 + boxWidth / 2, boxY + 5.5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(formatRupiah(totalDeposit), 14 + boxWidth / 2, boxY + 11.5, { align: 'center' });

  // Box 2: Total Penarikan (Pengeluaran)
  const box2X = 14 + boxWidth + 3;
  doc.setFillColor(255, 242, 242); // Soft red
  doc.setDrawColor(186, 26, 26);
  doc.roundedRect(box2X, boxY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(186, 26, 26);
  doc.text('TOTAL PENGELUARAN (TARIK)', box2X + boxWidth / 2, boxY + 5.5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(formatRupiah(totalWithdrawal), box2X + boxWidth / 2, boxY + 11.5, { align: 'center' });

  // Box 3: Arus Kas Bersih
  const box3X = 14 + (boxWidth * 2) + 6;
  doc.setFillColor(240, 244, 250); // Soft blue
  doc.setDrawColor(0, 93, 181);
  doc.roundedRect(box3X, boxY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 93, 181);
  doc.text('ARUS KAS BERSIH (NET)', box3X + boxWidth / 2, boxY + 5.5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(formatRupiah(netCashflow), box3X + boxWidth / 2, boxY + 11.5, { align: 'center' });

  // 5. TABEL TRANSAKSI DENGAN AUTOTABLE
  const tableData = transactions.map((tx, idx) => {
    const isDep = tx.type === 'deposit';
    return [
      idx + 1,
      formatDateCustom(tx.date, 'DD/MM/YYYY'),
      tx.studentName,
      tx.studentNisn,
      tx.className,
      isDep ? 'Setoran (+)' : 'Penarikan (-)',
      formatRupiah(tx.amount),
      tx.status === 'success' ? 'Berhasil' : 'Pending',
      tx.adminName || 'Admin',
      tx.notes || '-',
    ];
  });

  autoTable(doc, {
    startY: boxY + boxHeight + 4,
    head: [[
      'No',
      'Tanggal',
      'Nama Siswa',
      'NISN',
      'Kelas',
      'Jenis',
      'Nominal (Rp)',
      'Status',
      'Petugas',
      'Catatan',
    ]],
    body: tableData.length > 0 ? tableData : [['-', '-', 'Tidak ada data transaksi yang sesuai', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [0, 97, 48],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 30, 30],
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [248, 249, 248],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 16 },
      2: { fontStyle: 'bold', cellWidth: 32 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      7: { halign: 'center', cellWidth: 14 },
      8: { halign: 'center', cellWidth: 18 },
      9: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      // Warna nominal & status
      if (data.section === 'body') {
        if (data.column.index === 5) {
          const val = String(data.cell.raw);
          if (val.includes('Setoran')) {
            data.cell.styles.textColor = [0, 97, 48];
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('Penarikan')) {
            data.cell.styles.textColor = [186, 26, 26];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 40 },
  });

  // 6. TANDA TANGAN DI BAGIAN BAWAH LAPORAN
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  let signatureY = finalY + 12;

  // Jika dekat dengan margin bawah halaman, buat halaman baru untuk tanda tangan
  if (signatureY + 38 > pageHeight) {
    doc.addPage();
    signatureY = 25;
  }

  const signLeftX = 25;
  const signRightX = pageWidth - 65;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);

  // Kiri: Kepala Sekolah
  doc.text('Mengetahui,', signLeftX, signatureY, { align: 'center' });
  doc.text('Kepala Sekolah', signLeftX, signatureY + 4.5, { align: 'center' });
  doc.setLineWidth(0.3);
  doc.setDrawColor(40, 40, 40);
  doc.line(signLeftX - 22, signatureY + 24, signLeftX + 22, signatureY + 24);
  doc.setFont('helvetica', 'bold');
  doc.text(school.principalName, signLeftX, signatureY + 28, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('NIP. 19780512 200212 1 004', signLeftX, signatureY + 32, { align: 'center' });

  // Kanan: Bendahara Sekolah / Pembuat Laporan
  doc.setFontSize(8.5);
  doc.text(`Jakarta, ${todayStr}`, signRightX, signatureY, { align: 'center' });
  doc.text('Bendahara Tabungan Sekolah', signRightX, signatureY + 4.5, { align: 'center' });
  doc.line(signRightX - 24, signatureY + 24, signRightX + 24, signatureY + 24);
  doc.setFont('helvetica', 'bold');
  doc.text(options?.adminName || school.treasurerName || 'Siti Rahmawati, S.E.', signRightX, signatureY + 28, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Petugas Administrasi Keuangan', signRightX, signatureY + 32, { align: 'center' });

  // 7. FOOTER NOMOR HALAMAN DI SETIAP PAGE
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.text(
      `Sistem Informasi Tabungan Siswa — ${school.name}`,
      14,
      pageHeight - 6
    );
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - 14,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  // Simpan File PDF
  const defaultFilename = `Laporan_Transaksi_Tabungan_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(options?.filename || defaultFilename);
}

export type ReceiptPrinterType = 'thermal_58mm' | 'thermal_80mm' | 'regular_a4' | 'regular_a5';

export interface ReceiptData {
  transactionId: string;
  studentName: string;
  studentNisn: string;
  className: string;
  guardianName?: string;
  guardianPhone?: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: string;
  time?: string;
  notes?: string;
  totalBalance: number;
  availableBalance: number;
  lockedBalance: number;
  adminName: string;
  schoolName: string;
}

export function exportReceiptToPDF(
  receipt: ReceiptData,
  printerType: ReceiptPrinterType = 'thermal_80mm',
  schoolInfo?: SchoolInfo
) {
  const school: SchoolInfo = schoolInfo || {
    name: receipt.schoolName || 'SMA Bintang Gemilang',
    address: 'Jl. Merdeka Belajar No. 45, Jakarta Pusat',
    phone: '(021) 7890-1234',
    email: 'info@bintanggemilang.sch.id',
    principalName: 'Drs. H. Bambang Subagyo, M.Pd.',
    treasurerName: receipt.adminName || 'Siti Rahmawati, S.E.',
    logoUrl: '',
  };

  const isDeposit = receipt.type === 'deposit';
  const typeLabel = isDeposit ? 'SETORAN TABUNGAN' : 'PENARIKAN KAS';
  const typeCode = isDeposit ? 'SETOR (+)' : 'TARIK (-)';

  if (printerType === 'thermal_58mm') {
    // Thermal 58mm Roll: Width 58mm, Height ~140mm
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, 145],
    });

    const w = 58;
    let y = 6;

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.text(school.name.toUpperCase(), w / 2, y, { align: 'center' });
    y += 4;

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.text('TABUNGAN SISWA PINTAR (TABSI)', w / 2, y, { align: 'center' });
    y += 3.5;
    doc.text(school.phone, w / 2, y, { align: 'center' });
    y += 4;

    // Line
    doc.text('================================', w / 2, y, { align: 'center' });
    y += 3.5;

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.text(`STRUK ${typeLabel}`, w / 2, y, { align: 'center' });
    y += 3.5;

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.text('--------------------------------', w / 2, y, { align: 'center' });
    y += 3.5;

    // Details
    doc.text(`No.Tx : ${receipt.transactionId}`, 3, y); y += 3;
    doc.text(`Waktu : ${receipt.date} ${receipt.time ? receipt.time.replace(/Hari ini,\s*/i, '') : ''}`, 3, y); y += 3;
    doc.text(`Kasir : ${receipt.adminName.slice(0, 20)}`, 3, y); y += 3;
    doc.text(`Siswa : ${receipt.studentName.slice(0, 20)}`, 3, y); y += 3;
    doc.text(`NISN  : ${receipt.studentNisn}`, 3, y); y += 3;
    doc.text(`Kelas : ${receipt.className}`, 3, y); y += 3.5;

    doc.text('--------------------------------', w / 2, y, { align: 'center' });
    y += 3.5;

    // Nominal
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.text(`JENIS   : ${typeCode}`, 3, y); y += 3.5;
    doc.setFontSize(8.5);
    doc.text(`NOMINAL : ${formatRupiah(receipt.amount)}`, 3, y); y += 4;

    if (receipt.notes) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(6);
      doc.text(`Ket     : ${receipt.notes.slice(0, 26)}`, 3, y); y += 3.5;
    }

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.text('--------------------------------', w / 2, y, { align: 'center' });
    y += 3.5;

    // Balances
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.text(`TOTAL SALDO : ${formatRupiah(receipt.totalBalance)}`, 3, y); y += 3.2;
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.text(`- Bisa Ditarik (80%): ${formatRupiah(receipt.availableBalance)}`, 3, y); y += 3;
    doc.text(`- Terkunci (20%)   : ${formatRupiah(receipt.lockedBalance)}`, 3, y); y += 4;

    doc.text('================================', w / 2, y, { align: 'center' });
    y += 3.5;

    doc.setFont('courier', 'normal');
    doc.setFontSize(6);
    doc.text('Simpan struk ini sebagai bukti sah.', w / 2, y, { align: 'center' }); y += 3;
    doc.text('Terima Kasih Telah Menabung', w / 2, y, { align: 'center' }); y += 3;
    doc.text('** TABSI by MD2R **', w / 2, y, { align: 'center' });

    doc.save(`Struk_Thermal_58mm_${receipt.transactionId}.pdf`);
  } else if (printerType === 'thermal_80mm') {
    // Thermal 80mm Roll: Width 80mm, Height ~165mm
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 165],
    });

    const w = 80;
    let y = 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 97, 48);
    doc.text(school.name.toUpperCase(), w / 2, y, { align: 'center' });
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text('SISTEM TABUNGAN SISWA PINTAR (TABSI)', w / 2, y, { align: 'center' });
    y += 3.5;
    doc.text(`${school.address} | Telp: ${school.phone}`, w / 2, y, { align: 'center' });
    y += 4.5;

    doc.setDrawColor(0, 97, 48);
    doc.setLineWidth(0.4);
    doc.line(4, y, w - 4, y);
    y += 4.5;

    // Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(isDeposit ? 0 : 186, isDeposit ? 97 : 26, isDeposit ? 48 : 26);
    doc.text(`STRUK BUKTI ${typeLabel}`, w / 2, y, { align: 'center' });
    y += 4.5;

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);

    // Box Data
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(4, y, w - 4, y);
    y += 3.5;

    doc.text(`No. Transaksi : ${receipt.transactionId}`, 5, y); y += 3.5;
    doc.text(`Tanggal/Waktu : ${receipt.date} ${receipt.time ? receipt.time.replace(/Hari ini,\s*/i, '') : ''}`, 5, y); y += 3.5;
    doc.text(`Petugas Kasir : ${receipt.adminName}`, 5, y); y += 3.5;
    doc.text(`Nama Siswa    : ${receipt.studentName}`, 5, y); y += 3.5;
    doc.text(`NISN / Kelas  : ${receipt.studentNisn} (${receipt.className})`, 5, y); y += 4;

    doc.line(4, y, w - 4, y);
    y += 4;

    // Amount box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`JENIS MUTASI  : ${typeCode}`, 5, y); y += 4;

    doc.setFontSize(11);
    doc.setTextColor(isDeposit ? 0 : 186, isDeposit ? 97 : 26, isDeposit ? 48 : 26);
    doc.text(`NOMINAL       : ${formatRupiah(receipt.amount)}`, 5, y); y += 4.5;

    if (receipt.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text(`Keterangan    : ${receipt.notes}`, 5, y); y += 4;
    }

    doc.line(4, y, w - 4, y);
    y += 4;

    // Balances
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(26, 28, 28);
    doc.text('POSISI SALDO TERBARU:', 5, y); y += 4;

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Total Saldo    : ${formatRupiah(receipt.totalBalance)}`, 5, y); y += 3.5;
    doc.text(`Saldo 80% Bisa : ${formatRupiah(receipt.availableBalance)}`, 5, y); y += 3.5;
    doc.text(`Saldo 20% Kunci: ${formatRupiah(receipt.lockedBalance)}`, 5, y); y += 4.5;

    doc.setDrawColor(0, 97, 48);
    doc.line(4, y, w - 4, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Simpan bukti ini sebagai tanda terima tabungan resmi.', w / 2, y, { align: 'center' }); y += 3.2;
    doc.text('Layanan Bantuan & WhatsApp: 0821-8637-1356', w / 2, y, { align: 'center' }); y += 3.2;
    doc.text('TABSI by MD2R Software Solutions', w / 2, y, { align: 'center' });

    doc.save(`Struk_Thermal_80mm_${receipt.transactionId}.pdf`);
  } else if (printerType === 'regular_a5') {
    // Regular A5 Landscape (210mm x 148mm) or Portrait (148mm x 210mm)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a5',
    });

    const w = doc.internal.pageSize.getWidth(); // 210mm
    const h = doc.internal.pageSize.getHeight(); // 148mm

    // Kop Surat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 97, 48);
    doc.text(school.name.toUpperCase(), w / 2, 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(school.address, w / 2, 19, { align: 'center' });
    doc.text(`Telp: ${school.phone} | Email: ${school.email}`, w / 2, 23, { align: 'center' });

    doc.setDrawColor(0, 97, 48);
    doc.setLineWidth(0.6);
    doc.line(12, 26, w - 12, 26);
    doc.setLineWidth(0.2);
    doc.line(12, 27, w - 12, 27);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 28, 28);
    doc.text(`KUITANSI BUKTI ${typeLabel}`, w / 2, 34, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`No. Kuitansi: ${receipt.transactionId}  |  Tanggal: ${receipt.date} ${receipt.time ? receipt.time.replace(/Hari ini,\s*/i, '') : ''}`, w / 2, 38.5, { align: 'center' });

    // Table details
    autoTable(doc, {
      startY: 42,
      margin: { left: 12, right: 12 },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40, fillColor: [248, 249, 248] },
        1: { cellWidth: 'auto' },
        2: { fontStyle: 'bold', cellWidth: 40, fillColor: [248, 249, 248] },
        3: { cellWidth: 'auto' },
      },
      body: [
        ['Nama Siswa', receipt.studentName, 'NISN / Kelas', `${receipt.studentNisn} (${receipt.className})`],
        ['Jenis Mutasi', typeCode, 'Nominal Transaksi', formatRupiah(receipt.amount)],
        ['Keterangan', receipt.notes || (isDeposit ? 'Setoran Tabungan' : 'Penarikan Kas'), 'Petugas Bendahara', receipt.adminName],
        ['Total Saldo Baru', formatRupiah(receipt.totalBalance), 'Porsi Saldo (80%/20%)', `Bisa: ${formatRupiah(receipt.availableBalance)} | Kunci: ${formatRupiah(receipt.lockedBalance)}`],
      ],
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 85;

    // Dual Signatures
    const signY = finalY + 8;
    const signLeft = 45;
    const signRight = w - 45;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);

    doc.text('Penyetor / Wali Murid,', signLeft, signY, { align: 'center' });
    doc.line(signLeft - 22, signY + 18, signLeft + 22, signY + 18);
    doc.text(receipt.guardianName || receipt.studentName, signLeft, signY + 22, { align: 'center' });

    doc.text(`Petugas Kasir / Bendahara,`, signRight, signY, { align: 'center' });
    doc.line(signRight - 22, signY + 18, signRight + 22, signY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.adminName, signRight, signY + 22, { align: 'center' });

    doc.save(`Kuitansi_A5_${receipt.transactionId}.pdf`);
  } else {
    // Regular A4 Portrait (210mm x 297mm) Formal Kuitansi
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const w = doc.internal.pageSize.getWidth(); // 210mm

    // Kop Surat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 97, 48);
    doc.text(school.name.toUpperCase(), w / 2, 18, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(school.address, w / 2, 23.5, { align: 'center' });
    doc.text(`Telp: ${school.phone} | Email: ${school.email}`, w / 2, 28, { align: 'center' });

    doc.setDrawColor(0, 97, 48);
    doc.setLineWidth(0.8);
    doc.line(14, 31, w - 14, 31);
    doc.setLineWidth(0.2);
    doc.line(14, 32, w - 14, 32);

    // Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(26, 28, 28);
    doc.text(`KUITANSI BUKTI ${typeLabel}`, w / 2, 42, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Nomor Dokumen: ${receipt.transactionId}`, w / 2, 47, { align: 'center' });
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, w / 2, 51.5, { align: 'center' });

    // Table details
    autoTable(doc, {
      startY: 58,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45, fillColor: [248, 249, 248] },
        1: { cellWidth: 'auto' },
      },
      body: [
        ['Nama Lengkap Siswa', receipt.studentName],
        ['NISN / Kelas', `${receipt.studentNisn} — Kelas ${receipt.className}`],
        ['Nama Wali Murid', receipt.guardianName || '-'],
        ['Nomor Kontak Wali', receipt.guardianPhone || '-'],
        ['Waktu Transaksi', `${receipt.date} ${receipt.time ? receipt.time : ''}`],
        ['Jenis Transaksi', typeCode],
        ['Jumlah / Nominal', formatRupiah(receipt.amount)],
        ['Keterangan', receipt.notes || (isDeposit ? 'Setoran Tabungan Siswa' : 'Penarikan Kas Siswa')],
        ['Petugas Kasir / Bendahara', receipt.adminName],
        ['Total Saldo Terkini', formatRupiah(receipt.totalBalance)],
        ['Saldo Bisa Digunakan (80%)', formatRupiah(receipt.availableBalance)],
        ['Dana Terkunci Cadangan (20%)', formatRupiah(receipt.lockedBalance)],
      ],
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 140;

    // Security Verification Notice
    doc.setFillColor(244, 249, 245);
    doc.setDrawColor(0, 97, 48);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, finalY + 6, w - 28, 16, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 97, 48);
    doc.text('KEABSAHAN DOKUMEN SISTEM DIGITAL', 18, finalY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    doc.text('Kuitansi ini dicetak secara otomatis melalui Sistem Tabungan Siswa Pintar (TABSI by MD2R) dan sah tanpa tanda tangan basah bila memiliki Nomor Referensi Transaksi valid.', 18, finalY + 16, { maxWidth: w - 36 });

    // Dual Signatures
    const signY = finalY + 30;
    const signLeft = 45;
    const signRight = w - 45;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);

    doc.text('Penyetor / Wali Murid,', signLeft, signY, { align: 'center' });
    doc.line(signLeft - 25, signY + 24, signLeft + 25, signY + 24);
    doc.text(receipt.guardianName || receipt.studentName, signLeft, signY + 28, { align: 'center' });

    doc.text(`Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, signRight, signY, { align: 'center' });
    doc.text('Bendahara / Kasir Sekolah,', signRight, signY + 4.5, { align: 'center' });
    doc.line(signRight - 25, signY + 24, signRight + 25, signY + 24);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.adminName, signRight, signY + 28, { align: 'center' });

    doc.save(`Kuitansi_Resmi_A4_${receipt.transactionId}.pdf`);
  }
}
