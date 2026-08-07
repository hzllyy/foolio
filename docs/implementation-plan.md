# Foolio Implementation Plan

## 1. Delivery Strategy

Build Foolio as vertical slices around one shared document model and renderer. Prove geometry and scroll interpolation before investing in complete visual polish or backend breadth. Each phase ends with an executable demo and quality gate.

The existing repository is a static landing-page prototype with no package manifest, application framework, backend, or tests. Phase 0 therefore establishes a production application rather than incrementally adding builder logic to `script.js`.

## 2. Workstreams

- **Product and design:** resolve open interactions, normalize Figma states, and define responsive behavior.
- **Document/runtime:** schema, commands, renderer, geometry, animation evaluation, and migrations.
- **Builder UI:** shell, tools, Layers, inspector, timeline, preview, and responsive authoring.
- **Platform:** authentication, persistence, assets, guest migration, publishing, and observability.
- **Quality:** accessibility, security, test automation, visual parity, and performance budgets.

## 3. Phase 0 - Foundations and Risk Prototypes

### Deliverables

- Scaffold Next.js + React + TypeScript with linting, formatting, Vitest, and Playwright.
- Establish `src` boundaries described in `architecture.md`.
- Translate Figma colors, typography, spacing, borders, and control states into design tokens and accessible primitives.
- Preserve the current landing prototype for comparison; migrate its visuals only after app foundations exist.
- Configure local/staging Supabase projects, migrations, environment validation, and CI.
- Create small technical spikes for:
  - DOM/SVG drag, resize, rotate, selection, and snapping using Moveable/Selecto.
  - 200-element render performance.
  - Pixel-keyframe interpolation during timeline scrubbing and real scrolling.
  - IndexedDB storage of a project plus four representative image blobs.

### Product Decisions to Close (Resolved)

All four decisions below are resolved; see `decisions.md` ADR-005, ADR-006, ADR-021, and ADR-022.

- Mobile breakpoint is `768px`; mobile animation tracks are independently authored per property and fall back to the desktop track when absent.
- Scale is expressed as width/height with a proportional-lock UI affordance; no separate scale property is persisted.
- Sprite frames step evenly across a clamped scroll range, with no loop/crossfade in the first release.
- Guest uploads accept PNG/JPEG/WebP, capped at 8MB per image and 20 assets per project.

### Exit Gate

- CI runs typecheck, lint, unit tests, and one Playwright smoke test.
- The geometry prototype can select, drag, resize, and rotate DOM/SVG elements.
- A pure evaluator returns exact expected values at keyframe boundaries and midpoint.
- No unresolved decision blocks the canonical schema.

## 4. Phase 1 - Canonical Document and Shared Renderer

### Deliverables

- Implement versioned Zod schemas for projects, pages, elements, viewports, assets, tracks, and keyframes.
- Implement migrations and representative fixtures.
- Build scene graph traversal, parent/child invariants, and stable ordering.
- Build shared renderers for group, shape, polygon, text, image, path, and sprite elements.
- Implement desktop/mobile style resolution.
- Implement pure animation track compilation and evaluation.
- Add reduced-motion pose selection.
- Add renderer error boundaries for invalid/missing elements and assets.

### Tests

- Schema accepts all valid element types and rejects unknown/unsafe data.
- Tree operations prevent cycles, cross-page parenting, and orphan references.
- Renderer snapshots cover each element type and viewport override.
- Property-based tests cover interpolation ordering, clamping, easing, and finite numeric output.
- Editor, preview, and published render modes produce equivalent authored markup apart from mode-specific wrappers.

### Exit Gate

- A fixture portfolio renders from JSON in desktop and mobile modes.
- Changing `scrollOffsetPx` deterministically changes position, size, rotation, opacity, and sprite frame.

## 5. Phase 2 - Editor Shell, Commands, and Core Tools

### Deliverables

- Implement the Figma-aligned menubar, edit/animate switch, sidebar, toolbar, viewport control, canvas, and status UI.
- Implement Zustand stores for document and ephemeral session state.
- Implement command dispatch, Immer patches, gesture coalescing, undo, and redo.
- Implement Select tool with click, marquee, multi-select, drag, resize, rotate, keyboard nudging, snapping, and zoom-aware coordinates.
- Implement Shape, Text, Upload, Polygon, and Pen tools.
- Implement contextual inspectors for typography, fill, stroke, opacity, line weight, transform, and page scroll length.
- Add keyboard shortcuts and tooltips without exposing shortcuts as persistent instructional UI.
- Add accessible names, focus management, and non-pointer alternatives for core controls.

