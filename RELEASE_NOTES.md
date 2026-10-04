# NoVacDB Studio v0.2.0 Release Notes

NoVacDB Studio v0.2.0 is the second release of the dedicated desktop client for NoVacDB and PostgreSQL.

## What's New

- **CodeMirror 6 SQL Editor**:
  - Full SQL syntax highlighting, line numbering, and bracket matching.
  - Multi-tab query editing (`Ctrl+T` new, `Ctrl+W` close) with local persistence across application restarts.
  - Open and save `.sql` files (`Ctrl+O`, `Ctrl+S`, `Ctrl+Shift+S`).
  - Targeted execution: run the statement under the cursor or selection (`Ctrl+Enter`), or execute the entire editor (`Ctrl+Shift+Enter`).
  - Multi-statement execution: batch statements separated by semicolons are executed sequentially with distinct result tabs.

- **Query Execution & Wire Protocol Cancellation**:
  - Real-time elapsed execution time counter in the editor toolbar.
  - Asynchronous query cancellation (`Escape` or "Cancel" button) using PostgreSQL wire protocol `CancelRequest` on a dedicated auxiliary connection without freezing the interface or dropping the primary session.
  - Command tags (e.g. `INSERT 0 10`, `CREATE TABLE`) and execution duration reported upon completion.

- **High-Performance Results Grid**:
  - Row virtualization supporting up to 100,000 rows with continuous smooth scrolling.
  - Column headers displaying column names and PostgreSQL data type names (`int4`, `text`, `timestamptz`, `float8`, etc.).
  - Explicit representation of SQL `NULL` values in muted typography.
  - Truncated cell preview with a full-value inspection modal for large text fields.
  - Cell selection with clipboard copy (`Ctrl+C`) formatted as tab-separated values (TSV) for spreadsheet applications.
  - Data export to CSV and JSON files via native file dialogs.

- **Enhanced Server Error Reporting**:
  - Displays server error fields: severity, SQLSTATE code, primary message, `DETAIL`, and `HINT`.
  - Highlights the exact character error position in the CodeMirror editor with an inline squiggly underline.
  - Clear "Connection lost" indicator with a one-click "Reconnect" action.

- **Secure Connection Management**:
  - Saved connection profiles (host, port, user, database).
  - Passwords are never stored in plain text: integrated with Windows Credential Manager (`advapi32.dll`) when "Remember password" is enabled.
  - "Test connection" utility verifying server connectivity and retrieving `server_version`.

- **Persistent Query History**:
  - Local history storing up to 1,000 executed queries with timestamp, connection name, status, and duration.
  - Search filter by query text.
  - Double-click query item to load it into the active editor tab.

- **Design & Theme**:
  - Neutral monochrome theme (light and dark mode) adhering to developer tool ergonomics without gradients or neon accents.
  - System theme detection with manual override.

## Known Limitations

- **Unsigned Executable**: `NoVacDB-Studio.exe` is not signed with a commercial code-signing certificate; Windows SmartScreen will prompt "Windows protected your PC" on first launch (click "More info" -> "Run anyway").
- **Windows Only**: Release binary is built for 64-bit Windows (`windows/amd64`). macOS and Linux support are planned.
- **No Schema Browser**: Object/schema navigation is deferred until the NoVacDB engine implements catalog tables (`pg_catalog`).
- **No Password Authentication in NoVacDB**: NoVacDB currently uses trust authentication on localhost (password authentication is planned).

## SHA256 Checksum

```
a64fede001782a18f5ed8f41c2aec7df58cfb86d176c99917e36d7c6cb564647  NoVacDB-Studio.exe
```
