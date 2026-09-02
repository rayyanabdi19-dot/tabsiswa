import React, { useRef, useState } from 'react';
import { showToast } from './Toast';

export const PRESET_AVATARS = [
  {
    id: 'male-1',
    label: 'Siswa 1',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'female-1',
    label: 'Siswi 1',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'male-2',
    label: 'Siswa 2',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'female-2',
    label: 'Siswi 2',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'male-3',
    label: 'Siswa 3',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'female-3',
    label: 'Siswi 3',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'male-4',
    label: 'Siswa 4',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'female-4',
    label: 'Siswi 4',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
  },
];

export const DEFAULT_AVATAR = PRESET_AVATARS[1].url;

/**
 * Helper to compress and convert image files to optimized Base64 data URLs
 */
export function compressImageFile(
  file: File,
  maxWidth = 320,
  maxHeight = 320,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Berkas harus berupa gambar (JPG, PNG, WEBP, dll)'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memproses gambar'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas'));
    reader.readAsDataURL(file);
  });
}

interface StudentAvatarPickerProps {
  currentAvatar: string;
  onChangeAvatar: (newAvatarUrl: string) => void;
  studentName?: string;
}

export const StudentAvatarPicker: React.FC<StudentAvatarPickerProps> = ({
  currentAvatar,
  onChangeAvatar,
  studentName = 'Siswa',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await processImageFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImageFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const compressedDataUrl = await compressImageFile(file);
      onChangeAvatar(compressedDataUrl);
      showToast('Foto Berhasil Dipilih', `Foto untuk ${studentName} berhasil dimuat dari galeri.`);
    } catch (err: any) {
      showToast('Gagal Memuat Foto', err.message || 'Format gambar tidak didukung.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-bold text-[#1a1c1c] block text-xs">
          Foto Profil Siswa (Galeri / Perangkat)
        </label>
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="text-xs text-[#005db5] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">
            {showPresets ? 'keyboard_arrow_up' : 'palette'}
          </span>
          <span>{showPresets ? 'Tutup Pilihan Avatar' : 'Pilih dari Koleksi Avatar'}</span>
        </button>
      </div>

      {/* Main Avatar Area with Direct Gallery Upload */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-[#faf9f8] border border-[#becabd]/80 rounded-xl">
        {/* Avatar Preview */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden shrink-0 border-2 transition-all shadow-xs ${
            isDragging
              ? 'border-[#006130] ring-4 ring-[#96f7af]'
              : 'border-[#becabd] hover:border-[#006130]'
          }`}
          title="Klik untuk memilih foto dari galeri / file"
        >
          <img
            src={currentAvatar || DEFAULT_AVATAR}
            alt={studentName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
          />

          {/* Hover overlay with camera icon */}
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-xl">photo_camera</span>
            <span className="text-[9px] font-bold mt-0.5">Ganti Foto</span>
          </div>

          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-[#006130] text-xl">
                progress_activity
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons & Gallery Trigger */}
        <div className="flex-1 space-y-2 text-center sm:text-left w-full">
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3 py-2 bg-[#006130] hover:bg-[#107c41] text-white font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">photo_library</span>
              <span>Ambil dari Galeri</span>
            </button>

            {currentAvatar && currentAvatar !== DEFAULT_AVATAR && (
              <button
                type="button"
                onClick={() => {
                  onChangeAvatar(DEFAULT_AVATAR);
                  showToast('Foto Direset', 'Foto profil dikembalikan ke avatar default.');
                }}
                className="px-2.5 py-2 border border-[#becabd] text-[#ba1a1a] hover:bg-[#ffdad6]/40 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Hapus foto saat ini"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>Reset</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-[#6f7a6f]">
            Mendukung file JPG, PNG, atau WEBP. Dapat memilih langsung dari galeri HP atau komputer.
          </p>
        </div>
      </div>

      {/* Preset Avatars Gallery */}
      {showPresets && (
        <div className="p-3 bg-[#f4f3f2] border border-[#becabd]/70 rounded-xl space-y-2 animate-fadeIn">
          <span className="text-[11px] font-bold text-[#3f4940] block">
            Pilih Karakter Avatar Siap Pakai:
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {PRESET_AVATARS.map((item) => {
              const isSelected = currentAvatar === item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChangeAvatar(item.url);
                    showToast('Avatar Dipilih', `${item.label} dipilih.`);
                  }}
                  className={`relative p-0.5 rounded-full transition-transform hover:scale-105 cursor-pointer ${
                    isSelected ? 'ring-3 ring-[#006130] scale-105' : 'hover:ring-2 hover:ring-[#becabd]'
                  }`}
                  title={item.label}
                >
                  <img
                    src={item.url}
                    alt={item.label}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {isSelected && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#006130] text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
