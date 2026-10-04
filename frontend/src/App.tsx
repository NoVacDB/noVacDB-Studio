import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ConnectionStatus as IConnectionStatus,
  ConnectionParams,
  QueryExecutionResult,
  SavedConnection,
  QueryHistoryItem,
  DBError,
  EditorTab,
} from './types';
import {
  fetchConnectionStatus,
  disconnectDatabase,
  connectToDatabase,
  runQuery,
  cancelRunningQuery,
  fetchSavedConnections,
  saveSavedConnectionWithPassword,
  deleteSavedConnection,
  fetchHistory,
  saveHistoryItem,
  clearHistory,
  openSqlFile,
  saveSqlFile,
  saveSqlFileAs,
} from './lib/api';
import { ConnectForm } from './components/ConnectForm';
import { ConnectionStatus } from './components/ConnectionStatus';
import { Editor } from './components/Editor';
import { EditorTabs } from './components/EditorTabs';
import { ResultTabs } from './components/ResultTabs';
import { Sidebar } from './components/Sidebar';
import { StartScreen } from './components/StartScreen';
import { AboutDialog } from './components/AboutDialog';

const DEFAULT_SQL = `-- NoVacDB Studio\n-- Statements separated by ';' | Ctrl+Enter to run statement | Ctrl+Shift+Enter for all\nSELECT 1;\n`;

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState<IConnectionStatus>({
    connected: false,
    host: 'localhost',
    port: 5433,
    user: 'vikrant',
    database: 'demo',
  });
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [connectModalParams, setConnectModalParams] = useState<ConnectionParams>({
    host: 'localhost',
    port: 5433,
    user: 'vikrant',
    database: 'demo',
    password: '',
  });
  const [connectModalConnId, setConnectModalConnId] = useState<string>('');
  const [connectModalRemember, setConnectModalRemember] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Start screen connection state
  const [isConnectingStart, setIsConnectingStart] = useState(false);
  const [connectingTarget, setConnectingTarget] = useState('localhost:5433');
  const [connectErrorStart, setConnectErrorStart] = useState<DBError | null>(null);
  const [lastAttemptedParams, setLastAttemptedParams] = useState<ConnectionParams | null>(null);

  // Multi-tab SQL Editor state with persistence
  const [tabs, setTabs] = useState<EditorTab[]>(() => {
    try {
      const saved = localStorage.getItem('novacdb_editor_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'tab-1',
        title: 'Query 1',
        sql: DEFAULT_SQL,
        isDirty: false,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('novacdb_active_tab_id');
      if (savedId) return savedId;
    } catch {
      // ignore
    }
    return 'tab-1';
  });

  // Query running state
  const [isRunningQuery, setIsRunningQuery] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Active tab helper
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || {
    id: 'tab-1',
    title: 'Query 1',
    sql: DEFAULT_SQL,
  };

  // Persist tabs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('novacdb_editor_tabs', JSON.stringify(tabs));
      localStorage.setItem('novacdb_active_tab_id', activeTabId);
    } catch {
      // ignore
    }
  }, [tabs, activeTabId]);

  const loadSaved = () => {
    fetchSavedConnections()
      .then((conns) => {
        setSavedConnections(conns || []);
      })
      .catch((err) => {
        console.error('Failed to load saved connections:', err);
      });
  };

  const loadHistoryRecords = () => {
    fetchHistory()
      .then((recs) => {
        setQueryHistory(recs || []);
      })
      .catch((err) => {
        console.error('Failed to load query history:', err);
      });
  };

  // URL parameters handling for testing and screenshots
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const view = searchParams.get('view');
    const theme = searchParams.get('theme');

    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    }

    if (view === 'start') {
      setConnectionStatus({
        connected: false,
        host: 'localhost',
        port: 5433,
        user: 'vikrant',
        database: 'demo',
      });
      setSavedConnections([
        {
          id: 'conn-1',
          name: 'Local NoVacDB (Default)',
          host: 'localhost',
          port: 5433,
          user: 'vikrant',
          database: 'demo',
          saveAuth: false,
        },
        {
          id: 'conn-2',
          name: 'Analytics Database',
          host: 'localhost',
          port: 5434,
          user: 'vikrant',
          database: 'analytics',
          saveAuth: true,
        },
      ]);
      return;
    }

    if (view === 'multi_tabs' || view === 'multiple_results') {
      setConnectionStatus({
        connected: true,
        host: 'localhost',
        port: 5433,
        user: 'vikrant',
        database: 'demo',
      });
      const multiResults: QueryExecutionResult = {
        results: [
          {
            commandTag: 'CREATE TABLE',
            columns: [],
            rows: [],
            rowCount: 0,
            truncated: false,
            truncatedAt: 100000,
            durationMs: 8,
          },
          {
            commandTag: 'INSERT 0 3',
            columns: [],
            rows: [],
            rowCount: 3,
            truncated: false,
            truncatedAt: 100000,
            durationMs: 14,
          },
          {
            commandTag: 'SELECT',
            columns: ['id', 'metric', 'val'],
            columnTypes: ['int4', 'text', 'float8'],
            rows: [
              [
                { value: '1', isNull: false },
                { value: 'cpu_usage', isNull: false },
                { value: '42.5', isNull: false },
              ],
              [
                { value: '2', isNull: false },
                { value: 'mem_usage', isNull: false },
                { value: '78.2', isNull: false },
              ],
              [
                { value: '3', isNull: false },
                { value: 'disk_io', isNull: false },
                { value: '', isNull: true },
              ],
            ],
            rowCount: 3,
            truncated: false,
            truncatedAt: 100000,
            durationMs: 3,
          },
        ],
        totalDurationMs: 25,
      };
      setTabs([
        {
          id: 'tab-1',
          title: 'Batch Script.sql',
          sql: `CREATE TABLE system_metrics (id int, metric text, val float8);\nINSERT INTO system_metrics VALUES (1, 'cpu_usage', 42.5), (2, 'mem_usage', 78.2), (3, 'disk_io', NULL);\nSELECT id, metric, val FROM system_metrics ORDER BY id;`,
          result: multiResults,
        },
        {
          id: 'tab-2',
          title: 'Query 2',
          sql: `SELECT * FROM system_metrics;`,
        },
      ]);
      setActiveTabId('tab-1');
      return;
    }

    if (view === 'large_result') {
      setConnectionStatus({
        connected: true,
        host: 'localhost',
        port: 5433,
        user: 'vikrant',
        database: 'demo',
      });
      // Generate 100,000 synthetic rows for virtualized test view
      const bigRows = [];
      for (let i = 1; i <= 100000; i++) {
        bigRows.push([
          { value: String(i), isNull: false },
          { value: `worker_node_${i % 128}`, isNull: false },
          { value: i % 7 === 0 ? '' : `2026-10-04 10:14:${String(i % 60).padStart(2, '0')}`, isNull: i % 7 === 0 },
          { value: i % 13 === 0 ? '' : 'active', isNull: i % 13 === 0 },
        ]);
      }
      const largeResultObj: QueryExecutionResult = {
        results: [
          {
            commandTag: 'SELECT',
            columns: ['id', 'node_name', 'last_seen', 'status'],
            columnTypes: ['int8', 'text', 'timestamptz', 'text'],
            rows: bigRows,
            rowCount: 100000,
            truncated: false,
            truncatedAt: 100000,
            durationMs: 128,
          },
        ],
        totalDurationMs: 128,
      };
      setTabs([
        {
          id: 'tab-1',
          title: 'Large Dataset (100k Rows)',
          sql: `SELECT id, node_name, last_seen, status FROM nodes ORDER BY id LIMIT 100000;`,
          result: largeResultObj,
        },
      ]);
      setActiveTabId('tab-1');
      return;
    }

    if (view === 'error_hint' || view === 'error') {
      setConnectionStatus({
        connected: true,
        host: 'localhost',
        port: 5433,
        user: 'vikrant',
        database: 'demo',
      });
      const errSql = `CREATE TABLE t_float_test (x float(10));`;
      const errObj: QueryExecutionResult = {
        results: [],
        error: {
          severity: 'ERROR',
          code: '42804',
          message: 'type real (float(10)) is not supported yet',
          detail: '',
          hint: 'Use double precision.',
          position: 28,
        },
        totalDurationMs: 2,
      };
      setTabs([
        {
          id: 'tab-1',
          title: 'Schema Test',
          sql: errSql,
          result: errObj,
          errorPosition: 28,
        },
      ]);
      setActiveTabId('tab-1');
      return;
    }

    if (view === 'history') {
      setConnectionStatus({
        connected: true,
        host: 'localhost',
        port: 5433,
        user: 'vikrant',
        database: 'demo',
      });
      setQueryHistory([
        {
          id: 'h1',
          connectionName: 'Local NoVacDB',
          sql: 'SELECT id, node_name, status FROM nodes ORDER BY id LIMIT 100000;',
          timestamp: '2026-10-04 11:50:12',
          success: true,
          durationMs: 128,
        },
        {
          id: 'h2',
          connectionName: 'Local NoVacDB',
          sql: 'CREATE TABLE t_float_test (x float(10));',
          timestamp: '2026-10-04 11:48:00',
          success: false,
          durationMs: 2,
          errorMessage: 'type real (float(10)) is not supported yet',
        },
        {
          id: 'h3',
          connectionName: 'Local NoVacDB',
          sql: 'SELECT id, metric, val FROM system_metrics ORDER BY id;',
          timestamp: '2026-10-04 11:45:22',
          success: true,
          durationMs: 4,
        },
        {
          id: 'h4',
          connectionName: 'Local NoVacDB',
          sql: "INSERT INTO system_metrics VALUES (1, 'cpu_usage', 42.5);",
          timestamp: '2026-10-04 11:45:10',
          success: true,
          durationMs: 14,
        },
        {
          id: 'h5',
          connectionName: 'Local NoVacDB',
          sql: 'CREATE TABLE system_metrics (id int, metric text, val float8);',
          timestamp: '2026-10-04 11:44:50',
          success: true,
          durationMs: 9,
        },
      ]);
      return;
    }

    fetchConnectionStatus()
      .then((status) => {
        if (status) {
          setConnectionStatus(status);
        }
      })
      .catch((err) => {
        console.error('Failed to load initial connection status:', err);
      });

    loadSaved();
    loadHistoryRecords();
  }, []);

  // Timer while query executes
  useEffect(() => {
    if (isRunningQuery) {
      setElapsedSeconds(0);
      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((Date.now() - start) / 1000);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunningQuery]);

  // Tab management handlers
  const handleUpdateActiveSql = (newSql: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, sql: newSql, isDirty: true } : t))
    );
  };

  const handleNewTab = () => {
    const newId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTabObj: EditorTab = {
      id: newId,
      title: `Query ${tabs.length + 1}`,
      sql: DEFAULT_SQL,
      isDirty: false,
    };
    setTabs((prev) => [...prev, newTabObj]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (idToClose: string) => {
    if (tabs.length <= 1) return; // Keep at least one tab

    const index = tabs.findIndex((t) => t.id === idToClose);
    const newTabs = tabs.filter((t) => t.id !== idToClose);
    setTabs(newTabs);

    if (activeTabId === idToClose) {
      const nextTab = newTabs[Math.max(0, index - 1)] || newTabs[0];
      if (nextTab) {
        setActiveTabId(nextTab.id);
      }
    }
  };

  // Open & Save .sql files
  const handleOpenFile = async () => {
    try {
      const res = await openSqlFile();
      if (res && res.content !== undefined && res.path) {
        const fileName = res.path.split(/[\\/]/).pop() || 'script.sql';
        const newId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const openedTab: EditorTab = {
          id: newId,
          title: fileName,
          filePath: res.path,
          sql: res.content,
          isDirty: false,
        };
        setTabs((prev) => [...prev, openedTab]);
        setActiveTabId(newId);
      }
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  const handleSaveFile = async () => {
    try {
      const res = await saveSqlFile(activeTab.filePath || '', activeTab.sql);
      if (res && res.success && res.path) {
        const fileName = res.path.split(/[\\/]/).pop() || activeTab.title;
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? { ...t, title: fileName, filePath: res.path, isDirty: false }
              : t
          )
        );
      }
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  };

  const handleSaveFileAs = async () => {
    try {
      const defaultName = activeTab.title.endsWith('.sql') ? activeTab.title : `${activeTab.title}.sql`;
      const res = await saveSqlFileAs(defaultName, activeTab.sql);
      if (res && res.success && res.path) {
        const fileName = res.path.split(/[\\/]/).pop() || defaultName;
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? { ...t, title: fileName, filePath: res.path, isDirty: false }
              : t
          )
        );
      }
    } catch (err) {
      console.error('Failed to save file as:', err);
    }
  };

  // Global keyboard shortcuts for tabs and file operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleNewTab();
      } else if (isMod && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        handleCloseTab(activeTabId);
      } else if (isMod && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        handleOpenFile();
      } else if (isMod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveFileAs();
        } else {
          handleSaveFile();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, activeTab, tabs]);

  const handleConnectDirect = async (params: ConnectionParams) => {
    setLastAttemptedParams(params);
    setIsConnectingStart(true);
    setConnectingTarget(`${params.host || 'localhost'}:${params.port || 5433}`);
    setConnectErrorStart(null);

    try {
      const res = await connectToDatabase(params);
      if (res.error) {
        setConnectErrorStart(res.error);
      } else if (res.status && res.status.connected) {
        setConnectionStatus(res.status);
      } else {
        setConnectErrorStart({
          severity: 'ERROR',
          code: '',
          message: 'Connection failed: server closed connection',
          position: 0,
        });
      }
    } catch (err: unknown) {
      setConnectErrorStart({
        severity: 'ERROR',
        code: '',
        message: err instanceof Error ? err.message : String(err),
        position: 0,
      });
    } finally {
      setIsConnectingStart(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectDatabase();
      setConnectionStatus({
        connected: false,
        host: 'localhost',
        port: 5433,
        user: 'vikrant',
        database: 'demo',
      });
    } catch (err) {
      console.error('Failed to disconnect:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveConnectionWithPwd = async (conn: SavedConnection, password?: string) => {
    try {
      await saveSavedConnectionWithPassword(conn, password || '');
      loadSaved();
    } catch (err) {
      console.error('Failed to save connection profile:', err);
    }
  };

  const handleDeleteSavedConnection = async (id: string) => {
    try {
      await deleteSavedConnection(id);
      loadSaved();
    } catch (err) {
      console.error('Failed to delete connection profile:', err);
    }
  };

  const handleSelectSavedConnection = (conn: SavedConnection) => {
    setConnectModalConnId(conn.id);
    setConnectModalRemember(!!conn.saveAuth);
    setConnectModalParams({
      host: conn.host || 'localhost',
      port: conn.port || 5433,
      user: conn.user || 'vikrant',
      database: conn.database || 'demo',
      password: '',
    });
    setIsConnectModalOpen(true);
  };

  const handleOpenNewConnect = () => {
    setConnectModalConnId('');
    setConnectModalRemember(false);
    setConnectModalParams({
      host: connectionStatus.host || 'localhost',
      port: connectionStatus.port || 5433,
      user: connectionStatus.user || 'vikrant',
      database: connectionStatus.database || 'demo',
      password: '',
    });
    setIsConnectModalOpen(true);
  };

  // Run query logic
  const handleExecuteQuery = async (sqlToRun: string) => {
    if (!connectionStatus.connected) {
      handleOpenNewConnect();
      return;
    }

    if (!sqlToRun.trim() || isRunningQuery) {
      return;
    }

    setIsRunningQuery(true);

    // Clear previous error position
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, errorPosition: null } : t))
    );

    try {
      const res = await runQuery(sqlToRun);

      const errPos = res.error && res.error.position > 0 ? res.error.position : null;

      // Update current active tab's result
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, result: res, errorPosition: errPos }
            : t
        )
      );

      // Save into persistent history
      const historyItem: QueryHistoryItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        connectionName: connectionStatus.database || 'NoVacDB',
        sql: sqlToRun.trim(),
        timestamp: new Date().toLocaleTimeString(),
        success: !res.error,
        durationMs: res.totalDurationMs,
        errorMessage: res.error?.message,
      };

      await saveHistoryItem(historyItem);
      loadHistoryRecords();
    } catch (err: unknown) {
      console.error('Failed to run query:', err);
      const fallbackErr: QueryExecutionResult = {
        results: [],
        error: {
          severity: 'ERROR',
          code: '',
          message: err instanceof Error ? err.message : String(err) || 'Query execution failure',
          position: 0,
        },
        totalDurationMs: 0,
      };
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, result: fallbackErr } : t))
      );
    } finally {
      setIsRunningQuery(false);
    }
  };

  const handleCancelQuery = async () => {
    try {
      await cancelRunningQuery();
    } catch (err) {
      console.error('Failed to cancel query:', err);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      setQueryHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleJumpToError = () => {
    if (activeTab.result?.error && activeTab.result.error.position > 0) {
      const pos = activeTab.result.error.position;
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, errorPosition: null } : t))
      );
      setTimeout(() => {
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTabId ? { ...t, errorPosition: pos } : t))
        );
      }, 20);
    }
  };

  // Reconnect action if connection is lost
  const handleReconnect = () => {
    if (lastAttemptedParams) {
      handleConnectDirect(lastAttemptedParams);
    } else {
      handleOpenNewConnect();
    }
  };

  // If not connected, show the Start Screen
  if (!connectionStatus.connected) {
    return (
      <>
        <StartScreen
          savedConnections={savedConnections}
          onConnect={handleConnectDirect}
          onOpenNewConnect={handleOpenNewConnect}
          onOpenAbout={() => setIsAboutModalOpen(true)}
          isConnecting={isConnectingStart}
          connectingTarget={connectingTarget}
          connectError={connectErrorStart}
          onRetry={() => {
            if (lastAttemptedParams) {
              handleConnectDirect(lastAttemptedParams);
            }
          }}
          onClearError={() => setConnectErrorStart(null)}
        />

        <ConnectForm
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          onConnected={(status) => setConnectionStatus(status)}
          onSaveConnection={handleSaveConnectionWithPwd}
          initialParams={connectModalParams}
          connectionId={connectModalConnId}
          initialRememberPassword={connectModalRemember}
        />

        <AboutDialog
          isOpen={isAboutModalOpen}
          onClose={() => setIsAboutModalOpen(false)}
        />
      </>
    );
  }

  // Connected: show Main Workspace
  return (
    <div
      className="flex h-screen w-screen overflow-hidden select-none"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* Sidebar for saved connections and searchable query history */}
      <Sidebar
        savedConnections={savedConnections}
        activeConnection={connectionStatus}
        onSelectSavedConnection={handleSelectSavedConnection}
        onDeleteSavedConnection={handleDeleteSavedConnection}
        onOpenNewConnect={handleOpenNewConnect}
        queryHistory={queryHistory}
        onSelectHistoryQuery={(sql) => handleUpdateActiveSql(sql)}
        onClearHistory={handleClearHistory}
      />

      {/* Main workspace area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar with connection status, theme toggle, and about */}
        <header
          className="h-10 border-b px-3 flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderColor: 'var(--border)',
          }}
        >
          <ConnectionStatus
            status={connectionStatus}
            onOpenConnect={handleOpenNewConnect}
            onDisconnect={handleDisconnect}
            onOpenAbout={() => setIsAboutModalOpen(true)}
            disconnecting={disconnecting}
          />
        </header>

        {/* Editor Tabs bar (Ctrl+T, Ctrl+W, Ctrl+O, Ctrl+S) */}
        <EditorTabs
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={(id) => setActiveTabId(id)}
          onNewTab={handleNewTab}
          onCloseTab={handleCloseTab}
          onOpenFile={handleOpenFile}
          onSaveFile={handleSaveFile}
          onSaveFileAs={handleSaveFileAs}
        />

        {/* SQL Editor Area */}
        <section className="flex-1 flex flex-col min-h-0">
          <Editor
            key={activeTabId}
            value={activeTab.sql}
            onChange={handleUpdateActiveSql}
            onRun={(sqlText) => handleExecuteQuery(sqlText)}
            onRunAll={() => handleExecuteQuery(activeTab.sql)}
            onCancel={handleCancelQuery}
            onSaveFile={handleSaveFile}
            onOpenFile={handleOpenFile}
            isRunning={isRunningQuery}
            isConnected={connectionStatus.connected}
            elapsedSeconds={elapsedSeconds}
            errorPosition={activeTab.errorPosition}
          />
        </section>

        {/* Results Area */}
        <section
          className="h-64 flex flex-col shrink-0 border-t"
          style={{
            backgroundColor: 'var(--bg-app)',
            borderColor: 'var(--border)',
          }}
        >
          {isRunningQuery ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-2 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                style={{
                  borderColor: 'var(--text)',
                  borderTopColor: 'transparent',
                }}
              />
              <span className="font-mono text-xs">
                Executing query… ({elapsedSeconds.toFixed(1)}s)
              </span>
            </div>
          ) : activeTab.result ? (
            <ResultTabs
              executionResult={activeTab.result}
              onJumpToError={handleJumpToError}
              onReconnect={handleReconnect}
            />
          ) : (
            <div
              className="flex-1 p-4 text-xs flex items-center justify-center"
              style={{ color: 'var(--text-muted)' }}
            >
              Run a query (Ctrl+Enter) to view results
            </div>
          )}
        </section>
      </main>

      {/* Connect Modal */}
      <ConnectForm
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnected={(status) => setConnectionStatus(status)}
        onSaveConnection={handleSaveConnectionWithPwd}
        initialParams={connectModalParams}
        connectionId={connectModalConnId}
        initialRememberPassword={connectModalRemember}
      />

      {/* About Dialog */}
      <AboutDialog
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
}
