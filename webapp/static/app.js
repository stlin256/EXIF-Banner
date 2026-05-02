const STORAGE_KEY = "pptExifBannerSettings.v3";

const state = {
  albumId: "",
  root: "",
  photos: [],
  current: 0,
  exifSource: "",
  settings: null,
  logoPreviewPath: "",
  logoRules: [],
  logoRulesLoaded: false,
  missingLogoNotices: new Set(),
  toastTimer: 0,
  selected: new Set(),
  exportPollTimer: 0,
  previewTimer: 0,
  previewSerial: 0,
  previewObjectUrl: "",
  previewCache: new Map(),
  previewRequests: new Map(),
  previewCacheLimit: 72,
  previewWarmQueue: [],
  previewWarmQueued: new Set(),
  previewWarmActive: new Set(),
  previewWarmGeneration: 0,
  previewWarmRadius: 24,
  previewWarmConcurrency: 2,
  photoItems: new Map(),
  activePhotoItem: null,
  saveTimer: 0,
  scrollFrame: 0,
  preloadTimer: 0,
  wheelDelta: 0,
  wheelStepTimer: 0,
  wheelIdleTimer: 0,
  wheelDirection: 0,
  lastMoveDirection: 1,
};

const defaults = {
  slideWidth: 1920,
  slideHeight: 1080,
  slideLongEdge: 1920,
  slideAspectRatio: "16:9",
  background: "#f6f4ef",
  safeWidthPct: 95,
  safeHeightPct: 87,
  pageMarginXPct: 2.5,
  pageMarginYPct: 1.85,
  bannerWidthPct: 62.5,
  bannerHeightPct: 7.407,
  gapPct: 1.852,
  bannerOpacity: 0.6,
  bannerColor: "#000000",
  infoFontPct: 2.037,
  paramFontPct: 2.593,
  brandFontPct: 5.556,
  logoPath: "",
  brandText: "",
  shadow: true,
  quality: 92,
  exportFormat: "jpeg",
  exportScalePct: 100,
};

const $ = (id) => document.getElementById(id);

function init() {
  const saved = loadSavedState();
  state.settings = { ...defaults, ...(saved.settings || {}) };
  migrateLayoutSettings(saved.settings || {});
  loadLogoRules();
  if (saved.folder) {
    $("folderInput").value = saved.folder;
  }
  $("recursiveInput").checked = !!saved.recursive;
  $("pickFolderBtn").addEventListener("click", pickFolder);
  $("pickLogoBtn").addEventListener("click", pickLogo);
  $("scanBtn").addEventListener("click", scan);
  $("exportImagesBtn").addEventListener("click", () => exportAlbum("images"));
  $("exportPptxBtn").addEventListener("click", () => exportAlbum("pptx"));
  $("resetBtn").addEventListener("click", resetSettings);
  $("selectAllBtn").addEventListener("click", selectAllPhotos);
  $("clearSelectionBtn").addEventListener("click", clearPhotoSelection);
  $("exportCompleteCloseBtn").addEventListener("click", hideExportCompleteDialog);
  $("exportCompleteDialog").addEventListener("click", (event) => {
    if (event.target === $("exportCompleteDialog")) {
      hideExportCompleteDialog();
    }
  });
  $("previewStage").addEventListener("wheel", handlePreviewWheel, { passive: false });
  document.addEventListener("keydown", handleKeyNavigation);

  for (const input of settingsInputs()) {
    const onSettingChange = () => {
      readSettings();
      updatePreview();
    };
    input.addEventListener("input", onSettingChange);
    input.addEventListener("change", onSettingChange);
  }
  for (const input of exportOnlyInputs()) {
    const onExportSettingChange = () => {
      readSettings();
    };
    input.addEventListener("input", onExportSettingChange);
    input.addEventListener("change", onExportSettingChange);
  }
  $("folderInput").addEventListener("input", scheduleSaveState);
  $("recursiveInput").addEventListener("change", scheduleSaveState);
  window.addEventListener("beforeunload", flushSavedState);
  writeSettings();
  if (saved.folder) {
    loadLastProject();
  } else {
    setIdle("等待扫描");
  }
}

