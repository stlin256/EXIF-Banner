const STORAGE_KEY = "pptExifBannerSettings.v3";
const APP_NAME = "EXIF-Banner";

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
  previewCacheBytes: 0,
  previewRequests: new Map(),
  previewCacheLimit: 512,
  previewCacheMaxBytes: 1024 * 1024 * 1024,
  previewWarmQueue: [],
  previewWarmQueued: new Set(),
  previewWarmActive: new Set(),
  previewWarmGeneration: 0,
  previewWarmRadius: 24,
  previewWarmConcurrency: 2,
  bannerLayoutSerial: 0,
  bannerLayoutCache: new Map(),
  bannerLayoutRequests: new Map(),
  bannerLayoutCacheLimit: 72,
  bannerEditTimer: 0,
  bannerUndoStack: [],
  bannerUndoLimit: 80,
  photoItems: new Map(),
  thumbObserver: null,
  activePhotoItem: null,
  saveTimer: 0,
  scrollFrame: 0,
  preloadTimer: 0,
  warmIdleTimer: 0,
  wheelDelta: 0,
  wheelStepTimer: 0,
  wheelIdleTimer: 0,
  wheelDirection: 0,
  lastMoveDirection: 1,
  lastNavigationAt: 0,
  lastSettingsChangeAt: 0,
  language: "zh",
  sortMode: "dateAsc",
  statusMessage: { key: "status.waitingScan", args: {} },
  exportDialog: null,
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
  bannerTextOverrides: {},
  shadow: true,
  quality: 92,
  exportFormat: "jpeg",
  exportScalePct: 100,
};

const RESETTABLE_BANNER_TEXT_FIELDS = ["model", "lens", "params"];

const translations = {
  zh: {
    "placeholder.albumFolder": "选择相册文件夹",
    "placeholder.logoPath": "留空则按相机品牌自动匹配",
    "placeholder.brandText": "留空则自动读取相机品牌",
    "button.pickAlbum": "选择相册",
    "button.scan": "扫描",
    "button.exportImages": "导出图片",
    "button.exportPptx": "导出 PPTX",
    "button.selectAll": "全选",
    "button.clear": "清空",
    "button.reset": "重置",
    "button.resetParamsText": "重置参数内容",
    "button.pickLogo": "选择 Logo",
    "button.done": "完成",
    "button.switchLanguage": "切换语言",
    "control.recursive": "递归",
    "control.shadow": "图片阴影",
    "edit.brand": "编辑品牌文字",
    "edit.model": "编辑相机型号",
    "edit.lens": "编辑镜头型号",
    "edit.params": "编辑拍摄参数",
    "panel.photos": "照片",
    "panel.banner": "横幅",
    "sort.dateAsc": "时间 ↑",
    "sort.dateDesc": "时间 ↓",
    "sort.nameAsc": "A-Z",
    "sort.nameDesc": "Z-A",
    "empty.preview": "选择相册后开始预览",
    "field.background": "背景色",
    "field.bannerColor": "横幅色",
    "field.logoPath": "Logo 路径",
    "field.brandText": "品牌文字",
    "field.paramsText": "参数内容",
    "field.aspectRatio": "底片比例",
    "field.exportFormat": "导出格式",
    "slider.bannerWidth": "横幅宽度",
    "slider.bannerHeight": "横幅高度",
    "slider.opacity": "透明度",
    "slider.marginX": "左右页边距",
    "slider.marginY": "上下页边距",
    "slider.gap": "间距",
    "slider.infoFont": "机身/镜头字号",
    "slider.paramFont": "参数字号",
    "slider.jpegQuality": "JPEG 质量",
    "slider.exportScale": "导出分辨率",
    "status.waitingScan": "等待扫描",
    "status.ready": "就绪",
    "status.folderSelected": "相册已选择，开始扫描",
    "status.logoSelected": "Logo 已选择",
    "status.loadingLastAlbum": "加载上次相册",
    "status.scanningPhotos": "扫描照片",
    "status.photoCount": "{count} 张照片",
    "status.lastAlbumUnavailable": "上次相册不可用",
    "status.error": "出错",
    "status.exportedImages": "已导出 {count} 张图片",
    "status.exportedPptx": "已导出 {count} 页 PPTX",
    "status.exporting": "导出中",
    "busy.processing": "处理中",
    "file.notSelected": "未选择",
    "error.requestFailed": "请求失败",
    "error.previewRenderFailed": "预览渲染失败",
    "error.exportFailed": "导出失败",
    "alert.selectPhotos": "请先勾选要导出的照片。",
    "toast.currentCameraBrand": "当前相机品牌",
    "toast.missingLogo": "未找到 {brand} 的内置 Logo，可手动选择 Logo。",
    "exif.none": "无 EXIF",
    "export.images": "导出图片",
    "export.pptx": "导出 PPTX",
    "dialog.exportComplete": "导出完成",
    "dialog.exportCompleteSummary": "已完成导出",
    "dialog.imagesComplete": "图片导出完成",
    "dialog.pptxComplete": "PPTX 导出完成",
    "dialog.saveLocation": "保存位置",
    "progress.prepareExport": "准备导出",
    "progress.exportComplete": "导出完成",
    "progress.exportFailed": "导出失败",
    "progress.exportingImages": "导出图片 {done}/{total}",
    "progress.renderingSlides": "渲染幻灯片 {done}/{total}",
    "progress.writingPptx": "写入 PPTX",
  },
  en: {
    "placeholder.albumFolder": "Select album folder",
    "placeholder.logoPath": "Leave empty to match the camera brand",
    "placeholder.brandText": "Leave empty to use the camera brand",
    "button.pickAlbum": "Choose Album",
    "button.scan": "Scan",
    "button.exportImages": "Export Images",
    "button.exportPptx": "Export PPTX",
    "button.selectAll": "Select All",
    "button.clear": "Clear",
    "button.reset": "Reset",
    "button.resetParamsText": "Reset Params",
    "button.pickLogo": "Choose Logo",
    "button.done": "Done",
    "button.switchLanguage": "Switch Language",
    "control.recursive": "Recursive",
    "control.shadow": "Image Shadow",
    "edit.brand": "Edit brand text",
    "edit.model": "Edit camera model",
    "edit.lens": "Edit lens model",
    "edit.params": "Edit exposure parameters",
    "panel.photos": "Photos",
    "panel.banner": "Banner",
    "sort.dateAsc": "Date ↑",
    "sort.dateDesc": "Date ↓",
    "sort.nameAsc": "A-Z",
    "sort.nameDesc": "Z-A",
    "empty.preview": "Choose an album to start previewing",
    "field.background": "Background",
    "field.bannerColor": "Banner Color",
    "field.logoPath": "Logo Path",
    "field.brandText": "Brand Text",
    "field.paramsText": "Params Text",
    "field.aspectRatio": "Canvas Ratio",
    "field.exportFormat": "Export Format",
    "slider.bannerWidth": "Banner Width",
    "slider.bannerHeight": "Banner Height",
    "slider.opacity": "Opacity",
    "slider.marginX": "Side Margin",
    "slider.marginY": "Top/Bottom Margin",
    "slider.gap": "Gap",
    "slider.infoFont": "Body/Lens Size",
    "slider.paramFont": "Params Size",
    "slider.jpegQuality": "JPEG Quality",
    "slider.exportScale": "Export Scale",
    "status.waitingScan": "Waiting to scan",
    "status.ready": "Ready",
    "status.folderSelected": "Album selected, scanning",
    "status.logoSelected": "Logo selected",
    "status.loadingLastAlbum": "Loading last album",
    "status.scanningPhotos": "Scanning photos",
    "status.photoCount": "{count} photos",
    "status.lastAlbumUnavailable": "Last album unavailable",
    "status.error": "Error",
    "status.exportedImages": "Exported {count} images",
    "status.exportedPptx": "Exported {count} PPTX slides",
    "status.exporting": "Exporting",
    "busy.processing": "Processing",
    "file.notSelected": "Not selected",
    "error.requestFailed": "Request failed",
    "error.previewRenderFailed": "Preview render failed",
    "error.exportFailed": "Export failed",
    "alert.selectPhotos": "Select photos to export first.",
    "toast.currentCameraBrand": "current camera brand",
    "toast.missingLogo": "No built-in logo was found for {brand}. You can choose one manually.",
    "exif.none": "No EXIF",
    "export.images": "Export Images",
    "export.pptx": "Export PPTX",
    "dialog.exportComplete": "Export Complete",
    "dialog.exportCompleteSummary": "Export finished",
    "dialog.imagesComplete": "Image Export Complete",
    "dialog.pptxComplete": "PPTX Export Complete",
    "dialog.saveLocation": "Save Location",
    "progress.prepareExport": "Preparing export",
    "progress.exportComplete": "Export complete",
    "progress.exportFailed": "Export failed",
    "progress.exportingImages": "Exporting images {done}/{total}",
    "progress.renderingSlides": "Rendering slides {done}/{total}",
    "progress.writingPptx": "Writing PPTX",
  },
};

