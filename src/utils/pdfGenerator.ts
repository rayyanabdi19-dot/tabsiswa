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
