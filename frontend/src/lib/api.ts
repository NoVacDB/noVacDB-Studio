import * as WailsApp from '../../wailsjs/go/main/App';
import {
  ConnectionParams,
  ConnectionStatus,
  ConnectResult,
  TestConnectionResult,
  SimpleResult,
  QueryExecutionResult,
  SavedConnection,
  QueryHistoryItem,
  FileResult,
  FileSaveResult,
} from '../types';

export async function connectToDatabase(params: ConnectionParams): Promise<ConnectResult> {
  const paramObj: any = {
    host: params.host || 'localhost',
    port: Number(params.port) || 5433,
    user: params.user || 'vikrant',
    database: params.database || 'demo',
    password: params.password || '',
  };
  return (await (WailsApp as any).Connect(paramObj)) as unknown as ConnectResult;
}

export async function disconnectDatabase(): Promise<SimpleResult> {
  return (await (WailsApp as any).Disconnect()) as unknown as SimpleResult;
}

export async function testDatabaseConnection(params: ConnectionParams): Promise<TestConnectionResult> {
  const paramObj: any = {
    host: params.host || 'localhost',
    port: Number(params.port) || 5433,
    user: params.user || 'vikrant',
    database: params.database || 'demo',
    password: params.password || '',
  };
  return (await (WailsApp as any).TestConnection(paramObj)) as unknown as TestConnectionResult;
}

export async function fetchConnectionStatus(): Promise<ConnectionStatus> {
  return (await (WailsApp as any).GetConnectionStatus()) as unknown as ConnectionStatus;
}

export async function runQuery(sql: string): Promise<QueryExecutionResult> {
  return (await (WailsApp as any).ExecuteQuery(sql)) as unknown as QueryExecutionResult;
}

export async function cancelRunningQuery(): Promise<void> {
  return await (WailsApp as any).CancelQuery();
}

export async function fetchSavedConnections(): Promise<SavedConnection[]> {
  const res = await (WailsApp as any).GetSavedConnections();
  if (res && res.connections) {
    return res.connections;
  }
  return [];
}

export async function saveSavedConnection(conn: SavedConnection): Promise<SimpleResult> {
  return (await (WailsApp as any).SaveConnection(conn)) as unknown as SimpleResult;
}

export async function saveSavedConnectionWithPassword(
  conn: SavedConnection,
  password: string
): Promise<SimpleResult> {
  return (await (WailsApp as any).SaveConnectionWithPassword(conn, password)) as unknown as SimpleResult;
}

export async function fetchSavedPassword(id: string): Promise<string> {
  return (await (WailsApp as any).GetSavedPassword(id)) as unknown as string;
}

export async function deleteSavedConnection(id: string): Promise<SimpleResult> {
  return (await (WailsApp as any).DeleteSavedConnection(id)) as unknown as SimpleResult;
}

export async function fetchHistory(): Promise<QueryHistoryItem[]> {
  const res = await (WailsApp as any).GetHistory();
  return (res || []) as QueryHistoryItem[];
}

export async function saveHistoryItem(item: QueryHistoryItem): Promise<SimpleResult> {
  return (await (WailsApp as any).SaveHistory(item)) as unknown as SimpleResult;
}

export async function clearHistory(): Promise<SimpleResult> {
  return (await (WailsApp as any).ClearHistory()) as unknown as SimpleResult;
}

export async function openSqlFile(): Promise<FileResult> {
  return (await (WailsApp as any).OpenFile()) as unknown as FileResult;
}

export async function saveSqlFile(filePath: string, content: string): Promise<FileSaveResult> {
  return (await (WailsApp as any).SaveFile(filePath, content)) as unknown as FileSaveResult;
}

export async function saveSqlFileAs(defaultName: string, content: string): Promise<FileSaveResult> {
  return (await (WailsApp as any).SaveFileAs(defaultName, content)) as unknown as FileSaveResult;
}

export async function exportResultFile(defaultName: string, content: string): Promise<FileSaveResult> {
  return (await (WailsApp as any).ExportResult(defaultName, content)) as unknown as FileSaveResult;
}
