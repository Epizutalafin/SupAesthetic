/* =========================
   Constants
   ========================= */
const EXPORT_W = 832;
const EXPORT_H = 1472;

const PREVIEW_MAX_SCALE = 0.62;
const PNG_RENDER_SCALE = 2;

const CENTER_MIN_FREE = 140;
const CENTER_MAX_SHIFT = 260;

/* =========================
   Palette choices
   ========================= */
const NAME_CHOICES = [
  { id: "neutral", label: "Neutral", value: "rgba(10,12,14,.82)" },
  { id: "dark_silver", label: "Dark silver", value: "#6f7782" },
  { id: "dark_blue", label: "Dark blue", value: "#003366" },
  { id: "teal", label: "Teal", value: "#008080" },
  { id: "dark_green", label: "Dark green", value: "#006400" },
  { id: "dark_indigo", label: "Dark indigo", value: "#4B0082" },
  { id: "gold_muted", label: "Gold muted", value: "#B8860B" },
  { id: "brown", label: "Brown", value: "#6B4E3D" },
  { id: "dark_red", label: "Dark red", value: "#8B0000" },
  { id: "crimson_rose", label: "Crimson rose", value: "#C2185B" },
  { id: "dusty_rose", label: "Dusty Rose", value: "#A65D6E" },
  { id: "ivory", label: "Ivory", value: "#8A7F6A" },
];

const BUBBLE_CHOICES = [
  {
    id: "light",
    label: "Clair",
    bg: "rgba(255,255,255,.62)",
    text: "rgba(10,12,14,.92)",
    border: "rgba(255,255,255,.55)",
    chip: "rgba(255,255,255,.62)",
  },
  {
    id: "dark",
    label: "Sombre",
    bg: "rgba(12,14,18,.72)",
    text: "rgba(255,255,255,.92)",
    border: "rgba(255,255,255,.14)",
    chip: "rgba(12,14,18,.72)",
  },
  {
    id: "aqua",
    label: "Eau",
    bg: "rgba(140,210,200,.08)",
    text: "rgba(10,12,14,.92)",
    border: "rgba(255,255,255,.55)",
    chip: "rgba(140,210,200,.22)",
  },
  {
    id: "rose",
    label: "Rose",
    bg: "rgba(235,170,190,.08)",
    text: "rgba(10,12,14,.92)",
    border: "rgba(255,255,255,.55)",
    chip: "rgba(235,170,190,.22)",
  },
];

/* =========================
   LocalStorage keys
   ========================= */
const LS_THEME = "supAesthetic_theme";
const LS_THEME_COLOR = "supAesthetic_themeColor";

const LS_NAME_SUPA = "supAesthetic_nameColor_supa";
const LS_NAME_ME = "supAesthetic_nameColor_me";

const LS_BUBBLE_SUPA = "supAesthetic_bubbleStyle_supa";
const LS_BUBBLE_ME = "supAesthetic_bubbleStyle_me";

/* =========================
   Elements
   ========================= */
const els = {
  input: document.getElementById("inputText"),
  pages: document.getElementById("pages"),
  pageCount: document.getElementById("pageCount"),

  startsAI: document.getElementById("startsAI"),
  supaName: document.getElementById("supaName"),

  supaColorBtn: document.getElementById("supaColorBtn"),
  meColorBtn: document.getElementById("meColorBtn"),

  supaBubbleBtn: document.getElementById("supaBubbleBtn"),
  meBubbleBtn: document.getElementById("meBubbleBtn"),

  btnGenerate: document.getElementById("btnGenerate"),
  btnExport: document.getElementById("btnExport"),

  exportPanel: document.getElementById("exportPanel"),
  exportLinks: document.getElementById("exportLinks"),
  exportClose: document.getElementById("exportClose"),

  themeColor: document.getElementById("themeColor"), // hidden input[type=color]
};

const root = document.documentElement;
let activePaletteEl = null;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const isMobileLike = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/* =========================
   Helpers — theme color 🌈
   ========================= */
