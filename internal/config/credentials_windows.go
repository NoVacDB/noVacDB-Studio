//go:build windows

package config

import (
	"errors"
	"fmt"
	"syscall"
	"unsafe"
)

var (
	modadvapi32    = syscall.NewLazyDLL("advapi32.dll")
	procCredWrite  = modadvapi32.NewProc("CredWriteW")
	procCredRead   = modadvapi32.NewProc("CredReadW")
	procCredFree   = modadvapi32.NewProc("CredFree")
	procCredDelete = modadvapi32.NewProc("CredDeleteW")
)

const (
	credTypeGeneric        = 1 // CRED_TYPE_GENERIC
	credPersistLocalMachine = 2 // CRED_PERSIST_LOCAL_MACHINE
)

type winCredential struct {
	flags              uint32
	credType           uint32
	targetName         *uint16
	comment            *uint16
	lastWritten        syscall.Filetime
	credentialBlobSize uint32
	credentialBlob     uintptr
	persist            uint32
	attributeCount     uint32
	attributes         uintptr
	targetAlias        *uint16
	userName           *uint16
}

// SavePassword stores the password securely in the Windows Credential Manager.
func SavePassword(connID string, password string) error {
	if connID == "" {
		return errors.New("empty connection ID")
	}

	target, err := syscall.UTF16PtrFromString(targetName(connID))
	if err != nil {
		return err
	}

	blob := []byte(password)
	var blobPtr uintptr
	if len(blob) > 0 {
		blobPtr = uintptr(unsafe.Pointer(&blob[0]))
	}

	cred := winCredential{
		credType:           credTypeGeneric,
		targetName:         target,
		credentialBlobSize: uint32(len(blob)),
		credentialBlob:     blobPtr,
		persist:            credPersistLocalMachine,
	}

	r1, _, errSys := procCredWrite.Call(uintptr(unsafe.Pointer(&cred)), 0)
	if r1 == 0 {
		return fmt.Errorf("CredWrite failed: %w", errSys)
	}

	return nil
}

// GetPassword retrieves the password securely from the Windows Credential Manager.
func GetPassword(connID string) (string, error) {
	if connID == "" {
		return "", errors.New("empty connection ID")
	}

	target, err := syscall.UTF16PtrFromString(targetName(connID))
	if err != nil {
		return "", err
	}

	var credPtr *winCredential
	r1, _, errSys := procCredRead.Call(
		uintptr(unsafe.Pointer(target)),
		uintptr(credTypeGeneric),
		0,
		uintptr(unsafe.Pointer(&credPtr)),
	)
	if r1 == 0 {
		// Element not found is a normal case when no password is saved
		return "", fmt.Errorf("CredRead failed: %w", errSys)
	}
	defer procCredFree.Call(uintptr(unsafe.Pointer(credPtr)))

	if credPtr == nil || credPtr.credentialBlobSize == 0 {
		return "", nil
	}

	blobBytes := unsafe.Slice((*byte)(unsafe.Pointer(credPtr.credentialBlob)), credPtr.credentialBlobSize)
	return string(blobBytes), nil
}

// DeletePassword removes a stored password from the Windows Credential Manager.
func DeletePassword(connID string) error {
	if connID == "" {
		return nil
	}

	target, err := syscall.UTF16PtrFromString(targetName(connID))
	if err != nil {
		return err
	}

	r1, _, errSys := procCredDelete.Call(
		uintptr(unsafe.Pointer(target)),
		uintptr(credTypeGeneric),
		0,
	)
	if r1 == 0 {
		// Ignore not found errors during deletion
		_ = errSys
	}

	return nil
}
