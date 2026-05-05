(() => {
  const iconPaths = {
    "calendar-arrow-up": [
      '<path d="M8 2v4"/>',
      '<path d="M16 2v4"/>',
      '<rect width="18" height="18" x="3" y="4" rx="2"/>',
      '<path d="M3 10h18"/>',
      '<path d="m15 18 3-3 3 3"/>',
      '<path d="M18 22v-7"/>',
    ],
    "calendar-arrow-down": [
      '<path d="M8 2v4"/>',
      '<path d="M16 2v4"/>',
      '<rect width="18" height="18" x="3" y="4" rx="2"/>',
      '<path d="M3 10h18"/>',
      '<path d="M18 15v7"/>',
      '<path d="m15 19 3 3 3-3"/>',
    ],
    "arrow-up-a-z": [
      '<path d="m3 8 4-4 4 4"/>',
      '<path d="M7 4v16"/>',
      '<path d="M14 8h5"/>',
      '<path d="M13 12h7"/>',
      '<path d="m15 12 2-8 2 8"/>',
      '<path d="M14 16h6l-6 4h6"/>',
    ],
    "arrow-down-z-a": [
      '<path d="M7 4v16"/>',
      '<path d="m3 16 4 4 4-4"/>',
      '<path d="M14 4h6l-6 4h6"/>',
      '<path d="M14 16h5"/>',
      '<path d="M13 20h7"/>',
      '<path d="m15 20 2-8 2 8"/>',
    ],
    "chevron-down": ['<path d="m6 9 6 6 6-6"/>'],
    copy: [
      '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>',
      '<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    ],
    download: [
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
      '<polyline points="7 10 12 15 17 10"/>',
      '<line x1="12" x2="12" y1="15" y2="3"/>',
    ],
    languages: [
      '<path d="m5 8 6 6"/>',
      '<path d="m4 14 6-6 2-3"/>',
      '<path d="M2 5h12"/>',
      '<path d="M7 2h1"/>',
      '<path d="m22 22-5-10-5 10"/>',
      '<path d="M14 18h6"/>',
    ],
  };

  function create(name) {
    const paths = iconPaths[name];
    if (!paths) {
      return null;
    }
    const template = document.createElement("template");
    template.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${name}">${paths.join("")}</svg>`;
    return template.content.firstElementChild;
  }

  function replace(target, name) {
    const icon = create(name);
    if (!target || !icon) {
      return;
    }
    target.replaceChildren(icon);
  }

  window.EXIFBannerIcons = { create, replace };
})();
