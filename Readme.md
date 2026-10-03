# NoVacDB Studio

A local desktop app for working with [NoVacDB](https://github.com/vikrant-choudhary06/NoVacDB), the database that never needs VACUUM.

Write SQL, run it, and see the results, all on your own machine. No hosting, no accounts, no telemetry.

> **Status:** early development. The first version is a query editor.

## Features

**Planned for the first version**
- Connect to a NoVacDB server (default `localhost:5433`)
- SQL editor with highlighting; run with `Ctrl+Enter`
- Results in a table, with row count and time taken
- Clear errors: code, message, and the position in your query
- Saved connections and query history

**Later:** multiple tabs, CSV export, a table browser, SSH tunnels, and a NoVacDB dashboard showing table size, undo log and purge activity.

## Requirements

- Windows 10/11 (macOS and Linux later)
- A running NoVacDB server. On Windows, run it in WSL:
  ```bash
  ./novacdb -data-dir ~/novacdb-data
  ```

## Build from source

Needs [Go](https://go.dev/dl/) 1.22+, [Node.js](https://nodejs.org/) LTS and the Wails CLI:

```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails dev      # run in development mode
wails build    # creates build\bin\NoVacDB-Studio.exe
```

## Built with

Go · [Wails](https://wails.io) · React · TypeScript · Tailwind CSS · CodeMirror · pgx

## License

TBD
