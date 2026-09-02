import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Student, Transaction } from '../types';
import { formatRupiah, formatDateCustom } from '../utils/formatters';
import { getBackupStatus } from '../utils/backupStorage';

export interface NotificationItem {
  id: string;
  type: 'inactive_student' | 'recent_transaction' | 'system' | 'goal_reached' | 'backup_reminder';
  title: string;
  message: string;
  time: string;
  unread: boolean;
  priority: 'high' | 'medium' | 'low';
  linkTab?: string;
  student?: Student;
}

interface NotificationDropdownProps {
  students: Student[];
  transactions: Transaction[];
  isAdmin: boolean;
  onNavigateTab: (tab: string) => void;
  onSelectStudent?: (student: Student) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  students,
  transactions,
  isAdmin,
  onNavigateTab,
  onSelectStudent,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate smart notifications
  const notifications: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];

    // Reference timestamp from latest transaction or now
    let latestTxTime = 0;
    transactions.forEach((tx) => {
      if (tx.date) {
        const time = new Date(tx.date).getTime();
        if (!isNaN(time) && time > latestTxTime) latestTxTime = time;
      }
    });
    const refTime = latestTxTime > 0 ? latestTxTime : Date.now();

    // 1. Inactive Students Notifications (Admin only)
    if (isAdmin) {
      // Weekly Backup Reminder Notification (Recommended 1x per week)
      const bStatus = getBackupStatus();
      if (bStatus.isOverdue || bStatus.statusLevel === 'warning') {
        list.push({
          id: 'notif-backup-weekly-reminder',
          type: 'backup_reminder',
          title: bStatus.daysSinceLastBackup === null
            ? 'Pengingat: Belum Pernah Backup Data'
            : `Pengingat: Waktunya Backup Rutin (${bStatus.daysSinceLastBackup} hari)`,
          message:
            'Disarankan melakukan backup data minimal 1 minggu 1 kali untuk melindungi data mutasi tabungan siswa.',
          time: bStatus.daysSinceLastBackup === null ? 'Penting' : `${bStatus.daysSinceLastBackup} hr lalu`,
          unread: !readIds.has('notif-backup-weekly-reminder'),
          priority: bStatus.isOverdue ? 'high' : 'medium',
          linkTab: 'backup',
        });
      }

      const inactiveList: Student[] = [];
      students.forEach((std) => {
        const deposits = transactions.filter(
          (t) =>
            t.type === 'deposit' &&
            (t.studentNisn === std.nisn ||
              t.studentId === std.id ||
              t.studentName.toLowerCase() === std.name.toLowerCase())
        );

        let lastDepositTime: number | null = null;
        if (deposits.length > 0) {
          const sorted = [...deposits].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          lastDepositTime = new Date(sorted[0].date).getTime();
        } else if (std.initialDepositDate) {
          lastDepositTime = new Date(std.initialDepositDate).getTime();
        }

        if (lastDepositTime) {
          const diffDays = Math.floor((refTime - lastDepositTime) / (1000 * 60 * 60 * 24));
          if (diffDays >= 30) {
            inactiveList.push(std);
          }
        } else {
          inactiveList.push(std);
        }
      });

      if (inactiveList.length > 0) {
        list.push({
          id: 'notif-inactive-summary',
          type: 'inactive_student',
          title: `${inactiveList.length} Siswa Belum Setor > 30 Hari`,
          message: `Ada ${inactiveList.length} siswa yang belum menabung lebih dari 30 hari. Klik untuk melihat daftar & kirim WA pengingat.`,
          time: 'Hari ini',
          unread: !readIds.has('notif-inactive-summary'),
          priority: 'high',
          linkTab: 'dashboard',
        });
      }
    }

    // 2. Recent Transactions Notifications
    const recentTx = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    recentTx.forEach((tx) => {
      const isDeposit = tx.type === 'deposit';
      list.push({
        id: `notif-tx-${tx.id}`,
        type: 'recent_transaction',
        title: isDeposit ? 'Setoran Berhasil Masuk' : 'Penarikan Kas Tabungan',
        message: `${tx.studentName} (${tx.className}) • ${formatRupiah(tx.amount)}`,
        time: formatDateCustom(tx.date, 'DD MMM YYYY'),
        unread: !readIds.has(`notif-tx-${tx.id}`),
        priority: 'low',
        linkTab: isAdmin ? 'history' : 'student-portal-history',
      });
    });

    // 3. Goal Reached Notifications
    students.forEach((s) => {
      if (s.goal && s.balance >= s.goal.targetAmount) {
        list.push({
          id: `notif-goal-${s.id}`,
          type: 'goal_reached',
          title: `Target Tabungan Tercapai! 🎉`,
          message: `${s.name} telah mencapai target "${s.goal.title}" (${formatRupiah(s.balance)})`,
          time: 'Baru saja',
          unread: !readIds.has(`notif-goal-${s.id}`),
          priority: 'medium',
          student: s,
          linkTab: isAdmin ? 'students' : 'student-portal-balance',
        });
      }
    });

    // 4. Cloud Apps Script Active System Notification
    list.push({
      id: 'notif-system-ready',
      type: 'system',
      title: 'Sistem Terhubung Cloud Google',
      message: 'Database tabungan aktif dan tersinkronisasi otomatis.',
      time: 'Aktif',
      unread: !readIds.has('notif-system-ready'),
      priority: 'low',
    });

    return list;
  }, [students, transactions, isAdmin, readIds]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllRead = () => {
    const newSet = new Set(readIds);
    notifications.forEach((n) => newSet.add(n.id));
    setReadIds(newSet);
  };

  const handleItemClick = (item: NotificationItem) => {
    setReadIds((prev) => new Set(prev).add(item.id));
    if (item.student && onSelectStudent) {
      onSelectStudent(item.student);
    }
    if (item.linkTab) {
      onNavigateTab(item.linkTab);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Pemberitahuan"
        className={`relative p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-[#006130] text-white border-[#006130] shadow-xs'
            : 'bg-[#faf9f8] text-[#3f4940] border-[#becabd]/70 hover:bg-[#e9e8e7] hover:text-[#1a1c1c]'
        }`}
        title="Pemberitahuan & Aktivitas"
      >
        <span className="material-symbols-outlined text-[20px]">
          {unreadCount > 0 ? 'notifications_active' : 'notifications'}
        </span>

        {/* Pulse badge for unread */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-white text-[9px] font-extrabold items-center justify-center shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#becabd]/80 z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="px-4 py-3 bg-[#f4f3f2] border-b border-[#becabd]/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006130] text-lg">notifications</span>
              <h3 className="font-bold text-xs text-[#1a1c1c]">Pemberitahuan</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                  {unreadCount} Baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-[#005db5] hover:underline cursor-pointer"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-[#becabd]/30 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                <span className="material-symbols-outlined text-3xl text-gray-300 mb-1 block">
                  notifications_paused
                </span>
                Tidak ada pemberitahuan baru saat ini.
              </div>
            ) : (
              notifications.map((item) => {
                const getIcon = () => {
                  switch (item.type) {
                    case 'inactive_student':
                      return { icon: 'person_alert', bg: 'bg-amber-100 text-amber-800' };
                    case 'backup_reminder':
                      return { icon: 'settings_backup_restore', bg: 'bg-rose-100 text-rose-800' };
                    case 'recent_transaction':
                      return { icon: 'receipt_long', bg: 'bg-emerald-100 text-emerald-800' };
                    case 'goal_reached':
                      return { icon: 'emoji_events', bg: 'bg-indigo-100 text-indigo-800' };
                    default:
                      return { icon: 'cloud_done', bg: 'bg-blue-100 text-blue-800' };
                  }
                };

                const iconStyle = getIcon();

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 flex items-start gap-3 hover:bg-[#faf9f8] transition-colors cursor-pointer text-left ${
                      item.unread ? 'bg-[#006130]/5' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${iconStyle.bg}`}
                    >
                      <span className="material-symbols-outlined text-base">{iconStyle.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-[#1a1c1c] truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#3f4940] leading-snug line-clamp-2">
                        {item.message}
                      </p>
                    </div>

                    {item.unread && (
                      <span className="w-2 h-2 rounded-full bg-[#006130] shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[#faf9f8] border-t border-[#becabd]/40 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigateTab(isAdmin ? 'history' : 'student-portal-history');
              }}
              className="text-xs font-bold text-[#006130] hover:text-[#107c41] hover:underline cursor-pointer"
            >
              Lihat Seluruh Riwayat Aktivitas &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
