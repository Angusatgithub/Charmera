# camera.angushenderson.design

An infinite canvas photo gallery — drag in any direction, scroll or pinch to zoom.

## Structure

The site stays framework-free and static:

- `index.html` holds the document shell and loads the assets
- `styles.css` contains the gallery styling
- `js/app.js` bootstraps the gallery
- `js/camera.js` owns pan, zoom, and inertia state
- `js/interactions.js` binds pointer, wheel, and touch input
- `js/gallery.js` loads `photos.json`, renders the photos, and computes the initial center point
- `js/loader.js` controls the branded loading overlay using `loading.webm`
- `js/label-token.js` drives the small Charmera camera token in the top-left pill from live camera motion
- `js/metadata-dock.js` manages the bottom metadata pill shown on hover or long-press
- `js/debug-panel.js` and `js/tuning.js` power the `?debug` tuning panel
- `loading.webm` is a VP9 video with alpha, encoded from the `PNG_Sequence/` frames for the loader
- `PNG_Sequence/` source frames used by the label token at runtime and as the source for `loading.webm`
- `photos.json` is the source of truth for gallery layout data

## photos.json contract

`photos.json` must export an array of photo objects. Each object uses this shape:

```json
{
  "src": "photos/my-new-shot.jpg",
  "x": 600,
  "y": -200,
  "width": 380,
  "height": 570,
  "title": "My New Shot",
  "date": "2026-05-03",
  "alt": "Optional description"
}
```

- `src` — required relative path to the image asset
- `x` — required horizontal world position in pixels
- `y` — required vertical world position in pixels
- `width` — required rendered width in pixels; height is derived from the image aspect ratio
- `height` — optional source image height; include it when the aspect ratio is not the default landscape `1440x1080`
- `title` — optional metadata title shown in the bottom dock
- `date` — optional ISO date shown in the bottom dock
- `alt` — optional image description; defaults to an empty string when omitted

At runtime, `js/gallery.js` reads this file, creates one `.photo` element per entry, and `js/app.js` centers the initial camera view from the spread of those coordinates.

## Adding photos

**1. Add the image file**

```
photos/my-new-shot.jpg
```

Resize/compress before committing. Aim for ≤300KB per image — WebP at ~80% quality is ideal. [Squoosh](https://squoosh.app) works well for this.

**2. Sync `photos.json`**

```bash
python3 scripts/sync_photos.py
```

- Preserves existing `photos.json` entries and only generates defaults for new files
- Applies any manual entries from `photos.overrides.json` after the generated pass
- Places new photos on the current golden-angle spiral so the canvas stays balanced
- Derives `title` from the filename and `date` from `kMDItemContentCreationDate` on macOS, with file modified time as a fallback
- Uses `width: 480` for landscape images and `width: 360` for portrait images

**3. Curate if needed**

Use `photos.overrides.json` for anything that should survive future sync runs: hand-placed `x`/`y` coordinates, editorial titles or dates, or a rename that should inherit an existing placement.

Example:

```json
{
  "AaronEnjoyingPizza.jpg": {
    "rename_from": "SPI00.jpg"
  },
  "Katie30thBirthday.jpg": {
    "x": -420,
    "y": 180,
    "title": "Katie 30th Birthday"
  }
}
```

`rename_from` tells the sync script to keep the previous photo's placement and sizing when a file has just been renamed. Plain fields like `x`, `y`, `title`, `date`, `width`, and `alt` override the generated output after sync.

**4. Commit and push**

```
git add photos/my-new-shot.jpg photos.json photos.overrides.json scripts/sync_photos.py
git commit -m "add: new shot"
git push
```

GitHub Actions will deploy automatically.

## Layout tips

The coordinate system is centred around `(0, 0)`. The camera starts at the centroid of all photos, so spreading them evenly around the origin keeps the initial view balanced.

A rough layout guide:

- Leave ~80–120px gaps between photo edges so they breathe
- Mix portrait and landscape orientations
- Vary widths between ~280px and ~520px for visual rhythm
- Scatter in all four directions — don't just grow the grid downward

For a visual rebalance pass, keep the spiral as the background structure and only override the photos you want to cluster. Group related shots into loose local neighborhoods, check that the overall canvas still has weight in all four quadrants, and avoid moving too many large images onto the same arc at once.

## Local preview

Because `photos.json` is loaded via `fetch()`, you need a local server (not just opening `index.html` directly in a browser):

```bash
npx serve .
# or
python3 -m http.server
```

Then open `http://localhost:3000` (or whichever port).

## Deployment

The repo is deployed via GitHub Pages. Any push to `main` triggers a deploy.

To set up on a new repo:

1. Go to **Settings → Pages**
2. Set source to **GitHub Actions**
3. Use the workflow in `.github/workflows/deploy.yml`
