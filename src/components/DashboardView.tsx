import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { Student, Transaction } from '../types';
import { formatRupiah, getSavingsBreakdown } from '../utils/formatters';
import { InactiveStudentsNotification } from './InactiveStudentsNotification';

interface DashboardViewProps {
  students: Student[];
  transactions: Transaction[];
  onOpenReport: () => void;
  onOpenNewTransaction: (type?: 'deposit' | 'withdrawal') => void;
  onViewAllHistory: () => void;
  onSelectStudent: (student: Student) => void;
  onNavigateToStudents?: () => void;
  onNavigateToClasses?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  transactions,
  onOpenReport,
  onOpenNewTransaction,
  onViewAllHistory,
  onSelectStudent,
  onNavigateToStudents,
  onNavigateToClasses,
}) => {
  const [chartPeriod, setChartPeriod] = useState<'30days' | '90days' | 'year'>('30days');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [barChartMode, setBarChartMode] = useState<'total' | 'breakdown' | 'average'>('total');

  // Compute live metrics from data
  const totalStudentsCount = 1248 + (students.length - 8);
  const totalBalance = students.reduce((acc, s) => acc + s.balance, 450200000);
  
  // Calculate today's deposits and withdrawals
  const todayTransactions = transactions.filter((t) => t.date >= '2023-10-24');
  const depositsToday = todayTransactions
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 12500000);
  const withdrawalsToday = todayTransactions
    .filter((t) => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 3200000);

  // Chart data points
  const lineData = [
    { label: '1 Sep', value: 420 },
    { label: '5 Sep', value: 425 },
    { label: '10 Sep', value: 422 },
    { label: '15 Sep', value: 430 },
    { label: '20 Sep', value: 438 },
    { label: '25 Sep', value: 445 },
    { label: '30 Sep', value: 450.2 },
  ];

  const minVal = 415;
  const maxVal = 460;
  const chartHeight = 260;
  const chartWidth = 600;
  const paddingX = 40;
  const paddingY = 20;

  const points = lineData.map((d, index) => {
    const x = paddingX + (index / (lineData.length - 1)) * (chartWidth - 2 * paddingX);
    const y = chartHeight - paddingY - ((d.value - minVal) / (maxVal - minVal)) * (chartHeight - 2 * paddingY);
    return { ...d, x, y };
  });

  const pathD = points.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  // Aggregate class savings data for Recharts Bar Chart
  const classBreakdownData = useMemo(() => {
    const defaultClasses = [
      { name: 'Kelas 10A', target: 90000000, color: '#006130' },
      { name: 'Kelas 10B', target: 80000000, color: '#107c41' },
      { name: 'Kelas 10 MIPA 1', target: 90000000, color: '#005db5' },
      { name: 'Kelas 11A', target: 100000000, color: '#4b4d8e' },
      { name: 'Kelas 11B', target: 85000000, color: '#62a1fe' },
      { name: 'Kelas 12 IPA', target: 115000000, color: '#2a9d8f' },
      { name: 'Kelas 12 IPS', target: 95000000, color: '#e76f51' },
    ];

    const classMap = new Map<string, {
      name: string;
      totalBalance: number;
      studentsCount: number;
      target: number;
      color: string;
    }>();

    defaultClasses.forEach((c) => {
      classMap.set(c.name, {
        name: c.name,
        totalBalance: 0,
        studentsCount: 0,
        target: c.target,
        color: c.color,
      });
    });

    students.forEach((s) => {
      const cName = s.className || 'Lainnya';
      if (!classMap.has(cName)) {
        classMap.set(cName, {
          name: cName,
          totalBalance: 0,
          studentsCount: 0,
          target: 80000000,
          color: '#006130',
        });
      }
      const item = classMap.get(cName)!;
      item.totalBalance += s.balance;
      item.studentsCount += 1;
    });

    const baseMockAmounts: Record<string, { balance: number; count: number }> = {
      'Kelas 10A': { balance: 78500000, count: 36 },
      'Kelas 10B': { balance: 64200000, count: 34 },
      'Kelas 10 MIPA 1': { balance: 82000000, count: 35 },
      'Kelas 11A': { balance: 95400000, count: 36 },
      'Kelas 11B': { balance: 71800000, count: 33 },
      'Kelas 12 IPA': { balance: 110300000, count: 38 },
      'Kelas 12 IPS': { balance: 88000000, count: 36 },
    };

    return Array.from(classMap.values()).map((c) => {
      const mock = baseMockAmounts[c.name];
      const total = c.totalBalance > 0 ? c.totalBalance : (mock?.balance || 55000000);
      const count = c.studentsCount > 0 ? c.studentsCount : (mock?.count || 32);
      const breakdown = getSavingsBreakdown(total);
      const average = Math.round(total / (count || 1));
      const percentage = Math.min(Math.round((total / c.target) * 100), 100);

      return {
        name: c.name,
        totalBalance: total,
        availableBalance: breakdown.available,
        lockedBalance: breakdown.locked,
        averageBalance: average,
        studentsCount: count,
        target: c.target,
        percentage,
        color: c.color,
        totalInMillions: Number((total / 1000000).toFixed(2)),
        availableInMillions: Number((breakdown.available / 1000000).toFixed(2)),
        lockedInMillions: Number((breakdown.locked / 1000000).toFixed(2)),
        avgInMillions: Number((average / 1000000).toFixed(2)),
      };
    });
  }, [students]);

  // Aggregate stats from class data
  const totalClassSavings = useMemo(() => {
    return classBreakdownData.reduce((acc, c) => acc + c.totalBalance, 0);
  }, [classBreakdownData]);

  const highestClass = useMemo(() => {
    if (classBreakdownData.length === 0) return null;
    return [...classBreakdownData].sort((a, b) => b.totalBalance - a.totalBalance)[0];
  }, [classBreakdownData]);

  const totalClassStudents = useMemo(() => {
    return classBreakdownData.reduce((acc, c) => acc + c.studentsCount, 0);
  }, [classBreakdownData]);

  const overallAvgPerStudent = useMemo(() => {
    return totalClassStudents > 0 ? Math.round(totalClassSavings / totalClassStudents) : 0;
  }, [totalClassSavings, totalClassStudents]);

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">Dashboard Overview</h2>
          <p className="text-sm text-[#3f4940] mt-1">Monitor real-time financial metrics and recent activities.</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {onNavigateToClasses && (
            <button
              onClick={onNavigateToClasses}
              className="flex-1 md:flex-none border border-[#006130] bg-[#006130]/5 text-[#006130] hover:bg-[#006130]/15 transition-all duration-150 px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">meeting_room</span>
              <span>Menu Kelas</span>
            </button>
          )}
          {onNavigateToStudents && (
            <button
              onClick={onNavigateToStudents}
              className="flex-1 md:flex-none border border-[#becabd] text-[#3f4940] hover:bg-[#e9e8e7] hover:text-[#1a1c1c] transition-all duration-150 px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">groups</span>
              <span>Data Siswa</span>
            </button>
          )}
          <button
            onClick={onOpenReport}
            className="flex-1 md:flex-none border border-[#005db5] text-[#005db5] hover:bg-[#d6e3ff]/60 transition-all duration-150 px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Cetak Laporan</span>
          </button>
          <button
            onClick={() => onOpenNewTransaction('deposit')}
            className="flex-1 md:flex-none bg-[#006130] text-[#ffffff] hover:bg-[#107c41] transition-all duration-150 px-4 py-2.5 rounded-lg font-semibold text-sm shadow-xs hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Tambah Setoran</span>
          </button>
        </div>
      </div>

      {/* Inactive Students Notification (Belum Menabung > 30 Hari) */}
      <InactiveStudentsNotification
        students={students}
        transactions={transactions}
        onSelectStudent={onSelectStudent}
        onOpenNewTransaction={onOpenNewTransaction}
      />

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Stat 1: Total Students */}
        <div
          onClick={onNavigateToStudents}
          className="bg-[#ffffff] p-6 rounded-xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:border-[#006130] transition-colors cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[64px] text-[#006130]">groups</span>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#3f4940] mb-2">Total Students</h3>
            <span className="material-symbols-outlined text-xs text-[#006130] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
          </div>
          <p className="text-3xl font-bold text-[#1a1c1c] tracking-tight">{totalStudentsCount.toLocaleString('id-ID')}</p>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-[#006130] font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>+12 this month</span>
            </span>
            <span className="text-[#005db5] font-semibold text-[11px] hover:underline">Kelola &rarr;</span>
          </div>
        </div>

        {/* Stat 2: Total Balance */}
        <div className="bg-[#ffffff] p-6 rounded-xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:border-[#006130]/40 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[64px] text-[#006130]">account_balance_wallet</span>
          </div>
          <h3 className="text-sm font-medium text-[#3f4940] mb-2">Total Balance</h3>
          <p className="text-3xl font-bold text-[#1a1c1c] tracking-tight">Rp 450.2M</p>
          <div className="mt-4 flex items-center gap-1.5 text-[#006130] text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span>+5.2% vs last month</span>
          </div>
        </div>

        {/* Stat 3: Deposits Today */}
        <div className="bg-[#ffffff] p-6 rounded-xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:border-[#006130]/40 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[64px] text-[#006130]">arrow_downward</span>
          </div>
          <h3 className="text-sm font-medium text-[#3f4940] mb-2">Deposits Today</h3>
          <p className="text-3xl font-bold text-[#1a1c1c] tracking-tight">Rp 12.5M</p>
          <div className="mt-4 flex items-center gap-1.5 text-[#3f4940] text-xs">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>Updated 10m ago</span>
          </div>
        </div>

        {/* Stat 4: Withdrawals Today */}
        <div className="bg-[#ffffff] p-6 rounded-xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:border-[#ba1a1a]/40 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[64px] text-[#ba1a1a]">arrow_upward</span>
          </div>
          <h3 className="text-sm font-medium text-[#3f4940] mb-2">Withdrawals Today</h3>
          <p className="text-3xl font-bold text-[#1a1c1c] tracking-tight">Rp 3.2M</p>
          <div className="mt-4 flex items-center gap-1.5 text-[#3f4940] text-xs">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>Updated 10m ago</span>
          </div>
        </div>
      </div>

      {/* Main Chart & Recent Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Card */}
        <div className="lg:col-span-2 bg-[#ffffff] p-6 rounded-xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col min-h-[420px]">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
            <div>
              <h3 className="text-lg font-bold text-[#1a1c1c]">Savings Growth (Last 30 Days)</h3>
              <p className="text-xs text-[#3f4940]">Pertumbuhan akumulasi total tabungan seluruh siswa</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-[#f4f3f2] p-1 border border-[#becabd]/40 text-xs">
                <button
                  onClick={() => setChartPeriod('30days')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    chartPeriod === '30days' ? 'bg-[#ffffff] text-[#006130] font-semibold shadow-2xs' : 'text-[#3f4940]'
                  }`}
                >
                  30H
                </button>
                <button
                  onClick={() => setChartPeriod('90days')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    chartPeriod === '90days' ? 'bg-[#ffffff] text-[#006130] font-semibold shadow-2xs' : 'text-[#3f4940]'
                  }`}
                >
                  3B
                </button>
                <button
                  onClick={() => setChartPeriod('year')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    chartPeriod === 'year' ? 'bg-[#ffffff] text-[#006130] font-semibold shadow-2xs' : 'text-[#3f4940]'
                  }`}
                >
                  1T
                </button>
              </div>
            </div>
          </div>

          {/* Interactive SVG Chart */}
          <div className="flex-1 w-full relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#006130" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#006130" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines & Y-Axis ticks */}
              {[420, 430, 440, 450, 455].map((val) => {
                const y = chartHeight - paddingY - ((val - minVal) / (maxVal - minVal)) * (chartHeight - 2 * paddingY);
                return (
                  <g key={val}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#e3e2e1"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 4}
                      fill="#3f4940"
                      fontSize="11"
                      textAnchor="end"
                      fontFamily="Inter"
                    >
                      {val}M
                    </text>
                  </g>
                );
              })}

              {/* Shaded Area */}
              <path d={areaD} fill="url(#growthGradient)" />

              {/* Smooth Trend Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#006130"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points & tooltips */}
              {points.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.label === pt.label ? 6 : 4}
                    fill="#ffffff"
                    stroke="#006130"
                    strokeWidth={hoveredPoint?.label === pt.label ? 3 : 2}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* X Axis labels */}
                  <text
                    x={pt.x}
                    y={chartHeight - 4}
                    fill="#3f4940"
                    fontSize="11"
                    textAnchor="middle"
                    fontFamily="Inter"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                className="absolute pointer-events-none bg-[#2f3130] text-[#ffffff] text-xs py-1.5 px-3 rounded-lg shadow-md font-medium -translate-x-1/2 -translate-y-full transition-all"
                style={{
                  left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                  top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                  marginTop: '-10px',
                }}
              >
                <div className="text-[10px] text-[#dadad9]">{hoveredPoint.label} 2023</div>
                <div className="font-bold text-sm text-[#96f7af]">Rp {hoveredPoint.value}M</div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities List */}
        <div className="bg-[#ffffff] p-6 rounded-xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-[#1a1c1c]">Recent Activities</h3>
              <button
                onClick={onViewAllHistory}
                className="text-xs font-semibold text-[#005db5] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>View All</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {transactions.slice(0, 5).map((tx) => {
                const isDeposit = tx.type === 'deposit';
                return (
                  <div
                    key={tx.id}
                    onClick={() => {
                      const found = students.find((s) => s.id === tx.studentId || s.name === tx.studentName);
                      if (found) onSelectStudent(found);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#f4f3f2] transition-colors cursor-pointer border border-transparent hover:border-[#becabd]/40 group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isDeposit
                            ? 'bg-[#107c41]/15 text-[#006130]'
                            : 'bg-[#ffdad6]/60 text-[#ba1a1a]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isDeposit ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1a1c1c] group-hover:text-[#006130] transition-colors leading-tight">
                          {isDeposit ? 'Deposit' : 'Withdrawal'}
                        </p>
                        <p className="text-xs text-[#3f4940] mt-0.5">
                          {tx.studentName} - {tx.className}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-sm font-bold leading-tight ${
                          isDeposit ? 'text-[#006130]' : 'text-[#ba1a1a]'
                        }`}
                      >
                        {isDeposit ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[11px] text-[#3f4940] mt-0.5">{tx.time || tx.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#becabd]/40 flex justify-between items-center text-xs text-[#3f4940]">
            <span>Total 124 transactions recorded</span>
            <button
              onClick={() => onOpenNewTransaction()}
              className="text-[#006130] font-semibold hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">add_circle</span>
              <span>Input Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabungan per Kelas (Class Savings Trend & Recharts Bar Chart) */}
      <div className="bg-[#ffffff] p-6 sm:p-7 rounded-xl border border-[#becabd]/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-[#becabd]/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006130] text-2xl">bar_chart</span>
              <h3 className="text-xl font-bold text-[#1a1c1c] tracking-tight">Tren Total Saldo Tabungan per Kelas</h3>
            </div>
            <p className="text-xs text-[#3f4940] mt-1">
              Visualisasi komparasi saldo akumulasi, alokasi 80/20, dan performa tabungan antar rombongan belajar
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-[#f4f3f2] p-1.5 rounded-xl border border-[#becabd]/40 text-xs">
            <button
              onClick={() => setBarChartMode('total')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                barChartMode === 'total'
                  ? 'bg-[#006130] text-[#ffffff] shadow-xs'
                  : 'text-[#3f4940] hover:text-[#1a1c1c] hover:bg-[#ffffff]/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">stacked_bar_chart</span>
              <span>Total Saldo</span>
            </button>
            <button
              onClick={() => setBarChartMode('breakdown')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                barChartMode === 'breakdown'
                  ? 'bg-[#006130] text-[#ffffff] shadow-xs'
                  : 'text-[#3f4940] hover:text-[#1a1c1c] hover:bg-[#ffffff]/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">pie_chart</span>
              <span>Aturan 80/20</span>
            </button>
            <button
              onClick={() => setBarChartMode('average')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                barChartMode === 'average'
                  ? 'bg-[#006130] text-[#ffffff] shadow-xs'
                  : 'text-[#3f4940] hover:text-[#1a1c1c] hover:bg-[#ffffff]/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">person</span>
              <span>Rata-rata / Siswa</span>
            </button>
          </div>
        </div>

        {/* Quick Highlights Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-[#f4f3f2]/70 p-3.5 rounded-xl border border-[#becabd]/30">
            <span className="text-[11px] text-[#3f4940] font-medium block">Total Seluruh Kelas</span>
            <span className="text-base sm:text-lg font-black text-[#006130] mt-0.5 block">
              {formatRupiah(totalClassSavings)}
            </span>
          </div>

          <div className="bg-[#f4f3f2]/70 p-3.5 rounded-xl border border-[#becabd]/30">
            <span className="text-[11px] text-[#3f4940] font-medium block">Kelas Teratas</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base sm:text-lg font-black text-[#005db5] truncate">
                {highestClass ? highestClass.name : '-'}
              </span>
              <span className="text-[11px] text-[#3f4940] font-semibold">
                ({highestClass ? formatRupiah(highestClass.totalBalance) : ''})
              </span>
            </div>
          </div>

          <div className="bg-[#f4f3f2]/70 p-3.5 rounded-xl border border-[#becabd]/30">
            <span className="text-[11px] text-[#3f4940] font-medium block">Rata-rata / Siswa</span>
            <span className="text-base sm:text-lg font-black text-[#1a1c1c] mt-0.5 block">
              {formatRupiah(overallAvgPerStudent)}
            </span>
          </div>

          <div className="bg-[#f4f3f2]/70 p-3.5 rounded-xl border border-[#becabd]/30">
            <span className="text-[11px] text-[#3f4940] font-medium block">Total Rombel</span>
            <span className="text-base sm:text-lg font-black text-[#1a1c1c] mt-0.5 block">
              {classBreakdownData.length} Rombongan Belajar
            </span>
          </div>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="w-full h-80 sm:h-96 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={classBreakdownData}
              margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
              barGap={barChartMode === 'breakdown' ? 6 : 4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e2e1" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#3f4940', fontSize: 11, fontWeight: 500 }}
                axisLine={{ stroke: '#becabd' }}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={45}
              />
              <YAxis
                tick={{ fill: '#3f4940', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `Rp ${val}M`}
                width={70}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0, 97, 48, 0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#1a1c1c] text-[#ffffff] p-3.5 rounded-xl shadow-xl border border-white/10 text-xs min-w-[230px] z-50">
                        <div className="flex items-center justify-between pb-2 border-b border-white/15 mb-2">
                          <span className="font-bold text-sm text-white flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-[#96f7af]">school</span>
                            {data.name}
                          </span>
                          <span className="bg-white/10 text-[#b6ffc5] px-2 py-0.5 rounded text-[11px] font-semibold">
                            {data.studentsCount} Siswa
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[#dadad9]">Total Saldo:</span>
                            <span className="font-bold text-[#96f7af] text-sm">{formatRupiah(data.totalBalance)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-[#b6ffc5] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">lock_open</span>
                              Bisa Dipakai (80%):
                            </span>
                            <span className="font-medium text-white">{formatRupiah(data.availableBalance)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-[#ffdad6] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">lock</span>
                              Terkunci (20%):
                            </span>
                            <span className="font-medium text-white">{formatRupiah(data.lockedBalance)}</span>
                          </div>
                          <div className="pt-1.5 mt-1 border-t border-white/10 flex justify-between items-center text-[11px] text-[#dadad9]">
                            <span>Rata-rata / Siswa:</span>
                            <span className="font-semibold text-white">{formatRupiah(data.averageBalance)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 15, fontSize: 12 }}
                formatter={(value) => <span className="text-xs font-semibold text-[#3f4940]">{value}</span>}
              />

              {barChartMode === 'total' && (
                <Bar
                  dataKey="totalInMillions"
                  name="Total Saldo (Juta Rupiah)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                >
                  {classBreakdownData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || '#006130'}
                    />
                  ))}
                </Bar>
              )}

              {barChartMode === 'breakdown' && (
                <>
                  <Bar
                    dataKey="availableInMillions"
                    name="Tersedia 80% (Juta Rp)"
                    fill="#006130"
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="lockedInMillions"
                    name="Terkunci 20% (Juta Rp)"
                    fill="#ba1a1a"
                    stackId="a"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </>
              )}

              {barChartMode === 'average' && (
                <Bar
                  dataKey="avgInMillions"
                  name="Rata-rata per Siswa (Juta Rp)"
                  fill="#005db5"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Class Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
          {classBreakdownData.map((c) => {
            return (
              <div
                key={c.name}
                className="p-4 rounded-xl bg-[#f4f3f2]/60 border border-[#becabd]/40 hover:bg-[#ffffff] hover:shadow-sm transition-all"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-sm text-[#1a1c1c] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                    {c.name}
                  </span>
                  <span className="text-xs font-semibold text-[#3f4940] bg-white px-2 py-0.5 rounded-md border border-[#becabd]/40">
                    {c.studentsCount} Siswa
                  </span>
                </div>

                <div className="text-lg font-black text-[#006130] mt-1">{formatRupiah(c.totalBalance)}</div>

                {/* 80/20 Mini Pill Indicators */}
                <div className="flex items-center gap-2 my-2 text-[11px]">
                  <div className="flex-1 bg-[#107c41]/10 text-[#006130] px-2 py-1 rounded-md font-semibold flex items-center justify-between">
                    <span className="text-[10px]">Bisa:</span>
                    <span>{formatRupiah(c.availableBalance)}</span>
                  </div>
                  <div className="flex-1 bg-[#ba1a1a]/10 text-[#ba1a1a] px-2 py-1 rounded-md font-semibold flex items-center justify-between">
                    <span className="text-[10px]">Kunci:</span>
                    <span>{formatRupiah(c.lockedBalance)}</span>
                  </div>
                </div>

                <div className="w-full bg-[#e3e2e1] h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-[#3f4940]">
                  <span>Target: {formatRupiah(c.target)}</span>
                  <span className="font-bold text-[#006130]">{c.percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