const sortIconNames = {
  dateAsc: "calendar-arrow-up",
  dateDesc: "calendar-arrow-down",
  nameAsc: "arrow-up-a-z",
  nameDesc: "arrow-down-z-a",
};

const $ = (id) => document.getElementById(id);

function init() {
  const saved = loadSavedState();
  state.language = normalizeLanguage(saved.language || "zh");
  state.sortMode = normalizeSortMode(saved.sortMode);
  state.settings = { ...defaults, ...(saved.settings || {}) };
  configurePreviewCacheBudget();
  migrateLayoutSettings(saved.settings || {});
  loadLogoRules();
  if (saved.folder) {
    $("folderInput").value = saved.folder;
  }
  $("recursiveInput").checked = !!saved.recursive;
  setupLanguageControl();
  setupSortControl();
  $("pickFolderBtn").addEventListener("click", pickFolder);
  $("pickLogoBtn").addEventListener("click", pickLogo);
  $("scanBtn").addEventListener("click", scan);
  $("exportImagesBtn").addEventListener("click", () => exportAlbum("images"));
  $("exportPptxBtn").addEventListener("click", () => exportAlbum("pptx"));
  $("resetBtn").addEventListener("click", resetSettings);
  $("resetParamsTextBtn").addEventListener("click", resetParamsTextOverride);
  $("selectAllBtn").addEventListener("click", selectAllPhotos);
  $("clearSelectionBtn").addEventListener("click", clearPhotoSelection);
  $("exportCompleteCloseBtn").addEventListener("click", hideExportCompleteDialog);
  $("exportCompleteDialog").addEventListener("click", (event) => {
    if (event.target === $("exportCompleteDialog")) {
      hideExportCompleteDialog();
    }
  });
  setupBannerEditing();
  $("previewStage").addEventListener("wheel", handlePreviewWheel, { passive: false });
  document.addEventListener("keydown", handleKeyNavigation);

  for (const input of settingsInputs()) {
    const onSettingChange = () => {
      markPreviewSettingsChanged();
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
  applyI18n();
  if (saved.folder) {
    loadLastProject();
  } else {
    setIdle("status.waitingScan");
  }
}

function normalizeLanguage(language) {
  return language === "en" ? "en" : "zh";
}

function configurePreviewCacheBudget() {
  const mib = 1024 * 1024;
  const gib = 1024 * mib;
  const deviceMemory = Number(navigator.deviceMemory || 0);
  let budget = 512 * mib;
  if (deviceMemory >= 16) {
    budget = 2 * gib;
  } else if (deviceMemory >= 8) {
    budget = gib;
  } else if (deviceMemory >= 4) {
    budget = 512 * mib;
  } else if (deviceMemory >= 2) {
    budget = 384 * mib;
  }
  state.previewCacheMaxBytes = budget;
  state.previewCacheLimit = Math.max(256, Math.min(4096, Math.round(budget / (384 * 1024))));
}

function setupLanguageControl() {
  $("languageButton").addEventListener("click", toggleLanguage);
  setLocalIcon($("languageIcon"), "languages");
}

function toggleLanguage() {
  setLanguage(state.language === "zh" ? "en" : "zh");
}

function normalizeSortMode(sortMode) {
  return ["dateAsc", "dateDesc", "nameAsc", "nameDesc"].includes(sortMode) ? sortMode : "dateAsc";
}

function setupBannerEditing() {
  for (const field of bannerEditFields()) {
    field.addEventListener("focus", handleBannerEditFocus);
    field.addEventListener("input", handleBannerEditInput);
    field.addEventListener("compositionstart", handleBannerCompositionStart);
    field.addEventListener("compositionend", handleBannerCompositionEnd);
    field.addEventListener("blur", handleBannerEditBlur);
    field.addEventListener("keydown", handleBannerEditKeydown);
    field.addEventListener("paste", pastePlainText);
  }
}

function setupSortControl() {
  const control = $("sortControl");
  const button = $("sortButton");
  const menu = $("sortMenu");
  control.addEventListener("click", (event) => event.stopPropagation());
  button.addEventListener("click", toggleSortMenu);
  button.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSortMenu();
      menu.querySelector(".sortMenuItem.active")?.focus();
    }
  });
  menu.addEventListener("click", (event) => {
    const item = event.target.closest("[data-sort-mode]");
    if (item) {
      selectSortMode(item.dataset.sortMode).catch(showError);
    }
  });
  document.addEventListener("click", closeSortMenu);
  renderSortMenuIcons();
  setLocalIcon($("sortChevron"), "chevron-down");
  updateSortControl();
}

