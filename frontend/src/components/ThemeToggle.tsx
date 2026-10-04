import React from 'react';
import { ThemePreference, useTheme } from '../lib/theme';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { preference, setPreference } = useTheme();

  const options: { id: ThemePreference; label: string }[] = [
    { id: 'system', label: 'Auto' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ];

  return (
    <div
      className={`inline-flex items-center rounded-[4px] p-0.5 border text-xs select-none ${className}`}
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border)',
      }}
      role="group"
      aria-label="Theme selection"
    >
      {options.map((opt) => {
        const isActive = preference === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setPreference(opt.id)}
            className="px-2 py-0.5 text-[11px] rounded-[3px] transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--btn-primary-bg)' : 'transparent',
              color: isActive ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
