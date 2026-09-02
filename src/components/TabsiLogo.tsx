import React from 'react';

export type LogoVariant = 'modern' | 'book' | 'wallet' | 'shield' | 'monogram';

interface TabsiLogoProps {
  variant?: LogoVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtext?: boolean;
  showByline?: boolean;
  iconOnly?: boolean;
  className?: string;
  theme?: 'light' | 'dark';
}

export const TabsiLogo: React.FC<TabsiLogoProps> = ({
  variant = 'modern',
  size = 'md',
  showSubtext = true,
  showByline = true,
  iconOnly = false,
  className = '',
  theme = 'light',
}) => {
  // Dimension scales
  const sizeMap = {
    sm: { iconSize: 28, textClass: 'text-base', subtextClass: 'text-[9px]', bylineClass: 'text-[8px]' },
    md: { iconSize: 40, textClass: 'text-xl', subtextClass: 'text-[10px]', bylineClass: 'text-[9px]' },
    lg: { iconSize: 52, textClass: 'text-2xl', subtextClass: 'text-xs', bylineClass: 'text-[10px]' },
    xl: { iconSize: 68, textClass: 'text-3xl', subtextClass: 'text-sm', bylineClass: 'text-xs' },
  };

  const { iconSize, textClass, subtextClass, bylineClass } = sizeMap[size];

  // SVG Icon Renderers for all 5 concepts (with Concept 1 Modern Minimalist as primary)
  const renderIcon = () => {
    switch (variant) {
      case 'book':
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 drop-shadow-xs"
          >
            <rect width="100" height="100" rx="24" fill="url(#blue_grad_book)" />
            {/* Coin Rp */}
            <circle cx="50" cy="30" r="16" fill="#84cc16" />
            <text x="50" y="36" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="14">
              Rp
            </text>
            {/* Open Book */}
            <path
              d="M20 70C30 65 42 66 50 72C58 66 70 65 80 70V50C70 45 58 46 50 52C42 46 30 45 20 50V70Z"
              fill="#ffffff"
            />
            <path
              d="M50 52V72"
              stroke="#0284c7"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="blue_grad_book" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0284c7" />
                <stop stopColor="#0369a1" />
              </linearGradient>
            </defs>
          </svg>
        );

      case 'wallet':
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 drop-shadow-xs"
          >
            <rect width="100" height="100" rx="24" fill="url(#teal_grad_wallet)" />
            {/* Wallet outline */}
            <rect x="22" y="38" width="56" height="38" rx="8" stroke="#ffffff" strokeWidth="5" fill="none" />
            <path d="M28 38V30C28 27.8 29.8 26 32 26H68C70.2 26 72 27.8 72 30V38" stroke="#ffffff" strokeWidth="4" />
            {/* TS Monogram */}
            <text x="36" y="63" fill="#ffffff" fontWeight="900" fontSize="16" letterSpacing="-1">
              TS
            </text>
            {/* Wallet Clasp */}
            <rect x="64" y="50" width="16" height="14" rx="4" fill="#ffffff" />
            <circle cx="70" cy="57" r="2.5" fill="#0d9488" />
            <defs>
              <linearGradient id="teal_grad_wallet" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#14b8a6" />
                <stop stopColor="#0f766e" />
              </linearGradient>
            </defs>
          </svg>
        );

      case 'shield':
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 drop-shadow-xs"
          >
            <rect width="100" height="100" rx="24" fill="url(#purple_grad_shield)" />
            {/* Shield Outline */}
            <path
              d="M50 20L76 30V52C76 68 50 82 50 82C50 82 24 68 24 52V30L50 20Z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Students + Chart Growth */}
            <circle cx="50" cy="40" r="6" fill="#ffffff" />
            <path d="M42 54C42 49 46 48 50 48C54 48 58 49 58 54" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            {/* Bars */}
            <rect x="42" y="66" width="4" height="6" rx="1" fill="#84cc16" />
            <rect x="48" y="62" width="4" height="10" rx="1" fill="#84cc16" />
            <rect x="54" y="58" width="4" height="14" rx="1" fill="#84cc16" />
            <defs>
              <linearGradient id="purple_grad_shield" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4338ca" />
                <stop stopColor="#312e81" />
              </linearGradient>
            </defs>
          </svg>
        );

      case 'monogram':
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 drop-shadow-xs"
          >
            <rect width="100" height="100" rx="24" fill="#0f172a" />
            {/* Circular Ring */}
            <circle cx="50" cy="50" r="32" stroke="#ffffff" strokeWidth="4" />
            {/* Person Head */}
            <circle cx="50" cy="36" r="4.5" fill="#38bdf8" />
            {/* T Bar & Stem */}
            <path d="M38 45H62" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M50 45V68" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
            {/* S Arc intertwining */}
            <path
              d="M58 50C54 47 45 47 45 54C45 61 58 59 58 66C58 72 48 73 42 69"
              stroke="#84cc16"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        );

      case 'modern':
      default:
        // Konsep 1: Modern Minimalis TS with Person Dot + Green Curve & Blue Smile
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 drop-shadow-xs"
          >
            {/* White Rounded Card Background */}
            <rect width="100" height="100" rx="22" fill="#ffffff" />
            <rect width="100" height="100" rx="22" stroke="#e2e8f0" strokeWidth="1.5" />

            {/* Person Dot (Head) */}
            <circle cx="58" cy="27" r="6" fill="#16a34a" />

            {/* Blue 'T' Component */}
            <path
              d="M26 38H52"
              stroke="#0284c7"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M39 38V66"
              stroke="#0284c7"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* Green 'S' / Growing curve intertwining */}
            <path
              d="M68 37C64 34 52 35 52 44C52 53 69 51 69 61C69 70 55 71 48 67"
              stroke="#16a34a"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />

            {/* Cheerful Bottom Blue Arc (Smile curve) */}
            <path
              d="M24 74C38 84 62 84 76 74"
              stroke="#0284c7"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        );
    }
  };

  if (iconOnly) {
    return <div className={`inline-flex items-center justify-center ${className}`}>{renderIcon()}</div>;
  }

  const textColorMain = theme === 'dark' ? 'text-white' : 'text-[#0f172a]';
  const subtextColor = theme === 'dark' ? 'text-gray-300' : 'text-[#334155]';
  const bylineColor = theme === 'dark' ? 'text-gray-400' : 'text-[#64748b]';
  const dividerColor = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {renderIcon()}

      <div className="flex flex-col justify-center text-left select-none">
        {/* Main Logo Text: TABSi */}
        <div className={`font-black tracking-tight leading-none flex items-baseline ${textClass}`}>
          <span className={textColorMain}>TAB</span>
          <span className="text-[#16a34a] font-extrabold">S</span>
          <span className="text-[#16a34a] font-extrabold relative inline-block">
            i
            <span className="w-1.5 h-1.5 bg-[#0284c7] rounded-full absolute -top-1 left-0 transform translate-x-0.5"></span>
          </span>
        </div>

        {/* Subtext: TABUNGAN SISWA */}
        {showSubtext && (
          <div
            className={`font-extrabold tracking-[0.22em] uppercase leading-tight mt-0.5 ${subtextClass} ${subtextColor}`}
          >
            TABUNGAN SISWA
          </div>
        )}

        {/* Byline: by MD2R */}
        {showByline && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`h-[1px] w-4 ${dividerColor}`}></div>
            <span className={`font-bold tracking-wider ${bylineClass} ${bylineColor}`}>
              by <span className="text-[#0284c7] font-black">MD2R</span>
            </span>
            <div className={`h-[1px] w-4 ${dividerColor}`}></div>
          </div>
        )}
      </div>
    </div>
  );
};
