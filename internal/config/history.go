package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const MaxHistoryItems = 1000

// HistoryRecord represents a single query execution entry in the persistent history log.
type HistoryRecord struct {
	ID             string `json:"id"`
	ConnectionName string `json:"connectionName"`
	SQL            string `json:"sql"`
	Timestamp      string `json:"timestamp"`
	DurationMs     int64  `json:"durationMs"`
	Success        bool   `json:"success"`
	ErrorMessage   string `json:"errorMessage,omitempty"`
}

// HistoryManager manages reading and writing query history to history.json.
type HistoryManager struct {
	mu         sync.RWMutex
	customPath string
}

// NewHistoryManager creates a new HistoryManager instance.
func NewHistoryManager() *HistoryManager {
	return &HistoryManager{}
}

// NewHistoryManagerWithPath creates a HistoryManager for a specific file path (for testing).
func NewHistoryManagerWithPath(path string) *HistoryManager {
	return &HistoryManager{customPath: path}
}

// GetFilePath returns the path to history.json in the user config directory.
func (h *HistoryManager) GetFilePath() (string, error) {
	if h.customPath != "" {
		return h.customPath, nil
	}

	userConfigDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("getting user config dir: %w", err)
	}

	appConfigDir := filepath.Join(userConfigDir, "NoVacDB Studio")
	if err := os.MkdirAll(appConfigDir, 0755); err != nil {
		return "", fmt.Errorf("creating config directory: %w", err)
	}

	return filepath.Join(appConfigDir, "history.json"), nil
}

// LoadHistory loads all history items, sorted newest first, up to MaxHistoryItems.
func (h *HistoryManager) LoadHistory() ([]HistoryRecord, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	filePath, err := h.GetFilePath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return []HistoryRecord{}, nil
		}
		return nil, fmt.Errorf("reading history file: %w", err)
	}

	if len(data) == 0 {
		return []HistoryRecord{}, nil
	}

	var records []HistoryRecord
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, fmt.Errorf("parsing history json: %w", err)
	}

	return records, nil
}

// AddRecord prepends a new history item, truncating to 1,000 items, and persists to disk.
func (h *HistoryManager) AddRecord(rec HistoryRecord) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	filePath, err := h.GetFilePath()
	if err != nil {
		return err
	}

	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("creating history parent dir: %w", err)
	}

	var records []HistoryRecord
	data, err := os.ReadFile(filePath)
	if err == nil && len(data) > 0 {
		_ = json.Unmarshal(data, &records)
	}

	if rec.ID == "" {
		rec.ID = fmt.Sprintf("hist_%d", time.Now().UnixNano())
	}
	if rec.Timestamp == "" {
		rec.Timestamp = time.Now().Format("2006-01-02 15:04:05")
	}

	// Prepend new record (newest first)
	newList := make([]HistoryRecord, 0, len(records)+1)
	newList = append(newList, rec)
	newList = append(newList, records...)

	// Truncate to MaxHistoryItems
	if len(newList) > MaxHistoryItems {
		newList = newList[:MaxHistoryItems]
	}

	out, err := json.MarshalIndent(newList, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling history: %w", err)
	}

	if err := os.WriteFile(filePath, out, 0644); err != nil {
		return fmt.Errorf("writing history file: %w", err)
	}

	return nil
}

// ClearHistory empties the history records file.
func (h *HistoryManager) ClearHistory() error {
	h.mu.Lock()
	defer h.mu.Unlock()

	filePath, err := h.GetFilePath()
	if err != nil {
		return err
	}

	out, err := json.MarshalIndent([]HistoryRecord{}, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filePath, out, 0644)
}