function migrateLayoutSettings(savedSettings) {
  if (savedSettings.pageMarginXPct === undefined && savedSettings.safeWidthPct !== undefined) {
    state.settings.pageMarginXPct = Math.max(0, (100 - Number(savedSettings.safeWidthPct)) / 2);
  }
  if (savedSettings.pageMarginYPct === undefined && savedSettings.safeHeightPct !== undefined) {
    const banner = Number(state.settings.bannerHeightPct || defaults.bannerHeightPct);
    const gap = Number(state.settings.gapPct || defaults.gapPct);
    state.settings.pageMarginYPct = Math.max(0, (100 - Number(savedSettings.safeHeightPct) - banner - gap) / 2);
  }
}

function settingsInputs() {
  return [
    $("slideAspectRatioInput"),
    $("backgroundInput"),
    $("bannerColorInput"),
    $("logoPathInput"),
    $("brandTextInput"),
    $("bannerWidthInput"),
    $("bannerHeightInput"),
    $("opacityInput"),
    $("pageMarginXInput"),
    $("pageMarginYInput"),
    $("gapInput"),
    $("infoFontInput"),
    $("paramFontInput"),
    $("shadowInput"),
  ];
}

function exportOnlyInputs() {
  return [
    $("exportFormatInput"),
    $("qualityInput"),
    $("exportScaleInput"),
  ];
}

async function api(path, payload = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

async function loadLogoRules() {
  try {
    const response = await fetch("/logos/logo-rules.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("logo rules unavailable");
    }
    const data = await response.json();
    state.logoRules = Array.isArray(data.logos) ? data.logos : [];
  } catch {
    state.logoRules = [];
  } finally {
    state.logoRulesLoaded = true;
    maybePromptMissingLogo(state.photos[state.current]);
  }
}

async function pickFolder() {
  try {
    const data = await api("/api/pick-folder");
    if (data.folder) {
      $("folderInput").value = data.folder;
      saveState();
      setBusy("相册已选择，开始扫描");
      await nextFrame();
      await scan();
    } else {
      setIdle("就绪");
    }
  } catch (error) {
    showError(error);
  }
}

async function pickLogo() {
  try {
    const data = await api("/api/pick-logo");
    if (data.file) {
      $("logoPathInput").value = data.file;
      hideToast();
      readSettings();
      updatePreview();
      setIdle("Logo 已选择");
    } else {
      setIdle("就绪");
    }
  } catch (error) {
    showError(error);
  }
}

async function loadLastProject() {
  setBusy("加载上次相册");
  await nextFrame();
  await scan({ auto: true });
}

async function scan(options = {}) {
  const folder = $("folderInput").value.trim();
  if (!folder) {
    $("folderInput").focus();
    return;
  }
  setBusy("扫描照片");
  await nextFrame();
  try {
    const data = await api("/api/scan", {
      folder,
      recursive: $("recursiveInput").checked,
    });
    state.albumId = data.albumId;
    state.root = data.root;
    state.photos = data.photos;
    state.current = 0;
    state.exifSource = data.exifSource;
    state.missingLogoNotices.clear();
    const saved = loadSavedState();
    state.selected = restoredSelection(data.photos, saved, folder);
    clearPreviewCache();
    if (data.settings) {
      state.settings = { ...defaults, ...data.settings, ...state.settings };
      writeSettings();
    }
    renderPhotoList();
    const restoredIndex = isSameProject(saved, folder, data.photos) ? Number(saved.current || 0) : 0;
    selectPhoto(Math.min(restoredIndex, Math.max(0, data.photos.length - 1)));
    updateSelectionUI();
    setIdle(`${state.photos.length} 张照片`);
  } catch (error) {
    if (options.auto) {
      setIdle("上次相册不可用");
      console.error(error);
    } else {
      showError(error);
    }
  }
}

function isSameProject(saved, folder, photos = state.photos) {
  return (
    saved.folder === folder &&
    !!saved.recursive === $("recursiveInput").checked &&
    (!saved.photoFingerprint || saved.photoFingerprint === photoFingerprint(photos))
  );
}

function restoredSelection(photos, saved, folder) {
  if (!isSameProject(saved, folder, photos) || !Array.isArray(saved.selection)) {
    return new Set(photos.map((photo) => photo.index));
  }
  const available = new Set(photos.map((photo) => photo.index));
  const selection = new Set(
    saved.selection
      .map((value) => Number(value))
      .filter((value) => available.has(value))
  );
  return selection.size ? selection : new Set(photos.map((photo) => photo.index));
}

function photoFingerprint(photos) {
  if (!Array.isArray(photos) || !photos.length) {
    return "";
  }
  const first = photos[0]?.name || "";
  const last = photos[photos.length - 1]?.name || "";
  return `${photos.length}:${first}:${last}`;
}

function renderPhotoList() {
  const list = $("photoList");
  list.textContent = "";
  state.photoItems = new Map();
  state.activePhotoItem = null;
  const fragment = document.createDocumentFragment();
  for (const photo of state.photos) {
    const item = document.createElement("div");
    item.className = "photoItem";
    item.dataset.index = photo.index;
    item.classList.toggle("selected", state.selected.has(photo.index));

    const checkbox = document.createElement("input");
    checkbox.className = "photoSelect";
    checkbox.type = "checkbox";
    checkbox.checked = state.selected.has(photo.index);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.selected.add(photo.index);
      } else {
        state.selected.delete(photo.index);
      }
      item.classList.toggle("selected", checkbox.checked);
      updateSelectionUI();
      scheduleSaveState();
    });

    const image = document.createElement("img");
    image.className = "photoThumb";
    image.loading = "lazy";
    image.src = `/api/photo?album=${encodeURIComponent(state.albumId)}&index=${photo.index}&max=180`;
    image.addEventListener("click", () => selectPhoto(photo.index));

    const text = document.createElement("div");
    text.className = "photoText";
    text.addEventListener("click", () => selectPhoto(photo.index));
    const name = document.createElement("div");
    name.className = "photoName";
    name.textContent = photo.name;
    name.title = photo.name;
    const meta = document.createElement("div");
    meta.className = "photoMeta";
    meta.textContent = `${photo.width} x ${photo.height}`;
    text.append(name, meta);
    item.append(checkbox, image, text);
    fragment.append(item);
    state.photoItems.set(photo.index, item);
  }
  list.append(fragment);
}

