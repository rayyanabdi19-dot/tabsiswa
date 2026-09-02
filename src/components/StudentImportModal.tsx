import React, { useState, useRef } from 'react';
import { Student } from '../types';
import { showToast } from './Toast';
import { formatRupiah } from '../utils/formatters';
import {
  downloadStudentCSVTemplate,
  parseStudentCSV,
  parseStudentJSON,
} from '../utils/studentDataHelpers';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStudents: (imported: Student[], mode: 'merge' | 'replace') => void;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  isOpen,
  onClose,
  onImportStudents,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [previewStudents, setPreviewStudents] = useState<Student[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setPreviewStudents([]);
    setParseErrors([]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileProcess = (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setParseErrors([]);
    setPreviewStudents([]);

    const reader = new FileReader();
    const isJson = uploadedFile.name.endsWith('.json');

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setParseErrors(['Gagal membaca file atau file kosong.']);
        setIsProcessing(false);
        return;
      }

      if (isJson) {
        const { valid, errors } = parseStudentJSON(content);
        setPreviewStudents(valid);
        setParseErrors(errors);
      } else {
        // CSV parsing
        const { valid, errors } = parseStudentCSV(content);
        setPreviewStudents(valid);
        setParseErrors(errors);
      }
      setIsProcessing(false);
    };

    reader.onerror = () => {
      setParseErrors(['Terjadi kesalahan saat membaca berkas.']);
      setIsProcessing(false);
    };

    reader.readAsText(uploadedFile, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      handleFileProcess(dropped);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (previewStudents.length === 0) {
      showToast('Tidak Ada Data', 'Tidak ada data siswa yang valid untuk diimpor.', 'error');
      return;
    }

    onImportStudents(previewStudents, importMode);
    showToast(
      'Impor Siswa Berhasil',
      `Berhasil mengimpor ${previewStudents.length} data siswa (${importMode === 'merge' ? 'Digabungkan/Diperbarui' : 'Gantikan Seluruh Data'}).`
    );
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div
        className="bg-[#ffffff] rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-[#becabd] max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[#becabd]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006130]/10 flex items-center justify-center text-[#006130]">
              <span className="material-symbols-outlined text-xl">upload_file</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1a1c1c]">Impor Data Siswa</h3>
              <p className="text-xs text-[#3f4940]">
                Unggah berkas CSV / Excel / JSON untuk mendaftarkan atau memperbarui data siswa secara massal.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetState();
              onClose();
            }}
            className="text-[#6f7a6f] hover:text-[#1a1c1c] p-1 rounded-full cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-4 pr-1">
          {/* Template Download Prompt */}
          <div className="p-3.5 bg-[#f4f3f2] rounded-xl border border-[#becabd]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#005db5] text-2xl">download_for_offline</span>
              <div>
                <div className="font-bold text-xs text-[#1a1c1c]">Belum punya format data?</div>
                <div className="text-[11px] text-[#3f4940]">
                  Unduh template Excel / CSV resmi agar kolom data sesuai dengan sistem.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadStudentCSVTemplate}
              className="px-3 py-1.5 bg-[#ffffff] hover:bg-[#e9e8e7] border border-[#becabd] text-[#005db5] font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">file_download</span>
              <span>Unduh Template CSV</span>
            </button>
          </div>

          {/* Upload Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[#006130] bg-[#006130]/5 scale-[0.99]'
                : 'border-[#becabd] hover:border-[#006130] bg-[#faf9f8]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-[#006130]/10 mx-auto flex items-center justify-center text-[#006130] mb-2">
              <span className="material-symbols-outlined text-2xl">cloud_upload</span>
            </div>
            <div className="font-bold text-sm text-[#1a1c1c]">
              {file ? file.name : 'Tarik & Letakkan file di sini, atau Klik untuk memilih'}
            </div>
            <p className="text-xs text-[#6f7a6f] mt-1">
              Mendukung format: <strong>.CSV</strong> (Excel terpisah koma/titik koma) atau <strong>.JSON</strong>
            </p>
            {file && (
              <span className="inline-block mt-2 px-2.5 py-0.5 bg-[#96f7af] text-[#00210c] text-[11px] font-bold rounded-full">
                {(file.size / 1024).toFixed(1)} KB • Siap diproses
              </span>
            )}
          </div>

          {/* Mode Import Selector */}
          <div className="bg-[#ffffff] p-3 rounded-xl border border-[#becabd]/70">
            <div className="font-bold text-xs text-[#1a1c1c] mb-2">Metode Penanganan Data:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  importMode === 'merge'
                    ? 'border-[#006130] bg-[#006130]/5 text-[#1a1c1c]'
                    : 'border-[#becabd]/60 text-[#3f4940]'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="mt-0.5 text-[#006130] focus:ring-[#006130]"
                />
                <div>
                  <div className="font-bold text-xs">Gabungkan & Perbarui (Upsert)</div>
                  <div className="text-[11px] text-[#6f7a6f]">
                    Tambahkan siswa baru dan perbarui saldo/data jika NISN sudah terdaftar.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  importMode === 'replace'
                    ? 'border-[#ba1a1a] bg-[#ba1a1a]/5 text-[#1a1c1c]'
                    : 'border-[#becabd]/60 text-[#3f4940]'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-0.5 text-[#ba1a1a] focus:ring-[#ba1a1a]"
                />
                <div>
                  <div className="font-bold text-xs text-[#ba1a1a]">Gantikan Seluruh Data</div>
                  <div className="text-[11px] text-[#6f7a6f]">
                    Hapus data siswa saat ini dan gantikan seluruhnya dengan data berkas baru.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Validation & Preview Section */}
          {isProcessing && (
            <div className="text-center py-6 text-xs text-[#3f4940] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg animate-spin text-[#006130]">progress_activity</span>
              <span>Memproses dan memvalidasi berkas...</span>
            </div>
          )}

          {parseErrors.length > 0 && (
            <div className="p-3 bg-[#ffdad6]/60 border border-[#ba1a1a]/30 rounded-xl text-xs space-y-1">
              <div className="font-bold text-[#ba1a1a] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">error</span>
                <span>Peringatan Validasi Berkas ({parseErrors.length})</span>
              </div>
              <ul className="list-disc pl-5 text-[11px] text-[#410002] space-y-0.5 max-h-24 overflow-y-auto custom-scrollbar">
                {parseErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {previewStudents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-xs text-[#1a1c1c] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#006130]">check_circle</span>
                  <span>Pratinjau Data Siap Impor ({previewStudents.length} Siswa)</span>
                </div>
                <span className="text-[11px] text-[#006130] font-bold">
                  Total Saldo: {formatRupiah(previewStudents.reduce((sum, s) => sum + s.balance, 0))}
                </span>
              </div>

              <div className="border border-[#becabd]/80 rounded-xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#f4f3f2] sticky top-0 border-b border-[#becabd]/80 text-[#3f4940] font-semibold">
                    <tr>
                      <th className="p-2 pl-3">NISN</th>
                      <th className="p-2">Nama Siswa</th>
                      <th className="p-2">Kelas</th>
                      <th className="p-2 text-right">Saldo Awal</th>
                      <th className="p-2">Nama Wali</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#becabd]/40 text-[#1a1c1c]">
                    {previewStudents.slice(0, 15).map((s, i) => (
                      <tr key={i} className="hover:bg-[#faf9f8]">
                        <td className="p-2 pl-3 font-mono text-[11px] font-semibold text-[#005db5]">{s.nisn}</td>
                        <td className="p-2 font-medium">{s.name}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 bg-[#e9e8e7] text-[#3f4940] rounded text-[10px] font-semibold">
                            {s.className}
                          </span>
                        </td>
                        <td className="p-2 text-right font-bold text-[#006130]">
                          {formatRupiah(s.balance)}
                        </td>
                        <td className="p-2 text-[#3f4940] text-[11px]">{s.guardianName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewStudents.length > 15 && (
                  <div className="p-2 text-center text-[11px] text-[#6f7a6f] bg-[#faf9f8] border-t border-[#becabd]/60">
                    ... dan {previewStudents.length - 15} siswa lainnya
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#becabd]/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              resetState();
              onClose();
            }}
            className="px-4 py-2 border border-[#becabd] text-[#3f4940] font-semibold text-xs rounded-lg hover:bg-[#e9e8e7] transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={previewStudents.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2.5 bg-[#006130] hover:bg-[#107c41] text-[#ffffff] font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">save_alt</span>
            <span>Konfirmasi Impor ({previewStudents.length} Siswa)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
