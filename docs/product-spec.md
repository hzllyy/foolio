# Foolio Product Specification

## 1. Product Summary

Foolio is a no-code website builder for creative portfolios. It combines a familiar visual page editor with a pixel-based animation timeline so creators can choreograph how elements move as a visitor scrolls.

The product has four primary surfaces:

1. **Edit** - build pages and change element appearance and layout.
2. **Animate** - add pixel-positioned keyframes for scroll-driven motion.
3. **Preview** - experience the site at selectable viewport sizes.
4. **Publish** - make an immutable version of the project publicly accessible.

## 2. Design Evidence

The Figma overview (`0:1`) contains:

- Landing, login, registration, editor, animation, preview, and deploy/publish screens.
- A desktop editor with a menubar, project sidebar, page selector, canvas, mode switch, viewport controls, undo, and redo.
- An animation workspace with a pixel readout, playhead, keyframe markers, and screen thumbnails.
- A preview workspace with viewport controls.
- A publish form headed "Go Public!".

The Figma component page (`107:4`) contains:

- Primary and tertiary button variants, text fields, and common icon sizes.
- Edit/animate segmented-control states and default/previewing/deploying menubars.
- Toolbar controls for select, shape, text, upload, polygon, and pen.
- Sidebar variants for Canvas, Typography, Upload, Shape, Pen, Animate, and Sprite.
- Layer default, selected, and collapsed states.
- Position, rotation, scale, opacity, line-weight, width, page-height, and viewport controls.

The Figma file is the visual reference. This specification defines behavior where the design is silent.

## 3. Goals

- Let a creator build and publish a polished portfolio without writing code.
- Make scroll animation understandable through a video-editor-like timeline measured in pixels.
- Keep Edit and Animate views consistent by operating on the same elements and document model.
- Make experimentation low-friction, including guest access without registration.
- Ensure preview and published output use the same rendering and animation semantics.

## 4. Non-Goals for the First Release

- Real-time multiplayer editing.
- Third-party plugins, templates marketplace, or custom JavaScript.
- General-purpose ecommerce, CMS collections, forms, or blogging.
- Arbitrary CSS editing.
- Full Wix feature parity.
- Native mobile applications.
- Importing existing websites or Figma documents.
- Video/audio timeline editing.

## 5. User Types

### Guest Creator

- Can start a local project without an account.
- Can use the editor, animation mode, and preview.
- Cannot publish or synchronize across devices.
- Receives a browser-exit warning only when the local project has unsaved changes.
- Can register or sign in to migrate the local project and its assets.

### Registered Creator

- Can create, save, reopen, preview, and publish projects.
- Can sign in with email/password or Google.
- Owns private draft projects and uploaded assets.

### Portfolio Visitor

- Can access a published portfolio by its public URL.
- Sees no builder UI and does not need an account.
- Receives the appropriate responsive layout and scroll animations.

## 6. Core User Flows

### 6.1 Entry and Authentication

1. The landing page offers **Log in**, **Get started**, and **Continue as guest**.
2. Login supports Google and email/password.
3. Registration supports Google and site-managed credentials.
4. Guest entry creates a local project and opens Edit mode.
5. Registering from a guest session migrates the current local project before redirecting to the authenticated project URL.
6. If migration fails, the local project remains intact and the user can retry.

### 6.2 Edit Mode

The user can:

- Select one or more elements on the canvas or in Layers.
- Add rectangles/basic shapes, polygons, text, uploaded images, pen paths, and sprites.
- Drag, resize, and rotate selected elements.
- Change relevant properties such as position, size, rotation, opacity, fill, stroke, line weight, typography, and stacking order.
- Rename, show/hide, lock, reorder, group, duplicate, and delete layers.
- Add, rename, reorder, duplicate, and delete pages.
- Set page scroll length in CSS pixels (the Figma page-height control should use this product term).
- Undo and redo document-changing actions.
- Switch between desktop and mobile layout editing.

Tool behavior:

- **Select** enables selection and transforms.
- **Shape** creates a default rectangle, then exposes shape controls.
- **Text** creates an editable text element and exposes typography controls.
- **Upload** accepts supported image files and creates an image element.
- **Polygon** creates a polygon with configurable points and appearance.
- **Pen** records a freehand path and simplifies it into an SVG path.
- **Sprite** accepts one to four ordered images and creates one sprite element.

### 6.3 Layers

- Every page element appears exactly once in the Layers tree.
- Layer order is the paint order within a parent.
- Canvas and Layers selection remain synchronized.
- Hidden elements are not rendered in preview or publish.
- Locked elements render but cannot be transformed on the canvas.
- Groups may contain elements or nested groups; cycles are prohibited.

### 6.4 Animate Mode

