import React, { useState, useEffect } from 'react';
import { UserSession, Student, Transaction } from '../types';
import { NotificationDropdown } from './NotificationDropdown';
import { TabsiLogo } from './TabsiLogo';
import { getBackupStatus } from '../utils/backupStorage';
import {
  AppAboutModal,
  APP_VERSION,
  APP_BRAND_NAME,
} from './AppAboutModal';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenNewTransaction: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  user: UserSession;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  students?: Student[];
  transactions?: Transaction[];
  onSelectStudent?: (student: Student) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTransaction,
  onOpenSettings,
  onLogout,
  user,
  mobileMenuOpen,
  setMobileMenuOpen,
  students = [],
  transactions = [],
  onSelectStudent,
}) => {
  const isAdmin = user.role === 'admin';
  const [backupStatus, setBackupStatus] = useState(() => getBackupStatus());
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  useEffect(() => {
    // Check backup status periodically / when active tab changes
    setBackupStatus(getBackupStatus());
  }, [activeTab]);

  // Role-based navigation items
  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard Kas', icon: 'dashboard' },
    { id: 'classes', label: 'Menu Kelas', icon: 'meeting_room' },
    { id: 'students', label: 'Data Siswa', icon: 'groups' },
    { id: 'transactions', label: 'Kasir & Transaksi', icon: 'swap_horiz' },
    { id: 'history', label: 'Riwayat Transaksi', icon: 'history' },
    { id: 'report', label: 'Laporan Rekapitulasi', icon: 'description' },
    { id: 'backup', label: 'Backup & Pemulihan', icon: 'settings_backup_restore', hasBadge: backupStatus.isOverdue },
    { id: 'guide', label: 'Panduan Aplikasi', icon: 'menu_book' },
  ] as const;

  const studentNavItems = [
    { id: 'student-portal-balance', label: 'Saldo & Tabungan Saya', icon: 'account_balance_wallet' },
    { id: 'student-portal-history', label: 'Riwayat Transaksi Saya', icon: 'receipt_long' },
    { id: 'student-portal-profile', label: 'Profil Rekening & PIN', icon: 'badge' },
    { id: 'guide', label: 'Panduan Aplikasi', icon: 'menu_book' },
  ] as const;

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between overflow-y-auto custom-scrollbar pr-0.5">
      {/* Top Header Branding */}
      <div className="flex flex-col gap-2 mb-3 shrink-0">
        <div
          className="p-2.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs cursor-pointer hover:border-emerald-300 transition-colors"
          onClick={() => {
            setActiveTab(isAdmin ? 'dashboard' : 'student-portal-balance');
            setMobileMenuOpen(false);
          }}
          title="Ke Halaman Utama"
        >
          <TabsiLogo size="md" variant="modern" showByline={true} />
        </div>

        <div className="flex items-center justify-between px-1">
          <span
            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isAdmin
                ? 'bg-[#005db5]/10 text-[#005db5] border border-[#005db5]/20'
                : 'bg-[#006130]/10 text-[#006130] border border-[#006130]/20'
            }`}
          >
            {isAdmin ? 'Mode Bendahara / Admin' : 'Mode Siswa (Cek Saldo NIS)'}
          </span>
          <span className="text-[9px] font-black text-slate-500 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
            {APP_VERSION.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* Main Navigation Items (Scrollable when viewport height is small) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-1 space-y-1">
        <div className="px-3 py-1 text-[10px] font-extrabold text-[#6f7a6f] uppercase tracking-wider flex items-center justify-between">
          <span>{isAdmin ? 'Menu Administrasi Kas' : 'Portal Tabungan Siswa'}</span>
          <span className="text-[9px] font-bold text-slate-400">({navItems.length} Menu)</span>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 xl:py-2.5 rounded-xl font-bold text-xs transition-all duration-150 text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#006130] text-white shadow-xs translate-x-0.5'
                    : 'text-[#3f4940] hover:bg-[#e9e8e7] hover:text-[#1a1c1c]'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[19px] shrink-0 ${
                    isActive ? 'text-white fill-1' : 'text-[#3f4940]'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {'hasBadge' in item && item.hasBadge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500 text-white animate-pulse shrink-0">
                    Backup!
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* New Transaction CTA Button (ONLY FOR ADMIN) */}
        {isAdmin && (
          <div className="pt-2 px-0.5">
            <button
              onClick={() => {
                onOpenNewTransaction();
                setMobileMenuOpen(false);
              }}
              className="w-full bg-gradient-to-r from-[#006130] to-[#107c41] text-[#ffffff] text-xs font-bold py-2.5 px-3 rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>Input Transaksi Kasir</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Navigation (Pinned to bottom, always accessible) */}
      <div className="flex flex-col gap-1 border-t border-[#becabd]/60 pt-2.5 mt-2 shrink-0 bg-[#f4f3f2]">
        {isAdmin && (
          <button
            onClick={() => {
              onOpenSettings();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 xl:py-2 text-[#3f4940] hover:bg-[#e9e8e7] hover:text-[#1a1c1c] rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg text-[#3f4940]">settings</span>
            <span className="truncate">Pengaturan &amp; Cloud</span>
          </button>
        )}

        {/* Helpdesk & About App button */}
        <button
          onClick={() => {
            setIsAboutModalOpen(true);
            setMobileMenuOpen(false);
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 xl:py-2 text-[#006130] hover:bg-[#006130]/10 rounded-xl text-xs font-bold transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 truncate">
            <span className="material-symbols-outlined text-lg">support_agent</span>
            <span className="truncate">Helpdesk &amp; Q&amp;A</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#006130]/10 text-[#006130] font-black shrink-0">
            24/7
          </span>
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 xl:py-2 text-[#ba1a1a] hover:bg-[#ffdad6]/60 rounded-xl text-xs transition-colors text-left font-bold cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="truncate">Keluar ({isAdmin ? 'Admin' : 'Siswa'})</span>
        </button>

        {/* Subtle Brand & Build info */}
        <div className="px-2 pt-1.5 flex items-center justify-between text-[9px] text-[#6f7a6f]">
          <span className="font-semibold">{APP_BRAND_NAME}</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Online</span>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="fixed left-0 top-0 h-screen hidden md:flex flex-col p-3 xl:p-4 border-r border-[#becabd]/60 bg-[#f4f3f2] w-64 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Top AppBar */}
      <header className="flex justify-between items-center px-3.5 h-16 w-full fixed top-0 z-40 bg-[#ffffff] border-b border-[#becabd]/60 shadow-xs md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="text-[#006130] hover:bg-[#e9e8e7] p-2 rounded-xl transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
            aria-label="Buka menu navigasi"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveTab(isAdmin ? 'dashboard' : 'student-portal-balance')}
          >
            <TabsiLogo size="sm" variant="modern" showByline={false} showSubtext={false} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <NotificationDropdown
            students={students}
            transactions={transactions}
            isAdmin={isAdmin}
            onNavigateTab={setActiveTab}
            onSelectStudent={onSelectStudent}
          />

          <div className="flex items-center gap-1.5 border border-[#becabd]/60 bg-[#faf9f8] py-1 px-2.5 rounded-full shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-[#005db5]' : 'bg-[#006130]'}`}></span>
            <span className="text-xs font-bold text-[#1a1c1c] max-w-[80px] truncate">
              {user.name.split(' ')[0]}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#becabd] shrink-0">
            <img
              alt="User Avatar"
              className="w-full h-full object-cover"
              src={
                user.avatarUrl ||
                'https://lh3.googleusercontent.com/aida-public/AB6AXuCFjn6lH32yAUrvZmJPLsf3nI-q1tIaonsaPQXroil8Cspc1anf9uM82rG6yhC8IPO6ivZN9_TxJc_M_fVjT9gIL-ma0VWaKTFhIxAi1R2DZky4Zy4spweYUvTyFbDdZvyMFX2sUqR6JXJ0XNy-QE7OpxdJczirH91jw7uv4KB-8kB-RsISksG59GD-Mre_4PlQopbCdulFRXEwWkxZjm4AXtg4BJ58NljC56Zp23ny1KfY-PbN5dkz'
              }
            />
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-xs transition-opacity flex animate-in fade-in duration-150"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 sm:w-80 max-w-[85vw] h-full bg-[#f4f3f2] p-4 shadow-2xl border-r border-[#becabd]/80 flex flex-col justify-between overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dedicated Mobile Drawer Close Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-[#006130]">menu_open</span>
                <span>Navigasi Aplikasi</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                aria-label="Tutup menu"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {sidebarContent}
          </div>
        </div>
      )}

      {/* About & Helpdesk Modal */}
      <AppAboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </>
  );
};
