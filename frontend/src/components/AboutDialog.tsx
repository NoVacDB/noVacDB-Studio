import React from 'react';
import { Logo } from './Logo';
import { APP_VERSION } from '../version';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[4px] p-6 shadow-xs select-none"
        style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <Logo height={56} withText={false} />
          
          <h2 className="mt-3 text-base font-medium tracking-tight" style={{ color: 'var(--text)' }}>
            NoVacDB Studio
          </h2>
          
          <p className="mt-0.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            Version {APP_VERSION}
          </p>

          <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            A local desktop app for working with NoVacDB, the database that speaks PostgreSQL wire protocol without VACUUM.
          </p>

          <div
            className="w-full mt-4 pt-3 border-t text-[11px] font-mono flex flex-col gap-1 text-left"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <div>Desktop: Wails v2 + Go 1.25</div>
            <div>Driver: pgx v5 (pgconn protocol)</div>
            <div>Frontend: React + TypeScript + CodeMirror 6</div>
          </div>

          <div className="mt-6 w-full flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs rounded-[4px] transition-colors"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
