package db

import (
	"context"
	"net"
	"strconv"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestConvertResult_Basic(t *testing.T) {
	pgRes := &pgconn.Result{
		FieldDescriptions: []pgconn.FieldDescription{
			{Name: "id"},
			{Name: "name"},
		},
		Rows: [][][]byte{
			{[]byte("1"), []byte("alice")},
			{[]byte("2"), []byte("bob")},
		},
		CommandTag: pgconn.NewCommandTag("SELECT 2"),
	}

	res := ConvertResult(pgRes, 15*time.Millisecond)

	if len(res.Columns) != 2 || res.Columns[0] != "id" || res.Columns[1] != "name" {
		t.Fatalf("unexpected columns: %v", res.Columns)
	}
	if res.RowCount != 2 {
		t.Errorf("expected row count 2, got %d", res.RowCount)
	}
	if res.Truncated {
		t.Errorf("expected truncated false, got true")
	}
	if len(res.Rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(res.Rows))
	}
	if res.Rows[0][1].Value != "alice" || res.Rows[0][1].IsNull {
		t.Errorf("unexpected cell 0,1: %+v", res.Rows[0][1])
	}
	if res.DurationMs != 15 {
		t.Errorf("expected duration 15ms, got %d", res.DurationMs)
	}
}

func TestConvertResult_NullDistinction(t *testing.T) {
	pgRes := &pgconn.Result{
		FieldDescriptions: []pgconn.FieldDescription{
			{Name: "val"},
		},
		Rows: [][][]byte{
			{nil},             // SQL NULL
			{[]byte("")},      // Empty string
			{[]byte("hello")}, // Normal text
		},
		CommandTag: pgconn.NewCommandTag("SELECT 3"),
	}

	res := ConvertResult(pgRes, 5*time.Millisecond)

	if len(res.Rows) != 3 {
		t.Fatalf("expected 3 rows, got %d", len(res.Rows))
	}

	// 1. NULL
	if !res.Rows[0][0].IsNull {
		t.Errorf("row 0 expected IsNull=true, got false")
	}
	if res.Rows[0][0].Value != "" {
		t.Errorf("row 0 expected Value='', got %q", res.Rows[0][0].Value)
	}

	// 2. Empty string
	if res.Rows[1][0].IsNull {
		t.Errorf("row 1 expected IsNull=false, got true")
	}
	if res.Rows[1][0].Value != "" {
		t.Errorf("row 1 expected Value='', got %q", res.Rows[1][0].Value)
	}

	// 3. Normal text
	if res.Rows[2][0].IsNull {
		t.Errorf("row 2 expected IsNull=false, got true")
	}
	if res.Rows[2][0].Value != "hello" {
		t.Errorf("row 2 expected Value='hello', got %q", res.Rows[2][0].Value)
	}
}

func TestConvertResult_Truncation(t *testing.T) {
	totalRows := MaxRowsPerStatement + 250
	rawRows := make([][][]byte, totalRows)
	for i := 0; i < totalRows; i++ {
		rawRows[i] = [][]byte{[]byte(strconv.Itoa(i))}
	}

	pgRes := &pgconn.Result{
		FieldDescriptions: []pgconn.FieldDescription{
			{Name: "num"},
		},
		Rows:       rawRows,
		CommandTag: pgconn.NewCommandTag(strconv.Itoa(totalRows)),
	}

	res := ConvertResult(pgRes, 20*time.Millisecond)

	if !res.Truncated {
		t.Errorf("expected Truncated=true, got false")
	}
	if res.RowCount != totalRows {
		t.Errorf("expected RowCount=%d, got %d", totalRows, res.RowCount)
	}
	if len(res.Rows) != MaxRowsPerStatement {
		t.Errorf("expected len(Rows)=%d, got %d", MaxRowsPerStatement, len(res.Rows))
	}
	if res.TruncatedAt != MaxRowsPerStatement {
		t.Errorf("expected TruncatedAt=%d, got %d", MaxRowsPerStatement, res.TruncatedAt)
	}
}

func TestExecuteQuery_NotConnected(t *testing.T) {
	client := NewClient()
	result := client.ExecuteQuery(context.Background(), "SELECT 1")

	if result.Error == nil {
		t.Fatal("expected error when running query while not connected")
	}
	if result.Error.Message != "not connected to any database" {
		t.Errorf("unexpected error message: %q", result.Error.Message)
	}
	if len(result.Results) != 0 {
		t.Errorf("expected 0 results, got %d", len(result.Results))
	}
}

func TestExecuteQueryLiveIfRunning(t *testing.T) {
	conn, err := net.DialTimeout("tcp", "localhost:5433", 500*time.Millisecond)
	if err != nil {
		t.Skip("NoVacDB server is not reachable on localhost:5433; skipping live query test")
		return
	}
	_ = conn.Close()

	client := NewClient()
	ctx := context.Background()

	_, err = client.Connect(ctx, DefaultConnectionParams())
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	defer func() {
		_ = client.Disconnect(ctx)
	}()

	// 1. Create table
	res := client.ExecuteQuery(ctx, "CREATE TABLE _m1_test (id int, val text);")
	if res.Error != nil {
		t.Fatalf("CREATE TABLE failed: %v", res.Error)
	}
	defer func() {
		_ = client.ExecuteQuery(context.Background(), "DROP TABLE _m1_test;")
	}()

	// 2. Insert rows including NULL and empty text
	res = client.ExecuteQuery(ctx, "INSERT INTO _m1_test VALUES (1, 'alpha'), (2, NULL), (3, '');")
	if res.Error != nil {
		t.Fatalf("INSERT failed: %v", res.Error)
	}

	// 3. Select with NULL checks
	res = client.ExecuteQuery(ctx, "SELECT id, val FROM _m1_test ORDER BY id;")
	if res.Error != nil {
		t.Fatalf("SELECT failed: %v", res.Error)
	}
	if len(res.Results) != 1 {
		t.Fatalf("expected 1 statement result, got %d", len(res.Results))
	}
	rows := res.Results[0].Rows
	if len(rows) != 3 {
		t.Fatalf("expected 3 rows, got %d", len(rows))
	}
	if rows[0][1].Value != "alpha" || rows[0][1].IsNull {
		t.Errorf("row 0 expected 'alpha', not null: %+v", rows[0][1])
	}
	if !rows[1][1].IsNull {
		t.Errorf("row 1 expected null: %+v", rows[1][1])
	}
	if rows[2][1].Value != "" || rows[2][1].IsNull {
		t.Errorf("row 2 expected empty string, not null: %+v", rows[2][1])
	}

	// 4. Multi-statement batch
	res = client.ExecuteQuery(ctx, "SELECT id FROM _m1_test; SELECT val FROM _m1_test;")
	if res.Error != nil {
		t.Fatalf("multi-statement failed: %v", res.Error)
	}
	if len(res.Results) != 2 {
		t.Fatalf("expected 2 statement results, got %d", len(res.Results))
	}

	// 5. Multi-statement with failure in 2nd statement:
	// Results of 1st statement must be preserved, and error populated
	res = client.ExecuteQuery(ctx, "SELECT id FROM _m1_test; SELECT bad_col FROM _m1_test;")
	if len(res.Results) != 1 {
		t.Errorf("expected 1 result before error, got %d", len(res.Results))
	}
	if res.Error == nil {
		t.Errorf("expected error for bad column, got nil")
	} else if res.Error.Code == "" {
		t.Errorf("expected SQLSTATE code, got empty")
	}
}
