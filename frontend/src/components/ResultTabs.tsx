import React, { useState, useEffect } from 'react';
import { QueryExecutionResult } from '../types';
import { ResultGrid } from './ResultGrid';
import { ErrorPanel } from './ErrorPanel';

interface ResultTabsProps {
  executionResult: QueryExecutionResult;
  onJumpToError?: () => void;
  onReconnect?: () => void;
}

export const ResultTabs: React.FC<ResultTabsProps> = ({
  executionResult,
  onJumpToError,
  onReconnect,
}) => {
  const { results, error, totalDurationMs } = executionResult;
  const hasResults = results && results.length > 0;
  const hasError = !!error;

  const [activeTab, setActiveTab] = useState<number>(() => {
    if (hasError) return hasResults ? results.length : 0;
    const withCols = results?.findIndex((r) => r.columns && r.columns.length > 0);
    if (withCols !== undefined && withCols >= 0) return withCols;
    return 0;
  });

  useEffect(() => {
    if (hasError) {
      setActiveTab(hasResults ? results.length : 0);
    } else {
      const withCols = results?.findIndex((r) => r.columns && r.columns.length > 0);
      if (withCols !== undefined && withCols >= 0) {
        setActiveTab(withCols);
      } else {
        setActiveTab(0);
      }
    }
  }, [executionResult]);

  if (!hasResults && !hasError) {
    return (
      <div
        className="h-full flex items-center justify-center text-xs select-none"
        style={{ color: 'var(--text-muted)' }}
      >
        No results returned
      </div>
    );
  }

  const errorTabIndex = hasResults ? results.length : 0;
  const isShowingError = hasError && (!hasResults || activeTab === errorTabIndex);

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden select-none"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text)',
      }}
    >
      {/* Tab Navigation Header */}
      <div
        className="h-8 px-3 border-b flex items-center justify-between shrink-0"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-1 overflow-x-auto">
          {hasResults &&
            results.map((res, idx) => {
              const isActive = activeTab === idx && !isShowingError;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className="px-2.5 py-0.5 text-xs rounded-[4px] border transition-colors flex items-center gap-1.5"
                  style={{
                    backgroundColor: isActive ? 'var(--bg-app)' : 'transparent',
                    borderColor: isActive ? 'var(--border)' : 'transparent',
                    color: isActive ? 'var(--text)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  <span className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    #{idx + 1}
                  </span>
                  <span>{res.commandTag || 'Result'}</span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    ({res.rowCount})
                  </span>
                </button>
              );
            })}

          {hasError && (
            <button
              type="button"
              onClick={() => setActiveTab(errorTabIndex)}
              className="px-2.5 py-0.5 text-xs rounded-[4px] border transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: isShowingError ? 'var(--status-error-bg)' : 'transparent',
                borderColor: isShowingError ? 'var(--status-error-border)' : 'transparent',
                color: 'var(--status-error)',
                fontWeight: isShowingError ? 500 : 400,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--status-error)' }}
              />
              <span>Error</span>
              {error.code && (
                <span className="text-[10px] font-mono">
                  [{error.code}]
                </span>
              )}
            </button>
          )}
        </div>

        <div className="text-[11px] font-mono shrink-0 pl-3" style={{ color: 'var(--text-secondary)' }}>
          Total: {totalDurationMs} ms
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-hidden relative" style={{ backgroundColor: 'var(--bg-app)' }}>
        {isShowingError && error ? (
          <div className="h-full overflow-y-auto">
            <ErrorPanel error={error} onJumpToError={onJumpToError} onReconnect={onReconnect} />
          </div>
        ) : hasResults && results[activeTab] ? (
          <ResultGrid result={results[activeTab]} />
        ) : null}
      </div>
    </div>
  );
};