function toggleSortMenu() {
  if ($("sortMenu").hidden) {
    openSortMenu();
  } else {
    closeSortMenu();
  }
}

function openSortMenu() {
  $("sortMenu").hidden = false;
  $("sortButton").setAttribute("aria-expanded", "true");
}

function closeSortMenu() {
  $("sortMenu").hidden = true;
  $("sortButton").setAttribute("aria-expanded", "false");
}

function updateSortControl() {
  const mode = normalizeSortMode(state.sortMode);
  const labelKey = `sort.${mode}`;
  setLocalIcon($("sortIcon"), sortIconNames[mode] || sortIconNames.dateAsc);
  $("sortButton").dataset.i18nTitle = labelKey;
  $("sortButton").dataset.i18nAriaLabel = labelKey;
  $("sortButton").title = t(labelKey);
  $("sortButton").setAttribute("aria-label", t(labelKey));
  for (const item of document.querySelectorAll(".sortMenuItem")) {
    const active = item.dataset.sortMode === mode;
    item.classList.toggle("active", active);
    item.setAttribute("aria-checked", active ? "true" : "false");
  }
}

function renderSortMenuIcons() {
  for (const element of document.querySelectorAll("[data-sort-icon]")) {
    setLocalIcon(element, sortIconNames[element.dataset.sortIcon]);
  }
}

function setLocalIcon(element, name) {
  if (element && name && window.EXIFBannerIcons) {
    window.EXIFBannerIcons.replace(element, name);
  }
}

async function selectSortMode(sortMode) {
  const nextMode = normalizeSortMode(sortMode);
  closeSortMenu();
  if (nextMode === state.sortMode) {
    return;
  }
  state.sortMode = nextMode;
  updateSortControl();
  saveState();
  if ($("folderInput").value.trim()) {
    await scan();
  }
}

function setLanguage(language) {
  state.language = normalizeLanguage(language);
  applyI18n();
  saveState();
}

function t(key, values = {}) {
  const table = translations[state.language] || translations.zh;
  const fallback = translations.zh[key] || key;
  return (table[key] || fallback).replace(/\{(\w+)\}/g, (_, name) => {
    return values[name] === undefined || values[name] === null ? "" : String(values[name]);
  });
}

function hasTranslation(key) {
  return typeof key === "string" && !!(translations.zh[key] || translations.en[key]);
}

function messageDescriptor(message, args = {}) {
  if (message && typeof message === "object" && message.key) {
    return { key: message.key, args: message.args || {} };
  }
  if (message && typeof message === "object" && Object.prototype.hasOwnProperty.call(message, "text")) {
    return { text: String(message.text || "") };
  }
  if (hasTranslation(message)) {
    return { key: message, args };
  }
  return { text: String(message || "") };
}

function messageText(message) {
  return message?.key ? t(message.key, message.args || {}) : String(message?.text || "");
}

function applyI18n() {
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  }
  for (const element of document.querySelectorAll("[data-i18n-title]")) {
    element.title = t(element.dataset.i18nTitle);
  }
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }
  if (state.photos[state.current]) {
    updateMetaStrip(state.photos[state.current]);
    updateBannerEditLayer(state.photos[state.current]);
  } else {
    $("fileNameText").textContent = t("file.notSelected");
    $("fileNameText").title = "";
    $("captureDateText").textContent = "";
    $("captureDateText").title = "";
    $("bannerEditLayer").hidden = true;
  }
  updateParamsResetControl();
  updateSortControl();
  applyStatusMessage();
  renderExportCompleteDialog();
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
    throw new Error(data.error || t("error.requestFailed"));
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
    if (state.photos[state.current]) {
      updateBannerEditLayer(state.photos[state.current]);
    }
    maybePromptMissingLogo(state.photos[state.current]);
  }
}

