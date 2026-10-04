package db

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

const (
	// MaxRowsPerStatement is the maximum number of rows returned per statement to prevent freezing the UI.
	MaxRowsPerStatement = 100000

	// DefaultQueryTimeout is the default execution timeout.
	DefaultQueryTimeout = 30 * time.Second
)

// QueryManager handles query execution and cancellation on top of Client.
type queryState struct {
	queryMu      sync.Mutex
	cancelMu     sync.Mutex
	activeConn   *pgconn.PgConn
	activeCancel context.CancelFunc
}

var clientQueryState = make(map[*Client]*queryState)
var clientQueryStateMu sync.Mutex

func getQueryState(c *Client) *queryState {
	clientQueryStateMu.Lock()
	defer clientQueryStateMu.Unlock()
	state, exists := clientQueryState[c]
	if !exists {
		state = &queryState{}
		clientQueryState[c] = state
	}
	return state
}

// ConvertResult converts a single pgconn.Result into our plain StatementResult.
func ConvertResult(res *pgconn.Result, duration time.Duration) StatementResult {
	cols := make([]string, len(res.FieldDescriptions))
	colTypes := make([]string, len(res.FieldDescriptions))
	for i, fd := range res.FieldDescriptions {
		cols[i] = fd.Name
		colTypes[i] = OIDToTypeName(fd.DataTypeOID)
	}

	totalRows := len(res.Rows)
	truncated := false
	limit := totalRows
	if limit > MaxRowsPerStatement {
		truncated = true
		limit = MaxRowsPerStatement
	}

	rows := make([][]RowCell, limit)
	for rIdx := 0; rIdx < limit; rIdx++ {
		rawRow := res.Rows[rIdx]
		cells := make([]RowCell, len(rawRow))
		for cIdx, rawCell := range rawRow {
			if rawCell == nil {
				cells[cIdx] = RowCell{Value: "", IsNull: true}
			} else {
				cells[cIdx] = RowCell{Value: string(rawCell), IsNull: false}
			}
		}
		rows[rIdx] = cells
	}

	rowCount := totalRows
	if len(cols) == 0 {
		rowCount = int(res.CommandTag.RowsAffected())
	}

	return StatementResult{
		CommandTag:  res.CommandTag.String(),
		Columns:     cols,
		ColumnTypes: colTypes,
		Rows:        rows,
		RowCount:    rowCount,
		Truncated:   truncated,
		TruncatedAt: MaxRowsPerStatement,
		DurationMs:  duration.Milliseconds(),
	}
}

// ExecuteQuery runs SQL using pgconn's simple query protocol.
// It supports multiple ';'-separated statements, caps each statement at 100,000 rows,
// preserves results from statements prior to any failure, and applies a 30s timeout.
func (c *Client) ExecuteQuery(parentCtx context.Context, sqlText string) QueryExecutionResult {
	if parentCtx == nil {
		parentCtx = context.Background()
	}

	conn := c.Conn()
	if conn == nil {
		return QueryExecutionResult{
			Results: make([]StatementResult, 0),
			Error: &DBError{
				Severity: "ERROR",
				Code:     "",
				Message:  "not connected to any database",
				Position: 0,
			},
		}
	}

	state := getQueryState(c)
	state.queryMu.Lock()
	defer state.queryMu.Unlock()

	// Check again in case disconnection happened while waiting for lock
	conn = c.Conn()
	if conn == nil {
		return QueryExecutionResult{
			Results: make([]StatementResult, 0),
			Error: &DBError{
				Severity: "ERROR",
				Code:     "",
				Message:  "not connected to any database",
				Position: 0,
			},
		}
	}

	queryCtx, cancel := context.WithTimeout(parentCtx, DefaultQueryTimeout)
	state.cancelMu.Lock()
	state.activeConn = conn
	state.activeCancel = cancel
	state.cancelMu.Unlock()

	defer func() {
		cancel()
		state.cancelMu.Lock()
		state.activeConn = nil
		state.activeCancel = nil
		state.cancelMu.Unlock()
	}()

	start := time.Now()
	pgResults, execErr := conn.Exec(queryCtx, sqlText).ReadAll()
	totalDuration := time.Since(start)

	stmtResults := make([]StatementResult, 0)
	for _, res := range pgResults {
		if res == nil {
			continue
		}
		// If an individual result has an error, capture it and don't treat as a valid result
		if res.Err != nil {
			if execErr == nil {
				execErr = res.Err
			}
			continue
		}
		stmtResults = append(stmtResults, ConvertResult(res, totalDuration))
	}

	var dbErr *DBError
	if execErr != nil {
		if errors.Is(execErr, context.Canceled) {
			dbErr = &DBError{
				Severity: "ERROR",
				Code:     "57014",
				Message:  "query canceled by user",
				Position: 0,
			}
		} else if errors.Is(execErr, context.DeadlineExceeded) {
			dbErr = &DBError{
				Severity: "ERROR",
				Code:     "57014",
				Message:  fmt.Sprintf("query timed out after %v", DefaultQueryTimeout),
				Position: 0,
			}
		} else {
			dbErr = NewDBError(execErr)
		}
	}

	return QueryExecutionResult{
		Results:         stmtResults,
		Error:           dbErr,
		TotalDurationMs: totalDuration.Milliseconds(),
	}
}

// CancelActiveQuery cancels the currently executing query by sending a PostgreSQL CancelRequest on a separate connection.
func (c *Client) CancelActiveQuery() {
	state := getQueryState(c)
	state.cancelMu.Lock()
	conn := state.activeConn
	cancel := state.activeCancel
	state.cancelMu.Unlock()

	if conn != nil {
		// Send PostgreSQL CancelRequest on a separate connection as defined by the protocol
		ctx, cancelTimeout := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancelTimeout()
		err := conn.CancelRequest(ctx)
		if err == nil {
			// If CancelRequest was successfully sent, allow server to process it.
			// Only cancel context as fallback if query doesn't complete within 2s.
			go func(cFunc context.CancelFunc) {
				time.Sleep(2 * time.Second)
				state.cancelMu.Lock()
				active := state.activeCancel
				state.cancelMu.Unlock()
				if active != nil {
					cFunc()
				}
			}(cancel)
			return
		}
	}

	if cancel != nil {
		cancel()
	}
}
