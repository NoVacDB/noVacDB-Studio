import React from 'react';
import logoImg from '../assets/logo.png';

interface LogoProps {
  height?: number; // e.g., 20, 48, 96
  withText?: boolean;
  textSize?: 'sm' | 'base' | 'lg' | 'xl';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  height = 20,
  withText = false,
  textSize = 'sm',
  className = '',
}) => {
  // Height classes / styles
  const isStartScreen = height >= 80;
  const isTopBar = height <= 24;

  const fontClasses = {
    sm: 'text-xs font-medium',
    base: 'text-sm font-medium',
    lg: 'text-base font-medium',
    xl: 'text-lg font-medium',
  }[textSize];

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* 
        In dark theme, if the logo has dark parts, it sits on a small rounded square 
        with the light panel color (#F5F5F5) behind it as requested in section 2.
      */}
      <div
        className="flex items-center justify-center rounded-[4px] shrink-0 overflow-hidden"
        style={{
          backgroundColor: 'var(--logo-bg)',
          padding: isTopBar ? '1px' : isStartScreen ? '6px' : '3px',
        }}
      >
        <img
          src={logoImg}
          alt="NoVacDB Studio"
          style={{ height: `${height}px`, width: 'auto' }}
          className="object-contain block"
        />
      </div>

      {withText && (
        <span
          className={`tracking-tight ${fontClasses}`}
          style={{ color: 'var(--text)', fontFamily: 'var(--font-ui)' }}
        >
          NoVacDB Studio
        </span>
      )}
    </div>
  );
};
