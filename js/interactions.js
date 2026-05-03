const POINTER_TRAIL_LIMIT = 6;
const DRAG_MOMENTUM = 18;
const WHEEL_MOMENTUM = 0.16;
const WHEEL_IDLE_MS = 90;
const WHEEL_RELEASE_WINDOW_MS = 60;
const WHEEL_RELEASE_NOISE_FLOOR = 0.6;
const WHEEL_TAPER_RATIO = 0.65;
const TOUCH_METADATA_DELAY_MS = 500;
const TOUCH_METADATA_MOVE_TOLERANCE_PX = 12;
const ZOOM_IN_FACTOR = 1.07;
const ZOOM_OUT_FACTOR = 0.93;

/**
 * Wires pointer, wheel, and touch gestures to the shared camera controller.
 * @param {HTMLElement} canvas
 * @param {import("./camera.js").CameraController} camera
 * @param {import("./tuning.js").DebugTuning} tuning
 * @param {{ show: (metadata: { title: string, date: string }) => void, hide: () => void }} metadataDock
 */
export function bindInteractions(canvas, camera, tuning, metadataDock) {
  const drag = { active: false, lastX: 0, lastY: 0 };
  const pinch = { active: false, distance: 0 };
  const touchMetadata = {
    pointerId: null,
    startX: 0,
    startY: 0,
    photo: null,
    timer: null,
  };
  let trail = [];
  let wheelTrail = [];
  let wheelIdleTimer = null;
  let wheelActive = false;

  function getInteractionSetting(key, fallback) {
    const value = tuning.interactions?.[key];
    return Number.isFinite(value) ? value : fallback;
  }

  function findMetadataPhoto(target) {
    return target instanceof Element
      ? target.closest(".photo--has-meta")
      : null;
  }

  function readMetadata(photo) {
    return {
      title: photo?.dataset.metaTitle ?? "",
      date: photo?.dataset.metaDate ?? "",
    };
  }

  function clearTouchMetadata() {
    if (touchMetadata.timer !== null) {
      window.clearTimeout(touchMetadata.timer);
      touchMetadata.timer = null;
    }

    if (touchMetadata.photo) {
      touchMetadata.photo.classList.remove("photo--meta-pressing");
    }

    metadataDock.hide();

    touchMetadata.pointerId = null;
    touchMetadata.startX = 0;
    touchMetadata.startY = 0;
    touchMetadata.photo = null;
  }

  function cancelWheelMomentum() {
    if (wheelIdleTimer !== null) {
      window.clearTimeout(wheelIdleTimer);
      wheelIdleTimer = null;
    }

    wheelActive = false;
    wheelTrail = [];
    camera.stopInertia();
    camera.clearVelocity();
  }

  function recordPointer(clientX, clientY) {
    trail.push({ x: clientX, y: clientY, t: performance.now() });

    if (
      trail.length >
      getInteractionSetting("pointerTrailLimit", POINTER_TRAIL_LIMIT)
    ) {
      trail.shift();
    }
  }

  function updateVelocityFromTrail() {
    if (trail.length < 2) {
      return;
    }

    const start = trail[0];
    const end = trail[trail.length - 1];
    const deltaTime = Math.max(end.t - start.t, 1);

    camera.setVelocity(
      ((end.x - start.x) / deltaTime) *
        getInteractionSetting("dragMomentum", DRAG_MOMENTUM),
      ((end.y - start.y) / deltaTime) *
        getInteractionSetting("dragMomentum", DRAG_MOMENTUM),
    );
  }

  function getTouchDistance(touches) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );
  }

  function getTouchMidpoint(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" && !event.isPrimary) {
      return;
    }

    clearTouchMetadata();
    metadataDock.hide();

    camera.stopInertia();
    camera.clearVelocity();
    drag.active = true;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    trail = [];
    recordPointer(event.clientX, event.clientY);
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("dragging");

    if (event.pointerType === "touch") {
      const photo = findMetadataPhoto(event.target);

      if (photo) {
        touchMetadata.pointerId = event.pointerId;
        touchMetadata.startX = event.clientX;
        touchMetadata.startY = event.clientY;
        touchMetadata.photo = photo;
        photo.classList.add("photo--meta-pressing");
        touchMetadata.timer = window.setTimeout(() => {
          touchMetadata.timer = null;

          if (touchMetadata.photo) {
            touchMetadata.photo.classList.remove("photo--meta-pressing");
            metadataDock.show(readMetadata(touchMetadata.photo));
          }
        }, TOUCH_METADATA_DELAY_MS);
      }
    }
  });

  canvas.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch" || drag.active) {
      return;
    }

    const photo = findMetadataPhoto(event.target);

    if (photo) {
      metadataDock.show(readMetadata(photo));
    }
  });

  canvas.addEventListener("pointerout", (event) => {
    if (event.pointerType === "touch") {
      return;
    }

    const currentPhoto = findMetadataPhoto(event.target);

    if (!currentPhoto) {
      return;
    }

    const nextPhoto = findMetadataPhoto(event.relatedTarget);

    if (nextPhoto) {
      metadataDock.show(readMetadata(nextPhoto));
      return;
    }

    metadataDock.hide();
  });

  canvas.addEventListener("pointerleave", () => {
    metadataDock.hide();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!drag.active || (event.pointerType === "touch" && !event.isPrimary)) {
      return;
    }

    if (touchMetadata.pointerId === event.pointerId) {
      const moved = Math.hypot(
        event.clientX - touchMetadata.startX,
        event.clientY - touchMetadata.startY,
      );

      if (moved > TOUCH_METADATA_MOVE_TOLERANCE_PX) {
        clearTouchMetadata();
      }
    }

    camera.panBy(event.clientX - drag.lastX, event.clientY - drag.lastY);
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    recordPointer(event.clientX, event.clientY);
    updateVelocityFromTrail();
  });

  canvas.addEventListener("pointerup", (event) => {
    if (touchMetadata.pointerId === event.pointerId) {
      clearTouchMetadata();
    }

    if (!drag.active) {
      return;
    }

    drag.active = false;
    canvas.classList.remove("dragging");
    updateVelocityFromTrail();
    camera.startInertia();
  });

  canvas.addEventListener("pointercancel", (event) => {
    if (touchMetadata.pointerId === event.pointerId) {
      clearTouchMetadata();
    }

    drag.active = false;
    canvas.classList.remove("dragging");
    camera.clearVelocity();
    metadataDock.hide();
  });

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();

      if (event.ctrlKey || event.metaKey) {
        cancelWheelMomentum();
        camera.zoomAt(
          event.deltaY < 0
            ? getInteractionSetting("zoomInFactor", ZOOM_IN_FACTOR)
            : getInteractionSetting("zoomOutFactor", ZOOM_OUT_FACTOR),
          event.clientX,
          event.clientY,
        );
        return;
      }

      const deltaX = -event.deltaX;
      const deltaY = -event.deltaY;
      const now = performance.now();

      if (!wheelActive) {
        camera.stopInertia();
        camera.clearVelocity();
        wheelTrail = [];
        wheelActive = true;
      }

      camera.panBy(deltaX, deltaY);

      wheelTrail.push({ x: deltaX, y: deltaY, t: now });

      const trailLimit = getInteractionSetting(
        "pointerTrailLimit",
        POINTER_TRAIL_LIMIT,
      );

      if (wheelTrail.length > trailLimit) {
        wheelTrail.shift();
      }

      updateWheelVelocity();

      if (wheelIdleTimer !== null) {
        window.clearTimeout(wheelIdleTimer);
      }

      wheelIdleTimer = window.setTimeout(() => {
        wheelIdleTimer = null;
        wheelActive = false;
        releaseWheelMomentum();
      }, WHEEL_IDLE_MS);
    },
    { passive: false },
  );

  function getWheelVelocity(windowMs = null) {
    if (wheelTrail.length < 2) {
      return null;
    }

    const last = wheelTrail[wheelTrail.length - 1];
    const cutoff = windowMs == null ? -Infinity : last.t - windowMs;
    let firstIndex = 0;

    if (windowMs != null) {
      for (let i = wheelTrail.length - 1; i >= 0; i--) {
        if (wheelTrail[i].t < cutoff) {
          firstIndex = i + 1;
          break;
        }
      }
    }

    if (firstIndex >= wheelTrail.length - 1) {
      firstIndex = Math.max(0, wheelTrail.length - 2);
    }

    const first = wheelTrail[firstIndex];
    const span = Math.max(last.t - first.t, 1);
    let sumX = 0;
    let sumY = 0;

    for (let i = firstIndex + 1; i < wheelTrail.length; i++) {
      sumX += wheelTrail[i].x;
      sumY += wheelTrail[i].y;
    }

    const wheelMomentum = getInteractionSetting(
      "wheelMomentum",
      WHEEL_MOMENTUM,
    );
    const dragMomentum = getInteractionSetting("dragMomentum", DRAG_MOMENTUM);

    return {
      x: (sumX / span) * dragMomentum * wheelMomentum,
      y: (sumY / span) * dragMomentum * wheelMomentum,
    };
  }

  function updateWheelVelocity() {
    const velocity = getWheelVelocity();

    if (velocity) {
      camera.setVelocity(velocity.x, velocity.y);
    }
  }

  function releaseWheelMomentum() {
    const recent = getWheelVelocity(WHEEL_RELEASE_WINDOW_MS);
    const overall = getWheelVelocity();

    wheelTrail = [];

    if (!recent || !overall) {
      camera.clearVelocity();
      return;
    }

    const recentSpeed = Math.hypot(recent.x, recent.y);
    const overallSpeed = Math.hypot(overall.x, overall.y);

    // OS-supplied trackpad momentum tapers — if the tail is already slower
    // than the gesture's overall pace, the carry has already been delivered.
    if (
      recentSpeed < WHEEL_RELEASE_NOISE_FLOOR ||
      recentSpeed < overallSpeed * WHEEL_TAPER_RATIO
    ) {
      camera.clearVelocity();
      return;
    }

    camera.setVelocity(recent.x, recent.y);
    camera.startInertia();
  }

  canvas.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 2) {
        return;
      }

      clearTouchMetadata();
      drag.active = false;
      pinch.distance = getTouchDistance(event.touches);
      pinch.active = true;
    },
    { passive: true },
  );

  canvas.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 2 || !pinch.active) {
        return;
      }

      event.preventDefault();

      const nextDistance = getTouchDistance(event.touches);
      const midpoint = getTouchMidpoint(event.touches);

      camera.zoomAt(nextDistance / pinch.distance, midpoint.x, midpoint.y);
      pinch.distance = nextDistance;
    },
    { passive: false },
  );

  canvas.addEventListener("touchend", () => {
    clearTouchMetadata();
    pinch.active = false;
  });
}
