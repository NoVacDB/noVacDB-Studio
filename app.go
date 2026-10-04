package main

import (
	"context"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"NoVacDB-Studio/internal/config"
	"NoVacDB-Studio/internal/db"
)

// FileResult is returned when opening a file.
type FileResult struct {
	Path    string      `json:"path"`
	Content string      `json:"content"`
	Error   *db.DBError `json:"error,omitempty"`
}

// FileSaveResult is returned when saving or exporting a file.
type FileSaveResult struct {
	Path    string      `json:"path"`
	Success bool        `json:"success"`
	Error   *db.DBError `json:"error,omitempty"`
}

// App struct manages application state and exposes methods to the frontend.
type App struct {
	ctx        context.Context
	dbClient   *db.Client
	configMgr  *config.Manager
	historyMgr *config.HistoryManager
}

// NewApp creates a new App application struct.
func NewApp() *App {
	return &App{
		dbClient:   db.NewClient(),
		configMgr:  config.NewManager(),
		historyMgr: config.NewHistoryManager(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Connect establishes a connection to NoVacDB with the given parameters.
func (a *App) Connect(params db.ConnectionParams) db.ConnectResult {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	status, err := a.dbClient.Connect(ctx, params)
	if err != nil {
		return db.ConnectResult{
			Error: db.NewDBError(err),
		}
	}
	return db.ConnectResult{
		Status: status,
	}
}

// Disconnect closes the active NoVacDB connection.
func (a *App) Disconnect() db.SimpleResult {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	err := a.dbClient.Disconnect(ctx)
	if err != nil {
		return db.SimpleResult{
			Success: false,
			Error:   db.NewDBError(err),
		}
	}
	return db.SimpleResult{
		Success: true,
	}
}

// TestConnection tests whether a connection can be established and returns the server version.
func (a *App) TestConnection(params db.ConnectionParams) db.TestConnectionResult {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	version, err := a.dbClient.TestConnection(ctx, params)
	if err != nil {
		return db.TestConnectionResult{
			Success: false,
			Error:   db.NewDBError(err),
		}
	}
	return db.TestConnectionResult{
		Success:       true,
		ServerVersion: version,
	}
}

// GetConnectionStatus returns the current connection status.
func (a *App) GetConnectionStatus() db.ConnectionStatus {
	return a.dbClient.GetStatus()
}

// ExecuteQuery runs SQL query using simple query protocol with 30s timeout and cancel support.
func (a *App) ExecuteQuery(sqlText string) db.QueryExecutionResult {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	return a.dbClient.ExecuteQuery(ctx, sqlText)
}

// CancelQuery cancels the currently active query by sending a PostgreSQL CancelRequest.
func (a *App) CancelQuery() {
	a.dbClient.CancelActiveQuery()
}

// GetSavedConnections loads saved connections from the user configuration file.
func (a *App) GetSavedConnections() config.SavedConnectionsResult {
	conns, err := a.configMgr.LoadConnections()
	if err != nil {
		return config.SavedConnectionsResult{
			Connections: []config.SavedConnection{},
			Error:       db.NewDBError(err),
		}
	}
	return config.SavedConnectionsResult{
		Connections: conns,
	}
}

// SaveConnection persists a connection (passwords are omitted from connections.json).
func (a *App) SaveConnection(conn config.SavedConnection) db.SimpleResult {
	err := a.configMgr.SaveConnection(conn)
	if err != nil {
		return db.SimpleResult{
			Success: false,
			Error:   db.NewDBError(err),
		}
	}
	return db.SimpleResult{
		Success: true,
	}
}

// SaveConnectionWithPassword saves a connection and securely stores the password in Windows Credential Manager if requested.
func (a *App) SaveConnectionWithPassword(conn config.SavedConnection, password string) db.SimpleResult {
	err := a.configMgr.SaveConnection(conn)
	if err != nil {
		return db.SimpleResult{
			Success: false,
			Error:   db.NewDBError(err),
		}
	}

	if conn.SaveAuth && password != "" {
		_ = config.SavePassword(conn.ID, password)
	} else {
		_ = config.DeletePassword(conn.ID)
	}

	return db.SimpleResult{
		Success: true,
	}
}

// GetSavedPassword retrieves the password from Windows Credential Manager for a saved connection.
func (a *App) GetSavedPassword(id string) string {
	pwd, err := config.GetPassword(id)
	if err != nil {
		return ""
	}
	return pwd
}

// DeleteSavedConnection removes a saved connection by ID and deletes its stored credentials.
func (a *App) DeleteSavedConnection(id string) db.SimpleResult {
	err := a.configMgr.DeleteConnection(id)
	if err != nil {
		return db.SimpleResult{
			Success: false,
			Error:   db.NewDBError(err),
		}
	}
	return db.SimpleResult{
		Success: true,
	}
}

// GetHistory loads the query execution history (up to 1,000 items, newest first).
func (a *App) GetHistory() []config.HistoryRecord {
	recs, err := a.historyMgr.LoadHistory()
	if err != nil {
		return []config.HistoryRecord{}
	}
	return recs
}

// SaveHistory persists a query run into the query history log.
func (a *App) SaveHistory(rec config.HistoryRecord) db.SimpleResult {
	err := a.historyMgr.AddRecord(rec)
	if err != nil {
		return db.SimpleResult{
			Success: false,
			Error:   db.NewDBError(err),
		}
	}
	return db.SimpleResult{
		Success: true,
	}
}

// ClearHistory deletes all saved query history.
func (a *App) ClearHistory() db.SimpleResult {
	err := a.historyMgr.ClearHistory()
	if err != nil {
		return db.SimpleResult{
			Success: false,
			Error:   db.NewDBError(err),
		}
	}
	return db.SimpleResult{
		Success: true,
	}
}

// OpenFile opens a system file dialog to select and read a .sql file.
func (a *App) OpenFile() FileResult {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	path, err := runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
		Title: "Open SQL File",
		Filters: []runtime.FileFilter{
			{DisplayName: "SQL Files (*.sql)", Pattern: "*.sql"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return FileResult{Error: db.NewDBError(err)}
	}
	if path == "" {
		return FileResult{}
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return FileResult{Path: path, Error: db.NewDBError(err)}
	}

	return FileResult{
		Path:    path,
		Content: string(data),
	}
}

// SaveFile writes text to an existing file or prompts for a path if filePath is empty.
func (a *App) SaveFile(filePath string, content string) FileSaveResult {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	targetPath := filePath
	if targetPath == "" {
		var err error
		targetPath, err = runtime.SaveFileDialog(ctx, runtime.SaveDialogOptions{
			Title:           "Save SQL File",
			DefaultFilename: "query.sql",
			Filters: []runtime.FileFilter{
				{DisplayName: "SQL Files (*.sql)", Pattern: "*.sql"},
				{DisplayName: "All Files (*.*)", Pattern: "*.*"},
			},
		})
		if err != nil {
			return FileSaveResult{Success: false, Error: db.NewDBError(err)}
		}
		if targetPath == "" {
			return FileSaveResult{Success: false}
		}
	}

	if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
		return FileSaveResult{Path: targetPath, Success: false, Error: db.NewDBError(err)}
	}

	return FileSaveResult{
		Path:    targetPath,
		Success: true,
	}
}

// SaveFileAs prompts for a new file destination and writes the content.
func (a *App) SaveFileAs(defaultName string, content string) FileSaveResult {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	if defaultName == "" {
		defaultName = "query.sql"
	}

	targetPath, err := runtime.SaveFileDialog(ctx, runtime.SaveDialogOptions{
		Title:           "Save SQL File As",
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{DisplayName: "SQL Files (*.sql)", Pattern: "*.sql"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return FileSaveResult{Success: false, Error: db.NewDBError(err)}
	}
	if targetPath == "" {
		return FileSaveResult{Success: false}
	}

	if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
		return FileSaveResult{Path: targetPath, Success: false, Error: db.NewDBError(err)}
	}

	return FileSaveResult{
		Path:    targetPath,
		Success: true,
	}
}

// ExportResult prompts for a destination file and exports CSV or JSON content.
func (a *App) ExportResult(defaultName string, content string) FileSaveResult {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	ext := filepath.Ext(defaultName)
	filter := runtime.FileFilter{DisplayName: "All Files (*.*)", Pattern: "*.*"}
	if ext == ".csv" {
		filter = runtime.FileFilter{DisplayName: "CSV Files (*.csv)", Pattern: "*.csv"}
	} else if ext == ".json" {
		filter = runtime.FileFilter{DisplayName: "JSON Files (*.json)", Pattern: "*.json"}
	}

	targetPath, err := runtime.SaveFileDialog(ctx, runtime.SaveDialogOptions{
		Title:           "Export Result",
		DefaultFilename: defaultName,
		Filters:         []runtime.FileFilter{filter, {DisplayName: "All Files (*.*)", Pattern: "*.*"}},
	})
	if err != nil {
		return FileSaveResult{Success: false, Error: db.NewDBError(err)}
	}
	if targetPath == "" {
		return FileSaveResult{Success: false}
	}

	if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
		return FileSaveResult{Path: targetPath, Success: false, Error: db.NewDBError(err)}
	}

	return FileSaveResult{
		Path:    targetPath,
		Success: true,
	}
}