function selectPhoto(index) {
  if (!state.photos.length) {
    return;
  }
  const nextIndex = Math.max(0, Math.min(index, state.photos.length - 1));
  state.current = nextIndex;
  updateActivePhotoItem(nextIndex);
  $("slideCanvas").hidden = false;
  document.querySelector(".emptyState").hidden = true;
  updatePreview();
  scheduleSaveState();
  scrollActivePhotoIntoView();
}

function updateActivePhotoItem(index) {
  const nextItem = state.photoItems.get(index);
  if (state.activePhotoItem === nextItem) {
    return;
  }
  if (state.activePhotoItem) {
    state.activePhotoItem.classList.remove("active");
  }
  if (nextItem) {
    nextItem.classList.add("active");
  }
  state.activePhotoItem = nextItem || null;
}

function movePhoto(delta) {
  if (!state.photos.length) {
    return false;
  }
  const next = Math.max(0, Math.min(state.photos.length - 1, state.current + delta));
  if (next !== state.current) {
    state.lastMoveDirection = next > state.current ? 1 : -1;
    selectPhoto(next);
    return true;
  }
  return false;
}

function scrollActivePhotoIntoView() {
  window.cancelAnimationFrame(state.scrollFrame);
  const index = state.current;
  state.scrollFrame = window.requestAnimationFrame(() => {
    state.scrollFrame = 0;
    const active = state.photoItems.get(index);
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  });
}

