const FRAME_COUNT = 174;
const PLAYBACK_FPS = 30;
const ACTIVE_SPEED_EPSILON = 0.04;
const MOTION_START_THRESHOLD = 0.06;
const PRELOAD_CONCURRENCY = 2;
const FRAME_LOOKAHEAD = 8;

/**
 * Drives the small Charmera token in the label pill from live camera motion.
 * Uses canvas + ImageBitmap for jank-free frame rendering.
 * @param {{ root: Element | null, reducedMotionQuery: MediaQueryList }} options
 * @returns {{ setMotion: (motion: { normalizedSpeed?: number, active?: boolean }) => void }}
 */
export function createLabelTokenController({ root, reducedMotionQuery }) {
  const canvas = root?.querySelector(".ui-label__token");

  if (!(canvas instanceof HTMLCanvasElement)) {
    return {
      setMotion() {},
    };
  }

  const ctx = canvas.getContext("2d");
  const bitmaps = new Array(FRAME_COUNT).fill(null);
  const pendingLoads = new Set();
  const loadQueue = [];
  let rafId = null;
  let lastTime = 0;
  let frameAccumulator = 0;
  let currentFrameIndex = 0;
  let currentVelocity = 0;
  let targetVelocity = 0;
  let hasDrawnInitial = false;
  let activeLoads = 0;

  ensureFrame(0);

  const handleMotionPreferenceChange = () => {
    if (reducedMotionQuery.matches) {
      targetVelocity = 0;
      currentVelocity = 0;
      frameAccumulator = 0;
      drawFrame(0);

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
    preloadAround(currentFrameIndex);
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
      const nextFrameIndex = (currentFrameIndex + frameAdvance) % FRAME_COUNT;

      preloadAround(nextFrameIndex);
      drawFrame(nextFrameIndex);
    }

    rafId = requestAnimationFrame(step);
  }

  function drawFrame(nextFrameIndex) {
    const bitmap = bitmaps[nextFrameIndex];

    if (!bitmap) {
      ensureFrame(nextFrameIndex);
      return;
    }

    if (nextFrameIndex === currentFrameIndex && hasDrawnInitial) {
      return;
    }

    hasDrawnInitial = true;
    currentFrameIndex = nextFrameIndex;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
  }

  function preloadAround(startIndex) {
    for (let offset = 0; offset <= FRAME_LOOKAHEAD; offset += 1) {
      ensureFrame((startIndex + offset) % FRAME_COUNT);
    }
  }

  function ensureFrame(index) {
    if (bitmaps[index] || pendingLoads.has(index)) {
      return;
    }

    pendingLoads.add(index);
    loadQueue.push(index);
    flushQueue();
  }

  function flushQueue() {
    while (activeLoads < PRELOAD_CONCURRENCY && loadQueue.length > 0) {
      const nextIndex = loadQueue.shift();

      if (nextIndex === undefined) {
        return;
      }

      loadFrame(nextIndex);
    }
  }

  function loadFrame(index) {
    const image = new Image();

    activeLoads += 1;
    image.decoding = "async";

    const finalize = () => {
      activeLoads = Math.max(0, activeLoads - 1);
      pendingLoads.delete(index);
      flushQueue();
    };

    image.addEventListener(
      "load",
      () => {
        if (canvas.width === 300 && canvas.height === 150) {
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
        }

        createImageBitmap(image)
          .then((bitmap) => {
            bitmaps[index] = bitmap;

            if (index === 0 && !hasDrawnInitial) {
              hasDrawnInitial = true;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(bitmap, 0, 0);
            }

            finalize();
          })
          .catch(finalize);
      },
      { once: true },
    );

    image.addEventListener("error", finalize, { once: true });
    image.src = framePath(index);
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