### Tests

- Every command round-trips through undo and redo.
- One drag gesture creates one history entry.
- Canvas coordinates remain correct at multiple zoom levels.
- Tool switching cancels incomplete operations safely.
- Uploaded image placeholders cannot enter the document without a valid asset reference.
- Playwright covers creating and transforming every element type.

### Exit Gate

- A local in-memory project can be built from scratch and survives a full undo/redo cycle.
- The core builder matches the latest Figma screen at target desktop dimensions without overlap.

## 6. Phase 3 - Layers, Pages, and Local Persistence

### Deliverables

- Implement layer default, selected, and collapsed states from Figma.
- Synchronize selection, visibility, lock state, names, nesting, and paint order between Layers and canvas.
- Implement page add, rename, duplicate, reorder, delete, and active-page switching.
- Add Dexie database for documents, asset blobs, pending operations, and migration state.
- Implement guest autosave compaction and crash recovery.
- Add a pending-write-aware `beforeunload` guard.
- Add clear guest-local-storage messaging and quota failure handling.

### Tests

- Tree reorder and reparent operations preserve invariants and z-order.
- Reload restores the active guest draft and assets.
- Exit warning is installed during a pending write and removed after commit.
- IndexedDB quota and write failures leave the in-memory project usable and visibly unsaved.

### Exit Gate

- A guest can create a multi-page project, reload the tab, and continue without data loss.
- Layers and canvas never disagree about the selected or visible elements.

## 7. Phase 4 - Animation Workspace

### Deliverables

- Implement Animate mode and its sidebar state.
- Build virtualized timeline rows, pixel ruler, playhead, page-length visualization, keyframe markers, and horizontal navigation.
- Add keyframe create, update, move, duplicate, multi-select, and delete commands.
- Add property tracks for position, width, height, rotation, and opacity.
- Add timeline scrubbing and canvas synchronization.
- Add easing presets and data support for cubic Bezier values.
- Define confirmation behavior when scroll length is reduced across existing keyframes.
- Implement runtime scroll driver using compiled tracks and CSS custom properties.

### Tests

- Exact keyframe offsets produce exact authored values.
- Scrubbing, preview scrolling, and runtime scrolling produce equivalent values.
- Keyframe collisions resolve predictably and remain undoable.
- Timeline stays responsive with 500 keyframes.
- Reduced-motion output is static and usable.

### Exit Gate

- A creator can animate an element across a pixel range, scrub it in Animate mode, and see the same result in a scrollable runtime fixture.

## 8. Phase 5 - Sprite Tool

### Deliverables

- Implement the Sprite sidebar variant already present in the Figma component library.
- Add one-to-four-frame upload, ordering, replacement, removal, and validation.
- Add canvas placeholder/loading/error states.
- Map scroll range to discrete frame selection.
- Preload adjacent frames and prevent dimension changes from shifting layout.
- Add publish validation for incomplete or failed frames.

### Tests

- Sprite schemas reject zero or more than four frames.
- Frame selection is correct at start, boundary, midpoint, and end offsets.
- Mixed source dimensions respect the chosen fit behavior.
- Failed uploads do not lose successfully uploaded frames.

### Exit Gate

- A four-frame sprite behaves like one editable layer and plays deterministically in editor, preview, and runtime.

## 9. Phase 6 - Authentication, Cloud Autosave, and Guest Migration

### Deliverables

- Configure Supabase email/password and Google OAuth flows.
- Implement registration, login, logout, session refresh, password reset, and auth error states.
- Add project ownership tables, RLS policies, repository adapters, and server-side authorization.
- Implement revisioned autosave with idempotency keys, local retry queue, and save status.
- Implement private asset uploads, byte validation, metadata extraction, and signed URLs.
- Implement retryable guest-to-account migration with content-hash asset upload.
- Add stale-tab conflict handling.

### Tests

- RLS denies cross-user project and asset access.
- Replayed autosave requests do not duplicate or reorder changes.
- Network interruption queues and later flushes saves.
- Guest migration can resume after failure without duplicates.
- Local guest data is retained until the remote project is verified.

### Exit Gate

- Email and Google users can reopen projects across sessions.
- A guest can register and continue editing the same project with all assets intact.

## 10. Phase 7 - Preview and Responsive Authoring

### Deliverables

