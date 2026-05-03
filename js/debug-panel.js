import {
  PANEL_OPEN_STORAGE_KEY,
  applyNormalizedTuning,
  createDefaultTuning,
} from "./tuning.js";

const CONTROL_GROUPS = [
  {
    title: "Layout",
    controls: [
      {
        name: "layout.spread",
        label: "Cluster spread",
        type: "range",
        min: 0.55,
        max: 1.8,
        step: 0.01,
        format: (value) => value.toFixed(2),
        hint: "Lower values pull the image cloud tighter. Higher values open it out.",
      },
      {
        name: "layout.imageScale",
        label: "Image scale",
        type: "range",
        min: 0.6,
        max: 1.6,
        step: 0.01,
        format: (value) => value.toFixed(2),
      },
      {
        name: "layout.lazyLoading",
        label: "Lazy loading",
        type: "checkbox",
        format: (value) => (value ? "On" : "Off"),
        hint: "Stored locally so you can reload and compare first-load behaviour.",
      },
    ],
  },
  {
    title: "Motion",
    controls: [
      {
        name: "interactions.zoomInFactor",
        label: "Zoom in speed",
        type: "range",
        min: 1.01,
        max: 1.2,
        step: 0.005,
        format: (value) => value.toFixed(3),
      },
      {
        name: "interactions.zoomOutFactor",
        label: "Zoom out speed",
        type: "range",
        min: 0.8,
        max: 0.99,
        step: 0.005,
        format: (value) => value.toFixed(3),
      },
      {
        name: "interactions.dragMomentum",
        label: "Drag impulse",
        type: "range",
        min: 8,
        max: 36,
        step: 0.5,
        format: (value) => value.toFixed(1),
      },
      {
        name: "interactions.wheelMomentum",
        label: "Wheel impulse",
        type: "range",
        min: 0,
        max: 2,
        step: 0.05,
        format: (value) => value.toFixed(2),
        hint: "1.0 matches drag impulse. Lower for a quieter wheel release; higher for more carry.",
      },
      {
        name: "camera.springStiffness",
        label: "Spring stiffness",
        type: "range",
        min: 8,
        max: 160,
        step: 1,
        format: (value) => value.toFixed(0),
        hint: "Higher = snappier release. Lower = looser, more drifting glide.",
      },
      {
        name: "camera.springDamping",
        label: "Spring damping",
        type: "range",
        min: 2,
        max: 60,
        step: 0.5,
        format: (value) => value.toFixed(1),
        hint: "Lower values let the throw overshoot and settle. Higher values pull up sharp.",
      },
      {
        name: "camera.springMass",
        label: "Spring mass",
        type: "range",
        min: 0.4,
        max: 4,
        step: 0.05,
        format: (value) => value.toFixed(2),
      },
      {
        name: "camera.throwDecay",
        label: "Throw distance",
        type: "range",
        min: 0.05,
        max: 1.2,
        step: 0.01,
        format: (value) => value.toFixed(2),
        hint: "Seconds of velocity projected into the spring target. Bigger = farther flicks.",
      },
      {
        name: "camera.edgeDrag",
        label: "Edge drag",
        type: "range",
        min: 0.2,
        max: 0.95,
        step: 0.01,
        format: (value) => value.toFixed(2),
        hint: "Lower values slow the glide harder when the camera hits the gallery edge.",
      },
      {
        name: "camera.maxSpeed",
        label: "Max throw speed",
        type: "range",
        min: 6,
        max: 60,
        step: 1,
        format: (value) => value.toFixed(0),
        hint: "Caps inertia velocity in pixels per frame. Raise for longer flicks.",
      },
      {
        name: "motion.spreadStrength",
        label: "Spacing response",
        type: "range",
        min: 0,
        max: 90,
        step: 1,
        format: (value) => value.toFixed(0),
      },
      {
        name: "motion.blurStrength",
        label: "Motion blur",
        type: "range",
        min: 0,
        max: 6,
        step: 0.05,
        format: (value) => value.toFixed(2),
      },
      {
        name: "motion.directionStrength",
        label: "Directional drift",
        type: "range",
        min: 0,
        max: 60,
        step: 1,
        format: (value) => value.toFixed(0),
      },
      {
        name: "motion.responseDamping",
        label: "Response damping",
        type: "range",
        min: 0.55,
        max: 0.95,
        step: 0.01,
        format: (value) => value.toFixed(2),
      },
    ],
  },
  {
    title: "Landing View",
    controls: [
      {
        name: "camera.initialZoom",
        label: "Initial zoom",
        type: "range",
        min: 0.35,
        max: 2.4,
        step: 0.01,
        format: (value) => value.toFixed(2),
        hint: "Use Apply landing view or refresh the page to feel the starting composition.",
      },
      {
        name: "appearance.vignetteStrength",
        label: "Vignette strength",
        type: "range",
        min: 0,
        max: 0.95,
        step: 0.01,
        format: (value) => value.toFixed(2),
      },
    ],
  },
  {
    title: "Background RGB",
    controls: [
      {
        name: "appearance.background.r",
        label: "Red",
        type: "range",
        min: 0,
        max: 255,
        step: 1,
        format: (value) => `${Math.round(value)}`,
      },
      {
        name: "appearance.background.g",
        label: "Green",
        type: "range",
        min: 0,
        max: 255,
        step: 1,
        format: (value) => `${Math.round(value)}`,
      },
      {
        name: "appearance.background.b",
        label: "Blue",
        type: "range",
        min: 0,
        max: 255,
        step: 1,
        format: (value) => `${Math.round(value)}`,
      },
    ],
  },
];

