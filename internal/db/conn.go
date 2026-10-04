package db

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

// Client manages the lifecycle of the active database connection.
type Client struct {
	mu            sync.RWMutex
	conn          *pgconn.PgConn
	currentParams ConnectionParams
}

// NewClient creates a new Client instance.
func NewClient() *Client {
	return &Client{}
}

// BuildConnString formats the connection string for NoVacDB with sslmode=disable.
func BuildConnString(params ConnectionParams) string {
	normalized := params.Normalize()
	parts := []string{
		fmt.Sprintf("host=%s", normalized.Host),
		fmt.Sprintf("port=%d", normalized.Port),
		fmt.Sprintf("user=%s", normalized.User),
		fmt.Sprintf("dbname=%s", normalized.Database),
		"sslmode=disable",
	}
	if normalized.Password != "" {
		parts = append(parts, fmt.Sprintf("password=%s", normalized.Password))
	}
	return strings.Join(parts, " ")
}

// TestConnection attempts to connect to the server, extracts the server version, and closes the connection.
func (c *Client) TestConnection(ctx context.Context, params ConnectionParams) (string, error) {
	connStr := BuildConnString(params)
	testCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	conn, err := pgconn.Connect(testCtx, connStr)
	if err != nil {
		return "", fmt.Errorf("testing connection: %w", err)
	}
	defer conn.Close(context.Background())

	version := conn.ParameterStatus("server_version")
	if version == "" {
		version = "NoVacDB"
	}

	return version, nil
}

// Connect establishes a connection to NoVacDB and stores it on the client.
func (c *Client) Connect(ctx context.Context, params ConnectionParams) (*ConnectionStatus, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// If already connected, close the previous connection first
	if c.conn != nil {
		_ = c.conn.Close(ctx)
		c.conn = nil
	}

	normalized := params.Normalize()
	connStr := BuildConnString(normalized)

	connCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	conn, err := pgconn.Connect(connCtx, connStr)
	if err != nil {
		return nil, fmt.Errorf("connecting to NoVacDB: %w", err)
	}

	c.conn = conn
	c.currentParams = normalized

	return &ConnectionStatus{
		Connected: true,
		Host:      normalized.Host,
		Port:      normalized.Port,
		User:      normalized.User,
		Database:  normalized.Database,
	}, nil
}

// Disconnect closes the active connection if one exists.
func (c *Client) Disconnect(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		return nil
	}

	closeCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err := c.conn.Close(closeCtx)
	c.conn = nil
	c.currentParams = ConnectionParams{}

	if err != nil {
		return fmt.Errorf("disconnecting: %w", err)
	}
	return nil
}

// GetStatus returns the current connection status.
func (c *Client) GetStatus() ConnectionStatus {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.conn == nil {
		return ConnectionStatus{Connected: false}
	}

	return ConnectionStatus{
		Connected: true,
		Host:      c.currentParams.Host,
		Port:      c.currentParams.Port,
		User:      c.currentParams.User,
		Database:  c.currentParams.Database,
	}
}

// Conn returns the underlying active pgconn.PgConn, or nil if disconnected.
func (c *Client) Conn() *pgconn.PgConn {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.conn
}
