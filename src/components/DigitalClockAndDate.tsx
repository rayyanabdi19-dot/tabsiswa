import React, { useState, useEffect } from 'react';

export const DigitalClockAndDate: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date: Senin, 01 September 2026
  const dateFormatted = now.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Hours, minutes, seconds formatted
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#faf9f8] border border-[#becabd]/70 text-[#1a1c1c] shadow-2xs hover:border-[#006130]/40 transition-colors">
      {/* Calendar Icon & Date */}
      <div className="flex items-center gap-1.5 text-xs text-[#3f4940] border-r border-[#becabd]/60 pr-2.5">
        <span className="material-symbols-outlined text-sm text-[#006130]">calendar_today</span>
        <span className="font-semibold text-[11px] whitespace-nowrap">{dateFormatted}</span>
      </div>

      {/* Clock Icon & Digital Time */}
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-sm text-[#005db5]">schedule</span>
        <div className="font-mono text-xs font-bold tracking-wider text-[#1a1c1c] flex items-center">
          <span className="text-[#006130] font-extrabold">{hours}</span>
          <span className="text-gray-400 animate-pulse mx-0.5">:</span>
          <span className="text-[#006130] font-extrabold">{minutes}</span>
          <span className="text-gray-400 text-[10px] mx-0.5">:</span>
          <span className="text-[11px] text-[#6f7a6f]">{seconds}</span>
          <span className="text-[9px] font-sans font-bold text-[#6f7a6f] ml-1 uppercase">WIB</span>
        </div>
      </div>
    </div>
  );
};