function normalizeHex(hex) {
  const s = (hex || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  return "#f7f1e3";
}

function getSavedThemeColor() {
  try { return normalizeHex(localStorage.getItem(LS_THEME_COLOR) || "#f7f1e3"); }
  catch { return "#f7f1e3"; }
}

function setSavedThemeColor(hex) {
  const c = normalizeHex(hex);
  try { localStorage.setItem(LS_THEME_COLOR, c); } catch {}
  return c;
}

function clearSolidThemeOverrides() {
  root.style.removeProperty("--paperA");
  root.style.removeProperty("--paperB");
  root.style.removeProperty("--theme-img");
  root.style.removeProperty("--theme-img-opacity");
  root.style.removeProperty("--theme-img-blend");
}

function applySolidThemeColor(hex) {
  const c = normalizeHex(hex);
  root.style.setProperty("--paperA", c);
  root.style.setProperty("--paperB", c);
  root.style.setProperty("--theme-img", "none");
  root.style.setProperty("--theme-img-opacity", "0");
  root.style.setProperty("--theme-img-blend", "normal");

  if (els.themeColor) els.themeColor.value = c;
}

/* =========================
   Page size/scale
   ========================= */
function setPageSizeCSSVars() {
  root.style.setProperty("--page-w", `${EXPORT_W}px`);
  root.style.setProperty("--page-h", `${EXPORT_H}px`);
}

function updatePageScale() {
  const shell = document.querySelector(".shell");
  const available = Math.max(280, (shell?.clientWidth || window.innerWidth) - 24);
  const scale = Math.min(PREVIEW_MAX_SCALE, available / EXPORT_W);
  root.style.setProperty("--page-scale", String(scale));
}

/* =========================
   Theme (emoji pills)
   ========================= */
function setActiveThemePill(themeId) {
  const pills = document.querySelectorAll(".pill[data-theme]");
  pills.forEach((p) => {
    const on = p.dataset.theme === themeId;
    p.classList.toggle("isActive", on);
    p.setAttribute("aria-checked", on ? "true" : "false");
  });
}

function applyTheme(themeId) {
  const t = (themeId || "color").trim() || "color";
  root.dataset.theme = t;

  try { localStorage.setItem(LS_THEME, t); } catch {}

  // reset overrides when leaving the solid-color theme
  if (t !== "color") clearSolidThemeOverrides();

  // restore saved color when entering the solid-color theme
  if (t === "color") applySolidThemeColor(getSavedThemeColor());
}

function initTheme() {
  let saved = "color";
  try { saved = (localStorage.getItem(LS_THEME) || "color").trim() || "color"; } catch {}

  applyTheme(saved);
  setActiveThemePill(saved);

  const pills = document.querySelectorAll(".pill[data-theme]");
  pills.forEach((p) => {
    p.addEventListener("click", () => {
      const t = (p.dataset.theme || "color").trim() || "color";
      applyTheme(t);
      setActiveThemePill(t);

      if (t === "color") els.themeColor?.click();
    });
  });

  // picker => save + apply
  els.themeColor?.addEventListener("input", () => {
    const c = setSavedThemeColor(els.themeColor.value);
    applySolidThemeColor(c);
  });

  // keep picker in sync even if user clicks 🌈 repeatedly
  if (els.themeColor) els.themeColor.value = getSavedThemeColor();
}

/* =========================
   Name styles
   ========================= */
function setNameStyle(which, choice) {
  const col = choice?.value || "rgba(10,12,14,.82)";
  root.style.setProperty(`--name-color-${which}`, col);

  const btn = which === "supa" ? els.supaColorBtn : els.meColorBtn;
  if (btn) btn.style.background = col;

  try {
    localStorage.setItem(which === "supa" ? LS_NAME_SUPA : LS_NAME_ME, col);
  } catch {}
}

function currentNameKey(which) {
  const col = getComputedStyle(root).getPropertyValue(`--name-color-${which}`).trim();
  return col.replace(/\s+/g, "");
}

function initNameStyles() {
  const applyFromStorage = (which, key) => {
    let saved = "";
    try { saved = localStorage.getItem(key) || ""; } catch {}

    const cleaned = (saved || "").trim().replace(/\s+/g, "");
    if (!cleaned) return setNameStyle(which, NAME_CHOICES[0]);

    const match = NAME_CHOICES.find((c) => (c.value || "").replace(/\s+/g, "") === cleaned);
    if (match) return setNameStyle(which, match);

    setNameStyle(which, { value: saved });
  };

  applyFromStorage("supa", LS_NAME_SUPA);
  applyFromStorage("me", LS_NAME_ME);
}

/* =========================
   Bubble styles per speaker
   ========================= */
function setBubbleStyle(which, choice) {
  const pick = choice || BUBBLE_CHOICES[0];

  root.style.setProperty(`--bubble-bg-${which}`, pick.bg);
  root.style.setProperty(`--bubble-text-${which}`, pick.text);
  root.style.setProperty(`--bubble-border-${which}`, pick.border);

  const btn = which === "supa" ? els.supaBubbleBtn : els.meBubbleBtn;
  if (btn) {
    btn.style.background = pick.chip || pick.bg;
    btn.style.borderColor = "rgba(255,255,255,.25)";
  }

  try {
    localStorage.setItem(which === "supa" ? LS_BUBBLE_SUPA : LS_BUBBLE_ME, pick.id);
  } catch {}
}

function initBubbleStyles() {
  const load = (which, key) => {
    let saved = "light";
    try { saved = localStorage.getItem(key) || "light"; } catch {}
    const match = BUBBLE_CHOICES.find((x) => x.id === saved) || BUBBLE_CHOICES[0];
    setBubbleStyle(which, match);
  };

  load("supa", LS_BUBBLE_SUPA);
  load("me", LS_BUBBLE_ME);
}

/* =========================
   Palette system (shared)
   ========================= */
function closePalette() {
  if (!activePaletteEl) return;
  try { activePaletteEl.remove(); } catch {}
  activePaletteEl = null;
}

function positionPalette(pal, anchorBtn) {
  const rect = anchorBtn.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 8;
  const left = Math.min(window.innerWidth - 20 - 140, rect.left + window.scrollX - 110);
  pal.style.top = `${top}px`;
  pal.style.left = `${Math.max(12, left)}px`;
}

function openChoicePalette({ anchorBtn, which, choices, ariaLabel, onPick, isActiveKey }) {
  if (!anchorBtn) return;
  closePalette();

  const pal = document.createElement("div");
  pal.className = "palette";
  pal.setAttribute("role", "dialog");
  pal.setAttribute("aria-label", ariaLabel);
  positionPalette(pal, anchorBtn);

  const currentKey = isActiveKey?.(which) || "";

  choices.forEach((c) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "swatch";
    sw.title = c.label;

    const key = (c.value || c.id || "").toString().replace(/\s+/g, "");
    if (c.value) sw.style.background = c.value;
    else sw.style.background = c.chip || c.bg;

    if (key && key === currentKey) sw.classList.add("isActive");

    sw.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onPick(which, c);
      closePalette();
    });

    pal.appendChild(sw);
  });

  document.body.appendChild(pal);
  activePaletteEl = pal;
}

