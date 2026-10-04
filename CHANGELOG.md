# Changelog

All notable changes to NoVacDB Studio will be documented in this file.

## [v0.2.0] - 2026-10-04

### Added
- CodeMirror 6 SQL editor with syntax highlighting, bracket matching, and line numbers.
- Multi-tab query editing (`Ctrl+T`, `Ctrl+W`) with persistent storage across restarts.
- File operations: open `.sql` files (`Ctrl+O`) and save query tabs (`Ctrl+S`, `Ctrl+Shift+S`).
- Statement-level execution (`Ctrl+Enter`), full execution (`Ctrl+Shift+Enter`), and multi-statement result tabs.
- Wire-level query cancellation (`Escape` / Cancel button) via PostgreSQL `CancelRequest`.
- Virtualized result grid rendering up to 100,000 rows smoothly.
- Column header data types and distinct `NULL` display.
- Tab-separated values (TSV) clipboard copying (`Ctrl+C`) and CSV/JSON file export.
- Server error inspector showing severity, SQLSTATE, character position highlight, `DETAIL`, and `HINT`.
- Secure password storage in Windows Credential Manager (`advapi32.dll`).
- "Test connection" button displaying `server_version`.
- Searchable query history persisting up to 1,000 queries locally with double-click loading.
- System light and dark theme synchronization with manual toggle.

### Changed
- Refactored UI to neutral monochrome palette with centralized CSS variables.
- Updated version identifier to 0.2.0 across `wails.json`, start screen, and about dialog.

## [v0.1.0] - 2026-10-04

### Added
- Initial desktop client implementation with Wails v2, Go 1.25, and React 19.
- Basic connection dialog for NoVacDB and PostgreSQL instances (`localhost:5433`).
- Single query execution and basic tabular results view.
- Start screen with application logo and connection profile list.
- Basic error banner displaying message and error code.
