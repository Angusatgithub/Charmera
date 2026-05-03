import { createCamera } from "./camera.js";
import { createDebugPanel } from "./debug-panel.js";
import { loadGallery } from "./gallery.js";
import { bindInteractions } from "./interactions.js";
import { createLabelTokenController } from "./label-token.js";
import { initLoader } from "./loader.js";
import { createMetadataDockController } from "./metadata-dock.js";
import {
  applyNormalizedTuning,
  createDefaultTuning,
  loadTuning,
  saveTuning,
} from "./tuning.js";

const MOTION_UPDATE_INTERVAL_MS = 1000 / 30;

/**
 * Entry module that boots the gallery, wires interactions, and centers the first view.
 */

const canvas = document.getElementById("canvas");
const world = document.getElementById("world");
const uiLabel = document.getElementById("ui-label");
const metadataDockElement = document.getElementById("metadata-dock");
const debugToggle = document.getElementById("debug-toggle");
const debugPanel = document.getElementById("debug-panel");
const debugEnabled = new URLSearchParams(window.location.search).has("debug");
const tuning = loadTuning();
const loader = initLoader();
let gallery = null;
const reducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);
let motionFrame = null;
let lastMotionWrite = 0;
let currentMotion = zeroMotionState();
let targetMotion = zeroMotionState();

applyAppearance();
setDebugUiVisibility(debugEnabled);

const camera = createCamera(world, tuning);
const labelToken = createLabelTokenController({
  root: uiLabel,
  reducedMotionQuery,
});
const metadataDock = createMetadataDockController(metadataDockElement);

bindInteractions(canvas, camera, tuning, metadataDock);

if (debugEnabled) {
  createDebugPanel({
    panel: debugPanel,
    toggleButton: debugToggle,
    tuning,
    onTuningChange: () => {
      applyAppearance();
      syncMotionResponse();

      if (gallery) {
        gallery.applyTuning();
        gallery.setMotion(currentMotion);
        camera.setBounds(gallery.bounds);
      }

      saveTuning(tuning);
    },
    onApplyLandingView: applyLandingView,
    onReset: () => {
      applyNormalizedTuning(tuning, createDefaultTuning());
      applyAppearance();
      syncMotionResponse();

      if (gallery) {
        gallery.applyTuning();
        gallery.setMotion(currentMotion);
        applyLandingView();
      }

      saveTuning(tuning);
    },
  });
}

void boot();
camera.subscribeMotion((motion) => {
  targetMotion = buildMotionTarget(motion);
  labelToken.setMotion(motion);
  ensureMotionFrame();
});

reducedMotionQuery.addEventListener("change", () => {
  syncMotionResponse();
});

loader.whenHidden.then(() => {
  gallery?.playIntro();
});

async function boot() {
  await initializeGallery();
  loader.prioritizeApp();
  await gallery?.whenReady;
  loader.markReady();
}

/**
 * Loads photo layout data and positions the camera over the cluster midpoint.
 * @returns {Promise<void>}
 */
async function initializeGallery() {
  try {
    gallery = await loadGallery(world, tuning);
    camera.setBounds(gallery.bounds);
    gallery.setMotion(currentMotion);
    applyLandingView();
  } catch (error) {
    console.error("Failed to initialize gallery", error);
  }
}

function applyLandingView() {
  if (!gallery) {
    return;
  }

  camera.stopInertia();
  camera.clearVelocity();
  camera.setZoom(tuning.camera.initialZoom);
  camera.centerOn(gallery.center.x, gallery.center.y);
}

/**
 * Hides the debug affordances entirely unless the URL opts into them.
 * @param {boolean} visible
 */
function setDebugUiVisibility(visible) {
  debugToggle.hidden = !visible;
  debugPanel.hidden = !visible;
  debugPanel.setAttribute("aria-hidden", String(!visible));
}

function zeroMotionState() {
  return {
    blur: 0,
    spread: 0,
    directionX: 0,
    directionY: 0,
  };
}

function getMotionFactor() {
  return reducedMotionQuery.matches ? 0.22 : 1;
}

function buildMotionTarget(motion) {
  const factor = getMotionFactor();
  const maxSpeed = Number.isFinite(tuning.camera?.maxSpeed)
    ? tuning.camera.maxSpeed
    : 1;
  const directionScale = maxSpeed > 0 ? factor / maxSpeed : 0;

  return {
    blur: reducedMotionQuery.matches
      ? 0
      : motion.normalizedSpeed * (tuning.motion?.blurStrength ?? 0),
    spread:
      motion.normalizedSpeed * (tuning.motion?.spreadStrength ?? 0) * factor,
    directionX:
      motion.x * (tuning.motion?.directionStrength ?? 0) * directionScale,
    directionY:
      motion.y * (tuning.motion?.directionStrength ?? 0) * directionScale,
  };
}

function syncMotionResponse() {
  targetMotion = buildMotionTarget({
    x: 0,
    y: 0,
    speed: 0,
    normalizedSpeed: 0,
    active: false,
  });
  ensureMotionFrame();
}

function ensureMotionFrame() {
  if (motionFrame !== null) {
    return;
  }

  motionFrame = requestAnimationFrame(stepMotion);
}

function stepMotion() {
  const responseDamping = tuning.motion?.responseDamping ?? 0.82;
  const blend = Math.max(0.05, 1 - responseDamping);

  currentMotion = {
    blur: blendValue(currentMotion.blur, targetMotion.blur, blend),
    spread: blendValue(currentMotion.spread, targetMotion.spread, blend),
    directionX: blendValue(
      currentMotion.directionX,
      targetMotion.directionX,
      blend,
    ),
    directionY: blendValue(
      currentMotion.directionY,
      targetMotion.directionY,
      blend,
    ),
  };

  const settled = isMotionSettled(currentMotion, targetMotion);
  const now = performance.now();

  if (
    gallery &&
    (settled || now - lastMotionWrite >= MOTION_UPDATE_INTERVAL_MS)
  ) {
    gallery.setMotion(currentMotion);
    lastMotionWrite = now;
  }

  if (settled) {
    motionFrame = null;
    return;
  }

  motionFrame = requestAnimationFrame(stepMotion);
}

function blendValue(currentValue, nextValue, blend) {
  return currentValue + (nextValue - currentValue) * blend;
}

function isMotionSettled(currentValue, nextValue) {
  return (
    Math.abs(currentValue.blur - nextValue.blur) < 0.01 &&
    Math.abs(currentValue.spread - nextValue.spread) < 0.01 &&
    Math.abs(currentValue.directionX - nextValue.directionX) < 0.01 &&
    Math.abs(currentValue.directionY - nextValue.directionY) < 0.01
  );
}

function applyAppearance() {
  const root = document.documentElement;
  const { r, g, b } = tuning.appearance.background;

  root.style.setProperty("--background-rgb", `${r}, ${g}, ${b}`);
  root.style.setProperty(
    "--vignette-strength",
    tuning.appearance.vignetteStrength.toFixed(2),
  );
}

window.addEventListener("resize", () => {
  camera.refreshBounds();
});
