# Prompt History

Use this file as a lightweight running log of agent-assisted work in this repo.

## Entry Template

### YYYY-MM-DD

- Prompt: Short description of the request
- Outcome: What changed or what was decided
- Files: List the files touched
- Follow-up: Optional next step

## 2026-04-14

- Prompt: Set up the repo for agentic coding with shared instructions, planning, prompt history, and starter agent tooling.
- Outcome: Added workspace instructions, a starter prompt, a review agent, a photo-layout skill, a file-specific instruction, and root plan/history files.
- Files: `.github/copilot-instructions.md`, `.github/prompts/add-photos.prompt.md`, `.github/agents/layout-review.agent.md`, `.github/skills/update-photo-layout/SKILL.md`, `.github/instructions/html.instructions.md`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: Start using `PLAN.md` as the working checklist and append new entries here after substantial sessions.

- Prompt: Split the single-page gallery into separate HTML, CSS, and JavaScript files with clearer abstraction, then document the new structure and data contract.
- Outcome: Extracted styles into `styles.css`, split behavior into `js/app.js`, `js/camera.js`, `js/interactions.js`, and `js/gallery.js`, added lightweight JSDoc to the public module surfaces, updated README and plan notes, and verified in-browser that the gallery still rendered and interactions still worked.
- Files: `index.html`, `styles.css`, `js/app.js`, `js/camera.js`, `js/interactions.js`, `js/gallery.js`, `README.md`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: If the interaction layer grows further, consider adding a small `types` or `constants` module rather than putting shared contracts in multiple files.

- Prompt: Build a debug side panel in the gallery UI so image density, zoom behavior, momentum, initial zoom, lazy loading, and background color can be tuned live.
- Outcome: Added a persistent debug tuning panel, introduced a shared tuning store, wired camera/interactions/gallery/app to live settings, and verified in-browser that controls update runtime behavior, persist across reloads, and reset correctly.
- Files: `index.html`, `styles.css`, `js/app.js`, `js/camera.js`, `js/interactions.js`, `js/gallery.js`, `js/tuning.js`, `js/debug-panel.js`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: Decide whether to hide the tuning panel behind a debug-only affordance and whether exporting presets would help future layout passes.

- Prompt: Make the tuned debug-panel values the new defaults.
- Outcome: Updated the shared default tuning and CSS fallback variables so first-run behavior and reset-to-default now match the selected baseline: spread `0.7`, image scale `0.8`, lazy loading off, initial zoom `0.6`, vignette `0.55`, background RGB `45, 45, 45`.
- Files: `js/tuning.js`, `styles.css`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: Existing browsers with saved tuning can use Reset defaults once to adopt the new baseline immediately.

## 2026-05-02

- Prompt: Start Phase 1 of the roadmap by fixing the zoom-out failure mode and keeping camera movement attached to the live gallery.
- Outcome: Added rendered gallery bounds, derived the minimum zoom from the live spread, clamped translation during pan/zoom/inertia/resize, and verified in-browser that the gallery no longer falls to the near-empty `0.1` view or drifts off into darkness under aggressive panning.
- Files: `js/gallery.js`, `js/camera.js`, `js/app.js`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: Refine the bounds envelope later if outlier photos make the clamp feel too loose, and add edge resistance when Phase 2 momentum tuning begins.

- Prompt: Start Phase 2 by making momentum longer and softer, then add a speed-linked spacing and blur treatment inspired by the Cash App reference.
- Outcome: Reworked gesture momentum into separate drag and wheel impulse controls with softer damping and edge drag, exposed live camera velocity to the app, added a restrained velocity-linked spacing/blur/drift response for the gallery, added reduced-motion fallbacks, expanded the tuning panel, and verified in-browser that both drag and wheel input now carry motion more gently while reduced-motion disables blur and heavily softens the effect.
- Files: `js/app.js`, `js/camera.js`, `js/debug-panel.js`, `js/gallery.js`, `js/interactions.js`, `js/tuning.js`, `styles.css`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: Use the new controls to tune the exact motion character against the Cash App reference, then move on to hover metadata and UI chrome in Phase 3.

- Prompt: Replace the manual drag momentum with Motion One springs, make the spacing response visible, and tune drag release until it feels looser and less abrupt.
- Outcome: Refactored camera release motion to use Motion One spring animations, added tuning controls for spring stiffness, damping, mass, throw distance, edge drag, max throw speed, spacing response, motion blur, directional drift, and response damping, and preserved the static framework-free structure while keeping the tuned drag feel as the current baseline.
- Files: `js/app.js`, `js/camera.js`, `js/debug-panel.js`, `js/gallery.js`, `js/interactions.js`, `js/tuning.js`, `styles.css`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: Keep testing trackpad input separately from pointer dragging because OS-supplied scroll momentum can still feel different from a drag release.

