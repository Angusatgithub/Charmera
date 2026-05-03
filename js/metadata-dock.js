const HIDDEN_CLASS_NAME = "metadata-dock--hidden";

/**
 * Controls the shared bottom metadata pill.
 * @param {Element | null} root
 * @returns {{ show: (metadata: { title: string, date: string }) => void, hide: () => void }}
 */
export function createMetadataDockController(root) {
  const title = root?.querySelector(".metadata-dock__title");
  const date = root?.querySelector(".metadata-dock__date");

  if (
    !(root instanceof HTMLElement) ||
    !(title instanceof HTMLElement) ||
    !(date instanceof HTMLElement)
  ) {
    return {
      show() {},
      hide() {},
    };
  }

  function show(metadata) {
    const nextTitle = metadata.title ?? "";
    const nextDate = metadata.date ?? "";

    if (!nextTitle && !nextDate) {
      hide();
      return;
    }

    title.textContent = nextTitle;
    title.hidden = !nextTitle;
    date.textContent = nextDate;
    date.hidden = !nextDate;
    root.classList.remove(HIDDEN_CLASS_NAME);
    root.setAttribute("aria-hidden", "false");
  }

  function hide() {
    root.classList.add(HIDDEN_CLASS_NAME);
    root.setAttribute("aria-hidden", "true");
  }

  return {
    show,
    hide,
  };
}
