const FRAME_COUNT = 174;
const PLAYBACK_FPS = 30;
const ACTIVE_SPEED_EPSILON = 0.04;
const MOTION_START_THRESHOLD = 0.06;

/**
 * Drives the small Charmera token in the label pill from live camera motion.
 * @param {{ root: Element | null, reducedMotionQuery: MediaQueryList }} options
 * @returns {{ setMotion: (motion: { normalizedSpeed?: number, active?: boolean }) => void }}
 */
export function createLabelTokenController({ root, reducedMotionQuery }) {
  const image = root?.querySelector(".ui-label__token");

  if (!(image instanceof HTMLImageElement)) {
    return {
      setMotion() {},
    };
  }

  let rafId = null;
  let lastTime = 0;
  let frameAccumulator = 0;
  let currentFrameIndex = 0;
  let currentVelocity = 0;
  let targetVelocity = 0;

  const handleMotionPreferenceChange = () => {
    if (reducedMotionQuery.matches) {
      targetVelocity = 0;
      currentVelocity = 0;
      frameAccumulator = 0;
      setFrame(0);

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  };

  reducedMotionQuery.addEventListener("change", handleMotionPreferenceChange);

  function setMotion(motion) {
    if (reducedMotionQuery.matches) {
      return;
    }

    const normalizedSpeed = clamp(motion.normalizedSpeed ?? 0, 0, 1);

    targetVelocity =
      normalizedSpeed > MOTION_START_THRESHOLD ? normalizedSpeed : 0;
    ensureAnimation();
  }

  function ensureAnimation() {
    if (rafId !== null) {
      return;
    }

    lastTime = performance.now();
    rafId = requestAnimationFrame(step);
  }

  function step(now) {
    const deltaMs = Math.min(now - lastTime, 64);
    const deltaSeconds = deltaMs / 1000;

    lastTime = now;
    currentVelocity = blend(currentVelocity, targetVelocity, 0.28);

    if (
      targetVelocity <= ACTIVE_SPEED_EPSILON &&
      currentVelocity <= ACTIVE_SPEED_EPSILON
    ) {
      frameAccumulator = 0;
      currentVelocity = 0;
      targetVelocity = 0;
      rafId = null;
      return;
    }

    const framesPerSecond = PLAYBACK_FPS * (0.18 + currentVelocity * 1.4);

    frameAccumulator += framesPerSecond * deltaSeconds;

    if (frameAccumulator >= 1) {
      const frameAdvance = Math.floor(frameAccumulator);

      frameAccumulator -= frameAdvance;
      setFrame((currentFrameIndex + frameAdvance) % FRAME_COUNT);
    }

    rafId = requestAnimationFrame(step);
  }

  function setFrame(nextFrameIndex) {
    if (
      nextFrameIndex === currentFrameIndex &&
      image.dataset.frameReady === "true"
    ) {
      return;
    }

    currentFrameIndex = nextFrameIndex;
    image.src = framePath(nextFrameIndex);
    image.dataset.frameReady = "true";
  }

  return {
    setMotion,
  };
}

function framePath(frameIndex) {
  return `PNG_Sequence/Kodak_Charmera-${String(frameIndex + 1).padStart(5, "0")}.png`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function blend(currentValue, nextValue, amount) {
  return currentValue + (nextValue - currentValue) * amount;
}
