import React, { useState, useEffect } from 'react';
import { ConnectionParams, ConnectionStatus, DBError, SavedConnection } from '../types';
import { connectToDatabase, testDatabaseConnection, fetchSavedPassword } from '../lib/api';

interface ConnectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (status: ConnectionStatus) => void;
  onSaveConnection?: (conn: SavedConnection, password?: string) => void;
  initialParams?: ConnectionParams;
  connectionId?: string;
  initialRememberPassword?: boolean;
}

export const ConnectForm: React.FC<ConnectFormProps> = ({
  isOpen,
  onClose,
  onConnected,
  onSaveConnection,
  initialParams,
  connectionId,
  initialRememberPassword = false,
}) => {
  const [params, setParams] = useState<ConnectionParams>(
    initialParams || {
      host: 'localhost',
      port: 5433,
      user: 'vikrant',
      database: 'demo',
      password: '',
    }
  );

  const [connectionName, setConnectionName] = useState('');
  const [saveConnection, setSaveConnection] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(initialRememberPassword);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [serverVersion, setServerVersion] = useState('');
  const [error, setError] = useState<DBError | null>(null);

  useEffect(() => {
    if (initialParams) {
      setParams(initialParams);
    }
    setRememberPassword(initialRememberPassword);

    // If a saved connection ID with saved credentials is provided, fetch stored password
    if (connectionId && initialRememberPassword) {
      fetchSavedPassword(connectionId)
        .then((pwd) => {
          if (pwd) {
            setParams((prev) => ({ ...prev, password: pwd }));
          }
        })
        .catch((err) => console.error('Failed to load saved password:', err));
    }
  }, [initialParams, connectionId, initialRememberPassword, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams((prev) => ({
      ...prev,
      [name]: name === 'port' ? (parseInt(value, 10) || 0) : value,
    }));
    setError(null);
    setTestSuccess(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setTestSuccess(false);
    try {
      const res = await testDatabaseConnection(params);
      if (res.error) {
        setError(res.error);
      } else {
        setTestSuccess(true);
        setServerVersion(res.serverVersion || 'NoVacDB');
      }
    } catch (err: unknown) {
      setError({
        severity: 'ERROR',
        code: '',
        message: err instanceof Error ? err.message : String(err),
        position: 0,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    setTestSuccess(false);
    try {
      const res = await connectToDatabase(params);
      if (res.error) {
        setError(res.error);
      } else if (res.status && res.status.connected) {
        if (saveConnection && onSaveConnection) {
          onSaveConnection(
            {
              id: connectionId || '',
              name: connectionName.trim() || `${params.database} (${params.host}:${params.port})`,
              host: params.host,
              port: params.port,
              user: params.user,
              database: params.database,
              saveAuth: rememberPassword,
            },
            params.password
          );
        }
        onConnected(res.status);
        onClose();
      } else {
        setError({
          severity: 'ERROR',
          code: '',
          message: 'Connection failed: unexpected response from server',
          position: 0,
        });
      }
    } catch (err: unknown) {
      setError({
        severity: 'ERROR',
        code: '',
        message: err instanceof Error ? err.message : String(err),
        position: 0,
      });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[4px] border overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-5 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="text-sm font-medium tracking-tight" style={{ color: 'var(--text)' }}>
            Connection Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs transition-colors px-1.5 py-0.5 rounded-[4px]"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            Close
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleConnect} className="p-5 flex flex-col gap-3.5">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Host
              </label>
              <input
                type="text"
                name="host"
                value={params.host}
                onChange={handleChange}
                required
                className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border font-mono outline-hidden"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)',
                }}
                placeholder="localhost"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Port
              </label>
              <input
                type="number"
                name="port"
                value={params.port || ''}
                onChange={handleChange}
                required
                className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border font-mono outline-hidden"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)',
                }}
                placeholder="5433"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Database
            </label>
            <input
              type="text"
              name="database"
              value={params.database}
              onChange={handleChange}
              required
              className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border font-mono outline-hidden"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--input-text)',
              }}
              placeholder="demo"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              User
            </label>
            <input
              type="text"
              name="user"
              value={params.user}
              onChange={handleChange}
              required
              className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border font-mono outline-hidden"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--input-text)',
              }}
              placeholder="vikrant"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Optional (NoVacDB needs none)
              </span>
            </div>
            <input
              type="password"
              name="password"
              value={params.password}
              onChange={handleChange}
              className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border font-mono outline-hidden"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--input-text)',
              }}
              placeholder="optional"
            />
          </div>

          {/* Remember Password Option */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: 'var(--text)' }}>
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                className="rounded-[3px]"
              />
              <span>Remember password (stored in Windows Credential Manager)</span>
            </label>
          </div>

          {/* Save Connection Profile Option */}
          <div className="pt-2 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: 'var(--text)' }}>
              <input
                type="checkbox"
                checked={saveConnection}
                onChange={(e) => setSaveConnection(e.target.checked)}
                className="rounded-[3px]"
              />
              <span>Save connection profile</span>
            </label>
            {saveConnection && (
              <input
                type="text"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                placeholder="Connection Name (e.g. Local NoVacDB)"
                className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border outline-hidden"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)',
                }}
              />
            )}
          </div>

          {/* Feedback Banners */}
          {testSuccess && (
            <div
              className="p-2.5 rounded-[4px] border text-xs flex flex-col gap-0.5"
              style={{
                backgroundColor: 'var(--status-success-bg)',
                borderColor: 'var(--status-success-border)',
                color: 'var(--status-success)',
              }}
            >
              <div className="font-medium">
                Connection successful to {params.host}:{params.port}
              </div>
              <div className="font-mono text-[11px]">
                Server version: {serverVersion}
              </div>
            </div>
          )}

          {error && (
            <div
              className="p-2.5 rounded-[4px] border text-xs flex flex-col gap-1"
              style={{
                backgroundColor: 'var(--status-error-bg)',
                borderColor: 'var(--status-error-border)',
                color: 'var(--status-error)',
              }}
            >
              <div className="font-medium">
                Connection Failed {error.code ? `[SQLSTATE ${error.code}]` : ''}
              </div>
              <div className="font-mono text-[11px] break-words">{error.message}</div>
              {error.detail && <div className="text-[11px]">{error.detail}</div>}
              {error.hint && <div className="text-[11px] font-bold">HINT: {error.hint}</div>}
            </div>
          )}

          {/* Actions */}
          <div
            className="pt-2 flex items-center justify-between border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              disabled={testing || connecting}
              onClick={handleTest}
              className="px-3 py-1.5 text-xs rounded-[4px] border transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--btn-secondary-bg)',
                borderColor: 'var(--btn-secondary-border)',
                color: 'var(--btn-secondary-text)',
              }}
            >
              {testing ? 'Testing…' : 'Test connection'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs rounded-[4px] border transition-colors"
                style={{
                  backgroundColor: 'var(--btn-secondary-bg)',
                  borderColor: 'var(--btn-secondary-border)',
                  color: 'var(--btn-secondary-text)',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={connecting || testing}
                className="px-4 py-1.5 text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                }}
              >
                {connecting ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
