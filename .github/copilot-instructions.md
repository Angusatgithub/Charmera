# Project Guidelines

## Project Context

- Charmera is a single-page photography portfolio built as an infinite canvas gallery.
- The entire app lives in `index.html` with inline CSS and JavaScript.
- `photos.json` is the source of truth for image placement and sizing.
- `photos/` stores web-ready gallery images. `PNG_Sequence/` will be used to create a loading state from the png sequence.

## Architecture

- Keep the site framework-free unless the user explicitly asks for a larger rewrite.
- Preserve the current interaction model: drag to explore, inertia after drag, wheel pan, modified wheel zoom, and touch pinch zoom.
- Keep the initial camera centering logic aligned with the photo cluster so the landing view stays balanced.
- Prefer small, focused edits over restructuring the page.

## Editing Conventions

- Match the existing visual tone: minimal UI, dark palette, serif typography, subtle motion.
- When adding or moving photos, update `photos.json` first and avoid hard-coding layout data elsewhere.
- Keep asset and layout changes lightweight; do not introduce dependencies or build steps for simple content edits.
- If interaction code changes, consider both desktop and touch behavior.

## Local Preview And Validation

- Use a local server because `photos.json` is loaded with `fetch()`.
- Preferred preview commands: `python3 -m http.server` or `npx serve .`
- There is no formal test suite. Validate by loading the site in a browser and checking drag, zoom, and image loading behavior.

## Deployment

- The site is intended for GitHub Pages deployment.
- Keep the repo compatible with a static-hosted workflow.
