import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserSession,
  Student,
  Transaction,
  SchoolInfo,
  ClassInfo,
  TransactionType,
  NavigationTab,
} from './types';
import {
  INITIAL_STUDENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_SCHOOL_INFO,
  INITIAL_CLASSES,
} from './data/mockData';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { ClassesView } from './components/ClassesView';
import { StudentsView } from './components/StudentsView';
import { TransactionInputView } from './components/TransactionInputView';
import { HistoryView } from './components/HistoryView';
import { StudentProfileView } from './components/StudentProfileView';
import { StudentPortalView } from './components/StudentPortalView';
import { ReportGenerateView } from './components/ReportGenerateView';
import { UserGuideView } from './components/UserGuideView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { LoginView } from './components/LoginView';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer, showToast } from './components/Toast';
import { DigitalClockAndDate } from './components/DigitalClockAndDate';
import { NotificationDropdown } from './components/NotificationDropdown';
import {
  fetchFromAppsScript,
  saveTransactionToAppsScript,
  saveStudentToAppsScript,
  deleteStudentFromAppsScript,
  saveClassToAppsScript,
  syncAllToAppsScript,
  getStoredAppsScriptConfig,
} from './services/appsScriptApi';
import {
  loadAccountWorkspace,
  saveAccountWorkspace,
} from './utils/workspaceStorage';

