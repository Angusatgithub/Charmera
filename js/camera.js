import { animate } from "https://esm.sh/motion@11.18.0";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const INERTIA_DAMPING = 0.935;
const INERTIA_THRESHOLD = 0.15;
const MAX_SPEED = 28;
const EDGE_DRAG = 0.72;
const MIN_ZOOM_FIT_RATIO = 2.1;
const BOUNDS_PADDING_RATIO = 0.14;
const BOUNDS_PADDING_PX = 140;
const FRAME_DURATION_MS = 1000 / 60;
const SPRING_STIFFNESS = 38;
const SPRING_DAMPING = 16;
const SPRING_MASS = 1;
const THROW_DECAY_SECONDS = 0.32;

/**
 * Mutable camera state applied to the world transform.
 * @typedef {{ x: number, y: number, zoom: number }} CameraState
 */

/**
 * @typedef {{ left: number, top: number, right: number, bottom: number, width: number, height: number }} CameraBounds
 */

/**
 * Camera controller used by the interaction and bootstrap modules.
 * @typedef {{ x: number, y: number, speed: number, normalizedSpeed: number, active: boolean }} CameraMotionState
 * @typedef {{
 *   apply: () => void,
 *   panBy: (deltaX: number, deltaY: number) => void,
 *   zoomAt: (factor: number, clientX: number, clientY: number) => void,
 *   setZoom: (nextZoom: number, clientX?: number, clientY?: number) => void,
 *   setVelocity: (x: number, y: number) => void,
 *   nudgeVelocity: (x: number, y: number) => void,
 *   clearVelocity: () => void,
 *   clampVelocity: () => void,
 *   refreshBounds: () => void,
 *   setBounds: (nextBounds: CameraBounds | null) => void,
 *   stopInertia: () => void,
 *   startInertia: () => void,
 *   centerOn: (worldX: number, worldY: number, viewportWidth?: number, viewportHeight?: number) => void,
 *   subscribeMotion: (listener: (motion: CameraMotionState) => void) => () => void,
 *   state: CameraState,
 * }} CameraController
 */

/**
 * Creates the camera abstraction that owns pan, zoom, and inertia state for the world.
 * @param {HTMLElement} world
 * @param {import("./tuning.js").DebugTuning} tuning
 * @returns {CameraController}
 */
