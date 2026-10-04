//go:build !windows

package config

import (
	"errors"
	"sync"
)

var (
	memStore   = make(map[string]string)
	memStoreMu sync.RWMutex
)

// SavePassword stores the password in the in-memory fallback store on non-Windows platforms.
func SavePassword(connID string, password string) error {
	if connID == "" {
		return errors.New("empty connection ID")
	}
	memStoreMu.Lock()
	defer memStoreMu.Unlock()
	memStore[targetName(connID)] = password
	return nil
}

// GetPassword retrieves the password from the in-memory fallback store on non-Windows platforms.
func GetPassword(connID string) (string, error) {
	if connID == "" {
		return "", errors.New("empty connection ID")
	}
	memStoreMu.RLock()
	defer memStoreMu.RUnlock()
	pwd, exists := memStore[targetName(connID)]
	if !exists {
		return "", nil
	}
	return pwd, nil
}

// DeletePassword removes a stored password from the in-memory fallback store on non-Windows platforms.
func DeletePassword(connID string) error {
	if connID == "" {
		return nil
	}
	memStoreMu.Lock()
	defer memStoreMu.Unlock()
	delete(memStore, targetName(connID))
	return nil
}