function handlePreviewWheel(event) {
  if (!state.photos.length || document.body.classList.contains("busy")) {
    return;
  }
  const magnitude = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  if (Math.abs(magnitude) < 1) {
    return;
  }
  event.preventDefault();
  const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 40 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 500 : 1;
  const normalized = Math.max(-120, Math.min(120, magnitude * unit));
  const direction = normalized > 0 ? 1 : -1;
  const threshold = wheelStepThreshold();
  if (state.wheelDirection && state.wheelDirection !== direction) {
    state.wheelDelta = 0;
  }
  state.wheelDirection = direction;
  state.wheelDelta = direction * Math.min(threshold * 4, Math.abs(state.wheelDelta) + Math.abs(normalized));
  window.clearTimeout(state.wheelIdleTimer);
  state.wheelIdleTimer = window.setTimeout(resetWheelBuffer, 320);
  if (!state.wheelStepTimer && Math.abs(state.wheelDelta) >= threshold) {
    processWheelStep();
  }
}

function wheelStepThreshold() {
  return 90;
}

function processWheelStep() {
  state.wheelStepTimer = 0;
  const threshold = wheelStepThreshold();
  if (Math.abs(state.wheelDelta) < threshold) {
    return;
  }
  const direction = state.wheelDelta > 0 ? 1 : -1;
  state.wheelDelta -= direction * threshold;
  if (!movePhoto(direction)) {
    resetWheelBuffer();
    return;
  }
  if (Math.abs(state.wheelDelta) >= threshold) {
    state.wheelStepTimer = window.setTimeout(processWheelStep, 95);
  }
}

function resetWheelBuffer() {
  window.clearTimeout(state.wheelStepTimer);
  window.clearTimeout(state.wheelIdleTimer);
  state.wheelDelta = 0;
  state.wheelStepTimer = 0;
  state.wheelIdleTimer = 0;
  state.wheelDirection = 0;
}

function handleKeyNavigation(event) {
  if (event.key === "Escape" && !$("exportCompleteDialog").hidden) {
    event.preventDefault();
    hideExportCompleteDialog();
    return;
  }
  if (!state.photos.length || isTypingTarget(event.target)) {
    return;
  }
  if (event.key === "ArrowRight" || event.key === "PageDown") {
    event.preventDefault();
    movePhoto(1);
  } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    movePhoto(-1);
  }
}

function isTypingTarget(target) {
  if (!target || !target.tagName) {
    return false;
  }
  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
}

function selectAllPhotos() {
  state.selected = new Set(state.photos.map((photo) => photo.index));
  syncSelectionControls();
  updateSelectionUI();
  scheduleSaveState();
}

function clearPhotoSelection() {
  state.selected.clear();
  syncSelectionControls();
  updateSelectionUI();
  scheduleSaveState();
}

function syncSelectionControls() {
  for (const [index, item] of state.photoItems) {
    const checked = state.selected.has(index);
    item.classList.toggle("selected", checked);
    const checkbox = item.querySelector(".photoSelect");
    if (checkbox) {
      checkbox.checked = checked;
    }
  }
}

function updateSelectionUI() {
  const selectedCount = state.selected.size;
  const total = state.photos.length;
  $("countText").textContent = `${selectedCount}/${total}`;
  const disabled = total === 0 || selectedCount === 0;
  $("exportImagesBtn").disabled = disabled;
  $("exportPptxBtn").disabled = disabled;
}

function readSettings() {
  state.settings = {
    ...state.settings,
    background: $("backgroundInput").value,
    bannerColor: $("bannerColorInput").value,
    logoPath: $("logoPathInput").value.trim(),
    brandText: $("brandTextInput").value.trim(),
    slideAspectRatio: $("slideAspectRatioInput").value,
    slideLongEdge: 1920,
    bannerWidthPct: Number($("bannerWidthInput").value),
    bannerHeightPct: Number($("bannerHeightInput").value),
    bannerOpacity: Number($("opacityInput").value) / 100,
    pageMarginXPct: Number($("pageMarginXInput").value),
    pageMarginYPct: Number($("pageMarginYInput").value),
    gapPct: Number($("gapInput").value),
    infoFontPct: Number($("infoFontInput").value),
    paramFontPct: Number($("paramFontInput").value),
    exportFormat: $("exportFormatInput").value,
    quality: Number($("qualityInput").value),
    exportScalePct: Number($("exportScaleInput").value),
    shadow: $("shadowInput").checked,
  };
  updateSliderLabels();
  if (state.settings.logoPath) {
    hideToast();
  }
  scheduleSaveState();
}

