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
- `photos.json` is the source of truth for gallery layout data

## photos.json contract

`photos.json` must export an array of photo objects. Each object uses this shape:

```json
{
  "src": "photos/my-new-shot.jpg",
  "x": 600,
  "y": -200,
  "width": 380,
  "alt": "Optional description"
}
```

- `src` — required relative path to the image asset
- `x` — required horizontal world position in pixels
- `y` — required vertical world position in pixels
- `width` — required rendered width in pixels; height is derived from the image aspect ratio
- `alt` — optional image description; defaults to an empty string when omitted

At runtime, `js/gallery.js` reads this file, creates one `.photo` element per entry, and `js/app.js` centers the initial camera view from the spread of those coordinates.

## Adding photos

**1. Add the image file**

```
photos/my-new-shot.jpg
```

Resize/compress before committing. Aim for ≤300KB per image — WebP at ~80% quality is ideal. [Squoosh](https://squoosh.app) works well for this.

**2. Add an entry to `photos.json`**

```json
{ "src": "photos/my-new-shot.jpg", "x": 600, "y": -200, "width": 380 }
```

- `src` — relative path to the file inside `photos/`
- `x` / `y` — position in the world (pixels, can be negative)
- `width` — display width in pixels; height is auto from the image's aspect ratio
- `alt` — optional, but recommended if you want image descriptions later

**3. Commit and push**

```
git add photos/my-new-shot.jpg photos.json
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
