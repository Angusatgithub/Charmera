# photography.angushenderson.design

An infinite canvas photo gallery — drag in any direction, scroll or pinch to zoom.

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

- `x` / `y` — position in the world (pixels, can be negative)
- `width` — display width in pixels; height is auto from the image's aspect ratio

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
