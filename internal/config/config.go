package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"NoVacDB-Studio/internal/db"
)

// SavedConnection represents a user-saved connection without sensitive credentials.
// Passwords are strictly omitted from this structure and are never persisted.
type SavedConnection struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Host             string `json:"host"`
	Port             int    `json:"port"`
	User             string `json:"user"`
	Database string `json:"database"`
	SaveAuth bool   `json:"saveAuth"`
}

// SavedConnectionsResult wraps the list of saved connections with a potential error.
type SavedConnectionsResult struct {
	Connections []SavedConnection `json:"connections"`
	Error       *db.DBError       `json:"error,omitempty"`
}

// Manager handles reading and writing saved connections to the user config directory.
type Manager struct {
	mu         sync.RWMutex
	customPath string // optional path override for unit tests
}

// NewManager creates a new config Manager.
func NewManager() *Manager {
	return &Manager{}
}

// NewManagerWithPath creates a config Manager targeting a specific file path (useful for testing).
func NewManagerWithPath(path string) *Manager {
	return &Manager{customPath: path}
}

// GetFilePath returns the path to connections.json in os.UserConfigDir()/NoVacDB Studio/.
func (m *Manager) GetFilePath() (string, error) {
	if m.customPath != "" {
		return m.customPath, nil
	}

	userConfigDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("getting user config dir: %w", err)
	}

	appConfigDir := filepath.Join(userConfigDir, "NoVacDB Studio")
	if err := os.MkdirAll(appConfigDir, 0755); err != nil {
		return "", fmt.Errorf("creating config directory: %w", err)
	}

	return filepath.Join(appConfigDir, "connections.json"), nil
}

// LoadConnections loads all saved connections from the JSON configuration file.
func (m *Manager) LoadConnections() ([]SavedConnection, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	filePath, err := m.GetFilePath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return []SavedConnection{}, nil
		}
		return nil, fmt.Errorf("reading connections file: %w", err)
	}

	if len(data) == 0 {
		return []SavedConnection{}, nil
	}

	var connections []SavedConnection
	if err := json.Unmarshal(data, &connections); err != nil {
		return nil, fmt.Errorf("parsing connections json: %w", err)
	}

	return connections, nil
}

// SaveConnection saves a new connection or updates an existing one by ID.
func (m *Manager) SaveConnection(conn SavedConnection) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	filePath, err := m.GetFilePath()
	if err != nil {
		return err
	}

	// Ensure directory exists
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("creating parent dir: %w", err)
	}

	var connections []SavedConnection
	data, err := os.ReadFile(filePath)
	if err == nil && len(data) > 0 {
		_ = json.Unmarshal(data, &connections)
	}

	if conn.ID == "" {
		conn.ID = fmt.Sprintf("conn_%d", time.Now().UnixNano())
	}
	if conn.Name == "" {
		conn.Name = fmt.Sprintf("%s (%s:%d)", conn.Database, conn.Host, conn.Port)
	}

	found := false
	for i, c := range connections {
		if c.ID == conn.ID {
			connections[i] = conn
			found = true
			break
		}
	}
	if !found {
		connections = append(connections, conn)
	}

	out, err := json.MarshalIndent(connections, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling connections: %w", err)
	}

	if err := os.WriteFile(filePath, out, 0644); err != nil {
		return fmt.Errorf("writing connections file: %w", err)
	}

	return nil
}

// DeleteConnection removes a saved connection matching the provided ID.
func (m *Manager) DeleteConnection(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	filePath, err := m.GetFilePath()
	if err != nil {
		return err
	}

	var connections []SavedConnection
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("reading connections file: %w", err)
	}

	if len(data) > 0 {
		_ = json.Unmarshal(data, &connections)
	}

	filtered := make([]SavedConnection, 0, len(connections))
	for _, c := range connections {
		if c.ID != id {
			filtered = append(filtered, c)
		}
	}

	out, err := json.MarshalIndent(filtered, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling connections: %w", err)
	}

	if err := os.WriteFile(filePath, out, 0644); err != nil {
		return fmt.Errorf("writing connections file: %w", err)
	}

	_ = DeletePassword(id)

	return nil
}