export function createCamera(world, tuning) {
  const state = { x: 0, y: 0, zoom: 1 };
  const velocity = { x: 0, y: 0 };
  const motionListeners = new Set();
  let bounds = null;
  let activeAnimations = null;
  let applyFrame = null;
  let springTickFrame = null;
  let lastSpringTime = 0;
  let lastSpringX = 0;
  let lastSpringY = 0;

  function getCameraSetting(key, fallback) {
    const value = tuning.camera?.[key];
    return Number.isFinite(value) ? value : fallback;
  }

  function emitMotion() {
    const speed = Math.hypot(velocity.x, velocity.y);
    const maxSpeed = getCameraSetting("maxSpeed", MAX_SPEED);
    const motion = {
      x: velocity.x,
      y: velocity.y,
      speed,
      normalizedSpeed: maxSpeed > 0 ? Math.min(speed / maxSpeed, 1) : 0,
      active: speed > getCameraSetting("inertiaThreshold", INERTIA_THRESHOLD),
    };

    motionListeners.forEach((listener) => listener(motion));
  }

  function apply() {
    if (applyFrame !== null) {
      return;
    }

    applyFrame = requestAnimationFrame(() => {
      applyFrame = null;
      world.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.zoom})`;
    });
  }

  function getViewport() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  function getViewportPadding(viewportSize) {
    return Math.min(BOUNDS_PADDING_PX, viewportSize * BOUNDS_PADDING_RATIO);
  }

  function getMinZoom(viewportWidth, viewportHeight) {
    const fallback = getCameraSetting("minZoom", MIN_ZOOM);

    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      return fallback;
    }

    const fitZoom = Math.min(
      viewportWidth / bounds.width,
      viewportHeight / bounds.height,
    );

    return Math.max(fallback, fitZoom * MIN_ZOOM_FIT_RATIO);
  }

  function clampState() {
    if (!bounds) {
      return { hitX: false, hitY: false };
    }

    const viewport = getViewport();
    const paddingX = getViewportPadding(viewport.width);
    const paddingY = getViewportPadding(viewport.height);
    const scaledWidth = bounds.width * state.zoom;
    const scaledHeight = bounds.height * state.zoom;
    const centerX =
      viewport.width / 2 - (bounds.left + bounds.width / 2) * state.zoom;
    const centerY =
      viewport.height / 2 - (bounds.top + bounds.height / 2) * state.zoom;

    if (scaledWidth + paddingX * 2 <= viewport.width) {
      state.x = centerX;
    } else {
      const minX = viewport.width - bounds.right * state.zoom - paddingX;
      const maxX = -bounds.left * state.zoom + paddingX;
      const nextX = Math.min(maxX, Math.max(minX, state.x));
      const hitX = nextX !== state.x;
      state.x = nextX;

      if (scaledHeight + paddingY * 2 <= viewport.height) {
        state.y = centerY;
        return { hitX, hitY: false };
      }

      const minY = viewport.height - bounds.bottom * state.zoom - paddingY;
      const maxY = -bounds.top * state.zoom + paddingY;
      const nextY = Math.min(maxY, Math.max(minY, state.y));
      const hitY = nextY !== state.y;
      state.y = nextY;
      return { hitX, hitY };
    }

    if (scaledHeight + paddingY * 2 <= viewport.height) {
      state.y = centerY;
    } else {
      const minY = viewport.height - bounds.bottom * state.zoom - paddingY;
      const maxY = -bounds.top * state.zoom + paddingY;
      const nextY = Math.min(maxY, Math.max(minY, state.y));
      const hitY = nextY !== state.y;
      state.y = nextY;
      return { hitX: false, hitY };
    }

    return { hitX: false, hitY: false };
  }

  function panBy(deltaX, deltaY) {
    state.x += deltaX;
    state.y += deltaY;
    clampState();
    apply();
  }

  function setZoom(
    nextZoom,
    clientX = window.innerWidth / 2,
    clientY = window.innerHeight / 2,
  ) {
    const viewport = getViewport();
    const clampedZoom = Math.max(
      getMinZoom(viewport.width, viewport.height),
      Math.min(getCameraSetting("maxZoom", MAX_ZOOM), nextZoom),
    );
    const ratio = clampedZoom / state.zoom;

    state.x = clientX - (clientX - state.x) * ratio;
    state.y = clientY - (clientY - state.y) * ratio;
    state.zoom = clampedZoom;
    clampState();
    apply();
  }

  function zoomAt(factor, clientX, clientY) {
    setZoom(state.zoom * factor, clientX, clientY);
  }

  function setVelocity(x, y) {
    velocity.x = x;
    velocity.y = y;
    clampVelocity();
  }

  function nudgeVelocity(x, y) {
    velocity.x += x;
    velocity.y += y;
    clampVelocity();
  }

  function clearVelocity() {
    setVelocity(0, 0);
  }

  function clampVelocity() {
    const speed = Math.hypot(velocity.x, velocity.y);
    const maxSpeed = getCameraSetting("maxSpeed", MAX_SPEED);

    if (speed > maxSpeed) {
      const ratio = maxSpeed / speed;
      velocity.x *= ratio;
      velocity.y *= ratio;
    }

    emitMotion();
  }

  function refreshBounds() {
    const viewport = getViewport();
    const minZoom = getMinZoom(viewport.width, viewport.height);

    if (state.zoom < minZoom) {
      state.zoom = minZoom;
    }

    clampState();
    apply();
  }

  function setBounds(nextBounds) {
    bounds = nextBounds;
    refreshBounds();
  }

  function stopInertia() {
    if (activeAnimations) {
      activeAnimations.x?.stop();
      activeAnimations.y?.stop();
      activeAnimations = null;
    }

    if (springTickFrame !== null) {
      cancelAnimationFrame(springTickFrame);
      springTickFrame = null;
    }

    lastSpringTime = 0;
  }

  function scheduleSpringTick() {
    if (springTickFrame !== null) {
      return;
    }

    springTickFrame = requestAnimationFrame(() => {
      springTickFrame = null;
      tickFromSpring();
    });
  }

  function tickFromSpring() {
    const now = performance.now();
    const deltaMs = lastSpringTime
      ? Math.max(now - lastSpringTime, 1)
      : FRAME_DURATION_MS;

    velocity.x = ((state.x - lastSpringX) / deltaMs) * FRAME_DURATION_MS;
    velocity.y = ((state.y - lastSpringY) / deltaMs) * FRAME_DURATION_MS;
    lastSpringX = state.x;
    lastSpringY = state.y;
    lastSpringTime = now;

    const clamped = clampState();
    const edgeDrag = getCameraSetting("edgeDrag", EDGE_DRAG);

    if (clamped.hitX && activeAnimations?.x) {
      activeAnimations.x.stop();
      velocity.x *= edgeDrag;
    }

    if (clamped.hitY && activeAnimations?.y) {
      activeAnimations.y.stop();
      velocity.y *= edgeDrag;
    }

    apply();
    emitMotion();
  }

  function startInertia() {
    stopInertia();

    const speed = Math.hypot(velocity.x, velocity.y);
    const threshold = getCameraSetting("inertiaThreshold", INERTIA_THRESHOLD);

    if (speed < threshold) {
      clearVelocity();
      return;
    }

    const velocityPxPerSecond = {
      x: velocity.x * 60,
      y: velocity.y * 60,
    };
    const decay = getCameraSetting("throwDecay", THROW_DECAY_SECONDS);
    const targetX = state.x + velocityPxPerSecond.x * decay;
    const targetY = state.y + velocityPxPerSecond.y * decay;

    lastSpringX = state.x;
    lastSpringY = state.y;
    lastSpringTime = performance.now();

    const springOptions = {
      type: "spring",
      stiffness: getCameraSetting("springStiffness", SPRING_STIFFNESS),
      damping: getCameraSetting("springDamping", SPRING_DAMPING),
      mass: getCameraSetting("springMass", SPRING_MASS),
      restSpeed: 0.5,
      restDelta: 0.5,
    };

    const animations = {};

    animations.x = animate(state.x, targetX, {
      ...springOptions,
      velocity: velocityPxPerSecond.x,
      onUpdate: (value) => {
        if (activeAnimations !== animations) return;
        state.x = value;
        scheduleSpringTick();
      },
    });

    animations.y = animate(state.y, targetY, {
      ...springOptions,
      velocity: velocityPxPerSecond.y,
      onUpdate: (value) => {
        if (activeAnimations !== animations) return;
        state.y = value;
        scheduleSpringTick();
      },
    });

    activeAnimations = animations;

    const settle = () => {
      if (activeAnimations === animations) {
        activeAnimations = null;
        lastSpringTime = 0;
        clearVelocity();
      }
    };

    Promise.all([
      animations.x.finished.catch(() => {}),
      animations.y.finished.catch(() => {}),
    ]).then(settle);
  }

  function centerOn(
    worldX,
    worldY,
    viewportWidth = window.innerWidth,
    viewportHeight = window.innerHeight,
  ) {
    state.x = viewportWidth / 2 - worldX * state.zoom;
    state.y = viewportHeight / 2 - worldY * state.zoom;
    clampState();
    apply();
  }

  function subscribeMotion(listener) {
    motionListeners.add(listener);
    emitMotion();
    return () => {
      motionListeners.delete(listener);
    };
  }

  return {
    apply,
    panBy,
    zoomAt,
    setZoom,
    setVelocity,
    nudgeVelocity,
    clearVelocity,
    clampVelocity,
    refreshBounds,
    setBounds,
    stopInertia,
    startInertia,
    centerOn,
    subscribeMotion,
    state,
  };
}
