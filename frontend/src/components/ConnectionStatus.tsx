import React from 'react';
import { ConnectionStatus as IConnectionStatus } from '../types';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface ConnectionStatusProps {
  status: IConnectionStatus;
  onOpenConnect: () => void;
  onDisconnect: () => void;
  onOpenAbout?: () => void;
  disconnecting?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  onOpenConnect,
  onDisconnect,
  onOpenAbout,
  disconnecting = false,
}) => {
  return (
    <div className="flex items-center justify-between w-full h-full select-none">
      {/* Top-left: Logo (~20px tall) + "NoVacDB Studio" */}
      <div className="flex items-center gap-4">
        <Logo height={20} withText={true} textSize="sm" />

        <div className="h-4 w-px" style={{ backgroundColor: 'var(--border)' }} />

        {/* Connection info */}
        {status.connected ? (
          <div className="flex items-center gap-2 text-xs">
            {/* Status dot */}
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--status-success)' }}
              title="Connected"
            />
            <span className="font-medium" style={{ color: 'var(--status-success)' }}>
              Connected
            </span>
            <span style={{ color: 'var(--border-strong)' }}>|</span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--text)' }}>
              {status.database}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>on</span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--text)' }}>
              {status.host}:{status.port}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>as</span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--text)' }}>
              {status.user}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--text-muted)' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>Not connected</span>
          </div>
        )}
      </div>

      {/* Top-right actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {onOpenAbout && (
          <button
            type="button"
            onClick={onOpenAbout}
            className="px-2.5 py-1 text-xs rounded-[4px] border transition-colors"
            style={{
              backgroundColor: 'var(--btn-secondary-bg)',
              borderColor: 'var(--btn-secondary-border)',
              color: 'var(--btn-secondary-text)',
            }}
          >
            About
          </button>
        )}

        {status.connected ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={disconnecting}
            className="px-2.5 py-1 text-xs rounded-[4px] border transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--btn-secondary-bg)',
              borderColor: 'var(--btn-secondary-border)',
              color: 'var(--btn-secondary-text)',
            }}
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenConnect}
            className="px-3 py-1 text-xs rounded-[4px] font-medium transition-colors"
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
            }}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
};