async function pickFolder() {
  try {
    const data = await api("/api/pick-folder");
    if (data.folder) {
      $("folderInput").value = data.folder;
      saveState();
      setBusy("status.folderSelected");
      await nextFrame();
      await scan();
    } else {
      setIdle("status.ready");
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
      setIdle("status.logoSelected");
    } else {
      setIdle("status.ready");
    }
  } catch (error) {
    showError(error);
  }
}

async function loadLastProject() {
  setBusy("status.loadingLastAlbum");
  await nextFrame();
  await scan({ auto: true });
}

async function scan(options = {}) {
  const folder = $("folderInput").value.trim();
  if (!folder) {
    $("folderInput").focus();
    return;
  }
  setBusy("status.scanningPhotos");
  await nextFrame();
  try {
    const data = await api("/api/scan", {
      folder,
      recursive: $("recursiveInput").checked,
      sortMode: state.sortMode,
    });
    state.albumId = data.albumId;
    state.root = data.root;
    state.photos = data.photos;
    state.current = 0;
    state.exifSource = data.exifSource;
    state.bannerUndoStack = [];
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
    setIdle("status.photoCount", { count: state.photos.length });
  } catch (error) {
    if (options.auto) {
      setIdle("status.lastAlbumUnavailable");
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
    normalizeSortMode(saved.sortMode) === state.sortMode &&
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
  resetThumbObserver();
  state.thumbObserver = createThumbObserver(list);
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
    image.decoding = "async";
    image.alt = "";
    image.dataset.src = thumbUrl(photo.index);
    image.addEventListener("click", () => selectPhoto(photo.index));
    queueThumbImage(image);

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

function thumbUrl(index) {
  return `/api/photo?album=${encodeURIComponent(state.albumId)}&index=${index}&max=180`;
}

function createThumbObserver(root) {
  if (!("IntersectionObserver" in window)) {
    return null;
  }
  return new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        observer.unobserve(entry.target);
        loadThumbImage(entry.target);
      }
    },
    {
      root,
      rootMargin: "600px 0px",
      threshold: 0.01,
    }
  );
}

function queueThumbImage(image) {
  if (state.thumbObserver) {
    state.thumbObserver.observe(image);
  } else {
    loadThumbImage(image);
  }
}

function loadThumbImage(image) {
  const src = image.dataset.src;
  if (src && image.src !== src) {
    image.src = src;
  }
  delete image.dataset.src;
}

function resetThumbObserver() {
  if (state.thumbObserver) {
    state.thumbObserver.disconnect();
    state.thumbObserver = null;
  }
}