function initPalettes() {
  const open = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  els.supaColorBtn?.addEventListener(
    "pointerdown",
    open(() =>
      openChoicePalette({
        anchorBtn: els.supaColorBtn,
        which: "supa",
        choices: NAME_CHOICES,
        ariaLabel: "Palette de couleurs (nom)",
        onPick: (which, c) => setNameStyle(which, c),
        isActiveKey: (which) => currentNameKey(which),
      })
    )
  );

  els.meColorBtn?.addEventListener(
    "pointerdown",
    open(() =>
      openChoicePalette({
        anchorBtn: els.meColorBtn,
        which: "me",
        choices: NAME_CHOICES,
        ariaLabel: "Palette de couleurs (nom)",
        onPick: (which, c) => setNameStyle(which, c),
        isActiveKey: (which) => currentNameKey(which),
      })
    )
  );

  els.supaBubbleBtn?.addEventListener(
    "pointerdown",
    open(() =>
      openChoicePalette({
        anchorBtn: els.supaBubbleBtn,
        which: "supa",
        choices: BUBBLE_CHOICES,
        ariaLabel: "Palette bulles",
        onPick: (which, c) => setBubbleStyle(which, c),
        isActiveKey: (which) => {
          try { return (localStorage.getItem(which === "supa" ? LS_BUBBLE_SUPA : LS_BUBBLE_ME) || "light").trim(); }
          catch { return "light"; }
        },
      })
    )
  );

  els.meBubbleBtn?.addEventListener(
    "pointerdown",
    open(() =>
      openChoicePalette({
        anchorBtn: els.meBubbleBtn,
        which: "me",
        choices: BUBBLE_CHOICES,
        ariaLabel: "Palette bulles",
        onPick: (which, c) => setBubbleStyle(which, c),
        isActiveKey: (which) => {
          try { return (localStorage.getItem(which === "supa" ? LS_BUBBLE_SUPA : LS_BUBBLE_ME) || "light").trim(); }
          catch { return "light"; }
        },
      })
    )
  );

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!activePaletteEl) return;
      const t = e.target;

      const isBtn =
        t === els.supaColorBtn ||
        t === els.meColorBtn ||
        t === els.supaBubbleBtn ||
        t === els.meBubbleBtn;

      if (!activePaletteEl.contains(t) && !isBtn) closePalette();
    },
    { capture: true }
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePalette();
  });
}