function writeSettings() {
  $("backgroundInput").value = state.settings.background;
  $("bannerColorInput").value = state.settings.bannerColor;
  $("logoPathInput").value = state.settings.logoPath || "";
  $("brandTextInput").value = state.settings.brandText || "";
  $("slideAspectRatioInput").value = state.settings.slideAspectRatio || defaults.slideAspectRatio;
  $("bannerWidthInput").value = state.settings.bannerWidthPct;
  $("bannerHeightInput").value = state.settings.bannerHeightPct;
  $("opacityInput").value = Math.round(state.settings.bannerOpacity * 100);
  $("pageMarginXInput").value = state.settings.pageMarginXPct ?? defaults.pageMarginXPct;
  $("pageMarginYInput").value = state.settings.pageMarginYPct ?? defaults.pageMarginYPct;
  $("gapInput").value = state.settings.gapPct;
  $("infoFontInput").value = state.settings.infoFontPct;
  $("paramFontInput").value = state.settings.paramFontPct;
  $("exportFormatInput").value = state.settings.exportFormat || defaults.exportFormat;
  $("qualityInput").value = state.settings.quality ?? defaults.quality;
  $("exportScaleInput").value = state.settings.exportScalePct ?? defaults.exportScalePct;
  $("shadowInput").checked = !!state.settings.shadow;
  updateSliderLabels();
}

function resetSettings() {
  state.settings = { ...defaults };
  writeSettings();
  saveState();
  updatePreview();
}

function loadSavedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      folder: $("folderInput").value.trim(),
      recursive: $("recursiveInput").checked,
      current: state.current,
      selection: [...state.selected],
      photoFingerprint: photoFingerprint(state.photos),
      settings: state.settings,
    }));
  } catch {
    // Local storage can be disabled; the app still works without persistence.
  }
}

function scheduleSaveState() {
  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => {
    state.saveTimer = 0;
    saveState();
  }, 250);
}

function flushSavedState() {
  if (state.saveTimer) {
    window.clearTimeout(state.saveTimer);
    state.saveTimer = 0;
  }
  saveState();
}

function updateSliderLabels() {
  $("bannerWidthValue").textContent = `${Number($("bannerWidthInput").value).toFixed(1)}%`;
  $("bannerHeightValue").textContent = `${Number($("bannerHeightInput").value).toFixed(1)}%`;
  $("opacityValue").textContent = `${$("opacityInput").value}%`;
  $("pageMarginXValue").textContent = `${Number($("pageMarginXInput").value).toFixed(1)}%`;
  $("pageMarginYValue").textContent = `${Number($("pageMarginYInput").value).toFixed(2)}%`;
  $("gapValue").textContent = `${Number($("gapInput").value).toFixed(2)}%`;
  $("infoFontValue").textContent = `${Number($("infoFontInput").value).toFixed(2)}%`;
  $("paramFontValue").textContent = `${Number($("paramFontInput").value).toFixed(2)}%`;
  $("qualityValue").textContent = $("qualityInput").value;
  $("exportScaleValue").textContent = `${$("exportScaleInput").value}%`;
  $("qualityInput").disabled = $("exportFormatInput").value === "png";
}

function updatePreview() {
  const canvas = $("slideCanvas");
  const image = $("previewImage");
  const banner = $("bannerPreview");
  const photo = state.photos[state.current];
  if (!photo) {
    return;
  }

  canvas.style.background = state.settings.background;
  applySlideAspect(canvas);
  banner.hidden = true;
  Object.assign(image.style, {
    left: "0",
    top: "0",
    width: "100%",
    height: "100%",
    filter: "none",
    objectFit: "contain",
  });

  $("fileNameText").textContent = photo.name;
  $("fileNameText").title = photo.name;
  maybePromptMissingLogo(photo);
  scheduleServerPreview();
}

