---
name: update-photo-layout
description: "Use when adding photos, rebalancing the gallery layout, or updating photos.json coordinates and widths for the Charmera infinite canvas."
argument-hint: "Describe which photos to add or how the layout should change"
user-invocable: true
---

# Update Photo Layout

## When To Use

- Add new photos to the gallery
- Reposition existing photos in `photos.json`
- Rebalance the layout so the initial camera view stays centered and visually even

## Procedure

1. Read `photos.json` and inspect the current spread of images.
2. Add or update entries using the existing shape: `src`, `x`, `y`, `width`.
3. Keep spacing breathable and distribute photos across multiple directions around the origin.
4. If exact coordinates are not provided, choose placements that preserve the overall balance of the canvas.
5. Report the changed photo entries and any assumptions about placement or width.

## Layout Heuristics

- Leave visible gaps between neighboring photos instead of building a tight grid.
- Mix widths so the gallery keeps some rhythm.
- Avoid pushing all new photos only downward or only to one side.
- Remember that the initial camera centers on the rough middle of the cluster.