- Implement preview route using the shared renderer and current draft revision.
- Add desktop/mobile viewport switching and fit controls from the Figma component set.
- Implement mobile geometry overrides and, once confirmed, mobile animation tracks.
- Add missing-override indicators and reset-to-desktop behavior.
- Ensure preview scrolling never mutates editor playhead unless explicitly linked.
- Add responsive image renditions and font-loading stabilization.

### Tests

- Desktop and mobile previews choose the expected layout.
- Draft preview requires owner access and does not leak private data.
- Editor and preview screenshots match at exact viewport/scroll coordinates.
- Text and controls do not overflow or overlap at supported viewport sizes.

### Exit Gate

- A creator can author and preview both supported layouts with deterministic animation behavior.

## 11. Phase 8 - Publish and Public Runtime

### Deliverables

- Implement publish preflight validation and actionable error reporting.
- Implement unique slug selection, public metadata, and slug reservation rules.
- Compile immutable publication snapshots and animation arrays.
- Promote referenced assets to immutable public keys.
- Atomically activate, replace, retire, and unpublish publications.
- Implement public `p/[slug]` route, metadata tags, canonical URL, caching, and not-found behavior.
- Add audit events and publish observability.

### Tests

- Publish rejects missing assets, invalid documents, and unauthorized users.
- Failed publish leaves the previous publication active.
- Draft edits do not alter active public output.
- Public routes require no session and expose no private storage keys.
- Re-publish changes the publication cache key and preserves old in-flight responses.

### Exit Gate

- A registered creator can publish, update, visit, and unpublish a portfolio end to end.

## 12. Phase 9 - Hardening and Demo Readiness

### Deliverables

- Complete Figma visual parity pass for landing, auth, editor, animate, preview, publish, and component states.
- Run keyboard and screen-reader audits on builder workflows.
- Add CSP, rate limits, upload abuse controls, and security headers.
- Optimize images, bundles, timeline rendering, and animation evaluation.
- Add Sentry dashboards and alerts for autosave, migration, asset, and publish failures.
- Create seeded demo projects covering text, images, paths, polygons, sprites, and dense animation.
- Add backup/restore runbook and database migration procedure.

### Release Gates

- No critical/high security findings.
- Core Playwright suite passes in supported browsers.
- 200-element/500-keyframe reference project meets interaction budget.
- Published representative project meets agreed Core Web Vitals target.
- Guest recovery, account migration, and atomic republish have been failure-tested.
- Product owner signs off on current Figma parity and open-question resolutions.

## 13. Suggested Milestone Sequence

1. **Interactive editor proof:** Phase 0-2.
2. **Durable guest builder:** Phase 3.
3. **Signature animation demo:** Phase 4.
4. **Sprite differentiation:** Phase 5.
5. **Account-backed product:** Phase 6.
6. **Responsive preview:** Phase 7.
7. **Public portfolio release:** Phase 8-9.

This order deliberately proves Foolio's differentiator before completing platform infrastructure, while keeping the document model durable enough to avoid a rewrite.

## 14. Major Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Editor/runtime rendering drift | Published output differs from authoring | One shared renderer and parity tests |
| Pixel timeline/rendered-height drift | Unreachable keyframes or mismatched preview | Enforce `documentHeight = viewportHeight + scrollLength` in schema and parity tests |
| React rerenders during drag/scroll | Poor interaction performance | Imperative overlays/CSS variables, gesture commits, narrow stores |
| Guest asset loss or quota exhaustion | Loss of trust | IndexedDB transactions, quotas, status UI, migration retries |
| Responsive animation complexity | Schedule expansion | Desktop-first model, explicit mobile overrides, defer tablet |
| Large image/sprite memory use | Crashes and slow public sites | Dimension/byte caps, renditions, adjacent-frame preload |
| Autosave conflicts across tabs | Silent overwrite | Base revisions, conflict UI, no hidden last-write-wins |
| Partial publication | Broken public portfolio | Immutable build plus atomic active-snapshot swap |
| Unsafe user content | XSS or asset abuse | No raw code, strict schemas, byte validation, CSP, RLS |

## 15. Definition of Done for Any Feature

- Product behavior and edge cases are documented.
- Persisted changes use schema-validated commands and are undoable where appropriate.
- Guest and authenticated persistence implications are handled.
- Editor, preview, and published behavior remain consistent where applicable.
- Keyboard and accessible names are included.
- Unit/integration tests cover failure paths, not only the happy path.
- No unbounded asset, element, or keyframe operation is introduced.
- Relevant architecture decisions and data migrations are updated.
