export const TUNING_STORAGE_KEY = "charmera-debug-tuning";
export const PANEL_OPEN_STORAGE_KEY = "charmera-debug-panel-open";

export const DEFAULT_TUNING = Object.freeze({
  layout: Object.freeze({
    spread: 0.7,
    imageScale: 0.8,
    lazyLoading: false,
  }),
  interactions: Object.freeze({
    pointerTrailLimit: 6,
    dragMomentum: 18,
    wheelMomentum: 1,
    zoomInFactor: 1.07,
    zoomOutFactor: 0.93,
  }),
  camera: Object.freeze({
    minZoom: 0.1,
    maxZoom: 5,
    initialZoom: 0.6,
    inertiaDamping: 0.962,
    inertiaThreshold: 0.02,
    maxSpeed: 28,
    edgeDrag: 0.95,
    springStiffness: 45,
    springDamping: 11,
    springMass: 1,
    throwDecay: 0.32,
  }),
  motion: Object.freeze({
    blurStrength: 1.5,
    spreadStrength: 70,
    directionStrength: 28,
    responseDamping: 0.78,
  }),
  appearance: Object.freeze({
    background: Object.freeze({
      r: 45,
      g: 45,
      b: 45,
    }),
    vignetteStrength: 0.55,
  }),
});

/**
 * @typedef {{
 *   layout: {
 *     spread: number,
 *     imageScale: number,
 *     lazyLoading: boolean,
 *   },
 *   interactions: {
 *     pointerTrailLimit: number,
 *     dragMomentum: number,
 *     wheelMomentum: number,
 *     zoomInFactor: number,
 *     zoomOutFactor: number,
 *   },
 *   camera: {
 *     minZoom: number,
 *     maxZoom: number,
 *     initialZoom: number,
 *     inertiaDamping: number,
 *     inertiaThreshold: number,
 *     maxSpeed: number,
 *     edgeDrag: number,
 *   },
 *   motion: {
 *     blurStrength: number,
 *     spreadStrength: number,
 *     directionStrength: number,
 *     responseDamping: number,
 *   },
 *   appearance: {
 *     background: {
 *       r: number,
 *       g: number,
 *       b: number,
 *     },
 *     vignetteStrength: number,
 *   },
 * }} DebugTuning
 */

export function createDefaultTuning() {
  return structuredClone(DEFAULT_TUNING);
}

export function loadTuning() {
  const fallback = createDefaultTuning();

  try {
    const raw = window.localStorage.getItem(TUNING_STORAGE_KEY);

    if (!raw) {
      return fallback;
    }

    return normalizeTuning(JSON.parse(raw));
  } catch (error) {
    console.warn("Failed to load debug tuning", error);
    return fallback;
  }
}

export function saveTuning(tuning) {
  try {
    window.localStorage.setItem(
      TUNING_STORAGE_KEY,
      JSON.stringify(normalizeTuning(tuning)),
    );
  } catch (error) {
    console.warn("Failed to save debug tuning", error);
  }
}

export function applyNormalizedTuning(target, source) {
  const normalized = normalizeTuning(source);

  target.layout = normalized.layout;
  target.interactions = normalized.interactions;
  target.camera = normalized.camera;
  target.motion = normalized.motion;
  target.appearance = normalized.appearance;

  return target;
}

export function normalizeTuning(source = {}) {
  const defaults = createDefaultTuning();

  return {
    layout: {
      spread: readNumber(
        source.layout?.spread,
        defaults.layout.spread,
        0.55,
        1.8,
      ),
      imageScale: readNumber(
        source.layout?.imageScale,
        defaults.layout.imageScale,
        0.6,
        1.6,
      ),
      lazyLoading:
        typeof source.layout?.lazyLoading === "boolean"
          ? source.layout.lazyLoading
          : defaults.layout.lazyLoading,
    },
    interactions: {
      pointerTrailLimit: readNumber(
        source.interactions?.pointerTrailLimit,
        defaults.interactions.pointerTrailLimit,
        2,
        14,
        true,
      ),
      dragMomentum: readNumber(
        source.interactions?.dragMomentum,
        source.interactions?.momentumMultiplier,
        8,
        36,
      ),
      wheelMomentum: readNumber(
        source.interactions?.wheelMomentum,
        defaults.interactions.wheelMomentum,
        0,
        2,
      ),
      zoomInFactor: readNumber(
        source.interactions?.zoomInFactor,
        defaults.interactions.zoomInFactor,
        1.01,
        1.2,
      ),
      zoomOutFactor: readNumber(
        source.interactions?.zoomOutFactor,
        defaults.interactions.zoomOutFactor,
        0.8,
        0.99,
      ),
    },
    camera: {
      minZoom: defaults.camera.minZoom,
      maxZoom: defaults.camera.maxZoom,
      initialZoom: readNumber(
        source.camera?.initialZoom,
        defaults.camera.initialZoom,
        0.35,
        2.4,
      ),
      inertiaDamping: readNumber(
        source.camera?.inertiaDamping,
        defaults.camera.inertiaDamping,
        0.85,
        0.99,
      ),
      inertiaThreshold: readNumber(
        source.camera?.inertiaThreshold,
        defaults.camera.inertiaThreshold,
        0.002,
        0.08,
      ),
      maxSpeed: readNumber(
        source.camera?.maxSpeed,
        defaults.camera.maxSpeed,
        6,
        60,
      ),
      edgeDrag: readNumber(
        source.camera?.edgeDrag,
        defaults.camera.edgeDrag,
        0.2,
        0.95,
      ),
      springStiffness: readNumber(
        source.camera?.springStiffness,
        defaults.camera.springStiffness,
        8,
        160,
      ),
      springDamping: readNumber(
        source.camera?.springDamping,
        defaults.camera.springDamping,
        2,
        60,
      ),
      springMass: readNumber(
        source.camera?.springMass,
        defaults.camera.springMass,
        0.4,
        4,
      ),
      throwDecay: readNumber(
        source.camera?.throwDecay,
        defaults.camera.throwDecay,
        0.05,
        1.2,
      ),
    },
    motion: {
      blurStrength: readNumber(
        source.motion?.blurStrength,
        defaults.motion.blurStrength,
        0,
        6,
      ),
      spreadStrength: readNumber(
        source.motion?.spreadStrength,
        defaults.motion.spreadStrength,
        0,
        90,
      ),
      directionStrength: readNumber(
        source.motion?.directionStrength,
        defaults.motion.directionStrength,
        0,
        60,
      ),
      responseDamping: readNumber(
        source.motion?.responseDamping,
        defaults.motion.responseDamping,
        0.55,
        0.95,
      ),
    },
    appearance: {
      background: {
        r: readNumber(
          source.appearance?.background?.r,
          defaults.appearance.background.r,
          0,
          255,
          true,
        ),
        g: readNumber(
          source.appearance?.background?.g,
          defaults.appearance.background.g,
          0,
          255,
          true,
        ),
        b: readNumber(
          source.appearance?.background?.b,
          defaults.appearance.background.b,
          0,
          255,
          true,
        ),
      },
      vignetteStrength: readNumber(
        source.appearance?.vignetteStrength,
        defaults.appearance.vignetteStrength,
        0,
        0.95,
      ),
    },
  };
}

function readNumber(value, fallback, min, max, round = false) {
  const candidate = Number(value);

  if (!Number.isFinite(candidate)) {
    return fallback;
  }

  const clamped = Math.min(max, Math.max(min, candidate));
  return round ? Math.round(clamped) : clamped;
}
