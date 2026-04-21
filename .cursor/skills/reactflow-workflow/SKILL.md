---
name: reactflow-workflow
description: Build and harden React Flow diagram surfaces in VeloxDB using @xyflow/react patterns (nodes, edges, viewport, controls, interactions, performance). Use when working on schema diagram canvas behavior, replacing legacy canvas code, or improving diagram UX and scale.
---

# React Flow Workflow

Use this skill when implementing or improving the schema diagram surface in VeloxDB.

## Quick Start

1. Keep `@xyflow/react` styles imported once in the React Flow canvas module.
2. Ensure the canvas parent has explicit width and height.
3. Keep model state ownership in `ModelWorkspace`; keep `ReactFlowCanvas` mostly presentational and interaction-focused.
4. Use `DiagramSurfaceProps` as the boundary contract between workspace state and rendering.

## VeloxDB Diagram Architecture

- `src/features/model/components/ModelWorkspace.tsx`:
  - owns diagram state (viewport, selection, on-canvas tables, pending FKs, groups)
  - computes display props and passes them into `DiagramSurfaceAdapter`
- `src/features/model/components/DiagramSurfaceAdapter.tsx`:
  - forwards `DiagramSurfaceProps` to `ReactFlowCanvas`
- `src/features/model/components/ReactFlowCanvas.tsx`:
  - renders React Flow nodes/edges, connects events to workspace callbacks, and exposes export handle

Keep this separation intact; avoid pushing workspace orchestration logic into the canvas.

## React Flow Implementation Patterns

- **Nodes**:
  - Use memoized custom node components for table rendering.
  - Keep node `data` minimal and serializable.
  - Derive `draggable`, `selected`, and connectability from current tool mode.

- **Edges**:
  - Use routed edge points from `buildRoutedDiagramEdges`.
  - Keep pending edges visually distinct (dash + stronger color).
  - Prefer custom edge component only when built-in edges cannot represent routed geometry.

- **Connections**:
  - Gate with `isValidConnection` to block invalid or duplicate FK links.
  - Parse handles with stable prefixes (`in:` / `out:`) to identify columns.

- **Viewport & controls**:
  - Persist viewport to workspace via callback.
  - Throttle high-frequency viewport updates to avoid rerender storms.
  - Provide explicit fit actions (all and selection) in controls.

- **Tool modes**:
  - Select mode: selection + table dragging.
  - Pan mode: canvas drag panning.
  - Connect mode: handle-to-handle links; no accidental pan.
  - Space key temporarily enables panning in any mode.

## UX and Styling Guidance

- Use design tokens (`--diagram-table-header`, `--border`, `--muted-foreground`) for node and edge visuals.
- Keep minimap/background enabled; they improve navigation on medium/large models.
- Show concise mode hints in-canvas when interaction mode changes.
- Keep selected state and focus state obvious for keyboard + mouse users.

## Performance Guardrails

- Memoize mapped nodes/edges from workspace props.
- Avoid rebuilding heavy arrays on unrelated state changes.
- Throttle viewport persistence callbacks.
- Keep columns bounded for node rendering (`MAX_ROWS` style cap).
- Avoid unnecessary `useEffect`; prefer derived state and event callbacks.

## Change Checklist

- Confirm no renderer fallback code is reintroduced.
- Verify interactions: select, pan, connect, marquee, drag, delete/clear.
- Verify controls: zoom, fit all, fit selection, reset behavior.
- Verify exports (PNG/PDF) still work from current viewport/container.
- Run lint/type checks after editing diagram components.

## Reference

- React Flow Learn: [https://reactflow.dev/learn](https://reactflow.dev/learn)
