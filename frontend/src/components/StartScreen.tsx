import React from 'react';
import { ConnectionParams, SavedConnection, DBError } from '../types';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { APP_VERSION } from '../version';

interface StartScreenProps {
  savedConnections: SavedConnection[];
  onConnect: (params: ConnectionParams) => void;
  onOpenNewConnect: () => void;
  onOpenAbout: () => void;
  isConnecting: boolean;
  connectingTarget: string;
  connectError: DBError | null;
  onRetry: () => void;
  onClearError: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  savedConnections,
  onConnect,
  onOpenNewConnect,
  onOpenAbout,
  isConnecting,
  connectingTarget,
  connectError,
  onRetry,
  onClearError,
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-screen p-6 select-none"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* Top controls */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <ThemeToggle />
        <button
          type="button"
          onClick={onOpenAbout}
          className="text-xs transition-colors hover:underline px-2 py-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          About
        </button>
      </div>

      {/* Centered Brand Header */}
      <div className="flex flex-col items-center text-center">
        {/* Logo about 96px tall, keeping aspect ratio */}
        <Logo height={96} withText={false} />

        <h1
          className="mt-4 text-lg font-medium tracking-tight"
          style={{ color: 'var(--text)' }}
        >
          NoVacDB Studio
        </h1>

        <span
          className="mt-1 text-xs font-mono"
          style={{ color: 'var(--text-secondary)' }}
        >
          Version {APP_VERSION}
        </span>
      </div>

      {/* Main Container */}
      <div
        className="w-full max-w-md mt-6 rounded-[4px] border p-5 flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border)',
        }}
      >
        {isConnecting ? (
          /* Connecting State: small plain spinner and text */
          <div className="py-6 flex flex-col items-center justify-center gap-3">
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: 'var(--text)',
                borderTopColor: 'transparent',
              }}
            />
            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              Connecting to {connectingTarget}…
            </span>
          </div>
        ) : connectError ? (
          /* Connecting Failed State: show server error as-is in error color + Retry button */
          <div className="flex flex-col gap-3">
            <div
              className="p-3 rounded-[4px] border text-xs font-mono leading-relaxed break-words"
              style={{
                backgroundColor: 'var(--status-error-bg)',
                borderColor: 'var(--status-error-border)',
                color: 'var(--status-error)',
              }}
            >
              {connectError.code && (
                <div className="font-semibold mb-1">
                  SQLSTATE {connectError.code}
                </div>
              )}
              <div>{connectError.message}</div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={onClearError}
                className="px-3 py-1.5 text-xs rounded-[4px] border transition-colors"
                style={{
                  backgroundColor: 'var(--btn-secondary-bg)',
                  borderColor: 'var(--btn-secondary-border)',
                  color: 'var(--btn-secondary-text)',
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="px-4 py-1.5 text-xs rounded-[4px] font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          /* Normal State: Saved Connections or New Connection button */
          <div className="flex flex-col gap-3">
            {savedConnections.length > 0 ? (
              <>
                <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Saved Connections
                  </span>
                  <button
                    type="button"
                    onClick={onOpenNewConnect}
                    className="text-xs transition-colors hover:underline"
                    style={{ color: 'var(--text)' }}
                  >
                    + New Connection
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {savedConnections.map((conn) => (
                    <button
                      key={conn.id}
                      type="button"
                      onClick={() =>
                        onConnect({
                          host: conn.host,
                          port: conn.port,
                          user: conn.user,
                          database: conn.database,
                          password: '',
                        })
                      }
                      className="w-full text-left p-2.5 rounded-[4px] border transition-colors flex items-center justify-between group"
                      style={{
                        backgroundColor: 'var(--bg-app)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)',
                      }}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-medium truncate">
                          {conn.name}
                        </span>
                        <span className="text-[11px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                          {conn.user}@{conn.host}:{conn.port}/{conn.database}
                        </span>
                      </div>
                      <span className="text-xs shrink-0 font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                        Connect →
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-4 text-center flex flex-col items-center gap-3">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  No saved connections found.
                </p>
                <button
                  type="button"
                  onClick={onOpenNewConnect}
                  className="px-4 py-2 text-xs rounded-[4px] font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                  }}
                >
                  New Connection
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyboard Hint */}
      <div className="mt-6 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
        NoVacDB wire protocol client · Local desktop app
      </div>
    </div>
  );
};
