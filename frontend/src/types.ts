export interface ConnectionParams {
  host: string;
  port: number;
  user: string;
  database: string;
  password?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  host: string;
  port: number;
  user: string;
  database: string;
}

export interface DBError {
  severity: string;
  code: string;
  message: string;
  detail?: string;
  hint?: string;
  position: number;
}

export interface ConnectResult {
  status?: ConnectionStatus;
  error?: DBError;
}

export interface TestConnectionResult {
  success: boolean;
  serverVersion: string;
  error?: DBError;
}

export interface SimpleResult {
  success: boolean;
  error?: DBError;
}

export interface RowCell {
  value: string;
  isNull: boolean;
}

export interface StatementResult {
  commandTag: string;
  columns: string[];
  columnTypes?: string[];
  rows: RowCell[][];
  rowCount: number;
  truncated: boolean;
  truncatedAt: number;
  durationMs: number;
}

export interface QueryExecutionResult {
  results: StatementResult[];
  error?: DBError;
  totalDurationMs: number;
}

export interface SavedConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  database: string;
  saveAuth?: boolean;
}

export interface QueryHistoryItem {
  id: string;
  connectionName?: string;
  sql: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

export interface FileResult {
  path?: string;
  content?: string;
  error?: DBError;
}

export interface FileSaveResult {
  path?: string;
  success: boolean;
  error?: DBError;
}

export interface EditorTab {
  id: string;
  title: string;
  filePath?: string;
  sql: string;
  isDirty?: boolean;
  result?: QueryExecutionResult | null;
  errorPosition?: number | null;
}
