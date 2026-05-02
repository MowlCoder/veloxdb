# Changelog

All notable changes to VeloxDB will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-02

### Initial Release

VeloxDB is a fast, memory-efficient, developer-focused PostgreSQL desktop client. First public release.

### Features

**SQL Query Workspace**
- Monaco-powered SQL editor with syntax highlighting, autocomplete, and configurable font settings
- Multi-tab query editing with per-tab connection targeting
- Real-time SQL linting validated against the connected PostgreSQL server
- Query history with favorites, search, and per-connection filtering
- Results grid with virtual scrolling, inline cell editing, row insertion, and row deletion
- EXPLAIN ANALYZE support with inline plan visualization
- Export results to CSV and JSON
- SQL formatting via `sql-formatter`
- Quick-action SQL templates (SELECT, INSERT, UPDATE, DELETE, RENAME, DROP)

**Visual ER Diagram (Model)**
- Interactive canvas for introspecting and designing database schemas
- Auto-layout algorithms (grid, topological, Dagre-based)
- Drag-and-drop tables from catalog onto canvas
- Visual relationship creation between columns
- Inline table/column editing (rename, change types, add/drop)
- Index, trigger, rule, and RLS policy management
- Undo/Redo support for all diagram changes
- DDL migration preview before applying schema changes
- Diagram export to PNG and PDF
- Multiple diagram views per connection
- Snap-to-grid and alignment tools

**Connection Management**
- Multiple PostgreSQL connection profiles
- SSL/TLS support (disable, prefer, require)
- SSH tunnel support via bastion/jump host (key and password auth)
- Secure credential storage in OS keychain (macOS Keychain, Windows Credential Manager, Linux secret-service)
- Periodic health pings with auto-reconnect
- Reconnect to last active connection on launch

**Developer Experience**
- Command palette (Cmd/Ctrl+P) for quick action invocation
- Comprehensive keyboard shortcuts
- Light and dark themes with system-follow
- Persistent workspace state across sessions
- Resizable sidebar and results panel
- Error boundaries and toast notifications
- Onboarding flow for first-time users
- Settings dialog for theme, font, lint delay, max rows, and more

**Technical Foundation**
- Tauri 2 desktop framework (Rust backend + React frontend)
- Deadpool-postgres connection pooling for efficient concurrent queries
- Repository pattern for clean separation of concerns
- TanStack Query for server state management
- Zustand for client state management
- Virtual scrolling via TanStack Virtual for large result sets
