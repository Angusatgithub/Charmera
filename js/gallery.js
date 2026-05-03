/**
 * Photo layout entry loaded from photos.json.
 * @typedef {{ src: string, x: number, y: number, width: number, height?: number, alt?: string, title?: string, date?: string }} PhotoLayout
 */

/**
 * Rendered gallery controller.
 * @typedef {{
 *   photos: PhotoLayout[],
 *   center: ClusterCenter,
 *   bounds: GalleryBounds,
 *   applyTuning: () => void,
 *   setMotion: (motion: GalleryMotionState) => void,
 *   playIntro: () => void,
 * }} GalleryController
 */

/**
 * @typedef {{ blur: number, spread: number, directionX: number, directionY: number }} GalleryMotionState
 */

/**
 * Approximate center of the current photo cluster.
 * @typedef {{ x: number, y: number }} ClusterCenter
 */

/**
 * Rendered photo extents in world coordinates.
 * @typedef {{ left: number, top: number, right: number, bottom: number, width: number, height: number }} GalleryBounds
 */

const DEFAULT_PHOTO_ASPECT_RATIO = 3 / 4;
const MOTION_PROPERTY_EPSILON = 0.015;
const PHOTO_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function createPhotoElement(photo, index) {
  const container = document.createElement("div");
  container.className = "photo";
  container.style.setProperty("--photo-intro-delay", `${index * 0.05}s`);

  const image = document.createElement("img");
  image.src = photo.src;
  image.alt = photo.alt || "";
  image.decoding = "async";
  image.draggable = false;
  image.addEventListener("load", () => image.classList.add("loaded"));

  container.appendChild(image);

  if (photo.title || photo.date) {
    container.classList.add("photo--has-meta");
    container.dataset.metaTitle = photo.title ?? "";
    container.dataset.metaDate = photo.date ? formatPhotoDate(photo.date) : "";
  }

  return { container, image };
}

function formatPhotoDate(value) {
  const parsedDate = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return PHOTO_DATE_FORMATTER.format(parsedDate);
}

function getPhotoMetrics(photo, center, tuning) {
  const spread = tuning.layout?.spread ?? 1;
  const imageScale = tuning.layout?.imageScale ?? 1;
  const targetWidth = photo.width * imageScale;
  const photoCenterX = photo.x + photo.width / 2;
  const nextCenterX = center.x + (photoCenterX - center.x) * spread;

  return {
    x: nextCenterX - targetWidth / 2,
    y: center.y + (photo.y - center.y) * spread,
    width: targetWidth,
  };
}

function getPhotoHeight(photo, metrics) {
  const aspectRatio =
    Number.isFinite(photo.height) && photo.width > 0
      ? photo.height / photo.width
      : DEFAULT_PHOTO_ASPECT_RATIO;

  return metrics.width * aspectRatio;
}