function selectPhoto(index) {
  if (!state.photos.length) {
    return;
  }
  const nextIndex = Math.max(0, Math.min(index, state.photos.length - 1));
  if (nextIndex !== state.current) {
    state.lastNavigationAt = performance.now();
  }
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
  if (event.key === "Escape" && !$("sortMenu").hidden) {
    event.preventDefault();
    closeSortMenu();
    $("sortButton").focus();
    return;
  }
  if (event.key === "Escape" && !$("exportCompleteDialog").hidden) {
    event.preventDefault();
    hideExportCompleteDialog();
    return;
  }
  if (isUndoShortcut(event) && shouldHandleBannerUndo(event.target)) {
    event.preventDefault();
    undoBannerTextEdit();
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

function isUndoShortcut(event) {
  return (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "z";
}

function shouldHandleBannerUndo(target) {
  if (!state.bannerUndoStack.length) {
    return false;
  }
  if (!target || !target.tagName) {
    return true;
  }
  if (target.isContentEditable) {
    return false;
  }
  return !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function isTypingTarget(target) {
  if (!target || !target.tagName) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
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
  state.bannerUndoStack = [];
  writeSettings();
  saveState();
  updatePreview();
}

function resetParamsTextOverride() {
  resetBannerTextOverrides(RESETTABLE_BANNER_TEXT_FIELDS);
}

function resetBannerTextOverrides(fields) {
  const photo = state.photos[state.current];
  if (!photo) {
    return false;
  }
  const key = photoOverrideKey(photo);
  const previousOverrides = cloneBannerOverrides(state.settings.bannerTextOverrides);
  const overrides = cloneBannerOverrides(state.settings.bannerTextOverrides);
  const photoOverrides = { ...(overrides[key] || {}) };
  let changed = false;

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(photoOverrides, field)) {
      delete photoOverrides[field];
      changed = true;
    }
  }

  if (!changed) {
    updateParamsResetControl();
    return false;
  }
  if (Object.keys(photoOverrides).length) {
    overrides[key] = photoOverrides;
  } else {
    delete overrides[key];
  }

  state.settings.bannerTextOverrides = overrides;
  pushBannerUndoSnapshot(previousOverrides);
  scheduleSaveState();
  updateParamsResetControl();
  clearPreviewCache();
  updatePreview();
  syncBannerEditTexts(photo, { forceActive: true });
  return true;
}

function updateParamsResetControl() {
  const button = $("resetParamsTextBtn");
  if (!button) {
    return;
  }
  button.disabled = !hasAnyBannerTextOverride(state.photos[state.current], RESETTABLE_BANNER_TEXT_FIELDS);
}

function hasAnyBannerTextOverride(photo, fields) {
  return fields.some((field) => hasBannerTextOverride(photo, field));
}

function hasBannerTextOverride(photo, field) {
  if (!photo || !field) {
    return false;
  }
  const overrides = state.settings?.bannerTextOverrides?.[photoOverrideKey(photo)];
  return !!overrides && Object.prototype.hasOwnProperty.call(overrides, field);
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
      sortMode: state.sortMode,
      current: state.current,
      selection: [...state.selected],
      photoFingerprint: photoFingerprint(state.photos),
      settings: state.settings,
      language: state.language,
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

  updateMetaStrip(photo);
  updateBannerEditLayer(photo);
  updateParamsResetControl();
  maybePromptMissingLogo(photo);
  scheduleServerPreview();
}

function updateBannerEditLayer(photo) {
  const layer = $("bannerEditLayer");
  if (!photo || !state.albumId) {
    layer.hidden = true;
    return;
  }

  const index = state.current;
  const key = previewCacheKey(index);
  const cached = state.bannerLayoutCache.get(key);
  if (cached) {
    applyBannerEditLayout(photo, cached);
    return;
  }

  const serial = ++state.bannerLayoutSerial;
  layer.hidden = true;
  fetchBannerEditLayout(index)
    .then((layout) => {
      if (serial !== state.bannerLayoutSerial || index !== state.current) {
        return;
      }
      applyBannerEditLayout(photo, layout);
    })
    .catch((error) => {
      console.error(error);
      if (serial === state.bannerLayoutSerial) {
        layer.hidden = true;
      }
    });
}

function applyBannerEditLayout(photo, layout) {
  const layer = $("bannerEditLayer");
  if (!layout?.fields) {
    layer.hidden = true;
    return;
  }

  layer.hidden = false;
  Object.assign(layer.style, {
    left: "0",
    top: "0",
    width: "100%",
    height: "100%",
  });

  const canvasHeight = $("slideCanvas").getBoundingClientRect().height || Number(layout.slideHeight || 0);
  const scaleY = canvasHeight / Math.max(1, Number(layout.slideHeight || 1));
  const texts = bannerTexts(photo);
  const defaultTexts = defaultBannerTexts(photo);
  const elements = bannerEditElements();

  for (const [name, element] of Object.entries(elements)) {
    const rect = layout.fields[name];
    element.hidden = !rect || !!rect.hidden;
    if (!rect || rect.hidden) {
      continue;
    }
    element.dataset.defaultValue = defaultTexts[name] || "";
    element.dataset.currentValue = texts[name] || "";
    element.setAttribute("aria-label", t(`edit.${name}`));
    element.title = t(`edit.${name}`);
    Object.assign(element.style, {
      left: `${rect.leftPct}%`,
      top: `${rect.topPct}%`,
      width: `${rect.widthPct}%`,
      height: `${rect.heightPct}%`,
      fontSize: `${Math.max(8, Number(rect.fontSize || 12) * scaleY)}px`,
      lineHeight: `${Math.max(1, Number(rect.lineHeight || rect.height || 1) * scaleY)}px`,
      textAlign: rect.align || "left",
    });
    if (document.activeElement !== element) {
      element.textContent = texts[name] || "";
    }
  }
}

function bannerEditElements() {
  return {
    brand: $("brandEditField"),
    model: $("modelEditField"),
    lens: $("lensEditField"),
    params: $("paramsEditField"),
  };
}

function syncBannerEditTexts(photo, options = {}) {
  if (!photo) {
    return;
  }
  const texts = bannerTexts(photo);
  const defaultTexts = defaultBannerTexts(photo);
  for (const [name, element] of Object.entries(bannerEditElements())) {
    if (!element) {
      continue;
    }
    element.dataset.defaultValue = defaultTexts[name] || "";
    element.dataset.currentValue = texts[name] || "";
    if (options.forceActive || document.activeElement !== element) {
      element.textContent = texts[name] || "";
    }
  }
}

async function fetchBannerEditLayout(index) {
  const key = previewCacheKey(index);
  const cached = state.bannerLayoutCache.get(key);
  if (cached) {
    cached.used = performance.now();
    return cached;
  }
  const existing = state.bannerLayoutRequests.get(key);
  if (existing) {
    return existing;
  }
  const request = api("/api/banner-layout", {
    albumId: state.albumId,
    index,
    settings: state.settings,
  })
    .then((layout) => {
      rememberBannerLayout(key, layout);
      return layout;
    })
    .finally(() => {
      state.bannerLayoutRequests.delete(key);
    });
  state.bannerLayoutRequests.set(key, request);
  return request;
}

function rememberBannerLayout(key, layout) {
  state.bannerLayoutCache.set(key, { ...layout, used: performance.now() });
  while (state.bannerLayoutCache.size > state.bannerLayoutCacheLimit) {
    let oldestKey = "";
    let oldestUsed = Infinity;
    for (const [entryKey, entry] of state.bannerLayoutCache) {
      if (entry.used < oldestUsed) {
        oldestKey = entryKey;
        oldestUsed = entry.used;
      }
    }
    if (!oldestKey) {
      return;
    }
    state.bannerLayoutCache.delete(oldestKey);
  }
}

function bannerEditFields() {
  return [
    $("brandEditField"),
    $("modelEditField"),
    $("lensEditField"),
    $("paramsEditField"),
  ].filter(Boolean);
}

function handleBannerEditFocus(event) {
  const field = event.currentTarget;
  field.textContent = field.dataset.currentValue || "";
  field.dataset.editStartValue = field.dataset.currentValue || "";
  field.dataset.editStartOverrides = serializeBannerOverrides(state.settings.bannerTextOverrides);
  selectEditableText(field);
}

function handleBannerCompositionStart(event) {
  const field = event.currentTarget;
  field.dataset.composing = "true";
  window.clearTimeout(state.bannerEditTimer);
  state.bannerEditTimer = 0;
}

function handleBannerCompositionEnd(event) {
  const field = event.currentTarget;
  delete field.dataset.composing;
  handleBannerEditInput(event);
}

function handleBannerEditInput(event) {
  const field = event.currentTarget;
  if (field.dataset.composing === "true") {
    return;
  }
  window.clearTimeout(state.bannerEditTimer);
  state.bannerEditTimer = window.setTimeout(() => {
    state.bannerEditTimer = 0;
    const changed = commitBannerTextEdit(field.dataset.bannerField, field.textContent, {
      refreshLayout: false,
      recordUndo: false,
    });
    if (changed) {
      field.dataset.liveCommitted = "true";
      field.dataset.currentValue = normalizeBannerEditValue(field.textContent);
    }
  }, 320);
}

function handleBannerEditBlur(event) {
  const field = event.currentTarget;
  window.clearTimeout(state.bannerEditTimer);
  state.bannerEditTimer = 0;
  if (field.dataset.skipCommit === "true") {
    const restored = field.dataset.editStartValue || "";
    delete field.dataset.skipCommit;
    if (field.dataset.liveCommitted === "true") {
      commitBannerTextEdit(field.dataset.bannerField, restored, {
        forceRefresh: true,
        recordUndo: false,
        refreshLayout: true,
      });
    }
    delete field.dataset.liveCommitted;
    delete field.dataset.editStartValue;
    delete field.dataset.editStartOverrides;
    delete field.dataset.composing;
    field.textContent = restored;
    return;
  }
  commitBannerTextEdit(field.dataset.bannerField, field.textContent, {
    forceRefresh: field.dataset.liveCommitted === "true",
    recordUndo: false,
    refreshLayout: true,
  });
  recordBannerEditSessionUndo(field);
  delete field.dataset.liveCommitted;
  delete field.dataset.editStartValue;
  delete field.dataset.editStartOverrides;
  delete field.dataset.composing;
}

function handleBannerEditKeydown(event) {
  if (isUndoShortcut(event)) {
    const field = event.currentTarget;
    const current = normalizeBannerEditValue(field.textContent);
    const committed = normalizeBannerEditValue(field.dataset.currentValue || "");
    if (current === committed && state.bannerUndoStack.length) {
      event.preventDefault();
      undoBannerTextEdit();
    }
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.currentTarget.dataset.skipCommit = "true";
    event.currentTarget.blur();
  }
}

function pastePlainText(event) {
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") || "";
  document.execCommand("insertText", false, text.replace(/[\r\n]+/g, " "));
}

function selectEditableText(element) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

function commitBannerTextEdit(field, value, options = {}) {
  const photo = state.photos[state.current];
  if (!photo || !field) {
    return false;
  }
  const normalized = normalizeBannerEditValue(value);
  const defaultsForPhoto = defaultBannerTexts(photo);
  const key = photoOverrideKey(photo);
  const previousOverrides = cloneBannerOverrides(state.settings.bannerTextOverrides);
  const overrides = { ...(state.settings.bannerTextOverrides || {}) };
  const photoOverrides = { ...(overrides[key] || {}) };
  const previous = photoOverrides[field] || "";
  if (!normalized || normalized === defaultsForPhoto[field]) {
    delete photoOverrides[field];
  } else {
    photoOverrides[field] = normalized;
  }
  if (Object.keys(photoOverrides).length) {
    overrides[key] = photoOverrides;
  } else {
    delete overrides[key];
  }
  const next = photoOverrides[field] || "";
  const changed = previous !== next;
  if (!changed && !options.forceRefresh) {
    return false;
  }
  if (changed && options.recordUndo !== false) {
    pushBannerUndoSnapshot(previousOverrides);
  }
  state.settings.bannerTextOverrides = overrides;
  scheduleSaveState();
  updateParamsResetControl();
  if (options.refreshLayout === false) {
    clearPreviewImages();
    scheduleServerPreview();
  } else {
    clearPreviewCache();
    updatePreview();
  }
  return true;
}

function normalizeBannerEditValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function recordBannerEditSessionUndo(field) {
  const start = parseBannerOverrides(field.dataset.editStartOverrides);
  const current = state.settings.bannerTextOverrides || {};
  if (!sameBannerOverrides(start, current)) {
    pushBannerUndoSnapshot(start);
  }
}

function undoBannerTextEdit() {
  const snapshot = state.bannerUndoStack.pop();
  if (!snapshot) {
    return false;
  }
  window.clearTimeout(state.bannerEditTimer);
  state.bannerEditTimer = 0;
  state.settings.bannerTextOverrides = cloneBannerOverrides(snapshot);
  scheduleSaveState();
  updateParamsResetControl();
  clearPreviewCache();
  updatePreview();
  if (state.photos[state.current]) {
    syncBannerEditTexts(state.photos[state.current], { forceActive: true });
  }
  return true;
}

function pushBannerUndoSnapshot(snapshot) {
  const normalized = cloneBannerOverrides(snapshot);
  const previous = state.bannerUndoStack[state.bannerUndoStack.length - 1];
  if (previous && sameBannerOverrides(previous, normalized)) {
    return;
  }
  state.bannerUndoStack.push(normalized);
  while (state.bannerUndoStack.length > state.bannerUndoLimit) {
    state.bannerUndoStack.shift();
  }
}

function serializeBannerOverrides(overrides) {
  return JSON.stringify(cloneBannerOverrides(overrides));
}

function parseBannerOverrides(value) {
  try {
    return cloneBannerOverrides(JSON.parse(value || "{}"));
  } catch {
    return {};
  }
}

function cloneBannerOverrides(overrides) {
  return JSON.parse(JSON.stringify(overrides || {}));
}

function sameBannerOverrides(left, right) {
  return serializeBannerOverrides(left) === serializeBannerOverrides(right);
}

function photoOverrideKey(photo) {
  return photo?.path || `${photo?.name || ""}:${photo?.size || ""}`;
}

function bannerTexts(photo) {
  const base = defaultBannerTexts(photo);
  const overrides = state.settings.bannerTextOverrides?.[photoOverrideKey(photo)] || {};
  return { ...base, ...overrides };
}

function defaultBannerTexts(photo) {
  const exif = photo?.exif || {};
  return {
    brand: state.settings.brandText || inferBrand(exif),
    model: exif.model || "Unknown camera",
    lens: exif.lens || "Unknown lens",
    params: formatParamsText(exif),
  };
}

function updateMetaStrip(photo) {
  const fileName = photo?.name || t("file.notSelected");
  const captureDate = formatCaptureDate(photo?.exif?.dateTime);
  $("fileNameText").textContent = fileName;
  $("fileNameText").title = photo?.name || "";
  $("captureDateText").textContent = captureDate;
  $("captureDateText").title = captureDate;
}

function formatCaptureDate(value) {
  const parts = parseCaptureDate(value);
  if (!parts) {
    return "";
  }
  if (state.language === "en") {
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  }
  return `${parts.year}年${parts.month}月${parts.day}日${parts.hour}时${parts.minute}分`;
}

function parseCaptureDate(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})[:-](\d{2})[:-](\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) {
    return null;
  }
  return {
    year: match[1],
    month: match[2],
    day: match[3],
    hour: match[4] || "00",
    minute: match[5] || "00",
  };
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

function markPreviewSettingsChanged() {
  state.lastSettingsChangeAt = performance.now();
  state.previewWarmGeneration += 1;
  state.previewWarmQueue = [];
  state.previewWarmQueued.clear();
  window.clearTimeout(state.preloadTimer);
  window.clearTimeout(state.warmIdleTimer);
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
        throw new Error(t("error.previewRenderFailed"));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      rememberPreview(key, url, blob.size || 0);
      return url;
    })
    .finally(() => {
      state.previewRequests.delete(key);
    });
  state.previewRequests.set(key, request);
  return request;
}

