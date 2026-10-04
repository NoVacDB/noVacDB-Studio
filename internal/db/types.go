package db

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
)

// ConnectionParams represents the user-supplied connection configuration.
type ConnectionParams struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Database string `json:"database"`
	Password string `json:"password"` // optional
}

// DefaultConnectionParams returns the default parameters specified in AGENTS.md.
func DefaultConnectionParams() ConnectionParams {
	return ConnectionParams{
		Host:     "localhost",
		Port:     5433,
		User:     "vikrant",
		Database: "demo",
		Password: "",
	}
}

// Normalize fills in empty fields with the NoVacDB defaults.
func (p ConnectionParams) Normalize() ConnectionParams {
	if p.Host == "" {
		p.Host = "localhost"
	}
	if p.Port <= 0 {
		p.Port = 5433
	}
	if p.User == "" {
		p.User = "vikrant"
	}
	if p.Database == "" {
		p.Database = "demo"
	}
	return p
}

// ConnectionStatus reports the current connection state.
type ConnectionStatus struct {
	Connected bool   `json:"connected"`
	Host      string `json:"host"`
	Port      int    `json:"port"`
	User      string `json:"user"`
	Database  string `json:"database"`
}

// ConnectResult is returned by the Connect method.
type ConnectResult struct {
	Status *ConnectionStatus `json:"status,omitempty"`
	Error  *DBError          `json:"error,omitempty"`
}

// TestConnectionResult represents the outcome of testing a connection.
type TestConnectionResult struct {
	Success       bool     `json:"success"`
	ServerVersion string   `json:"serverVersion"`
	Error         *DBError `json:"error,omitempty"`
}

// SimpleResult is returned by operations that succeed or fail with a DBError.
type SimpleResult struct {
	Success bool     `json:"success"`
	Error   *DBError `json:"error,omitempty"`
}

// RowCell represents an individual cell in a result row, keeping SQL NULL distinct from empty strings.
type RowCell struct {
	Value  string `json:"value"`
	IsNull bool   `json:"isNull"`
}

// StatementResult represents the execution output of a single SQL statement.
type StatementResult struct {
	CommandTag  string      `json:"commandTag"`
	Columns     []string    `json:"columns"`
	ColumnTypes []string    `json:"columnTypes"`
	Rows        [][]RowCell `json:"rows"`
	RowCount    int         `json:"rowCount"`    // Total count of rows returned or affected
	Truncated   bool        `json:"truncated"`   // True if rows exceeded the 100,000 limit
	TruncatedAt int         `json:"truncatedAt"` // Max rows limit (100,000)
	DurationMs  int64       `json:"durationMs"`
}

// QueryExecutionResult holds results for all statements executed in one batch.
type QueryExecutionResult struct {
	Results         []StatementResult `json:"results"`
	Error           *DBError          `json:"error,omitempty"`
	TotalDurationMs int64             `json:"totalDurationMs"`
}

// DBError represents a structured error returned to the frontend.
type DBError struct {
	Severity string `json:"severity"`
	Code     string `json:"code"`
	Message  string `json:"message"`
	Detail   string `json:"detail"`
	Hint     string `json:"hint"`
	Position int    `json:"position"`
}

// Error implements the standard error interface.
func (e *DBError) Error() string {
	if e == nil {
		return ""
	}
	if e.Code != "" {
		return e.Message + " (SQLSTATE " + e.Code + ")"
	}
	return e.Message
}

// NewDBError converts any Go error into a structured DBError.
func NewDBError(err error) *DBError {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		pos := 0
		if pgErr.Position > 0 {
			pos = int(pgErr.Position)
		}
		sev := pgErr.Severity
		if sev == "" {
			sev = "ERROR"
		}
		return &DBError{
			Severity: sev,
			Code:     pgErr.Code,
			Message:  pgErr.Message,
			Detail:   pgErr.Detail,
			Hint:     pgErr.Hint,
			Position: pos,
		}
	}
	return &DBError{
		Severity: "ERROR",
		Code:     "",
		Message:  err.Error(),
		Detail:   "",
		Hint:     "",
		Position: 0,
	}
}

// OIDToTypeName maps standard PostgreSQL data type OIDs to user-friendly type names.
func OIDToTypeName(oid uint32) string {
	switch oid {
	case 16:
		return "bool"
	case 17:
		return "bytea"
	case 18:
		return "char"
	case 20:
		return "int8"
	case 21:
		return "int2"
	case 23:
		return "int4"
	case 25:
		return "text"
	case 700:
		return "float4"
	case 701:
		return "float8"
	case 1042:
		return "bpchar"
	case 1043:
		return "varchar"
	case 1082:
		return "date"
	case 1083:
		return "time"
	case 1114:
		return "timestamp"
	case 1184:
		return "timestamptz"
	case 1700:
		return "numeric"
	case 2950:
		return "uuid"
	case 3802:
		return "jsonb"
	default:
		if oid == 0 {
			return "unknown"
		}
		return fmt.Sprintf("oid_%d", oid)
	}
}