/* =========================
   Text helpers
   ========================= */
function escapeHTML(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlToLightMarkdown(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const out = [];

  const walk = (node) => {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      out.push(node.nodeValue || "");
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();

    if (tag === "br") { out.push("\n"); return; }

    if (tag === "strong" || tag === "b") {
      out.push("**"); [...node.childNodes].forEach(walk); out.push("**"); return;
    }

    if (tag === "em" || tag === "i") {
      out.push("*"); [...node.childNodes].forEach(walk); out.push("*"); return;
    }

    if (["p", "div", "section", "article"].includes(tag)) {
      [...node.childNodes].forEach(walk);
      out.push("\n\n");
      return;
    }

    [...node.childNodes].forEach(walk);
  };

  [...doc.body.childNodes].forEach(walk);

  return out
    .join("")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderLightMarkdown(text) {
  let s = escapeHTML(text || "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/\n/g, "<br>");
  return s;
}

els.input?.addEventListener("paste", (e) => {
  const html = e.clipboardData?.getData("text/html") || "";
  if (!html || !/<(em|i|strong|b|span|p|div|br)\b/i.test(html)) return;

  e.preventDefault();
  const md = htmlToLightMarkdown(html);
  if (!md) return;

  const before = els.input.value || "";
  const glue = before && !before.endsWith("\n\n") ? "\n\n" : "";
  els.input.value = before + glue + md;
});

/* =========================
   Conversation parsing/render
   ========================= */
function parseBlocks(raw) {
  const cleaned = (raw || "").trim();
  if (!cleaned) return [];
  return cleaned.split(/\n\s*\n+/g).map((s) => s.trim()).filter(Boolean);
}

function getSupaName() {
  return (els.supaName?.value || "Supa").trim() || "Supa";
}
function startsByAI() {
  return Boolean(els.startsAI?.checked);
}

function sideForIndex(i) {
  const first = startsByAI() ? "left" : "right";
  return i % 2 === 0 ? first : first === "left" ? "right" : "left";
}

function speakerForSide(side) {
  return side === "left" ? getSupaName() : "Moi";
}

function mountPage(page) {
  const spacer = document.createElement("div");
  spacer.className = "pageSpacer";
  spacer.appendChild(page);
  els.pages.appendChild(spacer);
}

function createPage() {
  const page = document.createElement("div");
  page.className = "page";

  const paper = document.createElement("div");
  paper.className = "paper";

  const content = document.createElement("div");
  content.className = "content";
  content.style.transform = "";

  page.appendChild(paper);
  page.appendChild(content);
  return { page, content };
}

function setSide(bubbleEl, side) {
  bubbleEl.classList.toggle("left", side === "left");
  bubbleEl.classList.toggle("right", side === "right");
  bubbleEl.dataset.side = side;

  const cb = bubbleEl.querySelector('input[data-role="side-toggle"]');
  if (cb) cb.checked = side === "right";

  const name = bubbleEl.querySelector(".bubbleName");
  if (name) name.textContent = speakerForSide(side);
}

function bubbleNode(contentText, side) {
  const wrap = document.createElement("div");
  wrap.className = `bubble ${side}`;
  wrap.dataset.side = side;

  const name = document.createElement("div");
  name.className = "bubbleName";
  name.textContent = speakerForSide(side);
  wrap.appendChild(name);

  const p = document.createElement("p");
  p.innerHTML = renderLightMarkdown(contentText);
  wrap.appendChild(p);

  const tools = document.createElement("div");
  tools.className = "bubbleTools";

  const sw = document.createElement("label");
  sw.className = "switch bubbleSwitch";

  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = side === "right";
  cb.setAttribute("data-role", "side-toggle");

  const slider = document.createElement("span");
  slider.className = "slider";

  sw.appendChild(cb);
  sw.appendChild(slider);
  tools.appendChild(sw);
  wrap.appendChild(tools);

  sw.addEventListener("click", (e) => e.stopPropagation());
  cb.addEventListener("change", (e) => {
    e.stopPropagation();
    setSide(wrap, cb.checked ? "right" : "left");
  });

  return wrap;
}

function softCenterPage(page) {
  const content = page.querySelector(".content");
  if (!content) return;

  content.style.transform = "";
  const bubbles = content.querySelectorAll(".bubble");
  if (!bubbles.length) return;

  const cs = getComputedStyle(content);
  const padTop = parseFloat(cs.paddingTop) || 0;
  const padBottom = parseFloat(cs.paddingBottom) || 0;

  const last = bubbles[bubbles.length - 1];
  const usedBottom = last.offsetTop + last.offsetHeight;

  const inner = content.clientHeight - padTop - padBottom;
  const used = usedBottom - padTop;
  const free = inner - used;

  if (free <= CENTER_MIN_FREE) return;

  const shift = Math.min(Math.floor(free / 2), CENTER_MAX_SHIFT);
  content.style.transform = `translateY(${shift}px)`;
}

function paginate(bubbles) {
  els.pages.innerHTML = "";

  let { page, content } = createPage();
  mountPage(page);

  const overflows = () => content.scrollHeight > content.clientHeight;

  for (const b of bubbles) {
    content.appendChild(b);
    if (overflows()) {
      content.removeChild(b);
      ({ page, content } = createPage());
      mountPage(page);
      content.appendChild(b);
    }
  }

  const pages = [...els.pages.querySelectorAll(".page")];
  requestAnimationFrame(() => pages.forEach(softCenterPage));

  const count = pages.length;
  els.pageCount.textContent = `${count} page${count > 1 ? "s" : ""}`;
}

function generate() {
  const blocks = parseBlocks(els.input.value);
  const bubbles = blocks.map((t, i) => bubbleNode(t, sideForIndex(i)));
  paginate(bubbles);
}

/* =========================
   Export PNG
   ========================= */
function downscaleCanvas(srcCanvas, outW, outH) {
  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;

  const ctx = out.getContext("2d", { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(srcCanvas, 0, 0, outW, outH);

  return out;
}

function canvasToObjectURL(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null);
      resolve(URL.createObjectURL(blob));
    }, "image/png");
  });
}

