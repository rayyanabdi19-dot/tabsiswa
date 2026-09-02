import React from 'react';
import { UserSession, Student, Transaction } from '../types';
import { NotificationDropdown } from './NotificationDropdown';
import { TabsiLogo } from './TabsiLogo';

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

  // Role-based navigation items
  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard Kas', icon: 'dashboard' },
    { id: 'classes', label: 'Menu Kelas', icon: 'meeting_room' },
    { id: 'students', label: 'Data Siswa', icon: 'groups' },
    { id: 'transactions', label: 'Kasir & Transaksi', icon: 'swap_horiz' },
    { id: 'history', label: 'Riwayat Transaksi', icon: 'history' },
    { id: 'report', label: 'Laporan Rekapitulasi', icon: 'description' },
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
    <div className="flex flex-col h-full">
      {/* Header Branding with Official TABSI Logo */}
      <div
        className="flex flex-col gap-1.5 mb-6 px-1.5 cursor-pointer"
        onClick={() => setActiveTab(isAdmin ? 'dashboard' : 'student-portal-balance')}
      >
        <div className="p-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <TabsiLogo size="md" variant="modern" showByline={true} />
        </div>
        <div className="flex items-center gap-1.5 px-1">
          <span
            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isAdmin
                ? 'bg-[#005db5]/10 text-[#005db5] border border-[#005db5]/20'
                : 'bg-[#006130]/10 text-[#006130] border border-[#006130]/20'
            }`}
          >
            {isAdmin ? 'Mode Bendahara / Admin' : 'Mode Siswa (Cek Saldo NIS)'}
          </span>
        </div>
      </div>

      {/* Main Navigation Items */}
      <nav className="flex-1 flex flex-col gap-1.5">
        <div className="px-3 py-1 text-[11px] font-bold text-[#6f7a6f] uppercase tracking-wider">
          {isAdmin ? 'Menu Administrasi' : 'Menu Siswa'}
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 text-left cursor-pointer ${
                isActive
                  ? 'bg-[#006130] text-white shadow-xs'
                  : 'text-[#3f4940] hover:bg-[#e9e8e7] hover:text-[#1a1c1c]'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[19px] ${
                  isActive ? 'text-white fill-1' : 'text-[#3f4940]'
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* New Transaction CTA (ONLY FOR ADMIN) */}
      {isAdmin && (
        <div className="my-4 px-1">
          <button
            onClick={() => {
              onOpenNewTransaction();
              setMobileMenuOpen(false);
            }}
            className="w-full bg-[#006130] text-[#ffffff] text-xs font-bold py-2.5 px-3.5 rounded-xl hover:bg-[#107c41] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Input Transaksi Kasir</span>
          </button>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex flex-col gap-1 border-t border-[#becabd]/60 pt-3 mt-auto">
        {isAdmin && (
          <button
            onClick={() => {
              onOpenSettings();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-[#3f4940] hover:bg-[#e9e8e7] hover:text-[#1a1c1c] rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            <span>Pengaturan & Cloud</span>
          </button>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2 text-[#ba1a1a] hover:bg-[#ffdad6]/60 rounded-xl text-xs transition-colors text-left font-bold cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span>Keluar ({isAdmin ? 'Admin' : 'Siswa'})</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="fixed left-0 top-0 h-screen hidden md:flex flex-col p-4 border-r border-[#becabd]/60 bg-[#f4f3f2] w-64 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Top AppBar */}
      <header className="flex justify-between items-center px-3.5 h-16 w-full fixed top-0 z-50 bg-[#ffffff] border-b border-[#becabd]/60 shadow-xs md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#006130] hover:bg-[#e9e8e7] p-2 rounded-xl transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
          <div className="flex items-center gap-2">
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
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 h-full bg-[#f4f3f2] p-4 shadow-xl border-r border-[#becabd]/60"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