- Animate mode uses the same page and element IDs as Edit mode.
- The horizontal timeline represents document scroll offset in CSS pixels, not elapsed time.
- Selecting an element shows its animation tracks.
- A keyframe captures one or more animatable properties at a scroll offset.
- Initial animatable properties are `x`, `y`, `width`, `height`, `rotation`, and `opacity`.
- Scale may be represented in the UI but is stored as width/height for deterministic layout unless proportional scaling is explicitly selected.
- Keyframes can be added, moved, edited, duplicated, and deleted.
- Values interpolate between neighboring keyframes using an easing function.
- Scrubbing the playhead updates the canvas without scrolling the surrounding application.
- The timeline range is `0..page.scrollLengthPx` for the active viewport.
- The rendered document height is `viewportHeightPx + scrollLengthPx`, so every timeline offset is reachable through `scrollY`.
- Keyframes cannot exist outside the page range; reducing scroll length requires confirmation if keyframes would be clamped or removed.
- Undo and redo span both Edit and Animate operations.

Default interpolation is linear. The data model supports easing from the start, while an easing editor may ship after the first usable animation milestone.

### 6.5 Sprite Elements

- A sprite contains one to four ordered image frames.
- It behaves as one image-like layer for layout, transforms, opacity, and animation.
- The sprite frame can be mapped to scroll progress over a configured pixel range.
- The first release uses discrete frame stepping; frame crossfades are optional later.
- Missing or failed frames are reported in the sidebar and block publish until fixed or removed.

Open interaction details for design validation:

- Whether a sprite loops, clamps, or ping-pongs outside its configured range.
- Whether frame duration can be weighted or is always evenly distributed.
- Whether automatic image alignment/cropping is needed when aspect ratios differ.

## 7. Preview and Responsive Behavior

- Preview removes editor chrome and renders the current draft through the production renderer.
- Desktop and mobile viewport controls match the Figma component set.
- Preview supports scrolling the complete page and restarting from scroll position zero.
- Edit state is not mutated by preview scrolling.
- Desktop and mobile layouts share content and element identity but may override geometry and animation keyframes.
- The published runtime chooses the closest supported layout breakpoint.
- For the first release, desktop and mobile are authored explicitly; tablet derives from desktop unless later added as a first-class breakpoint.

## 8. Publish

1. Publish validates the project, including missing assets, invalid links, duplicate slugs, and out-of-range keyframes.
2. The creator chooses a unique public slug and optional title/description.
3. Foolio creates an immutable publication snapshot of the current draft.
4. The public URL becomes available only after the snapshot and referenced assets are ready.
5. Later edits remain private until the creator publishes again.
6. Re-publish atomically replaces the active snapshot; visitors never see a partially updated project.
7. A creator can unpublish without deleting the draft.

The Figma term **deploy** is treated as **publish** in product copy and domain naming.

## 9. Saving and Guest Safety

### Registered Projects

- Local changes update immediately in memory.
- Changes are debounced into autosave batches.
- The UI exposes `saving`, `saved`, `offline`, and `error` states.
- Failed saves remain queued locally and retry when connectivity returns.

### Guest Projects

- The complete draft and local image blobs are stored in IndexedDB.
- `beforeunload` is registered only while the guest document has changes not committed to IndexedDB.
- Browser warnings cannot use custom text; the browser supplies the message.
- Closing a tab after a successful IndexedDB write should not show a warning.
- Clearing browser storage, private browsing limits, or switching devices can still lose work; this limitation must be shown before substantial editing and at publish/sign-in entry points.

## 10. Functional Acceptance Criteria

### Editor MVP

- A user can create, select, transform, reorder, hide, lock, duplicate, and delete all supported element types.
- Selection is identical between Layers and canvas.
- Undo/redo restores both element state and selection-relevant results without corrupting IDs.
- Reloading restores an authenticated project and a guest project.

### Animation MVP

- A user can create at least two keyframes for an element and see deterministic interpolation while scrubbing and scrolling.
- Position, size, rotation, and opacity match at exact keyframe pixel offsets.
- Moving a keyframe updates ordering without creating duplicate `(track, offset)` records.
- Preview and published output match editor scrubbing within a one-pixel geometry tolerance, excluding font rasterization.

### Publish MVP

- Only the owner can publish or unpublish a project.
- Public URLs resolve without authentication.
- A failed publish leaves the previous active publication unchanged.
- Draft changes do not affect the active publication until re-published.

## 11. Non-Functional Requirements

- **Performance:** maintain interactive transforms near 60 fps on a reference project of 200 elements and 500 keyframes on a current mid-range laptop.
- **Load:** first published view should target LCP under 2.5 seconds on a representative mobile connection after assets are optimized.
- **Durability:** autosave operations must be idempotent and recover after a dropped request.
- **Accessibility:** builder controls are keyboard reachable; published text remains real selectable text; reduced-motion visitors can receive static keyframe values.
- **Security:** drafts are private by default; uploaded content is validated; public rendering does not execute user scripts or raw HTML.
- **Compatibility:** current evergreen Chrome, Edge, Firefox, and Safari; touch preview is supported, while full mobile authoring is not required initially.

## 12. Open Product Questions

- Which easing presets are required for the first public demo?
- Are links and buttons first-release elements, or should text/image elements receive link behavior?
- What project and asset limits apply to free (registered) accounts? Guest limits are resolved: PNG/JPEG/WebP only, 8MB per image, 20 assets per project (see `decisions.md` ADR-022).
- Is a custom domain required after the first release?