function applySlideAspect(canvas) {
  const ratio = parseAspectRatio(state.settings.slideAspectRatio || defaults.slideAspectRatio);
  canvas.style.aspectRatio = `${ratio.width} / ${ratio.height}`;
  canvas.style.width = `min(100%, calc((100vh - 120px) * ${ratio.width / ratio.height}))`;
}

function parseAspectRatio(value) {
  const match = String(value || "16:9").match(/^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/);
  if (!match) {
    return { width: 16, height: 9 };
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) {
    return { width: 16, height: 9 };
  }
  return { width, height };
}

function scheduleServerPreview() {
  window.clearTimeout(state.previewTimer);
  const serial = ++state.previewSerial;
  const index = state.current;
  const cached = getCachedPreview(index);
  if (cached) {
    setPreviewImage(cached);
    schedulePreviewWarmup(index);
    return;
  }
  state.previewTimer = window.setTimeout(() => renderServerPreview(index, serial), 35);
  schedulePreviewWarmup(index, 140);
}

async function renderServerPreview(index = state.current, serial = ++state.previewSerial) {
  if (!state.albumId || !state.photos[index]) {
    return;
  }
  const cached = getCachedPreview(index);
  if (cached) {
    if (serial === state.previewSerial && index === state.current) {
      setPreviewImage(cached);
      schedulePreviewWarmup(index);
    }
    return;
  }
  try {
    const url = await fetchPreviewUrl(index);
    if (serial !== state.previewSerial || index !== state.current) {
      return;
    }
    setPreviewImage(url);
    schedulePreviewWarmup(index);
  } catch (error) {
    console.error(error);
  }
}

function setPreviewImage(url) {
  const image = $("previewImage");
  if (image.src !== url) {
    image.src = url;
  }
}

function previewCacheKey(index) {
  const { exportScalePct, exportFormat, quality, ...previewSettings } = state.settings;
  return `${state.albumId}:${index}:${JSON.stringify(previewSettings)}`;
}

function getCachedPreview(index) {
  const key = previewCacheKey(index);
  const cached = state.previewCache.get(key);
  if (!cached) {
    return "";
  }
  cached.used = performance.now();
  return cached.url;
}

async function fetchPreviewUrl(index) {
  const key = previewCacheKey(index);
  const cached = state.previewCache.get(key);
  if (cached) {
    cached.used = performance.now();
    return cached.url;
  }
  const existing = state.previewRequests.get(key);
  if (existing) {
    return existing;
  }
  const request = fetch("/api/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      albumId: state.albumId,
      index,
      settings: state.settings,
      maxSize: 1920,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("预览渲染失败");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      rememberPreview(key, url);
      return url;
    })
    .finally(() => {
      state.previewRequests.delete(key);
    });
  state.previewRequests.set(key, request);
  return request;
}

function rememberPreview(key, url) {
  state.previewCache.set(key, { url, used: performance.now() });
  while (state.previewCache.size > state.previewCacheLimit) {
    let oldestKey = "";
    let oldestUsed = Infinity;
    for (const [entryKey, entry] of state.previewCache) {
      if (entry.used < oldestUsed) {
        oldestKey = entryKey;
        oldestUsed = entry.used;
      }
    }
    if (!oldestKey) {
      return;
    }
    const removed = state.previewCache.get(oldestKey);
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }
    state.previewCache.delete(oldestKey);
  }
}

function schedulePreviewWarmup(index, delay = 40) {
  window.clearTimeout(state.preloadTimer);
  const generation = ++state.previewWarmGeneration;
  state.previewWarmQueue = [];
  state.previewWarmQueued.clear();
  state.previewWarmActive.clear();
  state.preloadTimer = window.setTimeout(() => {
    if (generation !== state.previewWarmGeneration) {
      return;
    }
    for (const nextIndex of previewWarmOrder(index)) {
      const key = previewCacheKey(nextIndex);
      if (!state.previewCache.has(key) && !state.previewRequests.has(key) && !state.previewWarmQueued.has(key)) {
        state.previewWarmQueue.push({ index: nextIndex, key, generation });
        state.previewWarmQueued.add(key);
      }
    }
    pumpPreviewWarmQueue();
  }, delay);
}

