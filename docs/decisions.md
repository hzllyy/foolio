# Foolio Architecture Decision Log

This file records decisions that shape implementation. Status values are **Accepted**, **Proposed**, or **Deferred**. Reversals should add a new decision rather than silently rewriting history.

## ADR-001: Build the Production App as a TypeScript Modular Monolith

- **Status:** Accepted
- **Decision:** Use Next.js, React, and TypeScript in one deployable application with explicit domain module boundaries.
- **Why:** Foolio needs authenticated UI, APIs, preview, and public routes, but does not yet need operationally expensive microservices.
- **Consequence:** Existing static files remain a visual prototype; production code will be scaffolded separately and can progressively replace the landing page.

## ADR-002: Use One Versioned Scene Graph Across All Modes

- **Status:** Accepted
- **Decision:** Edit, Animate, Preview, and Publish read the same canonical project document.
- **Why:** Separate editor and runtime models would create drift in geometry and animation behavior.
- **Consequence:** All document changes must pass shared schema validation and migrations.

## ADR-003: Render Authored Content with DOM and SVG, Not a Bitmap Canvas

- **Status:** Accepted
- **Decision:** Use semantic DOM for text/images/shapes and SVG for pen paths/polygons, with editor overlays supplied by Moveable and Selecto.
- **Why:** Published portfolios need selectable text, links, accessibility, responsive behavior, and rendering parity without translating a canvas scene into HTML.
- **Consequence:** Very large scenes require careful DOM virtualization and narrow state subscriptions. Canvas may still be used for temporary image processing, never as the canonical renderer.

## ADR-004: Treat CSS Pixels as the Animation Timeline Unit

- **Status:** Accepted
- **Decision:** Persist keyframe offsets as CSS-pixel scroll positions from `0..scrollLengthPx`; render the document at `viewportHeightPx + scrollLengthPx`.
- **Why:** This is Foolio's defining interaction and matches the Figma timeline readout.
- **Consequence:** Scroll-length edits and responsive layouts must explicitly handle keyframe ranges. Desktop and mobile may have independent scroll lengths.

## ADR-005: Author Desktop and Mobile as Related Layout Variants

- **Status:** Accepted
- **Decision:** Share elements/content across viewports while storing mobile geometry and animation overrides. The mobile breakpoint is `768px` viewport width, matching `ProjectSettings.breakpointPx`'s default. Each element may define independent mobile `ElementAnimation` tracks; when no mobile-specific track exists for a property, the element inherits and replays the desktop track unchanged.
- **Why:** The Figma design contains phone/desktop controls, and creative layouts need more control than automatic scaling provides. Track inheritance keeps typical mobile authoring effort low, since authors only add mobile entries where behavior diverges.
- **Consequence:** Responsive authoring adds complexity; tablet derives from desktop in the first release.

## ADR-006: Use Width and Height as Canonical Animated Size

- **Status:** Accepted
- **Decision:** Persist animated `width` and `height`; expose proportional scale as an editor affordance rather than an independent transform initially. The property inspector's proportional-lock control changes both `width` and `height` together during a single drag but commits ordinary width/height values; no `scale` field exists in `ElementStyle`.
- **Why:** Width/height determine text wrapping and layout, while independent CSS scale can produce misleading bounds.
- **Consequence:** This decision should be revisited if transform scale is essential for visual effects.

## ADR-007: Use a Command Layer with Patch-Based Undo/Redo

- **Status:** Accepted
- **Decision:** All persisted mutations are validated commands that produce Immer forward and inverse patches.
- **Why:** Tool gestures, layer changes, and keyframes need one consistent history and autosave boundary.
- **Consequence:** Direct document mutation outside the command layer is prohibited. Continuous gestures coalesce into one command.

## ADR-008: Separate Durable Document State from Ephemeral Editor State

- **Status:** Accepted
- **Decision:** Selection, active tool, open panel, zoom, hover, and playhead are not stored in the project document.
- **Why:** They should not create autosaves, publications, or cross-tab conflicts.
- **Consequence:** Session restoration may store a small separate preference record.

## ADR-009: Use Supabase for First-Release Auth, PostgreSQL, and Storage

- **Status:** Accepted
- **Decision:** Use Supabase Auth for Google and email/password, PostgreSQL with RLS for durable data, and Supabase Storage for assets.
- **Why:** It minimizes infrastructure while supporting the required auth and access-control model.
- **Consequence:** Domain repositories must isolate vendor APIs so storage or auth can be replaced later.

## ADR-010: Persist Guest Drafts and Assets in IndexedDB

- **Status:** Accepted
- **Decision:** Use Dexie-backed IndexedDB with the same project schema as registered projects.
- **Why:** `localStorage` cannot safely hold structured projects or image blobs, and guest mode must survive reloads.
- **Consequence:** Storage quotas and private-browsing limitations must be communicated. Guest migration is a first-class workflow.

## ADR-011: Warn on Tab Exit Only for Pending Guest Writes

- **Status:** Accepted
- **Decision:** Register `beforeunload` only while a guest persistence transaction is pending.
- **Why:** Browsers ignore custom warning text, and warning on every exit would be noisy when IndexedDB already contains the latest draft.
- **Consequence:** The UI must separately explain that local-only projects can be lost through storage clearing or device changes.

