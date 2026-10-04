# NoVacDB Studio — TODO & Unsupported Features

This document tracks features and PostgreSQL capabilities not yet supported by NoVacDB or planned for future milestones.

## Unsupported by NoVacDB Server (as of Phase 6)

- **Catalogs**: `pg_catalog` and `information_schema` do not exist. Studio must not query them.
- **Aggregates**: `COUNT`, `SUM`, `AVG`, `MAX`, `MIN`.
- **Grouping**: `GROUP BY`.
- **Joins & Subqueries**: `JOIN`, subqueries.
- **Transactions over wire**: `BEGIN`, `COMMIT`, `ROLLBACK`.
- **Session config**: `SET`, `SHOW`.
- **Data types**: `varchar` / `char` are rejected with "Use text."
- **Clauses**: `RETURNING` is not yet supported.

## Milestone 2 (Future)

- Multiple editor tabs.
- Open and save `.sql` files.
- Dark / light theme switching.
- Export results to CSV.

## Later Milestones

- Table browser (pending server metadata support).
- SSH tunnel connections for remote servers.
- NoVacDB Dashboard: live table sizes, undo log metrics, and purge activity.