export default function App() {
  // Persistence state
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('tp_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    // Default active user session for instant preview
    return {
      role: 'admin',
      name: 'Siti Rahmawati (Bendahara)',
      nisnOrEmail: 'admin.siti@bintanggemilang.sch.id',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCFjn6lH32yAUrvZmJPLsf3nI-q1tIaonsaPQXroil8Cspc1anf9uM82rG6yhC8IPO6ivZN9_TxJc_M_fVjT9gIL-ma0VWaKTFhIxAi1R2DZky4Zy4spweYUvTyFbDdZvyMFX2sUqR6JXJ0XNy-QE7OpxdJczirH91jw7uv4KB-8kB-RsISksG59GD-Mre_4PlQopbCdulFRXEwWkxZjm4AXtg4BJ58NljC56Zp23ny1KfY-PbN5dkz',
    };
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('tp_students');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return INITIAL_STUDENTS;
  });

  const [classes, setClasses] = useState<ClassInfo[]>(() => {
    const saved = localStorage.getItem('tp_classes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return INITIAL_CLASSES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('tp_transactions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(() => {
    const saved = localStorage.getItem('tp_school_info');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return INITIAL_SCHOOL_INFO;
  });

  // UI Navigation states
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    return user?.role === 'student' ? 'student-portal-balance' : 'dashboard';
  });

  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student>(
    students[0] || INITIAL_STUDENTS[0]
  );
  const [initialTxStudent, setInitialTxStudent] = useState<Student | null>(null);
  const [initialTxType, setInitialTxType] = useState<TransactionType>('deposit');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackendSyncing, setIsBackendSyncing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'idle' | 'error'>('idle');

  // Enforce role-based route guard
  useEffect(() => {
    if (user?.role === 'student') {
      if (
        activeTab === 'dashboard' ||
        activeTab === 'classes' ||
        activeTab === 'students' ||
        activeTab === 'transactions' ||
        activeTab === 'report' ||
        activeTab === 'profile' ||
        activeTab === 'history'
      ) {
        setActiveTab('student-portal-balance');
      }
    } else if (user?.role === 'admin') {
      if (
        activeTab === 'student-portal-balance' ||
        activeTab === 'student-portal-history' ||
        activeTab === 'student-portal-profile'
      ) {
        setActiveTab('dashboard');
      }
    }
  }, [user?.role, activeTab]);

  // Current logged in student resolver
  const currentStudent =
    students.find(
      (s) => s.id === user?.studentId || s.nisn === user?.nisnOrEmail || s.name === user?.name
    ) ||
    students[0] ||
    INITIAL_STUDENTS[0];

  // Sync to local storage & multi-tenant isolated workspace
  useEffect(() => {
    if (user) {
      localStorage.setItem('tp_user_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('tp_user_session');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('tp_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('tp_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('tp_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('tp_school_info', JSON.stringify(schoolInfo));
  }, [schoolInfo]);

  // Synchronize with active isolated account workspace
  useEffect(() => {
    const accId = user?.accountId || 'acc-default';
    saveAccountWorkspace(accId, {
      students,
      classes,
      transactions,
      schoolInfo,
    });
  }, [user?.accountId, students, classes, transactions, schoolInfo]);

  // Attempt initial sync from Apps Script backend on load
  const triggerBackendPull = useCallback(async (showNotif = false) => {
    setIsBackendSyncing(true);
    const res = await fetchFromAppsScript();
    setIsBackendSyncing(false);

    if (res.success && res.data) {
      setBackendStatus('connected');
      if (res.data.students && res.data.students.length > 0) {
        setStudents(res.data.students);
      }
      if (res.data.transactions && res.data.transactions.length > 0) {
        setTransactions(res.data.transactions);
      }
      if (res.data.schoolInfo && res.data.schoolInfo.name) {
        setSchoolInfo((prev) => ({ ...prev, ...res.data!.schoolInfo }));
      }
      if (showNotif) {
        showToast('Sinkronisasi Berhasil', 'Data terbaru dimuat dari backend Google Apps Script.');
      }
    } else {
      setBackendStatus('idle');
      if (showNotif) {
        showToast('Info Sinkronisasi', res.message || 'Menggunakan penyimpanan data lokal.', 'info');
      }
    }
  }, []);

  useEffect(() => {
    triggerBackendPull(false);
  }, [triggerBackendPull]);

  // Handlers
  const handleSaveTransaction = async (newTxData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...newTxData,
      id: `tx-${Date.now()}`,
    };

    // Update student's balance in local state
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === newTx.studentId || s.nisn === newTx.studentNisn) {
          const updatedBalance =
            newTx.type === 'deposit' ? s.balance + newTx.amount : s.balance - newTx.amount;
          return {
            ...s,
            balance: Math.max(0, updatedBalance),
          };
        }
        return s;
      })
    );

    // Add to transaction stream locally
    setTransactions((prev) => [newTx, ...prev]);

    // Asynchronously save to Google Apps Script backend if auto-sync enabled
    const config = getStoredAppsScriptConfig();
    if (config.autoSync) {
      setIsBackendSyncing(true);
      saveTransactionToAppsScript(newTx, config)
        .then((res) => {
          setIsBackendSyncing(false);
          if (res.success) {
            setBackendStatus('connected');
            showToast('Tersimpan di Apps Script', 'Transaksi telah direkam ke Google Sheets.');
          } else {
            setBackendStatus('idle');
          }
        })
        .catch(() => {
          setIsBackendSyncing(false);
        });
    }

    // Navigate to history to see the newly logged record
    setTimeout(() => {
      setActiveTab('history');
    }, 600);
  };

  const handleUpdateStudent = (updated: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedStudentForProfile(updated);
  };

  const handleImportStudents = (imported: Student[], mode: 'merge' | 'replace') => {
    let finalStudents: Student[] = [];

    if (mode === 'replace') {
      finalStudents = imported;
    } else {
      // Merge mode (upsert by NISN or ID)
      const existingMap = new Map<string, Student>();
      students.forEach((s) => existingMap.set(s.nisn || s.id, s));

      imported.forEach((imp) => {
        const key = imp.nisn || imp.id;
        if (existingMap.has(key)) {
          const old = existingMap.get(key)!;
          existingMap.set(key, {
            ...old,
            ...imp,
            id: old.id, // preserve ID
            avatarUrl: old.avatarUrl || imp.avatarUrl,
          });
        } else {
          existingMap.set(key, imp);
        }
      });

      finalStudents = Array.from(existingMap.values());
    }

    setStudents(finalStudents);
    if (finalStudents.length > 0) {
      setSelectedStudentForProfile(finalStudents[0]);
    }

    // Attempt sync to Apps Script if configured
    const config = getStoredAppsScriptConfig();
    if (config.autoSync) {
      syncAllToAppsScript(
        {
          students: finalStudents,
          transactions,
          schoolInfo,
        },
        config
      ).then((res) => {
        if (res.success) {
          setBackendStatus('connected');
        }
      });
    }
  };

  const handleSaveStudent = (newOrUpdated: Student) => {
    setStudents((prev) => {
      const exists = prev.some((s) => s.id === newOrUpdated.id || s.nisn === newOrUpdated.nisn);
      if (exists) {
        return prev.map((s) =>
          s.id === newOrUpdated.id || s.nisn === newOrUpdated.nisn ? newOrUpdated : s
        );
      }
      return [newOrUpdated, ...prev];
    });

    // Auto-sync to Apps Script
    const config = getStoredAppsScriptConfig();
    if (config.autoSync) {
      saveStudentToAppsScript(newOrUpdated, config).then((res) => {
        if (res.success) {
          setBackendStatus('connected');
          showToast('Data Tersinkron', `Data siswa ${newOrUpdated.name} tersimpan di Google Sheets.`);
        }
      });
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    const target = students.find((s) => s.id === studentId);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));

    // Auto-sync deletion to Apps Script
    const config = getStoredAppsScriptConfig();
    if (config.autoSync && target) {
      deleteStudentFromAppsScript(studentId, target.nisn, config).then((res) => {
        if (res.success) {
          setBackendStatus('connected');
        }
      });
    }
  };

  // Class Management Handlers
  const handleSaveClass = (classData: ClassInfo, oldName?: string) => {
    setClasses((prev) => {
      const exists = prev.some((c) => c.id === classData.id);
      if (exists) {
        return prev.map((c) => (c.id === classData.id ? classData : c));
      }
      return [...prev, classData];
    });

    // If class was renamed, update student references
    if (oldName && oldName !== classData.name) {
      setStudents((prev) =>
        prev.map((s) => (s.className === oldName ? { ...s, className: classData.name } : s))
      );
    }

    // Auto-sync to Apps Script
    const config = getStoredAppsScriptConfig();
    if (config.autoSync) {
      saveClassToAppsScript(classData, config).then((res) => {
        if (res.success) {
          setBackendStatus('connected');
        }
      });
    }
  };

  const handleDeleteClass = (classId: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== classId));
  };

  const handleResetData = () => {
    setStudents(INITIAL_STUDENTS);
    setClasses(INITIAL_CLASSES);
    setTransactions(INITIAL_TRANSACTIONS);
    setSchoolInfo(INITIAL_SCHOOL_INFO);
    setSelectedStudentForProfile(INITIAL_STUDENTS[0]);
    localStorage.clear();
    showToast('Data Direset', 'Semua data telah dikembalikan ke kondisi awal sistem.');
  };

  const handleRestoreData = (restored: {
    schoolInfo: SchoolInfo;
    classes: ClassInfo[];
    students: Student[];
    transactions: Transaction[];
  }) => {
    if (restored.schoolInfo) setSchoolInfo(restored.schoolInfo);
    if (restored.classes) setClasses(restored.classes);
    if (restored.students) {
      setStudents(restored.students);
      if (restored.students.length > 0) {
        setSelectedStudentForProfile(restored.students[0]);
      }
    }
    if (restored.transactions) setTransactions(restored.transactions);

    if (user?.accountId) {
      saveAccountWorkspace(user.accountId, {
        schoolInfo: restored.schoolInfo || schoolInfo,
        classes: restored.classes || classes,
        students: restored.students || students,
        transactions: restored.transactions || transactions,
      });
    }
  };

  const handleDataSynced = (data: {
    students?: Student[];
    transactions?: Transaction[];
    schoolInfo?: SchoolInfo;
  }) => {
    if (data.students && data.students.length > 0) setStudents(data.students);
    if (data.transactions && data.transactions.length > 0) setTransactions(data.transactions);
    if (data.schoolInfo) setSchoolInfo((prev) => ({ ...prev, ...data.schoolInfo }));
  };

  // If unauthenticated, render the login view
  if (!user) {
    return (
      <>
        <ToastContainer />
        <LoginView
          students={students}
          schoolInfo={schoolInfo}
          onLogin={(sess) => {
            const accId = sess.accountId || 'acc-default';
            const ws = loadAccountWorkspace(accId);
            setStudents(ws.students);
            setClasses(ws.classes);
            setTransactions(ws.transactions);
            setSchoolInfo(ws.schoolInfo);
            setUser(sess);
            if (sess.role === 'student') {
              setActiveTab('student-portal-balance');
            } else {
              setActiveTab('dashboard');
            }
          }}
        />
      </>
    );
  }

  // If in report view (admin only), render the dedicated high-focus report generator layout
  if (activeTab === 'report' && user.role === 'admin') {
    return (
      <>
        <ToastContainer />
        <ReportGenerateView
          students={students}
          transactions={transactions}
          schoolInfo={schoolInfo}
          onBack={() => setActiveTab('dashboard')}
          adminName={user.name}
        />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          schoolInfo={schoolInfo}
          onUpdateSchoolInfo={setSchoolInfo}
          onResetData={handleResetData}
          students={students}
          transactions={transactions}
          classes={classes}
          onDataSynced={handleDataSynced}
        />
      </>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-[#faf9f8] text-[#1a1c1c] flex">
      <ToastContainer />

      {/* Navigation (Sidebar on Desktop, Header on Mobile) */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTransaction={() => {
          setInitialTxStudent(null);
          setInitialTxType('deposit');
          setActiveTab('transactions');
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={() => {
          setUser(null);
          showToast('Telah Keluar', 'Sesi login telah diakhiri.');
        }}
        user={user}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        students={students}
        transactions={transactions}
        onSelectStudent={(std) => {
          setSelectedStudentForProfile(std);
          setActiveTab('students');
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 pt-16 md:pt-0">
        {/* Top Header Bar on Desktop - Clean, Smooth & Professional */}
        <header className="hidden md:flex justify-between items-center px-6 lg:px-8 h-18 border-b border-[#becabd]/60 bg-[#ffffff] sticky top-0 z-30 shadow-2xs backdrop-blur-xs">
          {/* Left Brand / School Info & Active Mode */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#006130]/10 flex items-center justify-center border border-[#006130]/20 text-[#006130]">
                <span className="material-symbols-outlined text-lg font-bold">account_balance</span>
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-[#006130] uppercase tracking-wide leading-tight">
                  {schoolInfo.name}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-[#6f7a6f] font-semibold">T.A 2023/2024</span>
                  <span className="text-[10px] text-gray-300">•</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                      isAdmin
                        ? 'bg-[#005db5]/10 text-[#005db5] border border-[#005db5]/20'
                        : 'bg-[#006130]/10 text-[#006130] border border-[#006130]/20'
                    }`}
                  >
                    {isAdmin ? 'Mode Bendahara' : `Siswa: ${user.name.split(' ')[0]}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Controls: Digital Clock & Date, Notifications, Quick Role Switch & User Profile */}
          <div className="flex items-center gap-3">
            {/* Digital Clock & Calendar Date */}
            <DigitalClockAndDate />

            {/* Notification Bell Dropdown */}
            <NotificationDropdown
              students={students}
              transactions={transactions}
              isAdmin={isAdmin}
              onNavigateTab={setActiveTab}
              onSelectStudent={(std) => {
                setSelectedStudentForProfile(std);
                setActiveTab('students');
              }}
            />

            {/* Apps Script Backend Pill Indicator (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => triggerBackendPull(true)}
                title="Klik untuk sinkronisasi dengan Google Apps Script"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#becabd]/60 bg-[#faf9f8] hover:bg-[#e9e8e7] text-xs font-semibold transition-colors cursor-pointer group shadow-2xs"
              >
                <span
                  className={`material-symbols-outlined text-sm ${
                    isBackendSyncing
                      ? 'animate-spin text-[#005db5]'
                      : backendStatus === 'connected'
                      ? 'text-[#006130]'
                      : 'text-[#6f7a6f]'
                  }`}
                >
                  {isBackendSyncing ? 'sync' : 'cloud_done'}
                </span>
                <span className="text-[11px] text-[#3f4940] group-hover:text-[#1a1c1c] hidden lg:inline">
                  Apps Script: {isBackendSyncing ? 'Sinkronisasi...' : 'Terkoneksi'}
                </span>
              </button>
            )}

            {/* Quick Switch Role Switcher */}
            <div className="flex items-center bg-[#faf9f8] p-0.5 rounded-xl border border-[#becabd]/80 shadow-2xs">
              <button
                onClick={() => {
                  if (isAdmin) {
                    const std = students[0] || INITIAL_STUDENTS[0];
                    setUser({
                      role: 'student',
                      name: std.name,
                      nisnOrEmail: std.nisn,
                      className: std.className,
                      studentId: std.id,
                      avatarUrl: std.avatarUrl,
                    });
                    setActiveTab('student-portal-balance');
                    showToast('Beralih ke Siswa', `Melihat tampilan portal siswa ${std.name}.`);
                  } else {
                    setUser({
                      role: 'admin',
                      name: 'Siti Rahmawati (Bendahara)',
                      nisnOrEmail: 'admin.siti@bintanggemilang.sch.id',
                      avatarUrl:
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuCFjn6lH32yAUrvZmJPLsf3nI-q1tIaonsaPQXroil8Cspc1anf9uM82rG6yhC8IPO6ivZN9_TxJc_M_fVjT9gIL-ma0VWaKTFhIxAi1R2DZky4Zy4spweYUvTyFbDdZvyMFX2sUqR6JXJ0XNy-QE7OpxdJczirH91jw7uv4KB-8kB-RsISksG59GD-Mre_4PlQopbCdulFRXEwWkxZjm4AXtg4BJ58NljC56Zp23ny1KfY-PbN5dkz',
                    });
                    setActiveTab('dashboard');
                    showToast('Beralih ke Admin', 'Menampilkan panel pengelolaan Administrator.');
                  }
                }}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAdmin
                    ? 'bg-[#005db5] hover:bg-[#004a93] text-white shadow-2xs'
                    : 'bg-[#006130] hover:bg-[#107c41] text-white shadow-2xs'
                }`}
              >
                <span className="material-symbols-outlined text-sm">switch_account</span>
                <span className="text-[11px] whitespace-nowrap">Ganti ke {isAdmin ? 'Siswa' : 'Admin'}</span>
              </button>
            </div>

            <div className="h-6 w-[1px] bg-[#becabd]/60" />

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 p-1 pr-3 rounded-full border border-[#becabd]/60 bg-[#faf9f8] shadow-2xs">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#becabd] shrink-0">
                <img
                  alt={user.name}
                  className="w-full h-full object-cover"
                  src={user.avatarUrl}
                />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#1a1c1c] leading-tight max-w-[130px] truncate">{user.name}</div>
                <div className="text-[10px] text-[#6f7a6f] leading-none">
                  {isAdmin ? 'Bendahara Sekolah' : user.className || 'Siswa'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* View Router with Smooth Motion Transitions */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">
          <AnimatePresence mode="wait">
            {/* ================= COMMON: BUKU PANDUAN APLIKASI ================= */}
            {activeTab === 'guide' && (
              <motion.div
                key="guide-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <UserGuideView
                  isAdmin={isAdmin}
                  students={students}
                  transactions={transactions}
                  classes={classes}
                  schoolInfo={schoolInfo}
                  onNavigateTab={(tab) => {
                    setActiveTab(tab as any);
                  }}
                  onOpenNewTransaction={() => {
                    setInitialTxStudent(null);
                    setInitialTxType('deposit');
                    setActiveTab('transactions');
                  }}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </motion.div>
            )}

            {/* ================= ROLE: SISWA ================= */}
            {!isAdmin && activeTab !== 'guide' && (
              <motion.div
                key="student-portal-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <StudentPortalView
                  student={currentStudent}
                  allTransactions={transactions}
                  schoolInfo={schoolInfo}
                  allStudents={students}
                  onSwitchStudent={(std) => {
                    setUser((prev) =>
                      prev
                        ? {
                            ...prev,
                            name: std.name,
                            nisnOrEmail: std.nisn,
                            className: std.className,
                            studentId: std.id,
                            avatarUrl: std.avatarUrl,
                          }
                        : null
                    );
                  }}
                  onLogout={() => {
                    setUser(null);
                    showToast('Telah Keluar', 'Sesi siswa telah diakhiri.');
                  }}
                />
              </motion.div>
            )}

            {/* ================= ROLE: ADMIN SEKOLAH ================= */}
            {isAdmin && activeTab === 'dashboard' && (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <DashboardView
                  students={students}
                  transactions={transactions}
                  onOpenReport={() => setActiveTab('report')}
                  onOpenNewTransaction={(type) => {
                    setInitialTxStudent(null);
                    setInitialTxType(type || 'deposit');
                    setActiveTab('transactions');
                  }}
                  onViewAllHistory={() => setActiveTab('history')}
                  onSelectStudent={(student) => {
                    setSelectedStudentForProfile(student);
                    setActiveTab('profile');
                  }}
                  onNavigateToStudents={() => setActiveTab('students')}
                  onNavigateToClasses={() => setActiveTab('classes')}
                />
              </motion.div>
            )}

            {isAdmin && activeTab === 'classes' && (
              <motion.div
                key="classes-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <ClassesView
                  classes={classes}
                  students={students}
                  transactions={transactions}
                  onSaveClass={handleSaveClass}
                  onDeleteClass={handleDeleteClass}
                  onSelectStudent={(student) => {
                    setSelectedStudentForProfile(student);
                    setActiveTab('profile');
                  }}
                  onNavigateToStudents={() => {
                    setActiveTab('students');
                  }}
                  onOpenTransactionForStudent={(student, type) => {
                    setInitialTxStudent(student);
                    setInitialTxType(type || 'deposit');
                    setActiveTab('transactions');
                  }}
                  onOpenReportForClass={() => {
                    setActiveTab('report');
                  }}
                  onOpenNewTransaction={(type) => {
                    setInitialTxStudent(null);
                    setInitialTxType(type || 'deposit');
                    setActiveTab('transactions');
                  }}
                />
              </motion.div>
            )}

            {isAdmin && activeTab === 'students' && (
              <motion.div
                key="students-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <StudentsView
                  students={students}
                  transactions={transactions}
                  classes={classes}
                  onSelectStudent={(student) => {
                    setSelectedStudentForProfile(student);
                    setActiveTab('profile');
                  }}
                  onOpenTransactionForStudent={(student, type) => {
                    setInitialTxStudent(student);
                    setInitialTxType(type || 'deposit');
                    setActiveTab('transactions');
                  }}
                  onImportStudents={handleImportStudents}
                  onSaveStudent={handleSaveStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onSaveClass={handleSaveClass}
                  onDeleteClass={handleDeleteClass}
                  onOpenReportForClass={() => {
                    setActiveTab('report');
                  }}
                />
              </motion.div>
            )}

            {isAdmin && activeTab === 'transactions' && (
              <motion.div
                key="transactions-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <TransactionInputView
                  students={students}
                  initialStudent={initialTxStudent}
                  initialType={initialTxType}
                  schoolName={schoolInfo.name}
                  adminName={user.name}
                  schoolInfo={schoolInfo}
                  onSaveTransaction={handleSaveTransaction}
                />
              </motion.div>
            )}

            {isAdmin && activeTab === 'history' && (
              <motion.div
                key="history-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <HistoryView
                  transactions={transactions}
                  students={students}
                  onOpenReport={() => setActiveTab('report')}
                  schoolInfo={schoolInfo}
                  adminName={user.name}
                />
              </motion.div>
            )}

            {isAdmin && activeTab === 'report' && (
              <motion.div
                key="report-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <ReportGenerateView
                  students={students}
                  transactions={transactions}
                  schoolInfo={schoolInfo}
                  onBack={() => setActiveTab('dashboard')}
                />
              </motion.div>
            )}

            {isAdmin && activeTab === 'profile' && (
              <motion.div
                key="profile-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <StudentProfileView
                  student={selectedStudentForProfile}
                  allTransactions={transactions}
                  allStudents={students}
                  onUpdateStudent={handleUpdateStudent}
                  onOpenDepositForStudent={(student) => {
                    setInitialTxStudent(student);
                    setInitialTxType('deposit');
                    setActiveTab('transactions');
                  }}
                  onOpenReport={() => setActiveTab('report')}
                  onExecuteAutoDebit={(student, amount, notes) => {
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];
                    const timeStr = now.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    // Update student balance & last debited
                    const updatedStudent: Student = {
                      ...student,
                      balance: student.balance + amount,
                      recurringSavings: student.recurringSavings
                        ? {
                            ...student.recurringSavings,
                            lastDebitedDate: dateStr,
                          }
                        : undefined,
                    };
                    handleUpdateStudent(updatedStudent);

                    // Add transaction
                    const newTx: Transaction = {
                      id: `tx-autodebit-${Date.now()}`,
                      studentId: student.id,
                      studentName: student.name,
                      studentNisn: student.nisn,
                      className: student.className,
                      type: 'deposit',
                      amount: amount,
                      date: dateStr,
                      time: timeStr,
                      status: 'success',
                      adminName: 'Sistem Autodebet Otomatis',
                      notes: notes || `Autodebet Tabungan Rutin Bulanan`,
                      category: 'Tabungan Rutin',
                    };
                    setTransactions((prev) => [newTx, ...prev]);
                    showToast('Autodebet Sukses', `Setoran rutin ${formatRupiah(amount)} berhasil diproses.`);
                  }}
                />
              </motion.div>
            )}

            {isAdmin && activeTab === 'backup' && (
              <motion.div
                key="backup-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <BackupRestoreView
                  schoolInfo={schoolInfo}
                  classes={classes}
                  students={students}
                  transactions={transactions}
                  user={user}
                  onRestoreData={handleRestoreData}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Settings Modal (Admin Only) */}
      {isAdmin && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          schoolInfo={schoolInfo}
          onUpdateSchoolInfo={setSchoolInfo}
          onResetData={handleResetData}
          students={students}
          transactions={transactions}
          classes={classes}
          onDataSynced={handleDataSynced}
        />
      )}
    </div>
  );
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
