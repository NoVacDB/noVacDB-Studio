import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught UI error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-screen w-screen flex-col items-center justify-center p-6 select-none"
          style={{
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <div
            className="max-w-md w-full rounded-[4px] border p-5 flex flex-col gap-3.5"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-2" style={{ color: 'var(--status-error)' }}>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--status-error)' }}
              />
              <h1 className="text-sm font-medium tracking-tight">An interface error occurred</h1>
            </div>
            <div
              className="p-3 rounded-[4px] border text-xs font-mono break-words"
              style={{
                backgroundColor: 'var(--status-error-bg)',
                borderColor: 'var(--status-error-border)',
                color: 'var(--status-error)',
              }}
            >
              {this.state.error?.message || 'Unknown runtime error'}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-3.5 py-1.5 text-xs font-medium rounded-[4px] transition-colors"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                }}
              >
                Reload UI
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
