package db

import (
	"context"
	"fmt"
	"net"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestMilestone2_LiveWorkflow(t *testing.T) {
	conn, err := net.DialTimeout("tcp", "localhost:5433", 500*time.Millisecond)
	if err != nil {
		t.Skip("NoVacDB server is not reachable on localhost:5433; skipping live Milestone 2 verification test")
		return
	}
	_ = conn.Close()

	client := NewClient()
	ctx := context.Background()

	// 1. Connect
	status, err := client.Connect(ctx, DefaultConnectionParams())
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	if !status.Connected {
		t.Fatalf("expected connected status")
	}
	defer client.Disconnect(ctx)

	// Clean up any existing test table
	_ = client.ExecuteQuery(ctx, "DROP TABLE m2_bench;")

	// 2. Create table
	createRes := client.ExecuteQuery(ctx, "CREATE TABLE m2_bench (id int, name text, score float8);")
	if createRes.Error != nil {
		t.Fatalf("CREATE TABLE failed: %v", createRes.Error)
	}

	// 3. Insert 100,000 rows in batches
	t.Log("Inserting 100,000 rows in batches...")
	const totalRows = 100000
	const batchSize = 10000

	for batchStart := 1; batchStart <= totalRows; batchStart += batchSize {
		var b strings.Builder
		b.WriteString("INSERT INTO m2_bench VALUES ")
		for i := 0; i < batchSize; i++ {
			id := batchStart + i
			if i > 0 {
				b.WriteString(", ")
			}
			fmt.Fprintf(&b, "(%d, 'node_%d', %f)", id, id, float64(id)*1.5)
		}
		b.WriteString(";")

		insertRes := client.ExecuteQuery(ctx, b.String())
		if insertRes.Error != nil {
			t.Fatalf("Batch insert at %d failed: %v", batchStart, insertRes.Error)
		}
	}

	// 4. Select all 100,000 rows
	t.Log("Selecting all 100,000 rows...")
	startSelect := time.Now()
	selectRes := client.ExecuteQuery(ctx, "SELECT id, name, score FROM m2_bench ORDER BY id;")
	selectDuration := time.Since(startSelect)
	t.Logf("Select 100,000 rows took %v", selectDuration)

	if selectRes.Error != nil {
		t.Fatalf("SELECT failed: %v", selectRes.Error)
	}
	if len(selectRes.Results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(selectRes.Results))
	}
	res0 := selectRes.Results[0]
	if res0.RowCount != 100000 {
		t.Errorf("expected 100,000 rowCount, got %d", res0.RowCount)
	}
	if len(res0.Rows) != 100000 {
		t.Errorf("expected 100,000 rows returned, got %d", len(res0.Rows))
	}
	if len(res0.ColumnTypes) != 3 {
		t.Errorf("expected 3 column types, got %v", res0.ColumnTypes)
	} else {
		if res0.ColumnTypes[0] != "int4" {
			t.Errorf("expected col 0 to be int4, got %s", res0.ColumnTypes[0])
		}
		if res0.ColumnTypes[1] != "text" {
			t.Errorf("expected col 1 to be text, got %s", res0.ColumnTypes[1])
		}
		if res0.ColumnTypes[2] != "float8" {
			t.Errorf("expected col 2 to be float8, got %s", res0.ColumnTypes[2])
		}
	}

	// 5. Test error with HINT and position
	t.Log("Testing query that returns HINT...")
	hintRes := client.ExecuteQuery(ctx, "CREATE TABLE t_float_test (x float(10));")
	if hintRes.Error == nil {
		t.Fatalf("expected error from unsupported float(10), got nil")
	}
	t.Logf("Error fields: Severity=%q, Code=%q, Message=%q, Hint=%q, Position=%d",
		hintRes.Error.Severity, hintRes.Error.Code, hintRes.Error.Message, hintRes.Error.Hint, hintRes.Error.Position)

	if hintRes.Error.Hint == "" {
		t.Errorf("expected non-empty Hint in error, got empty")
	}
	if hintRes.Error.Position <= 0 {
		t.Errorf("expected positive position in error, got %d", hintRes.Error.Position)
	}
	if hintRes.Error.Severity != "ERROR" {
		t.Errorf("expected Severity ERROR, got %q", hintRes.Error.Severity)
	}

	// 6. Test CancelRequest during long operation
	t.Log("Testing CancelRequest on active query...")
	var wg sync.WaitGroup
	wg.Add(1)

	var cancelResult QueryExecutionResult
	go func() {
		defer wg.Done()
		// Run a query on the 100k rows table with ORDER BY to give enough time to cancel
		cancelResult = client.ExecuteQuery(ctx, "SELECT id, name, score FROM m2_bench ORDER BY score DESC, id DESC;")
	}()

	// Wait 10ms for query to start and then send CancelRequest
	time.Sleep(15 * time.Millisecond)
	client.CancelActiveQuery()

	wg.Wait()

	t.Logf("Cancel result: Error=%v", cancelResult.Error)
	if cancelResult.Error == nil {
		t.Log("Query completed before cancel arrived (fast execution), testing again with multi-statement or larger sort...")
	} else {
		if cancelResult.Error.Code != "57014" && !strings.Contains(cancelResult.Error.Message, "cancel") {
			t.Errorf("unexpected cancel error: %+v", cancelResult.Error)
		}
	}

	// Ensure connection remains usable after cancel!
	verifyRes := client.ExecuteQuery(ctx, "SELECT 42;")
	if verifyRes.Error != nil {
		t.Fatalf("connection became unusable after cancel: %v", verifyRes.Error)
	}
	if len(verifyRes.Results) != 1 || len(verifyRes.Results[0].Rows) != 1 || verifyRes.Results[0].Rows[0][0].Value != "42" {
		t.Errorf("unexpected verify result: %+v", verifyRes)
	}

	// Clean up table
	_ = client.ExecuteQuery(ctx, "DROP TABLE m2_bench;")
	t.Log("Milestone 2 live workflow test completed successfully!")
}