function previewWarmOrder(index) {
  const order = [];
  const primary = state.lastMoveDirection >= 0 ? 1 : -1;
  const secondary = -primary;
  for (let distance = 1; distance <= state.previewWarmRadius; distance += 1) {
    const nextIndex = index + primary * distance;
    if (nextIndex >= 0 && nextIndex < state.photos.length) {
      order.push(nextIndex);
    }
  }
  for (let distance = 1; distance <= Math.ceil(state.previewWarmRadius / 2); distance += 1) {
    const nextIndex = index + secondary * distance;
    if (nextIndex >= 0 && nextIndex < state.photos.length) {
      order.push(nextIndex);
    }
  }
  return order;
}

function pumpPreviewWarmQueue() {
  while (state.previewWarmActive.size < state.previewWarmConcurrency && state.previewWarmQueue.length) {
    const item = state.previewWarmQueue.shift();
    state.previewWarmQueued.delete(item.key);
    if (item.generation !== state.previewWarmGeneration) {
      continue;
    }
    if (state.previewCache.has(item.key) || state.previewRequests.has(item.key)) {
      continue;
    }
    const token = `${item.generation}:${item.index}:${performance.now()}`;
    state.previewWarmActive.add(token);
    fetchPreviewUrl(item.index)
      .catch(() => {})
      .finally(() => {
        state.previewWarmActive.delete(token);
        if (item.generation === state.previewWarmGeneration) {
          pumpPreviewWarmQueue();
        }
      });
  }
}

function clearPreviewCache() {
  window.clearTimeout(state.previewTimer);
  window.clearTimeout(state.preloadTimer);
  state.previewSerial += 1;
  state.previewWarmGeneration += 1;
  state.previewWarmQueue = [];
  state.previewWarmQueued.clear();
  state.previewWarmActive.clear();
  for (const entry of state.previewCache.values()) {
    URL.revokeObjectURL(entry.url);
  }
  state.previewCache.clear();
  state.previewRequests.clear();
}

function updateLogoPreview(brand) {
  const logoPath = state.settings.logoPath;
  const logo = $("logoPreview");
  const label = $("brandTextPreview");
  label.textContent = brand;

  if (!logoPath) {
    state.logoPreviewPath = "";
    logo.hidden = true;
    label.hidden = false;
    return;
  }

  label.hidden = true;
  logo.hidden = false;
  logo.onerror = () => {
    logo.hidden = true;
    label.hidden = false;
  };
  if (state.logoPreviewPath !== logoPath) {
    state.logoPreviewPath = logoPath;
    logo.src = `/api/logo?path=${encodeURIComponent(logoPath)}`;
  }
}

function maybePromptMissingLogo(photo) {
  if (!photo || !state.logoRulesLoaded || state.settings.logoPath) {
    return;
  }
  if (matchedLogoRule(photo.exif || {})) {
    return;
  }
  const brand = inferBrand(photo.exif || {});
  const key = normalizeLogoText(brand || "unknown");
  if (state.missingLogoNotices.has(key)) {
    return;
  }
  state.missingLogoNotices.add(key);
  const label = brand && brand !== "CAMERA" ? brand : "当前相机品牌";
  showToast(`未找到 ${label} 的内置 Logo，可手动选择 Logo。`);
}

function matchedLogoRule(exif) {
  const text = normalizeLogoText(`${exif.make || ""} ${exif.model || ""}`);
  if (!text) {
    return null;
  }
  for (const rule of state.logoRules) {
    const terms = Array.isArray(rule.match) ? rule.match : [];
    if (terms.some((term) => {
      const normalized = normalizeLogoText(term);
      return normalized && text.includes(normalized);
    })) {
      return rule;
    }
  }
  return null;
}