function rememberPreview(key, url, bytes = 0) {
  const existing = state.previewCache.get(key);
  if (existing) {
    URL.revokeObjectURL(existing.url);
    state.previewCacheBytes -= existing.bytes || 0;
  }
  state.previewCache.set(key, { url, used: performance.now(), bytes });
  state.previewCacheBytes += bytes;
  trimPreviewCache();
}

function trimPreviewCache() {
  const byteLimit = previewCacheByteLimit();
  while (
    state.previewCache.size > 1 &&
    (state.previewCache.size > state.previewCacheLimit || state.previewCacheBytes > byteLimit)
  ) {
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
      state.previewCacheBytes -= removed.bytes || 0;
    }
    state.previewCache.delete(oldestKey);
  }
}

function previewCacheByteLimit() {
  const fallback = state.previewCacheMaxBytes || 512 * 1024 * 1024;
  const memory = performance?.memory;
  if (!memory?.jsHeapSizeLimit || !memory?.usedJSHeapSize) {
    return fallback;
  }
  const usageRatio = memory.usedJSHeapSize / Math.max(1, memory.jsHeapSizeLimit);
  if (usageRatio > 0.85) {
    return Math.max(128 * 1024 * 1024, Math.floor(state.previewCacheBytes * 0.5));
  }
  if (usageRatio > 0.72) {
    return Math.max(192 * 1024 * 1024, Math.floor(state.previewCacheBytes * 0.75));
  }
  return fallback;
}

