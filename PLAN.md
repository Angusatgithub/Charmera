# Charmera Plan

## Project Context

Charmera is a static photography portfolio site built as an infinite canvas. The app is served from `index.html`, `styles.css`, and small vanilla JavaScript modules under `js/`, and it reads layout data from `photos.json`. The current experience is centered on lightweight browsing: drag to move, scroll or pinch to zoom, and lazy-loaded photos placed across a custom coordinate system.

## Working Notes

- Keep the site static and easy to deploy on GitHub Pages.
- Treat `photos.json` as the editable map of the gallery.
- Preserve the current visual tone unless a design change is explicitly requested.
- Validate changes in a browser because there is no automated test suite.
- The current gallery data was regenerated from the live `photos/` directory on 14 April 2026.
- `photos.json` now contains 243 live entries and no longer uses template placeholders.
- `photos.json` now also carries optional `title` and `date` fields used by the Phase 3 metadata pill.
- `photos.overrides.json` is now the durable home for curated positions, metadata tweaks, and rename carry-overs that should survive bulk sync runs.
- All current photos in `photos/` are 1440x1080 landscape images, so every entry currently uses `width: 480`.
- If portrait images are added later, use `width: 360` unless a deliberate exception is needed.
- The current spread uses a centered golden-angle spiral to keep the canvas balanced around the origin; future manual rebalancing can group related moments without losing that overall center.
- The current `title` values were derived from filenames and the current `date` values were derived from each image file's `kMDItemContentCreationDate`, so treat them as a good baseline rather than final editorial metadata.
- `scripts/sync_photos.py` is now the default bulk-import path: it preserves existing entries, adds missing files from `photos/`, and assigns default metadata and spiral positions for new photos.

## Active To Dos

- [x] Set up workspace instructions for Copilot
- [x] Create prompt history and project plan files
- [x] Add `.github` folders for prompts, agents, skills, and instructions
- [x] Replace the template entries in `photos.json` with the live gallery layout if they are still placeholders
- [ ] Add or restore a GitHub Pages deploy workflow if deployment is meant to stay automated
- [ ] Review the live photo spread and rebalance any clusters that feel too dense or too directional
- [ ] Add alt text policy for photos if accessibility metadata becomes important
- [x] Decide whether the debug tuning panel should remain visible in the shipped UI or move behind a query flag or shortcut
- [ ] Run a real touch-device pass on the Phase 3 long-press metadata reveal and tune the hold timing if needed
- [ ] Review the auto-derived photo titles and dates and replace any awkward filename-based wording before treating the metadata as final
- [x] Decide whether bulk photo imports should grow a small manual-overrides workflow so event-based regrouping survives future sync runs

## Latest Session Notes