function downloadURL(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function openExportPanel(items) {
  els.exportLinks.innerHTML = "";
  items.forEach(({ url, filename }) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.textContent = filename;
    els.exportLinks.appendChild(a);
  });
  els.exportPanel.hidden = false;
}

function closeExportPanel() {
  const links = els.exportLinks?.querySelectorAll("a") || [];
  links.forEach((a) => {
    try { URL.revokeObjectURL(a.href); } catch {}
  });
  els.exportLinks.innerHTML = "";
  els.exportPanel.hidden = true;
}

els.exportClose?.addEventListener("click", closeExportPanel);
els.exportPanel?.addEventListener("click", (e) => {
  if (e.target === els.exportPanel) closeExportPanel();
});

/* ===== Auto-crop helpers (content-based + rounded corners) ===== */
const CROP_TOP_BREATH = 64;       // air au-dessus de la 1ère bulle (px)
const CROP_BOTTOM_BREATH = 64;    // air en bas (px)
const CROP_MIN_H = 520;           // hauteur mini (évite un PNG trop "tassé")
const CROP_FREE_MIN = 220;        // si on a au moins ça de vide, on rogne
const PAGE_RADIUS = 18;           // doit matcher .page { border-radius: 18px; }

/** Mesure le rectangle utile (top/bottom) dans la page, en px (non-scalé) */
function measureUsedBounds(pageEl) {
  const content = pageEl.querySelector(".content");
  if (!content) return { top: 0, height: EXPORT_H };

  const bubbles = content.querySelectorAll(".bubble");
  if (!bubbles.length) return { top: 0, height: EXPORT_H };

  const pageRect = pageEl.getBoundingClientRect();
  const firstRect = bubbles[0].getBoundingClientRect();
  const lastRect = bubbles[bubbles.length - 1].getBoundingClientRect();

  // bounds relatifs au haut de la page
  let top = (firstRect.top - pageRect.top) - CROP_TOP_BREATH;
  let bottom = (lastRect.bottom - pageRect.top) + CROP_BOTTOM_BREATH;

  top = Math.max(0, Math.floor(top));
  bottom = Math.min(EXPORT_H, Math.ceil(bottom));

  let height = Math.max(CROP_MIN_H, bottom - top);
  if (top + height > EXPORT_H) {
    // si ça déborde, on remonte un peu le top
    top = Math.max(0, EXPORT_H - height);
  }

  return { top, height };
}

