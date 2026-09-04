import React from 'react';

interface SappyLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
  textColor?: string;
  color?: string;
  subtext?: string;
}

export const SappyLogoMark: React.FC<{ size?: number | string; className?: string; color?: string }> = ({
  size = 32,
  className = '',
  color = 'currentColor',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      {/* Outer Circle */}
      <circle cx="50" cy="50" r="44" stroke={color} strokeWidth="5.5" strokeLinejoin="round" />
      {/* Central Dot */}
      <circle cx="50" cy="26" r="3.6" fill={color} />
      {/* V-Stem / Pen lines */}
      <path
        d="M 33 10.5 L 49.5 93.8 L 67 10.5"
        stroke={color}
        strokeWidth="4.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Flowing Ribbon Loops */}
      <path
        d="M 12 36.5 C 12 18 36 10 50 10 C 68 10 88 22 88 43.5 C 88 56 78 66 65 66 C 44 66 22 47 22 36 C 22 25 36 17 50 17"
        stroke={color}
        strokeWidth="4.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right lower curve */}
      <path
        d="M 68 43.5 C 78 50 78 64 68 70 C 60 74 54 68 53.5 61"
        stroke={color}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const SappyLogo: React.FC<SappyLogoProps> = ({
  size = 36,
  className = '',
  showText = true,
  textColor = 'text-slate-900',
  color = '#284228',
  subtext = 'stationery & printing.',
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <SappyLogoMark size={size} color={color} />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold text-base tracking-wider uppercase ${textColor}`}>
            SAPPY
          </span>
          <span className="text-[10px] italic font-serif opacity-85 leading-none tracking-tight">
            {subtext}
          </span>
        </div>
      )}
    </div>
  );
};
