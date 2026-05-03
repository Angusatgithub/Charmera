const FRAME_COUNT = 174;
const FRAME_RATE = 30;
const FRAME_DURATION_MS = 1000 / FRAME_RATE;
const MIN_DISPLAY_MS = 3000;
const EXIT_CLASS_NAME = "loading-overlay--hidden";
const EXIT_DURATION_BUFFER_MS = 900;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Boots the loading overlay animation and coordinates its dismissal.
 * @returns {{ markReady: () => void, whenHidden: Promise<void> }}
 */
export function initLoader() {
  const overlay = document.getElementById("loading-overlay");
  const animation = document.getElementById("loading-animation");

  if (
    !(overlay instanceof HTMLElement) ||
    !(animation instanceof HTMLImageElement)
  ) {
    return {
      markReady() {},
      whenHidden: Promise.resolve(),
    };
  }

  const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const frames = createFrameList();
  let currentFrameIndex = 0;
  let minDelayElapsed = false;
  let appReady = false;
  let dismissing = false;
  let frameTimer = null;
  let cleanupTimer = null;
  let resolveHidden = () => {};
  const whenHidden = new Promise((resolve) => {
    resolveHidden = resolve;
  });

  const handleFirstFrameLoad = () => {
    frames[0].loaded = true;
  };
  const handleMotionPreferenceChange = () => {
    if (reducedMotionQuery.matches) {
      stopAnimation();
      showBestAvailableFrame(currentFrameIndex);
      return;
    }

    startAnimation();
  };

  animation.addEventListener("load", handleFirstFrameLoad, { once: true });
  reducedMotionQuery.addEventListener("change", handleMotionPreferenceChange);

  preloadFrames(frames, animation);
  startAnimation();

  const minDelayTimer = window.setTimeout(() => {
    minDelayElapsed = true;
    maybeDismiss();
  }, MIN_DISPLAY_MS);

  function markReady() {
    appReady = true;
    maybeDismiss();
  }

  function maybeDismiss() {
    if (!minDelayElapsed || !appReady || dismissing) {
      return;
    }

    dismissing = true;
    stopAnimation();
    overlay.classList.add(EXIT_CLASS_NAME);
    overlay.addEventListener("transitionend", handleOverlayHidden);
    cleanupTimer = window.setTimeout(
      handleOverlayHidden,
      EXIT_DURATION_BUFFER_MS,
    );
  }

  function handleOverlayHidden(event) {
    if (
      event &&
      (event.target !== overlay || event.propertyName !== "opacity")
    ) {
      return;
    }

    overlay.removeEventListener("transitionend", handleOverlayHidden);
    reducedMotionQuery.removeEventListener(
      "change",
      handleMotionPreferenceChange,
    );
    animation.removeEventListener("load", handleFirstFrameLoad);
    stopAnimation();
    window.clearTimeout(minDelayTimer);

    if (cleanupTimer !== null) {
      window.clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }

    overlay.remove();
    resolveHidden();
  }

  function startAnimation() {
    if (reducedMotionQuery.matches || frameTimer !== null) {
      return;
    }

    frameTimer = window.setInterval(() => {
      currentFrameIndex = (currentFrameIndex + 1) % FRAME_COUNT;
      showBestAvailableFrame(currentFrameIndex);
    }, FRAME_DURATION_MS);
  }

  function stopAnimation() {
    if (frameTimer === null) {
      return;
    }

    window.clearInterval(frameTimer);
    frameTimer = null;
  }

  function showBestAvailableFrame(targetIndex) {
    const nextIndex = findLoadedFrame(frames, targetIndex);

    if (nextIndex === -1) {
      return;
    }

    currentFrameIndex = nextIndex;
    animation.src = frames[nextIndex].src;
  }

  return {
    markReady,
    whenHidden,
  };
}

function preloadFrames(frames, animation) {
  frames.forEach((frame, index) => {
    const image = new Image();

    image.decoding = "async";
    image.src = frame.src;
    image.addEventListener(
      "load",
      () => {
        frame.loaded = true;

        if (index === 0 && !animation.currentSrc) {
          animation.src = frame.src;
        }
      },
      { once: true },
    );
  });
}

function findLoadedFrame(frames, startIndex) {
  for (let offset = 0; offset < frames.length; offset += 1) {
    const index = (startIndex - offset + frames.length) % frames.length;

    if (frames[index].loaded) {
      return index;
    }
  }

  return -1;
}

function createFrameList() {
  return Array.from({ length: FRAME_COUNT }, (_, index) => ({
    src: `PNG_Sequence/Kodak_Charmera-${String(index + 1).padStart(5, "0")}.png`,
    loaded: false,
  }));
}
