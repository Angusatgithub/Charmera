const MIN_DISPLAY_MS = 3000;
const EXIT_CLASS_NAME = "loading-overlay--hidden";
const EXIT_DURATION_BUFFER_MS = 900;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Boots the loading overlay animation and coordinates its dismissal.
 * Uses a looping webm video — one request, hardware-decoded, zero jank.
 * @returns {{ markReady: () => void, whenHidden: Promise<void> }}
 */
export function initLoader() {
  const overlay = document.getElementById("loading-overlay");
  const video = document.getElementById("loading-animation");

  if (
    !(overlay instanceof HTMLElement) ||
    !(video instanceof HTMLVideoElement)
  ) {
    return {
      markReady() {},
      whenHidden: Promise.resolve(),
    };
  }

  const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  let minDelayElapsed = false;
  let appReady = false;
  let dismissing = false;
  let cleanupTimer = null;
  let resolveHidden = () => {};
  const whenHidden = new Promise((resolve) => {
    resolveHidden = resolve;
  });

  const handleMotionPreferenceChange = () => {
    if (reducedMotionQuery.matches) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  };

  reducedMotionQuery.addEventListener("change", handleMotionPreferenceChange);

  if (!reducedMotionQuery.matches) {
    video.play().catch(() => {});
  }

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
    video.pause();
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
    window.clearTimeout(minDelayTimer);

    if (cleanupTimer !== null) {
      window.clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }

    video.removeAttribute("src");
    video.load();
    overlay.remove();
    resolveHidden();
  }

  return {
    markReady,
    whenHidden,
  };
}