function getBoundsFromMetrics(items, center, tuning) {
  if (items.length === 0) {
    return {
      left: center.x,
      top: center.y,
      right: center.x,
      bottom: center.y,
      width: 0,
      height: 0,
    };
  }

  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  items.forEach(({ photo }) => {
    const metrics = getPhotoMetrics(photo, center, tuning);
    const height = getPhotoHeight(photo, metrics);

    left = Math.min(left, metrics.x);
    top = Math.min(top, metrics.y);
    right = Math.max(right, metrics.x + metrics.width);
    bottom = Math.max(bottom, metrics.y + height);
  });

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function applyPhotoMetrics(container, metrics) {
  container.style.left = `${metrics.x}px`;
  container.style.top = `${metrics.y}px`;
  container.style.width = `${metrics.width}px`;
}

function applyMotionProfile(container, photo, center, tuning) {
  const metrics = getPhotoMetrics(photo, center, tuning);
  const height = getPhotoHeight(photo, metrics);
  const photoCenterX = metrics.x + metrics.width / 2;
  const photoCenterY = metrics.y + height / 2;
  const deltaX = photoCenterX - center.x;
  const deltaY = photoCenterY - center.y;
  const distance = Math.hypot(deltaX, deltaY) || 1;
  const reach = Math.min(distance / 1600, 1);

  container.style.setProperty(
    "--photo-motion-radial-x",
    `${((deltaX / distance) * reach).toFixed(4)}`,
  );
  container.style.setProperty(
    "--photo-motion-radial-y",
    `${((deltaY / distance) * reach).toFixed(4)}`,
  );
}

function applyImageBehavior(image, tuning) {
  const useLazyLoading = tuning.layout?.lazyLoading !== false;

  image.loading = useLazyLoading ? "lazy" : "eager";
  image.fetchPriority = useLazyLoading ? "auto" : "high";
}

/**
 * Loads the gallery data, renders each photo into the world, and returns the parsed layout.
 * @param {HTMLElement} world
 * @param {import("./tuning.js").DebugTuning} tuning
 * @returns {Promise<GalleryController>}
 */
export async function loadGallery(world, tuning) {
  const response = await fetch("photos.json");

  if (!response.ok) {
    throw new Error(`Failed to load photos.json: ${response.status}`);
  }

  const photos = await response.json();
  const center = getClusterCenter(photos);
  const controller = {
    photos,
    center,
    bounds: {
      left: center.x,
      top: center.y,
      right: center.x,
      bottom: center.y,
      width: 0,
      height: 0,
    },
    applyTuning,
    setMotion,
    playIntro,
  };
  const items = photos.map((photo, index) => {
    const element = createPhotoElement(photo, index);

    world.appendChild(element.container);
    return { photo, ...element };
  });
  let lastAppliedMotion = null;

  function applyTuning() {
    items.forEach(({ photo, container, image }) => {
      applyPhotoMetrics(container, getPhotoMetrics(photo, center, tuning));
      applyMotionProfile(container, photo, center, tuning);
      applyImageBehavior(image, tuning);
    });

    controller.bounds = getBoundsFromMetrics(items, center, tuning);
  }

  function setMotion(motion) {
    if (lastAppliedMotion && isSameMotion(motion, lastAppliedMotion)) {
      return;
    }

    lastAppliedMotion = { ...motion };

    world.style.setProperty(
      "--gallery-motion-blur",
      `${motion.blur.toFixed(3)}px`,
    );
    world.style.setProperty(
      "--gallery-motion-spread",
      `${motion.spread.toFixed(3)}px`,
    );
    world.style.setProperty(
      "--gallery-motion-direction-x",
      `${motion.directionX.toFixed(3)}px`,
    );
    world.style.setProperty(
      "--gallery-motion-direction-y",
      `${motion.directionY.toFixed(3)}px`,
    );
  }

  function playIntro() {
    items.forEach(({ container }) => {
      container.classList.add("photo--revealed");
    });
  }

  function isSameMotion(nextMotion, previousMotion) {
    return (
      Math.abs(nextMotion.blur - previousMotion.blur) <
        MOTION_PROPERTY_EPSILON &&
      Math.abs(nextMotion.spread - previousMotion.spread) <
        MOTION_PROPERTY_EPSILON &&
      Math.abs(nextMotion.directionX - previousMotion.directionX) <
        MOTION_PROPERTY_EPSILON &&
      Math.abs(nextMotion.directionY - previousMotion.directionY) <
        MOTION_PROPERTY_EPSILON
    );
  }

  applyTuning();
  setMotion({ blur: 0, spread: 0, directionX: 0, directionY: 0 });

  return controller;
}

/**
 * Calculates the initial camera target from the rendered photo spread.
 * @param {PhotoLayout[]} photos
 * @returns {ClusterCenter}
 */
export function getClusterCenter(photos) {
  if (photos.length === 0) {
    return { x: 0, y: 0 };
  }

  const xCenters = photos.map((photo) => photo.x + photo.width / 2);
  const yPositions = photos.map((photo) => photo.y);

  return {
    x: (Math.min(...xCenters) + Math.max(...xCenters)) / 2,
    y: (Math.min(...yPositions) + Math.max(...yPositions)) / 2,
  };
}