- Added 92 newly dropped photos to the gallery by syncing `photos/` into `photos.json`, bringing the live entry count to `243`.
- Added `scripts/sync_photos.py` so future bulk photo drops can be imported with one command instead of manually assigning coordinates and metadata entry-by-entry.
- Added `photos.overrides.json` as a durable curation layer so hand-grouped placements and rename carry-overs survive future sync runs.
- The sync script preserves existing placements, adds missing files on the current golden-angle spiral, derives titles from filenames, derives dates from `kMDItemContentCreationDate` on macOS with a modified-time fallback, and normalizes ordinal titles like `30th`.
- The top-left chrome was refined again: the Charmera token now sits in its own pill beside the `Little Camera` text pill, both use Source Code Pro, and the token now holds on its last animation frame between gestures instead of snapping back to frame 1.
- Hover metadata no longer appears inside each image; it now uses a single bottom viewport pill with Source Code Pro styling, a `24px` semibold title, an `18px` date, a `20px` gap, down-out dismissal, title truncation on smaller widths, and a descender-safe line height.
- The experimental bottom hint pill was removed after review so the shipped UI stays quieter; the remaining chrome is now the top-left brand pill and the bottom metadata dock only.
- Phase 4 now adds a branded startup overlay with a centered `loading...` caption and a fade-out into the gallery.
- The production loading format is a looping `loading.webm` (VP9 with alpha, ~723 KB) encoded from the `PNG_Sequence/` frames. This replaced direct PNG-frame playback to eliminate network contention and animation jank.
- The loader now waits for both gallery readiness and a deliberate minimum hold before dismissal; the current hold is `3` seconds so the Charmera animation registers even on fast loads.
- Reduced-motion handling now pauses the video while preserving the same fade-out timing.
- The gallery intro reveal now waits until after the loader is gone, so the photo fade-and-lift animation is visible again instead of being hidden behind the overlay.
- The loader now waits for 12 of the 16 closest-to-center priority photos to load (up from 6 of 10) before dismissing, with a 12-second timeout fallback.
- The top-left label pill now includes a small Charmera token that still loads PNG frames on demand after the gallery is up, keeping the runtime dependency on `PNG_Sequence/` for only the token.
- That label token is now tied to the camera's live movement signal, so dragging and inertial motion briefly play the sequence while reduced-motion keeps the pill static.
- Phase 1 camera safety work now derives bounds from the rendered gallery metrics rather than hard-coded world assumptions.
- The camera now clamps zoom and translation against live gallery extents during pan, inertia, landing-view reset, and resize.
- Browser verification confirmed that repeated zoom-out now stops around `0.206` instead of the previous weak `0.1` state and that aggressive panning no longer drifts fully into empty darkness.
- The current bounds pass uses a hard clamp across the full spread; a later refinement can trim outliers or add edge resistance without reopening the core Phase 1 fix.
- `photos.json` was updated by scanning the current `photos/` directory instead of relying on assumed filenames.
- The generated coordinates span a much larger canvas than the original placeholder set, so the next review should happen in-browser rather than by inspecting JSON alone.
- A sensible next layout pass would be to cluster related images by event, people, or place while keeping the overall canvas center stable.
- If new assets are added in bulk again, regenerate from the folder first, then do a lighter manual curation pass instead of hand-placing every image from scratch.
- The gallery was split out of the original single-file page into `index.html`, `styles.css`, and focused modules under `js/` for camera state, interactions, gallery loading, and app bootstrap.
- README documentation now describes both the module layout and the `photos.json` contract, including the optional `alt` field and which modules consume that data.
- Browser verification after the refactor confirmed that all 151 photos still rendered, the initial camera centering still worked, and drag interactions still updated the world transform.
- A persistent in-app debug tuning panel now controls layout density, image scale, lazy loading, zoom speed, swipe momentum, landing zoom, vignette strength, and background RGB without editing code.
- Tuning state now persists in local storage, supports reset/apply actions, and is shared across `app`, `camera`, `interactions`, and `gallery` so changes affect real runtime behavior rather than labels only.
- The current baseline tuning was updated after browser testing to: spread `0.7`, image scale `0.8`, lazy loading off, initial zoom `0.6`, vignette `0.55`, and background RGB `45, 45, 45`.
- Browser verification for the tuning panel confirmed live layout changes, image loading mode changes, landing-view transform updates, reload persistence, and reset-to-default behavior.
- Phase 2 now separates drag impulse, wheel impulse, damping, and edge drag so swipe and trackpad motion can travel farther without feeling harsher at release.
- The camera now exposes live velocity data to the app, and the gallery uses that signal for a restrained motion treatment: outward spacing, directional drift, and a light blur tied to movement strength.
- Reduced-motion handling now removes the blur and substantially softens the spacing/drift response instead of fully stripping feedback.
- Browser verification on a fresh local preview confirmed that drag motion reacts live, wheel pans keep moving briefly after input stops, and the reduced-motion mode keeps the response much quieter.
- Phase 2 momentum was refactored again to use Motion One springs for release motion, replacing the previous manual decay loop with spring stiffness, damping, mass, throw distance, edge drag, and max throw speed controls.
- Drag release now has the best current feel at the saved tuning values, while wheel/trackpad input has been adjusted to behave more like dragging and to avoid delayed post-scroll nudges when switching into zoom.
- The debug panel now includes the expanded motion controls: drag impulse, wheel impulse, spring stiffness, spring damping, spring mass, throw distance, edge drag, max throw speed, spacing response, motion blur, directional drift, and response damping.
- A performance pass batched camera transform writes and spring ticks through `requestAnimationFrame`, throttled gallery motion CSS writes, skipped tiny repeated motion updates, added async image decoding, and removed broad per-photo layer promotion.
- The `fadeUp` intro animation was simplified so it no longer overrides the live `.photo` transform used for spacing and drift effects.
- Browser verification after the performance pass confirmed that 151 photos still render, drag/scroll/modified-wheel zoom still work, and live photo transforms still apply.
- Remaining performance watch item: full-gallery `filter: blur()` is still the most likely expensive effect during movement; lower the Motion blur slider or replace the blur treatment if lag persists on lower-powered devices.
- Phase 3 now adds a desktop hover lift, bottom-edge metadata pill, pill-styled top-left label, and a `?debug` gate for the Tune button and debug panel so the default shipped UI stays cleaner.
- The metadata source of truth is now `photos.json`: every current entry includes a derived `title` and `date`, and the gallery formats those dates for display in the pill UI.
- Touch metadata reveal now uses a long-press fallback rather than accidental hover emulation; browser-side verification covered the code path, but a real touch-device pass is still worth doing before calling the interaction fully tuned.

## Session Checklist Template

