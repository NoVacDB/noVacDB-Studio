import React from 'react';
import { DBError } from '../types';

interface ErrorPanelProps {
  error: DBError;
  onJumpToError?: () => void;
  onReconnect?: () => void;
  isConnectionLost?: boolean;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({
  error,
  onJumpToError,
  onReconnect,
  isConnectionLost,
}) => {
  const isConnLost =
    isConnectionLost ||
    error.message.toLowerCase().includes('connection refused') ||
    error.message.toLowerCase().includes('broken pipe') ||
    error.message.toLowerCase().includes('connection lost') ||
    error.message.toLowerCase().includes('server closed connection') ||
    error.code === '57P01';

  return (
    <div
      className="p-4 rounded-[4px] border m-3 flex flex-col gap-3 select-none"
      style={{
        backgroundColor: 'var(--status-error-bg)',
        borderColor: 'var(--status-error-border)',
        color: 'var(--status-error)',
      }}
    >
      {/* Header with error tags */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--status-error)' }}
          />
          <span className="text-xs font-medium uppercase tracking-wider">
            {error.severity || 'ERROR'}
          </span>
          {error.code && (
            <span
              className="text-[11px] font-mono px-1.5 py-0.5 rounded-[3px] border"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--status-error-border)',
                color: 'var(--status-error)',
              }}
            >
              SQLSTATE {error.code}
            </span>
          )}
          {error.position > 0 && (
            <span
              className="text-[11px] font-mono px-1.5 py-0.5 rounded-[3px] border"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              Position {error.position}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {error.position > 0 && onJumpToError && (
            <button
              type="button"
              onClick={onJumpToError}
              className="text-xs px-2.5 py-1 rounded-[4px] border transition-colors"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            >
              Highlight in editor
            </button>
          )}

          {isConnLost && onReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              className="text-xs px-3 py-1 rounded-[4px] font-medium transition-colors"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
              }}
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Connection Lost Alert Banner if applicable */}
      {isConnLost && (
        <div
          className="p-2.5 rounded-[4px] border text-xs flex items-center justify-between"
          style={{
            backgroundColor: 'var(--bg-app)',
            borderColor: 'var(--status-error-border)',
            color: 'var(--status-error)',
          }}
        >
          <span>Connection lost to the server. Your editor text has been preserved.</span>
          {onReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              className="underline text-xs ml-2 cursor-pointer"
            >
              Reconnect now
            </button>
          )}
        </div>
      )}

      {/* Main Error Message */}
      <div
        className="text-xs font-mono whitespace-pre-wrap leading-relaxed p-2.5 rounded-[4px] border break-words"
        style={{
          backgroundColor: 'var(--bg-app)',
          borderColor: 'var(--status-error-border)',
          color: 'var(--status-error)',
        }}
      >
        {error.message}
      </div>

      {/* DETAIL (if present) */}
      {error.detail && (
        <div
          className="text-xs font-mono p-2.5 rounded-[4px] border leading-relaxed break-words"
          style={{
            backgroundColor: 'var(--bg-app)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        >
          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            DETAIL:{' '}
          </span>
          <span>{error.detail}</span>
        </div>
      )}

      {/* HINT (if present) */}
      {error.hint && (
        <div
          className="text-xs font-mono p-2.5 rounded-[4px] border leading-relaxed break-words"
          style={{
            backgroundColor: 'var(--status-warning-bg)',
            borderColor: 'var(--status-warning-border)',
            color: 'var(--status-warning)',
          }}
        >
          <span className="font-bold">HINT: </span>
          <span>{error.hint}</span>
        </div>
      )}
    </div>
  );
};
