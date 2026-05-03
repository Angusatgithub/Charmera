---
description: "Use when editing index.html or the Charmera gallery interaction code. Covers vanilla HTML, CSS, and JavaScript conventions for the infinite canvas."
name: "Charmera HTML Guidance"
applyTo: "index.html"
---

# Charmera HTML Guidance

- Keep the app as a static, framework-free document unless a rewrite is explicitly requested.
- Preserve the existing interaction model: drag, inertia, wheel pan, modified wheel zoom, and touch pinch zoom.
- Treat `photos.json` as the only layout data source.
- Maintain the restrained visual language: dark background, serif typography, quiet UI, subtle transitions.
- When changing camera or gesture logic, make sure the behavior still works for both mouse and touch input.
- Avoid adding build tooling or external dependencies for straightforward visual or content changes.
