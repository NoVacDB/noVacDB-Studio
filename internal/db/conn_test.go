package db

import (
	"context"
	"errors"
	"net"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestBuildConnString(t *testing.T) {
	tests := []struct {
		name     string
		input    ConnectionParams
		contains []string
	}{
		{
			name:  "defaults",
			input: ConnectionParams{},
			contains: []string{
				"host=localhost",
				"port=5433",
				"user=vikrant",
				"dbname=demo",
				"sslmode=disable",
			},
		},
		{
			name: "custom with password",
			input: ConnectionParams{
				Host:     "127.0.0.1",
				Port:     5434,
				User:     "alice",
				Database: "testdb",
				Password: "secret",
			},
			contains: []string{
				"host=127.0.0.1",
				"port=5434",
				"user=alice",
				"dbname=testdb",
				"password=secret",
				"sslmode=disable",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildConnString(tt.input)
			for _, exp := range tt.contains {
				if !strings.Contains(got, exp) {
					t.Errorf("BuildConnString() = %q, expected to contain %q", got, exp)
				}
			}
			if tt.input.Password == "" && strings.Contains(got, "password=") {
				t.Errorf("BuildConnString() = %q, should not contain password", got)
			}
		})
	}
}

func TestNormalize(t *testing.T) {
	p := ConnectionParams{}
	norm := p.Normalize()

	if norm.Host != "localhost" {
		t.Errorf("expected host localhost, got %s", norm.Host)
	}
	if norm.Port != 5433 {
		t.Errorf("expected port 5433, got %d", norm.Port)
	}
	if norm.User != "vikrant" {
		t.Errorf("expected user vikrant, got %s", norm.User)
	}
	if norm.Database != "demo" {
		t.Errorf("expected database demo, got %s", norm.Database)
	}
}

func TestNewDBError(t *testing.T) {
	t.Run("nil error", func(t *testing.T) {
		if NewDBError(nil) != nil {
			t.Error("expected nil DBError for nil input")
		}
	})

	t.Run("generic error", func(t *testing.T) {
		err := errors.New("network failure")
		dbErr := NewDBError(err)
		if dbErr == nil {
			t.Fatal("expected non-nil DBError")
		}
		if dbErr.Message != "network failure" {
			t.Errorf("expected message 'network failure', got %q", dbErr.Message)
		}
		if dbErr.Code != "" || dbErr.Position != 0 {
			t.Errorf("unexpected code or position in generic error: %+v", dbErr)
		}
	})

	t.Run("pgconn error", func(t *testing.T) {
		pgErr := &pgconn.PgError{
			Code:     "42601",
			Message:  "syntax error at or near 'SELECTT'",
			Position: 8,
		}
		dbErr := NewDBError(pgErr)
		if dbErr == nil {
			t.Fatal("expected non-nil DBError")
		}
		if dbErr.Code != "42601" {
			t.Errorf("expected code 42601, got %q", dbErr.Code)
		}
		if dbErr.Message != "syntax error at or near 'SELECTT'" {
			t.Errorf("unexpected message: %q", dbErr.Message)
		}
		if dbErr.Position != 8 {
			t.Errorf("expected position 8, got %d", dbErr.Position)
		}
	})
}

func TestConnectionUnreachable(t *testing.T) {
	client := NewClient()
	ctx := context.Background()

	// Pick a port that is unlikely to have any service listening
	_, err := client.TestConnection(ctx, ConnectionParams{
		Host: "127.0.0.1",
		Port: 59998,
	})
	if err == nil {
		t.Error("expected TestConnection to fail for unreachable port, got nil")
	}

	_, err = client.Connect(ctx, ConnectionParams{
		Host: "127.0.0.1",
		Port: 59998,
	})
	if err == nil {
		t.Error("expected Connect to fail for unreachable port, got nil")
	}

	status := client.GetStatus()
	if status.Connected {
		t.Error("expected client to not be connected")
	}
}

func TestConnectionLiveIfRunning(t *testing.T) {
	// Check if NoVacDB is listening on localhost:5433
	conn, err := net.DialTimeout("tcp", "localhost:5433", 500*time.Millisecond)
	if err != nil {
		t.Skip("NoVacDB server is not reachable on localhost:5433; skipping live connection test")
		return
	}
	_ = conn.Close()

	client := NewClient()
	ctx := context.Background()

	// 1. TestConnection
	if version, err := client.TestConnection(ctx, DefaultConnectionParams()); err != nil {
		t.Fatalf("TestConnection failed: %v", err)
	} else if version == "" {
		t.Fatalf("expected non-empty version from TestConnection")
	}

	// 2. Connect
	status, err := client.Connect(ctx, DefaultConnectionParams())
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	if !status.Connected {
		t.Fatalf("expected status.Connected to be true")
	}

	// 3. GetStatus
	currentStatus := client.GetStatus()
	if !currentStatus.Connected {
		t.Errorf("GetStatus() returned not connected")
	}
	if currentStatus.Port != 5433 {
		t.Errorf("expected port 5433, got %d", currentStatus.Port)
	}

	// 4. Disconnect
	if err := client.Disconnect(ctx); err != nil {
		t.Fatalf("Disconnect failed: %v", err)
	}

	currentStatus = client.GetStatus()
	if currentStatus.Connected {
		t.Errorf("expected client to be disconnected after Disconnect()")
	}
}