- Prompt: Make scrolling feel more like dragging and remove the delayed post-scroll nudge, then improve interaction performance after lag appeared during drag and scroll.
- Outcome: Adjusted wheel handling so modified-wheel zoom cancels pending pan momentum, then added a performance pass: camera transform writes and spring ticks are batched with `requestAnimationFrame`, gallery motion CSS writes are throttled/skipped when tiny, images decode asynchronously, unnecessary per-photo layer promotion was removed, and the photo intro animation no longer overrides live motion transforms. Browser verification confirmed all 151 photos render and drag, wheel pan, and modified-wheel zoom still work.
- Files: `js/app.js`, `js/camera.js`, `js/gallery.js`, `js/interactions.js`, `styles.css`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: If lag remains, test reducing or replacing the full-gallery motion blur because `filter: blur()` on `#world` is likely the highest-cost remaining visual effect.

- Prompt: Start Phase 3 by adding hover polish, metadata pills, and cleaner shipped UI chrome.
- Outcome: Added a desktop photo hover lift, bottom-edge metadata pills, long-press metadata reveal on touch, pill styling for the fixed title label, and gated the Tune button plus debug panel behind `?debug`. Browser verification confirmed the default URL hides tuning UI, `?debug` restores it, metadata renders in the gallery, and pointer-drag handling still fires.
- Files: `js/app.js`, `js/gallery.js`, `js/interactions.js`, `styles.css`, `photos.json`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: Do a real touch-device pass to tune long-press reveal timing and dismissal now that the browser-side path is wired.

- Prompt: Populate the full gallery metadata so every photo has a title and date for the new pill UI.
- Outcome: Derived `title` values from filenames for all 151 entries, populated `date` from each file's `kMDItemContentCreationDate`, and formatted the rendered date copy in the gallery as readable metadata like `28 Mar 2026`.
- Files: `photos.json`, `js/gallery.js`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: Curate any awkward auto-generated titles or replace the file-metadata dates if a more editorial source becomes available.

## 2026-05-03

- Prompt: Plan and implement Phase 4 so the site always opens on a Charmera-branded loading state using the PNG sequence, with a small `loading...` caption and a fade into the gallery.
- Outcome: Added a full-screen startup overlay, implemented direct PNG-sequence playback at 30 fps, gated dismissal on both gallery readiness and a branded minimum hold, and added a reduced-motion path that shows a static frame instead of cycling the animation.
- Files: `index.html`, `styles.css`, `js/app.js`, `js/loader.js`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: Decide whether the Charmera asset should return post-load as a small reactive corner token later in Phase 4.

- Prompt: Restore the gallery's photo intro reveal so it happens after the loader disappears, and increase the loader minimum duration.
- Outcome: Raised the loading-state minimum hold to `3` seconds, delayed the gallery reveal until after the overlay is removed, and restored the staggered fade-and-lift photo intro so it is visible again instead of playing behind the loader.
- Files: `styles.css`, `js/app.js`, `js/gallery.js`, `js/loader.js`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: Tune the loader scale and reveal pacing by eye if the branded moment should feel either shorter or more restrained.

- Prompt: Reuse the Charmera PNG sequence after load inside the top-left label pill and have it react to gallery movement.
- Outcome: Added a small Charmera token to the `Little Camera` pill, wired it to the existing camera motion signal so it plays briefly during drag and inertia, tuned it to settle back to frame 1 when the gallery calms down, and verified that reduced-motion keeps the token static.
- Files: `index.html`, `styles.css`, `js/app.js`, `js/label-token.js`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: If the branding wants a stronger post-load presence later, consider whether the pill text should shorten so the token can grow slightly without making the chrome feel heavier.

- Prompt: Refine the top-left brand chrome so the Charmera token sits in its own pill, the text pill uses Source Code Pro, and the token no longer snaps back to frame 1 between gestures.
- Outcome: Split the brand UI into separate token and text pills, updated the label typography and sizing to Source Code Pro, kept the token pill aligned to the text pill height, and changed the token controller so motion resumes from the last frame reached instead of resetting after each interaction.
- Files: `index.html`, `styles.css`, `js/app.js`, `js/label-token.js`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: If the label starts feeling too wide on smaller laptops, trim the text or slightly reduce the text pill padding before shrinking the token.

- Prompt: Move photo metadata out of the hovered image and into a single bottom viewport pill while keeping the image hover scale.
- Outcome: Replaced the per-image metadata overlay with a shared bottom dock, wired both desktop hover and touch long-press to the dock, styled it in Source Code Pro with larger title/date hierarchy, added down-out dismissal, truncation for longer titles, and adjusted line height so descenders no longer clip.
- Files: `index.html`, `styles.css`, `js/app.js`, `js/gallery.js`, `js/interactions.js`, `js/metadata-dock.js`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: Do a real touch-device pass to confirm the long-press metadata dock still feels deliberate now that the information is detached from the hovered image.

- Prompt: Try the bottom hint as a pill and then remove it entirely when it proved unnecessary.
- Outcome: Briefly restyled the onboarding hint into pill chrome with a slide-in/out motion, then removed the hint element and all related logic so the shipped UI relies only on the brand pill and metadata dock.
- Files: `index.html`, `styles.css`, `js/app.js`, `js/interactions.js`, `PLAN.md`, `PROMPT_HISTORY.md`
- Follow-up: No follow-up needed unless a future onboarding need emerges that justifies reintroducing guidance.