Use this section for short-lived task tracking during an editing session.

- [ ] Define the change
- [ ] Make the smallest viable edit
- [ ] Preview locally in a browser
- [ ] Record notable prompts or decisions in `PROMPT_HISTORY.md`

## Next Pass Roadmap

### Phase 1: Camera Safety And World Limits

- [x] Tighten the minimum zoom so users cannot zoom out far enough to hit the current weak loading/readability state.
- [x] Review whether the minimum zoom should be a fixed floor or derived from the loaded gallery extents.
- [x] Add soft world bounds so drag and inertia ease or clamp before the camera disappears into empty darkness.
- [x] Compute and expose gallery extents from the live photo spread so camera limits are based on real content, not hard-coded guesses.
- [x] Treat the faux-infinite repeating field as a second-pass experiment after soft bounds are working, rather than mixing both problems into the same fix.
- [x] Verification: confirm the landing view still centers correctly, zoom-out stays useful, and aggressive panning on mouse, trackpad, and touch no longer drifts into empty space.

### Phase 2: Momentum And Motion Response

- [x] Rework swipe and scroll momentum so movement travels farther but decays more softly instead of feeling faster or harsher.
- [x] Replace single-knob momentum tuning with a small set of controls for gesture impulse, damping, and edge drag.
- [x] Expose clean camera velocity data so later effects can react to actual movement instead of raw gesture events.
- [x] Prototype a subtle momentum-linked motion treatment, likely a restrained blur or spacing/compression effect, and keep it well below the point where photos become unreadable.
- [x] Add reduced-motion handling so motion polish can be softened or disabled automatically.
- [x] Verification: compare pre/post tuning during long swipes and wheel pans and confirm the gallery feels gentler, longer-travel, and still controllable near edges.
- [x] Refactor release momentum to a spring-based Motion One path with debug controls for stiffness, damping, mass, and throw distance.
- [x] Add a performance pass for camera and gallery motion hot paths after the spring refactor.
- [ ] If lag remains noticeable, test a no-blur motion mode because full-canvas blur is likely the highest-cost visual effect.

### Phase 3: Hover States And UI Chrome

- [x] Add a desktop hover state for photos with a slight scale-up and stronger presence without breaking the quiet tone of the site.
- [x] Add a bottom-edge metadata pill that shows the current image filename and, if available, a created date.
- [x] Decide on the touch fallback for metadata: no pill on touch, tap-to-reveal, or focus-style reveal.
- [x] Define a metadata source of truth instead of trying to query file metadata in-browser; preferred approach is to derive and store the data in `photos.json` or a sidecar JSON file.
- [x] Restyle the fixed heading and top-bar UI so it uses the same pill language as the Tune button and future metadata surfaces.
- [x] Move the tuning panel behind a query flag, shortcut, or local-only access path so the shipped UI stays minimal.
- [ ] Verification: desktop hover should feel intentional and stable, metadata should not flicker, and touch devices should get a deliberate fallback rather than accidental hover behavior.

### Phase 4: Charmera Loading Identity

- [x] Build a branded loading state using the PNG sequence as source material for startup.
- [x] Decide on the production format for that animation before implementation: converted to `loading.webm` (VP9 with alpha) for single-request, hardware-decoded playback.
- [x] Show the loading state while `photos.json` and the initial gallery shell are loading, then dismiss it cleanly once the first view is ready.
- [x] Reuse the Charmera asset after load as a small corner mark or token that reacts when the user swipes or scrolls.
- [x] Tie any post-load motion on that asset to the same camera velocity signal used for momentum effects so it feels connected to the interaction model.
- [x] Verification: cold loads should show the branded state immediately, hold for at least `3` seconds, and exit cleanly once the first view is ready.

### Phase 5: Branding, Metadata Workflow, And Deployment

- [ ] Add a favicon, likely derived from a strong still from `PNG_Sequence` or a simplified Charmera mark.
- [ ] Create a `CNAME` file for `camera.angushenderson.design`.
- [ ] Add or restore a GitHub Pages deploy workflow if automated deployment is still desired.
- [ ] Document the metadata-generation workflow if hover UI depends on created dates or other asset metadata.
- [ ] Document how the debug/tuning panel is accessed once it is moved out of the default shipped UI.
- [ ] Verification: favicon renders in the browser tab, Pages deployment succeeds, and the custom domain is ready once DNS records are added.

### Recommended Order

- [ ] Start with zoom floor and soft bounds.
- [ ] Then retune momentum and add velocity-aware motion polish.
- [ ] Then add hover metadata and pill-style UI cleanup.
- [ ] Then add the Charmera loading identity and post-load corner behavior.
- [ ] Finish with favicon, CNAME, deployment, and metadata workflow documentation.
