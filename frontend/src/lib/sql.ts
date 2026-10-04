/**
 * Utility functions for parsing SQL statements and extracting the statement under cursor.
 */

export interface SqlStatementRange {
  text: string;
  start: number;
  end: number;
}

/**
 * Splits SQL text into individual statements, respecting single-quoted strings,
 * double-quoted identifiers, and comments.
 */
export function splitSqlStatements(sql: string): SqlStatementRange[] {
  const statements: SqlStatementRange[] = [];
  const len = sql.length;
  let stmtStart = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  let i = 0;
  while (i < len) {
    const ch = sql[i];
    const next = i + 1 < len ? sql[i + 1] : '';

    if (inLineComment) {
      if (ch === '\n' || ch === '\r') {
        inLineComment = false;
      }
      i++;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (inSingleQuote) {
      if (ch === "'") {
        if (next === "'") {
          // Escaped quote ''
          i += 2;
          continue;
        }
        inSingleQuote = false;
      }
      i++;
      continue;
    }

    if (inDoubleQuote) {
      if (ch === '"') {
        if (next === '"') {
          // Escaped identifier ""
          i += 2;
          continue;
        }
        inDoubleQuote = false;
      }
      i++;
      continue;
    }

    // Check comment starters
    if (ch === '-' && next === '-') {
      inLineComment = true;
      i += 2;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }

    // Check quotes
    if (ch === "'") {
      inSingleQuote = true;
      i++;
      continue;
    }

    if (ch === '"') {
      inDoubleQuote = true;
      i++;
      continue;
    }

    // Semicolon separator
    if (ch === ';') {
      const stmtText = sql.slice(stmtStart, i).trim();
      if (stmtText.length > 0) {
        statements.push({
          text: stmtText,
          start: stmtStart,
          end: i,
        });
      }
      stmtStart = i + 1;
      i++;
      continue;
    }

    i++;
  }

  // Trailing statement without semicolon
  const lastText = sql.slice(stmtStart).trim();
  if (lastText.length > 0) {
    statements.push({
      text: lastText,
      start: stmtStart,
      end: len,
    });
  }

  return statements;
}

/**
 * Finds the SQL statement enclosing the current cursor offset.
 * If cursor is between statements or at end, returns the nearest statement.
 */
export function getStatementAtCursor(sql: string, cursorOffset: number): string {
  const stmts = splitSqlStatements(sql);
  if (stmts.length === 0) {
    return sql.trim();
  }

  // Find exact enclosing statement
  for (const s of stmts) {
    if (cursorOffset >= s.start && cursorOffset <= s.end) {
      return s.text;
    }
  }

  // Find closest statement preceding cursor
  let closest = stmts[0];
  for (const s of stmts) {
    if (s.start <= cursorOffset) {
      closest = s;
    } else {
      break;
    }
  }

  return closest.text;
}