## ADR-012: Use Optimistic Local Editing and Revisioned Autosave

- **Status:** Accepted
- **Decision:** Apply commands locally, batch saves with an idempotency key and base revision, and reject stale conflicting writes.
- **Why:** Network latency cannot block pointer interactions, and duplicate/reordered requests must not corrupt documents.
- **Consequence:** Multi-tab conflicts need a user-visible recovery flow; real-time merge is deferred.

## ADR-013: Publish Immutable Snapshots Atomically

- **Status:** Accepted
- **Decision:** Compile a validated snapshot and immutable asset manifest, then atomically switch the project's active publication.
- **Why:** Public visitors must never see partial saves or mutable drafts.
- **Consequence:** Publish is a distinct server operation, not merely a boolean on the project.

## ADR-014: Use a Shared Renderer for Editor, Preview, and Public Routes

- **Status:** Accepted
- **Decision:** The scene renderer and animation evaluator are framework modules reused in all three surfaces; builder controls wrap but do not fork them.
- **Why:** Rendering parity is a core correctness requirement.
- **Consequence:** Renderer APIs cannot depend on selection, authentication, or database clients.

## ADR-015: Use a RequestAnimationFrame Scroll Driver Initially

- **Status:** Accepted
- **Decision:** Compile tracks and apply evaluated CSS custom properties in one animation-frame loop.
- **Why:** Exact pixel scrubbing and broad browser behavior are more important than adopting `ScrollTimeline` immediately.
- **Consequence:** Native scroll timelines can later optimize compatible cases after parity tests exist.

## ADR-016: Limit Sprite Elements to Four Raster Frames in the First Release

- **Status:** Accepted
- **Decision:** Store one to four ordered image assets and use discrete frame selection over a scroll range.
- **Why:** It meets the stated feature while bounding upload, memory, and authoring complexity.
- **Consequence:** Looping, weighted frame timing, crossfade, and video-like sprites remain open product decisions.

## ADR-017: Keep Draft Assets Private and Published Assets Immutable

- **Status:** Accepted
- **Decision:** Serve drafts through signed URLs and publications through content-addressed public URLs.
- **Why:** Draft privacy and stable CDN caching require different access semantics.
- **Consequence:** Publish must verify/promote every referenced asset before activation.

## ADR-018: Do Not Allow User-Supplied HTML, CSS, or JavaScript

- **Status:** Accepted
- **Decision:** Persist only schema-controlled content, properties, links, and paths.
- **Why:** Arbitrary code would undermine security, rendering determinism, and public-site isolation.
- **Consequence:** Advanced customization must be implemented as safe product features or constrained tokens.

## ADR-019: Use Figma Components as Visual Contracts, Not Runtime Architecture

- **Status:** Accepted
- **Decision:** Reproduce Figma states through reusable application components and tokens without copying frame hierarchy into business logic.
- **Why:** The Figma library describes controls and visual variants, while application state and accessibility require semantic implementation.
- **Consequence:** Component names such as `Type=animate` and `state=deploying` map to typed domain states with normalized naming.

## ADR-020: Defer Real-Time Collaboration and Plugin Extensibility

- **Status:** Deferred
- **Decision:** Design stable IDs and command boundaries that do not block future collaboration, but do not introduce CRDTs or plugin APIs now.
- **Why:** Both systems materially increase complexity before core editor and animation behavior is validated.
- **Consequence:** A stale second tab uses revision conflict handling rather than automatic merging.

## ADR-021: Sprite Frame Stepping Is Evenly Spaced and Clamped

- **Status:** Accepted
- **Decision:** Within `SpritePlayback.startOffsetPx..endOffsetPx`, compute `t = clamp((scrollOffsetPx - startOffsetPx) / (endOffsetPx - startOffsetPx), 0, 1)` and select `frameIndex = min(frames.length - 1, floor(t * frames.length))`. There is no looping, ping-pong, or crossfade in the first release.
- **Why:** A single deterministic formula keeps the renderer, editor preview, and published output identical without per-sprite configuration.
- **Consequence:** Authors control pacing only by adjusting `startOffsetPx`/`endOffsetPx`, not per-frame durations. Looping and crossfade remain deferred, as already noted in ADR-016.

## ADR-022: Guest Uploads Are Capped by Type, Size, and Count

- **Status:** Accepted
- **Decision:** Accept PNG, JPEG, and WebP uploads only. Guest (unauthenticated) projects allow up to 20 assets per project and 8MB per image, enforced client-side before an asset enters the document.
- **Why:** Bounded, predictable limits protect IndexedDB quotas and keep the Phase 0 storage spike's assumptions valid; registered-account limits can be raised independently later without a schema change.
- **Consequence:** Exceeding a cap must block the upload with a clear message rather than silently truncating the project. Registered-account quotas remain an open product question (see `product-spec.md`).

## Decisions Requiring Product Validation

Phase 0's blocking decisions (mobile breakpoint/tracks, scale semantics, sprite behavior, guest upload limits) are resolved above in ADR-005, ADR-006, ADR-021, and ADR-022.

| Topic | Current proposal | Must resolve by |
| --- | --- | --- |
| Public slug retention | Temporary reservation after unpublish | Publish milestone |