function getCropForPage(pageEl, pageIndex, totalPages) {
  const isOnly = totalPages === 1;
  const isLast = pageIndex === totalPages - 1;

  if (!isOnly && !isLast) return { top: 0, height: EXPORT_H };

  const { top, height } = measureUsedBounds(pageEl);
  const free = EXPORT_H - height;

  // si quasi plein, pas la peine de crop (évite des tailles random)
  if (free < CROP_FREE_MIN) return { top: 0, height: EXPORT_H };

  return { top, height };
}

/** Dessine un rectangle arrondi (helper) */
function roundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Croppe une zone (top/height) dans un canvas hi-res (déjà rendu par html2canvas),
 * puis renvoie un canvas "final" en taille export (832 x cropH) avec coins arrondis.
 */
function cropAndRoundFromHiRes(bigCanvas, cropTop, cropH, scale) {
  const srcY = Math.round(cropTop * scale);
  const srcH = Math.round(cropH * scale);
  const srcW = Math.round(EXPORT_W * scale);

  // canvas hi-res croppé
  const hi = document.createElement("canvas");
  hi.width = srcW;
  hi.height = srcH;
  hi.getContext("2d").drawImage(bigCanvas, 0, srcY, srcW, srcH, 0, 0, srcW, srcH);

  // downscale vers taille finale + masque arrondi
  const out = document.createElement("canvas");
  out.width = EXPORT_W;
  out.height = cropH;

  const ctx = out.getContext("2d", { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  roundedRectPath(ctx, 0, 0, out.width, out.height, PAGE_RADIUS);
  ctx.clip();

  ctx.drawImage(hi, 0, 0, out.width, out.height);
  return out;
}

/* ===== Export PNG ===== */
async function exportAllPagesPNG() {
  const pages = [...document.querySelectorAll(".page")];
  if (!pages.length) return;

  document.body.classList.add("exporting");
  await wait(80);

  const mobileItems = [];
  const isMobile = isMobileLike();

  for (let i = 0; i < pages.length; i++) {
    const node = pages[i];
    const { top: cropTop, height: cropH } = getCropForPage(node, i, pages.length);

    // 1) on rend TOUJOURS la page complète, pour que le fond + coins soient cohérents
    const bigCanvas = await html2canvas(node, {
      backgroundColor: null,
      width: EXPORT_W,
      height: EXPORT_H,
      scale: PNG_RENDER_SCALE,
      useCORS: true,
    });

    // 2) on croppe en post-process + on remet les coins arrondis
    const finalCanvas = cropAndRoundFromHiRes(bigCanvas, cropTop, cropH, PNG_RENDER_SCALE);

    const filename = `rp_page_${String(i + 1).padStart(2, "0")}.png`;

    if (isMobile) {
      const url = await canvasToObjectURL(finalCanvas);
      if (url) mobileItems.push({ url, filename });
    } else {
      finalCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        downloadURL(url, filename);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, "image/png");
      await wait(120);
    }
  }

  document.body.classList.remove("exporting");
  if (isMobile && mobileItems.length) openExportPanel(mobileItems);
}

/* =========================
   Events / init
   ========================= */
els.btnGenerate?.addEventListener("click", generate);
els.btnExport?.addEventListener("click", exportAllPagesPNG);

window.addEventListener("resize", updatePageScale);

setPageSizeCSSVars();
updatePageScale();

initTheme();
initBubbleStyles();
initNameStyles();
initPalettes();