function schedulePreviewWarmup(index, delay = 40, options = {}) {
  window.clearTimeout(state.preloadTimer);
  const generation = ++state.previewWarmGeneration;
  const compact = !options.full && shouldUseCompactWarmup();
  const radius = compact ? 6 : state.previewWarmRadius;
  const effectiveDelay = compact ? Math.max(delay, 220) : delay;
  state.previewWarmQueue = [];
  state.previewWarmQueued.clear();
  state.previewWarmActive.clear();
  state.preloadTimer = window.setTimeout(() => {
    if (generation !== state.previewWarmGeneration) {
      return;
    }
    for (const nextIndex of previewWarmOrder(index, radius)) {
      const key = previewCacheKey(nextIndex);
      if (!state.previewCache.has(key) && !state.previewRequests.has(key) && !state.previewWarmQueued.has(key)) {
        state.previewWarmQueue.push({ index: nextIndex, key, generation });
        state.previewWarmQueued.add(key);
      }
    }
    pumpPreviewWarmQueue();
    scheduleFullWarmupAfterIdle(index, generation, compact);
  }, effectiveDelay);
}

function shouldUseCompactWarmup() {
  const now = performance.now();
  return now - state.lastNavigationAt < 500 || now - state.lastSettingsChangeAt < 700;
}

function scheduleFullWarmupAfterIdle(index, generation, compact) {
  window.clearTimeout(state.warmIdleTimer);
  if (!compact) {
    return;
  }
  state.warmIdleTimer = window.setTimeout(() => {
    if (generation === state.previewWarmGeneration && index === state.current) {
      schedulePreviewWarmup(index, 0, { full: true });
    }
  }, 900);
}

