package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSavedConnectionsLifecycle(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "novacdb_config_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	testFilePath := filepath.Join(tempDir, "connections.json")
	mgr := NewManagerWithPath(testFilePath)

	// 1. Initial load should return empty list
	conns, err := mgr.LoadConnections()
	if err != nil {
		t.Fatalf("LoadConnections failed on empty store: %v", err)
	}
	if len(conns) != 0 {
		t.Errorf("expected 0 connections, got %d", len(conns))
	}

	// 2. Save a new connection
	newConn := SavedConnection{
		ID:       "c1",
		Name:     "Local Dev",
		Host:     "localhost",
		Port:     5433,
		User:     "vikrant",
		Database: "demo",
	}
	if err := mgr.SaveConnection(newConn); err != nil {
		t.Fatalf("SaveConnection failed: %v", err)
	}

	// Verify file was written and does not contain "password"
	fileBytes, err := os.ReadFile(testFilePath)
	if err != nil {
		t.Fatalf("reading file failed: %v", err)
	}
	if strings.Contains(strings.ToLower(string(fileBytes)), "password") {
		t.Errorf("connections.json must never contain passwords: %s", string(fileBytes))
	}

	// 3. Load and verify
	conns, err = mgr.LoadConnections()
	if err != nil {
		t.Fatalf("LoadConnections failed: %v", err)
	}
	if len(conns) != 1 {
		t.Fatalf("expected 1 connection, got %d", len(conns))
	}
	if conns[0].Name != "Local Dev" || conns[0].Port != 5433 {
		t.Errorf("unexpected loaded connection: %+v", conns[0])
	}

	// 4. Update the connection
	updatedConn := conns[0]
	updatedConn.Name = "Local Production Simulation"
	if err := mgr.SaveConnection(updatedConn); err != nil {
		t.Fatalf("SaveConnection update failed: %v", err)
	}

	conns, err = mgr.LoadConnections()
	if err != nil {
		t.Fatalf("LoadConnections failed: %v", err)
	}
	if len(conns) != 1 {
		t.Fatalf("expected 1 connection after update, got %d", len(conns))
	}
	if conns[0].Name != "Local Production Simulation" {
		t.Errorf("expected updated name, got %s", conns[0].Name)
	}

	// 5. Delete the connection
	if err := mgr.DeleteConnection("c1"); err != nil {
		t.Fatalf("DeleteConnection failed: %v", err)
	}

	conns, err = mgr.LoadConnections()
	if err != nil {
		t.Fatalf("LoadConnections failed after delete: %v", err)
	}
	if len(conns) != 0 {
		t.Errorf("expected 0 connections after delete, got %d", len(conns))
	}
}

func TestNoPasswordInJSON(t *testing.T) {
	conn := SavedConnection{
		ID:       "c2",
		Name:     "Test",
		Host:     "localhost",
		Port:     5433,
		User:     "user",
		Database: "db",
	}

	data, err := json.Marshal(conn)
	if err != nil {
		t.Fatalf("json marshal failed: %v", err)
	}

	if strings.Contains(strings.ToLower(string(data)), "password") {
		t.Errorf("SavedConnection struct leaked password field in json: %s", string(data))
	}
}
