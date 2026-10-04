import React, { useState, useMemo } from 'react';
import { ConnectionStatus, SavedConnection, QueryHistoryItem } from '../types';

interface SidebarProps {
  savedConnections: SavedConnection[];
  activeConnection: ConnectionStatus;
  onSelectSavedConnection: (conn: SavedConnection) => void;
  onDeleteSavedConnection: (id: string) => void;
  onOpenNewConnect: () => void;
  queryHistory: QueryHistoryItem[];
  onSelectHistoryQuery: (sql: string) => void;
  onClearHistory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  savedConnections,
  activeConnection,
  onSelectSavedConnection,
  onDeleteSavedConnection,
  onOpenNewConnect,
  queryHistory,
  onSelectHistoryQuery,
  onClearHistory,
}) => {
  const [historyFilter, setHistoryFilter] = useState('');

  const filteredHistory = useMemo(() => {
    if (!historyFilter.trim()) return queryHistory;
    const q = historyFilter.toLowerCase();
    return queryHistory.filter(
      (item) =>
        item.sql.toLowerCase().includes(q) ||
        (item.connectionName && item.connectionName.toLowerCase().includes(q))
    );
  }, [queryHistory, historyFilter]);

  return (
    <aside
      className="w-64 shrink-0 flex flex-col border-r select-none h-full overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
      }}
    >
      {/* Connections Section */}
      <div className="p-3 border-b flex flex-col max-h-60 shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          <span>CONNECTIONS</span>
          <button
            type="button"
            onClick={onOpenNewConnect}
            className="text-xs transition-colors hover:underline"
            style={{ color: 'var(--text)' }}
          >
            + New
          </button>
        </div>

        {/* Active connection card if connected */}
        {activeConnection.connected && (
          <div
            className="mb-2 p-2 rounded-[4px] border text-xs shrink-0"
            style={{
              backgroundColor: 'var(--bg-app)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--status-success)' }}
              />
              <span className="truncate" style={{ color: 'var(--text)' }}>
                {activeConnection.database}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                (active)
              </span>
            </div>
            <div
              className="text-[10px] font-mono pl-3 pt-0.5 truncate"
              style={{ color: 'var(--text-secondary)' }}
            >
              {activeConnection.user}@{activeConnection.host}:{activeConnection.port}
            </div>
          </div>
        )}

        {/* Saved Connections List */}
        <div className="overflow-y-auto space-y-1 flex-1 pr-0.5 min-h-0">
          {savedConnections.length > 0 ? (
            savedConnections.map((conn) => (
              <div
                key={conn.id}
                className="group p-2 rounded-[4px] border text-xs flex items-center justify-between transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-app)',
                  borderColor: 'var(--border)',
                }}
                onClick={() => onSelectSavedConnection(conn)}
              >
                <div className="flex-1 min-w-0 pr-1.5">
                  <div className="font-medium truncate" style={{ color: 'var(--text)' }}>
                    {conn.name}
                  </div>
                  <div className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                    {conn.database} ({conn.host}:{conn.port})
                  </div>
                </div>
                <button
                  type="button"
                  title="Delete saved connection"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSavedConnection(conn.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-xs transition-opacity rounded-[2px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <div
              className="text-xs px-2 py-3 rounded-[4px] border text-center"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              No saved connections
            </div>
          )}
        </div>
      </div>

      {/* Query History Section */}
      <div className="flex-1 overflow-hidden flex flex-col p-3 min-h-0">
        <div className="flex items-center justify-between text-xs font-medium mb-1.5 shrink-0" style={{ color: 'var(--text-secondary)' }}>
          <span>QUERY HISTORY</span>
          {queryHistory.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-[11px] transition-colors hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Search input for query history */}
        <div className="mb-2 shrink-0">
          <input
            type="text"
            value={historyFilter}
            onChange={(e) => setHistoryFilter(e.target.value)}
            placeholder="Search history…"
            className="w-full px-2 py-1 text-xs rounded-[4px] border outline-hidden"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--input-border)',
              color: 'var(--input-text)',
            }}
          />
        </div>

        {/* History records list */}
        <div className="overflow-y-auto flex-1 space-y-1.5 pr-0.5 min-h-0">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                onDoubleClick={() => onSelectHistoryQuery(item.sql)}
                onClick={() => onSelectHistoryQuery(item.sql)}
                className="p-2 rounded-[4px] border text-xs cursor-pointer transition-colors"
                style={{
                  backgroundColor: 'var(--bg-app)',
                  borderColor: 'var(--border)',
                }}
                title="Double-click to load into editor"
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: item.success ? 'var(--status-success)' : 'var(--status-error)',
                      }}
                    />
                    <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                      {item.timestamp}
                    </span>
                  </span>
                  <span className="font-mono shrink-0 pl-1" style={{ color: 'var(--text-secondary)' }}>
                    {item.durationMs} ms
                  </span>
                </div>
                {item.connectionName && (
                  <div className="text-[10px] font-mono truncate mb-0.5" style={{ color: 'var(--text-muted)' }}>
                    [{item.connectionName}]
                  </div>
                )}
                <div
                  className="font-mono text-[11px] line-clamp-2 break-all"
                  style={{ color: 'var(--text)' }}
                >
                  {item.sql}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs px-2 py-4 text-center" style={{ color: 'var(--text-muted)' }}>
              {historyFilter ? 'No matching queries' : 'No queries run yet'}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