/**
 * @param {{
 *   panel: HTMLElement,
 *   toggleButton: HTMLButtonElement,
 *   tuning: import("./tuning.js").DebugTuning,
 *   onTuningChange: () => void,
 *   onApplyLandingView: () => void,
 *   onReset: () => void,
 * }} options
 */
export function createDebugPanel({
  panel,
  toggleButton,
  tuning,
  onTuningChange,
  onApplyLandingView,
  onReset,
}) {
  panel.innerHTML = `
    <div class="debug-panel__header">
      <div>
        <h2 class="debug-panel__title">Debug Tuning</h2>
        <p class="debug-panel__subtitle">Persistent controls for layout, momentum, loading, and colour.</p>
      </div>
      <button class="debug-panel__collapse" type="button" aria-label="Close tuning panel">×</button>
    </div>
    <form class="debug-panel__form"></form>
  `;

  const form = panel.querySelector(".debug-panel__form");
  const collapseButton = panel.querySelector(".debug-panel__collapse");

  form.innerHTML = `
    ${CONTROL_GROUPS.map(renderGroup).join("")}
    <div class="debug-panel__color-preview" data-color-preview></div>
    <div class="debug-panel__actions">
      <button class="debug-panel__button" type="button" data-action="apply-view">Apply landing view</button>
      <button class="debug-panel__button" type="button" data-action="reset">Reset defaults</button>
    </div>
    <p class="debug-panel__note">Settings are saved in this browser so reload-based checks still use the current tuning values.</p>
  `;

  const preview = panel.querySelector("[data-color-preview]");
  const openByDefault =
    window.localStorage.getItem(PANEL_OPEN_STORAGE_KEY) !== "false";

  setOpen(openByDefault);
  syncControls();

  toggleButton.addEventListener("click", () =>
    setOpen(!panel.classList.contains("open")),
  );
  collapseButton.addEventListener("click", () => setOpen(false));

  form.addEventListener("input", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    updateTuningValue(
      target.name,
      target.type === "checkbox" ? target.checked : target.value,
    );
    syncControl(target.name);
    onTuningChange();
  });

  form.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    if (target.dataset.action === "apply-view") {
      onApplyLandingView();
      return;
    }

    if (target.dataset.action === "reset") {
      applyNormalizedTuning(tuning, createDefaultTuning());
      syncControls();
      onReset();
    }
  });

  function setOpen(isOpen) {
    panel.classList.toggle("open", isOpen);
    toggleButton.setAttribute("aria-expanded", String(isOpen));
    window.localStorage.setItem(PANEL_OPEN_STORAGE_KEY, String(isOpen));
  }

  function syncControls() {
    CONTROL_GROUPS.forEach((group) => {
      group.controls.forEach((control) => syncControl(control.name));
    });

    preview.style.background = colorString();
  }

  function syncControl(name) {
    const input = form.elements.namedItem(name);
    const output = form.querySelector(`[data-output="${name}"]`);
    const control = findControl(name);
    const value = getTuningValue(name);

    if (input instanceof HTMLInputElement) {
      if (input.type === "checkbox") {
        input.checked = Boolean(value);
      } else {
        input.value = `${value}`;
      }
    }

    if (output && control) {
      output.textContent = control.format(value);
    }

    if (name.startsWith("appearance.background.")) {
      preview.style.background = colorString();
    }
  }

  function updateTuningValue(path, rawValue) {
    const parts = path.split(".");
    const key = parts.pop();
    let branch = tuning;

    parts.forEach((part) => {
      branch = branch[part];
    });

    branch[key] = typeof rawValue === "boolean" ? rawValue : Number(rawValue);
  }

  function getTuningValue(path) {
    return path.split(".").reduce((value, part) => value[part], tuning);
  }

  function findControl(name) {
    return CONTROL_GROUPS.flatMap((group) => group.controls).find(
      (control) => control.name === name,
    );
  }

  function colorString() {
    const { r, g, b } = tuning.appearance.background;
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function renderGroup(group) {
  return `
    <section class="debug-panel__group">
      <h3 class="debug-panel__group-title">${group.title}</h3>
      ${group.controls.map(renderControl).join("")}
    </section>
  `;
}

function renderControl(control) {
  const hint = control.hint
    ? `<p class="debug-control__hint">${control.hint}</p>`
    : "";

  if (control.type === "checkbox") {
    return `
      <label class="debug-control debug-control--checkbox">
        <span class="debug-control__top">
          <span class="debug-control__label">${control.label}</span>
          <span class="debug-control__value" data-output="${control.name}"></span>
        </span>
        <input type="checkbox" name="${control.name}" />
        ${hint}
      </label>
    `;
  }

  return `
    <label class="debug-control">
      <span class="debug-control__top">
        <span class="debug-control__label">${control.label}</span>
        <span class="debug-control__value" data-output="${control.name}"></span>
      </span>
      <input
        type="range"
        name="${control.name}"
        min="${control.min}"
        max="${control.max}"
        step="${control.step}"
      />
      ${hint}
    </label>
  `;
}