function normalizeLogoText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) {
    return;
  }
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(hideToast, 4600);
}

function hideToast() {
  const toast = $("toast");
  if (!toast) {
    return;
  }
  window.clearTimeout(state.toastTimer);
  state.toastTimer = 0;
  toast.hidden = true;
}

function inferBrand(exif) {
  const text = (exif.make || exif.model || "CAMERA").trim();
  return text ? text.split(/\s+/)[0].toUpperCase() : "CAMERA";
}

function formatParams(exif) {
  const values = [];
  if (exif.focalLength) values.push(escapeHtml(exif.focalLength));
  if (exif.fNumber) values.push(`F${escapeHtml(exif.fNumber)}`);
  if (exif.exposureTime) values.push(`${escapeHtml(exif.exposureTime)}s`);
  if (exif.iso) values.push(`ISO ${escapeHtml(exif.iso)}`);
  return values.length ? values.join("&nbsp;&nbsp;&nbsp;&nbsp;") : "No EXIF";
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

async function exportAlbum(kind) {
  if (!state.albumId) {
    return;
  }
  const selection = [...state.selected].sort((a, b) => a - b);
  if (!selection.length) {
    alert("请先勾选要导出的照片。");
    return;
  }

  readSettings();
  const label = kind === "images" ? "导出图片" : "导出 PPTX";
  try {
    const picked = await api("/api/pick-output-dir");
    if (!picked.folder) {
      setIdle("就绪");
      return;
    }

    setBusy(label, 0);
    await nextFrame();
    const started = await api("/api/export/start", {
      kind,
      albumId: state.albumId,
      settings: state.settings,
      selection,
      outputDir: picked.folder,
    });
    await pollExportJob(started.jobId, kind);
  } catch (error) {
    showError(error);
  }
}

async function pollExportJob(jobId, kind) {
  while (true) {
    await delay(350);
    const job = await api("/api/export/status", { jobId });
    setBusy(job.message || "导出中", Number(job.progress || 0));
    if (job.status === "done") {
      const result = job.result || {};
      if (kind === "images") {
        setIdle(`已导出 ${result.count || 0} 张图片`);
      } else {
        setIdle(`已导出 ${result.count || 0} 页 PPTX`);
      }
      showExportCompleteDialog(kind, result);
      return;
    }
    if (job.status === "error") {
      throw new Error(job.error || "导出失败");
    }
  }
}

function setBusy(text, progress = null) {
  $("statusText").textContent = text;
  $("busyText").textContent = text;
  document.body.classList.add("busy");
  setProgress(progress);
}

function setIdle(text = "就绪") {
  $("statusText").textContent = text;
  document.body.classList.remove("busy");
  setProgress(null);
}

function showError(error) {
  setIdle("出错");
  alert(error.message || String(error));
}

function showExportCompleteDialog(kind, result) {
  const isImages = kind === "images";
  const count = Number(result.count || 0);
  const targetPath = isImages ? result.outputDir || "" : result.outputFile || "";
  $("exportCompleteTitle").textContent = isImages ? "图片导出完成" : "PPTX 导出完成";
  $("exportCompleteSummary").textContent = isImages ? `已导出 ${count} 张图片` : `已导出 ${count} 页 PPTX`;
  $("exportCompletePath").textContent = targetPath;
  $("exportCompletePath").title = targetPath;
  $("exportCompleteDialog").hidden = false;
  $("exportCompleteCloseBtn").focus();
}

function hideExportCompleteDialog() {
  $("exportCompleteDialog").hidden = true;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setProgress(progress) {
  const track = $("progressTrack");
  const text = $("progressText");
  if (progress === null || Number.isNaN(progress)) {
    track.hidden = true;
    text.hidden = true;
    $("progressFill").style.width = "0%";
    return;
  }
  const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
  track.hidden = false;
  text.hidden = false;
  $("progressFill").style.width = `${percent}%`;
  text.textContent = `${percent}%`;
}

window.addEventListener("resize", updatePreview);
init();