function previewWarmOrder(index, radius = state.previewWarmRadius) {
  const order = [];
  const primary = state.lastMoveDirection >= 0 ? 1 : -1;
  const secondary = -primary;
  for (let distance = 1; distance <= radius; distance += 1) {
    const nextIndex = index + primary * distance;
    if (nextIndex >= 0 && nextIndex < state.photos.length) {
      order.push(nextIndex);
    }
  }
  for (let distance = 1; distance <= Math.ceil(radius / 2); distance += 1) {
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

function clearPreviewImages() {
  window.clearTimeout(state.previewTimer);
  window.clearTimeout(state.preloadTimer);
  window.clearTimeout(state.warmIdleTimer);
  state.previewSerial += 1;
  state.previewWarmGeneration += 1;
  state.previewWarmQueue = [];
  state.previewWarmQueued.clear();
  state.previewWarmActive.clear();
  for (const entry of state.previewCache.values()) {
    URL.revokeObjectURL(entry.url);
  }
  state.previewCache.clear();
  state.previewCacheBytes = 0;
  state.previewRequests.clear();
}

function clearPreviewCache() {
  clearPreviewImages();
  state.bannerLayoutSerial += 1;
  state.bannerLayoutCache.clear();
  state.bannerLayoutRequests.clear();
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
  const label = brand && brand !== "CAMERA" ? brand : t("toast.currentCameraBrand");
  showToast(t("toast.missingLogo", { brand: label }));
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
  const text = formatParamsText(exif);
  return escapeHtml(text).replace(/ {4}/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
}

function formatParamsText(exif) {
  const values = [];
  if (exif.focalLength) values.push(exif.focalLength);
  if (exif.fNumber) values.push(`F${exif.fNumber}`);
  if (exif.exposureTime) values.push(`${exif.exposureTime}s`);
  if (exif.iso) values.push(`ISO ${exif.iso}`);
  return values.length ? values.join("    ") : t("exif.none");
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
    showWarning(t("alert.selectPhotos"));
    return;
  }

  readSettings();
  const labelKey = kind === "images" ? "export.images" : "export.pptx";
  try {
    const picked = await api("/api/pick-output-dir");
    if (!picked.folder) {
      setIdle("status.ready");
      return;
    }

    setBusy(labelKey, 0);
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
    setBusy(localizeJobMessage(job.message) || "status.exporting", Number(job.progress || 0));
    if (job.status === "done") {
      const result = job.result || {};
      if (kind === "images") {
        setIdle("status.exportedImages", { count: result.count || 0 });
      } else {
        setIdle("status.exportedPptx", { count: result.count || 0 });
      }
      showExportCompleteDialog(kind, result);
      return;
    }
    if (job.status === "error") {
      throw new Error(job.error || t("error.exportFailed"));
    }
  }
}

function localizeJobMessage(message) {
  const text = String(message || "").trim();
  const exact = {
    "准备导出": "progress.prepareExport",
    "导出完成": "progress.exportComplete",
    "导出失败": "progress.exportFailed",
    "写入 PPTX": "progress.writingPptx",
  };
  if (exact[text]) {
    return { key: exact[text], args: {} };
  }
  let match = text.match(/^导出图片\s+(\d+)\/(\d+)$/);
  if (match) {
    return { key: "progress.exportingImages", args: { done: match[1], total: match[2] } };
  }
  match = text.match(/^渲染幻灯片\s+(\d+)\/(\d+)$/);
  if (match) {
    return { key: "progress.renderingSlides", args: { done: match[1], total: match[2] } };
  }
  return text ? { text } : null;
}

function setBusy(message, progress = null, args = {}) {
  state.statusMessage = messageDescriptor(message, args);
  document.body.classList.add("busy");
  applyStatusMessage();
  setProgress(progress);
}

function setIdle(message = "status.ready", args = {}) {
  state.statusMessage = messageDescriptor(message, args);
  document.body.classList.remove("busy");
  applyStatusMessage();
  setProgress(null);
}

function applyStatusMessage() {
  const text = messageText(state.statusMessage);
  $("statusText").textContent = text;
  $("busyText").textContent = document.body.classList.contains("busy") ? text : t("busy.processing");
}

function showError(error) {
  setIdle("status.error");
  const message = error.message || String(error);
  showNativeMessage("error", t("status.error"), message)
    .then((shown) => {
      if (!shown) {
        alert(message);
      }
    });
}

function showExportCompleteDialog(kind, result) {
  if (hasNativeDialogApi()) {
    const { title, message } = exportCompleteMessage(kind, result);
    showNativeMessage("info", title, message).then((shown) => {
      if (!shown) {
        showExportCompleteOverlay(kind, result);
      }
    });
    return;
  }
  showExportCompleteOverlay(kind, result);
}

function showWarning(message) {
  showNativeMessage("warning", APP_NAME, message)
    .then((shown) => {
      if (!shown) {
        alert(message);
      }
    });
}

function showExportCompleteOverlay(kind, result) {
  state.exportDialog = { kind, result };
  renderExportCompleteDialog();
  $("exportCompleteDialog").hidden = false;
  $("exportCompleteCloseBtn").focus();
}

function exportCompleteMessage(kind, result) {
  const isImages = kind === "images";
  const count = Number(result.count || 0);
  const targetPath = isImages ? result.outputDir || "" : result.outputFile || "";
  const title = isImages ? t("dialog.imagesComplete") : t("dialog.pptxComplete");
  const summary = isImages
    ? t("status.exportedImages", { count })
    : t("status.exportedPptx", { count });
  const message = targetPath
    ? `${summary}\n\n${t("dialog.saveLocation")}:\n${targetPath}`
    : summary;
  return { title, message, targetPath, summary };
}

function renderExportCompleteDialog() {
  if (!state.exportDialog) {
    return;
  }
  const { kind, result } = state.exportDialog;
  const { title, summary, targetPath } = exportCompleteMessage(kind, result);
  $("exportCompleteTitle").textContent = title;
  $("exportCompleteSummary").textContent = summary;
  $("exportCompletePath").textContent = targetPath;
  $("exportCompletePath").title = targetPath;
}

function hideExportCompleteDialog() {
  $("exportCompleteDialog").hidden = true;
  state.exportDialog = null;
}

function hasNativeDialogApi() {
  return !!window.pywebview?.api?.show_message;
}

async function showNativeMessage(kind, title, message) {
  if (!hasNativeDialogApi()) {
    return false;
  }
  try {
    await window.pywebview.api.show_message(kind, title, message);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
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
