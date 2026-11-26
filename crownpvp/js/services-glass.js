/* CrownPVP Services — "Designed in glass" hero.
   Thick smoked-glass shards in WebGL (three.js 0.169 via import map), content printed on the glass,
   a DOM text layer mapped onto the tilted slab with a homography, and a shatter transition to the services view. */
const hero = document.getElementById("glass");
if (hero) boot();

async function boot() {
  const mini = document.getElementById("gl-mini");
  const onScroll = () => mini && mini.classList.toggle("on", scrollY > hero.offsetHeight * 0.7);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const root = document.documentElement;
  const fallback = () => { root.classList.remove("gl-on"); root.classList.add("gl-fallback"); };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return fallback();
  let THREE, RoomEnvironment;
  try {
    THREE = await import("three");
    ({ RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js"));
  } catch (e) { console.warn("[glass] three.js unavailable", e); return fallback(); }
  try { await run(THREE, RoomEnvironment); } catch (e) { console.warn("[glass] disabled", e); fallback(); }
}

const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fl = (v, m) => Math.max(v, m);
const smooth = t => t * t * (3 - 2 * t);
const easeInCubic = t => t * t * t;
const easeOutBack = (t, c1 = 1.2) => { const c3 = c1 + 1, u = t - 1; return 1 + c3 * u * u * u + c1 * u * u; };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- content ---------- */
const C = {
  brand: "CrownPVP", brandSub: "Studio",
  links: [["Services", "#services"], ["Showcase", "#work"], ["Pricing", "#pricing"], ["Minecraft", "#minecraft-services"]],
  hire: ["Hire me", "#project-intake"],
  eyebrow: "WEB & MINECRAFT STUDIO",
  h1: ["Built to be", "remembered."],
  sub: ["Premium websites, full-stack apps and custom Minecraft", "systems. Six years building, taking on select projects."],
  subFlat: "Premium websites, full-stack apps and custom Minecraft systems. Six years building, taking on select projects.",
  cta: "Hire me", link: "See what I build →",
  footL: "© CrownPVP Studio", footR: "Scroll for pricing ↓"
};

/* ---------- cut pattern ---------- */
const PT = {
  TL: [0, 0, "f"], TR: [1, 0, "f"], BR: [1, 1, "f"], BL: [0, 1, "f"],
  tAB: [.22, 0, "e"], tBC: [.515, 0, "e"], tCE: [.84, 0, "e"], bAD: [.34, 1, "e"], bDE: [.865, 1, "e"],
  J0: [.385, .72, "j"], J1: [.48, .62, "j"], J2: [.716, .49, "j"]
};
const CELLS = [
  ["TL", "tAB", "J0", "bAD", "BL"],
  ["tAB", "tBC", "J1", "J0"],
  ["tBC", "tCE", "J2", "J1"],
  ["J0", "J1", "J2", "bDE", "bAD"],
  ["tCE", "TR", "BR", "bDE", "J2"]
];

/* ---------- polygon helpers ---------- */
function insetPoly(pts, h) {
  const n = pts.length; let area = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a.x * b.y - b.x * a.y; }
  const sg = area > 0 ? 1 : -1, nr = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n]; const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    nr.push({ x: -dy / l * sg, y: dx / l * sg });
  }
  return pts.map((p, i) => {
    const n1 = nr[(i + n - 1) % n], n2 = nr[i];
    const k = 1 + n1.x * n2.x + n1.y * n2.y;
    let mx = (n1.x + n2.x) / Math.max(k, .25) * h, my = (n1.y + n2.y) / Math.max(k, .25) * h;
    const m = Math.hypot(mx, my), lim = h * 3; if (m > lim) { mx *= lim / m; my *= lim / m; }
    return { x: p.x + mx, y: p.y + my };
  });
}
function roundedShape(THREE, pts, r) {
  const n = pts.length, arcs = [], s = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const p = pts[(i + n - 1) % n], c = pts[i], q = pts[(i + 1) % n];
    let ax = p.x - c.x, ay = p.y - c.y, bx = q.x - c.x, by = q.y - c.y;
    const la = Math.hypot(ax, ay) || 1, lb = Math.hypot(bx, by) || 1; ax /= la; ay /= la; bx /= lb; by /= lb;
    const ang = Math.acos(clamp(ax * bx + ay * by, -1, 1));
    let t = ang > 3.05 ? 0 : r * 1.2 / Math.tan(ang / 2);
    t = Math.min(t, la * .48, lb * .48);
    arcs.push({ c, t, a: { x: c.x + ax * t, y: c.y + ay * t }, b: { x: c.x + bx * t, y: c.y + by * t } });
  }
  arcs.forEach((o, i) => {
    if (i === 0) s.moveTo(o.a.x, o.a.y); else s.lineTo(o.a.x, o.a.y);
    if (o.t > .01) s.quadraticCurveTo(o.c.x, o.c.y, o.b.x, o.b.y);
  });
  s.closePath();
  return s;
}
/* square (0,0)-(w,h) -> quad (TL,TR,BR,BL), as a CSS matrix3d */
function homography(q, w, h) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dy1 * dx2 || 1e-9;
  const g = (dx3 * dy2 - dy3 * dx2) / den, hh = (dx1 * dy3 - dy1 * dx3) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hh / h},0,0,1,0,${c},${f},0,1)`;
}

/* ---------- canvas text ---------- */
const mctx = document.createElement("canvas").getContext("2d");
const HAS_LS = "letterSpacing" in mctx;
function setFont(ctx, it) { ctx.font = `${it.w} ${it.size}px ${FONT}`; if (HAS_LS) ctx.letterSpacing = (it.ls || 0) * it.size + "px"; }
function textW(ctx, it) {
  setFont(ctx, it);
  if (HAS_LS || !it.ls) return ctx.measureText(it.t).width;
  return [...it.t].reduce((a, ch) => a + ctx.measureText(ch).width + it.ls * it.size, 0);
}
function drawStr(ctx, it, x, y) {
  ctx.textAlign = "left";
  if (HAS_LS || !it.ls) { ctx.fillText(it.t, x, y); return; }
  let cx = x; for (const ch of it.t) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + it.ls * it.size; }
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function paint(L, items, hov) {
  const { ctx, cs, w, h } = L;
  ctx.setTransform(cs, 0, 0, cs, 0, 0); ctx.clearRect(0, 0, w, h); ctx.textBaseline = "alphabetic";
  for (const it of items) {
    const on = it.id && it.id === hov;
    if (it.k === "mark") {
      rrect(ctx, it.x, it.y, it.s, it.s, it.s * .24); ctx.fillStyle = "#ececf0"; ctx.fill();
      const P = [[.2, .7], [.16, .32], [.36, .5], [.5, .26], [.64, .5], [.84, .32], [.8, .7]];
      ctx.beginPath(); P.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](it.x + p[0] * it.s, it.y + p[1] * it.s)); ctx.closePath();
      ctx.fillStyle = "#0b0b0e"; ctx.fill();
    } else if (it.k === "pill") {
      rrect(ctx, it.x, it.y, it.pw, it.ph, it.r); ctx.fillStyle = on ? "#36d67e" : "#ececf0"; ctx.fill();
      setFont(ctx, it); ctx.fillStyle = "#08080a";
      const tw = textW(ctx, it); drawStr(ctx, it, it.x + (it.pw - tw) / 2, it.y + it.ph / 2 + it.size * .36);
    } else {
      setFont(ctx, it);
      if (it.grad) { const gr = ctx.createLinearGradient(0, it.grad[0], 0, it.grad[1]); gr.addColorStop(0, "#dcdce0"); gr.addColorStop(1, "#bdbdc3"); ctx.fillStyle = gr; }
      else ctx.fillStyle = on && it.hc ? it.hc : it.c;
      drawStr(ctx, it, it.left, it.y);
      if (on && it.ul) { ctx.fillRect(it.left, it.y + it.size * .2, it.wd - (it.ls < 0 ? 0 : it.ls * it.size), Math.max(1, it.size * .07)); }
    }
  }
}
function finalize(items) {
  for (const it of items) {
    if (it.k === "mark" || it.k === "pill") continue;
    it.wd = textW(mctx, it);
    it.left = it.align === "right" ? it.x - it.wd : it.align === "center" ? it.x - it.wd / 2 : it.x;
  }
  return items;
}
function wrap(it, maxW) {
  const words = it.t.split(" "), lines = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (cur && textW(mctx, { ...it, t }) > maxW) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

/* ---------- main ---------- */
async function run(THREE, RoomEnvironment) {
  const $ = (s, r = document) => r.querySelector(s);
  const canvas = $("#gl-canvas"), nav$ = $("#gl-text-nav"), pan$ = $("#gl-text-panel");
  const defs = $("#gl-defs"), backBtn = $("#gl-back");
  const root = document.documentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  if (!renderer.getContext()) throw new Error("no webgl");
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x050507, 1);
  renderer.autoClear = false;

  const scene = new THREE.Scene(), sliverScene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex; scene.environmentIntensity = .42;
  sliverScene.environment = envTex; sliverScene.environmentIntensity = .42;
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 8000);
  const key = new THREE.DirectionalLight(0xd5e3ff, 1.5); scene.add(key); scene.add(key.target);
  const key2 = new THREE.DirectionalLight(0xd5e3ff, 1.5); sliverScene.add(key2); sliverScene.add(key2.target);
  const block = new THREE.Group(); scene.add(block);

  const U = { uPtr: { value: new THREE.Vector3() }, uGlow: { value: 0 }, uR: { value: 300 } };
  function glassMat(iri, glow) {
    const m = new THREE.MeshPhysicalMaterial({
      color: 0x17171b, roughness: .36, clearcoat: .7, clearcoatRoughness: .12, specularIntensity: .7,
      iridescence: iri, iridescenceIOR: 1.3, iridescenceThicknessRange: [250, 650],
      envMap: envTex, envMapIntensity: .42
    });
    if (glow) {
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vGW;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vGW;\nuniform vec3 uPtr;\nuniform float uGlow;\nuniform float uR;")
          .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n{ float gd = distance(vGW.xy, uPtr.xy) / uR; totalEmissiveRadiance += vec3(.42, .37, .62) * .16 * exp(-1.6 * gd * gd) * uGlow; }");
      };
      m.customProgramCacheKey = () => "crown-glass-glow";
    }
    return m;
  }

  const veil = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 0x050507, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  veil.renderOrder = 999; veil.visible = false; scene.add(veil);

  /* ---------- layout state ---------- */
  let W = 0, H = 0, portrait = false, bw = 0, bh = 0, S = 1, Sg = 1, navH = 0, gapL = 0, panelTop = 0, panelH = 0;
  let g = 0, depth = 0, bevel = 0, radius = 0, camZ = 0;
  let pieces = [], texNav = null, texPan = null, itemsNav = [], itemsPan = [];
  let sliver = null, sliverCx = 0, sliverCy = 0;
  const hov = { nav: null, pan: null };
  let drift = {};
  const rand = rng(20261126);
  for (const k in PT) drift[k] = { px: 10 + rand() * 10, py: 10 + rand() * 10, fx: rand() * TAU, fy: rand() * TAU };

  const ptr = { x: 0, y: 0, in: false, fade: 0, moved: false };
  const tilt = { x: 0, y: 0, rx: 0, ry: 0 };
  let state = "in", t0 = 0, fromBack = false, acc = 0, hovered = null, backHover = false;
  let sl = { from: 0, to: 0, t0: 0, delay: 0, dur: .5, cur: 0 };
  let visible = true, last = 0, raf = 0;
  const PLAN = { dpr: 1 };

  function disposePieces() {
    for (const p of pieces) {
      block.remove(p.group); p.mesh.geometry.dispose(); p.text.geometry.dispose(); p.mat.dispose();
    }
    pieces = [];
    [texNav, texPan].forEach(t => t && (t.tex.dispose(), t.textMat.dispose()));
    if (sliver) { sliverScene.remove(sliver.mesh); sliver.mesh.geometry.dispose(); sliver.mat.dispose(); sliver = null; }
  }
  function makeTex(w, h) {
    const cs = Math.min(Math.max(devicePixelRatio || 1, 1.5), 2, 4096 / Math.max(w, h));
    const c = document.createElement("canvas"); c.width = Math.round(w * cs); c.height = Math.round(h * cs);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.premultiplyAlpha = true;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
    const textMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, premultipliedAlpha: true });
    return { c, ctx: c.getContext("2d"), cs, w, h, tex, textMat };
  }

  /* ---------- content layouts (pixel space of each slab) ---------- */
  function layoutNav() {
    const it = [], h = navH, cy = h / 2, ml = portrait ? 18 : 34 * S;
    const fs = fl(15 * S * (portrait ? 1.3 : 1), 14), ms = fl(20 * S, 17);
    it.push({ k: "mark", id: "mark", x: ml, y: cy - ms / 2, s: ms });
    const brand = { t: C.brand, x: ml + ms + 11 * Math.max(S, .8), y: cy + fs * .36, size: fs, w: 600, ls: -.01, c: "rgba(255,255,255,.94)", tag: "span" };
    it.push(brand); finalize([brand]);
    if (!portrait) {
      const sub = { t: C.brandSub, x: brand.left + brand.wd + 10 * S, y: brand.y, size: fl(13 * S, 12), w: 500, ls: 0, c: "rgba(255,255,255,.36)" };
      it.push(sub);
    }
    const ls = fl(14 * S, 13), gap = 38 * S;
    if (!portrait) {
      const L = C.links.map((l, i) => ({ t: l[0], href: l[1], id: "nav" + i, y: cy + ls * .36, size: ls, w: 500, ls: 0, c: "rgba(255,255,255,.6)", hc: "rgba(255,255,255,.97)" }));
      finalize(L);
      const total = L.reduce((a, l) => a + l.wd, 0) + gap * (L.length - 1);
      let x = bw / 2 - total / 2 + 20 * S;
      L.forEach(l => { l.x = x; l.align = "left"; x += l.wd + gap; });
      finalize(L); it.push(...L);
    }
    const hire = { t: C.hire[0] + " ↗", href: C.hire[1], id: "hire", x: bw - ml, align: "right", y: cy + ls * .36, size: ls, w: 500, ls: 0, c: "rgba(255,255,255,.86)", hc: "#ffffff" };
    it.push(hire);
    return finalize(it);
  }
  function layoutPanel() {
    const it = [], pw = bw, ph = panelH;
    const es = fl(11 * S, 10), ss = portrait ? 14.5 : fl(17 * S, 13.5), fs = portrait ? 14 : fl(14 * S, 13);
    const ml = portrait ? 22 : pw * .045;
    const eb = { t: C.eyebrow, x: ml, y: (portrait ? .055 : .135) * ph + es * .36, size: es, w: 500, ls: .2, c: "rgba(255,255,255,.38)", tag: "p" };
    it.push(eb);
    const hs = portrait ? Math.min(pw * .135, ph * .1) : Math.min(pw * .078, ph * .2);
    const b1 = eb.y + (portrait ? 20 : 26 * S) + hs * .78, b2 = b1 + hs * .97;
    const grad = [b1 - hs * .8, b2 + hs * .22];
    C.h1.forEach((t, i) => it.push({ t, x: ml - hs * .03, y: i ? b2 : b1, size: hs, w: 500, ls: -.045, c: "#cfcfd4", grad, tag: "h1line" }));
    let sy = b2 + hs * .1 + (portrait ? 26 : 38 * S) + ss * .5;
    const lh = ss * 1.55, subLines = portrait ? wrap({ t: C.subFlat, size: ss, w: 400, ls: 0 }, pw - ml * 2) : C.sub;
    subLines.forEach((t, i) => it.push({ t, x: ml, y: sy + i * lh, size: ss, w: 400, ls: 0, c: "rgba(255,255,255,.55)", tag: "p" }));
    sy += (subLines.length - 1) * lh;
    const pwid = fl(116 * S, portrait ? 120 : 104), phh = fl(40 * S, 38), py = sy + (portrait ? 26 : 34 * S);
    it.push({ k: "pill", id: "cta", t: C.cta, href: C.hire[1], x: ml, y: py, pw: pwid, ph: phh, r: 6, size: fs, w: 500, ls: 0 });
    it.push({ t: C.link, act: "shatter", id: "link", x: ml + pwid + (portrait ? 18 : 26 * S), y: py + phh / 2 + fs * .36, size: fs, w: 500, ls: 0, c: "rgba(255,255,255,.88)", hc: "#fff", ul: true });
    const fz = fl(11 * S, 10), fy = ph - (portrait ? 20 : 26 * S);
    it.push({ t: C.footL, x: ml, y: fy, size: fz, w: 400, ls: .02, c: "rgba(255,255,255,.34)" });
    it.push({ t: C.footR, href: "#pricing", id: "foot", x: pw - ml, align: "right", y: fy, size: fz, w: 400, ls: .02, c: "rgba(255,255,255,.34)", hc: "rgba(255,255,255,.8)" });
    return finalize(it);
  }

  function buildDom(layer, items, which) {
    layer.textContent = "";
    const h1 = document.createElement("h1"); h1.className = "gl-h1"; if (items.some(i => i.tag === "h1line")) layer.appendChild(h1);
    const sizeOf = it => it.size;
    for (const it of items) {
      if (it.k === "mark") continue;
      let el;
      if (it.href) { el = document.createElement("a"); el.href = it.href; }
      else if (it.act) { el = document.createElement("button"); el.type = "button"; }
      else el = document.createElement("span");
      el.className = "gl-t"; el.textContent = it.t;
      const st = el.style;
      if (it.k === "pill") {
        st.left = it.x + "px"; st.top = it.y + "px"; st.width = it.pw + "px"; st.height = it.ph + "px";
        st.font = `500 ${it.size}px/${it.ph}px ${FONT}`; st.textAlign = "center";
      } else {
        const interactive = it.href || it.act, padX = interactive ? 8 : 0, padY = interactive ? 8 : 0;
        st.left = it.left - padX + "px"; st.top = it.y - sizeOf(it) * .8638 - padY + "px";
        st.font = `${it.w} ${it.size}px/${it.size}px ${FONT}`; st.letterSpacing = (it.ls || 0) + "em";
        st.padding = `${padY}px ${padX}px`; st.width = Math.ceil(it.wd + 2 + padX * 2) + "px"; st.height = it.size + padY * 2 + "px";
      }
      if (it.id) {
        const set = v => { if (hov[which] !== v) { hov[which] = v; repaint(which); } };
        el.addEventListener("pointerenter", () => set(it.id)); el.addEventListener("pointerleave", () => set(null));
        el.addEventListener("focus", () => set(it.id)); el.addEventListener("blur", () => set(null));
      }
      if (it.act === "shatter") el.addEventListener("click", shatter);
      (it.tag === "h1line" ? h1 : layer).appendChild(el);
    }
  }
  function repaint(which) {
    if (which === "nav" && texNav) { paint(texNav, itemsNav, hov.nav); texNav.tex.needsUpdate = true; }
    if (which === "pan" && texPan) { paint(texPan, itemsPan, hov.pan); texPan.tex.needsUpdate = true; }
  }

  /* ---------- build ---------- */
  function layout() {
    cancelAnimationFrame(raf);
    disposePieces();
    W = Math.max(320, hero.clientWidth); H = Math.max(480, hero.clientHeight); portrait = W < H;
    const phone = W < 600, mx = phone ? 16 : .055 * W, my = phone ? 16 : .085 * H;
    bw = W - mx * 2; bh = H - my * 2; S = bw / 1730; Sg = W < 700 ? Math.max(S, .55) : S;
    navH = .108 * bh; g = 14 * Sg; gapL = Math.max(0, 14 - g); panelTop = navH + gapL; panelH = bh - panelTop;
    depth = 13 * Sg; bevel = 2.6 * Sg; radius = 20 * Sg;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camZ = (H / 2) / Math.tan(THREE.MathUtils.degToRad(15)); camera.position.set(0, 0, camZ);
    camera.near = 10; camera.far = camZ * 3; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    key.position.set(-W * .55, H * .75, camZ * .7); key2.position.copy(key.position);
    veil.geometry.dispose(); veil.geometry = new THREE.PlaneGeometry(W * 4, H * 4);
    U.uR.value = 300 * Sg;

    texNav = makeTex(bw, navH); texPan = makeTex(bw, panelH);
    itemsNav = layoutNav(); itemsPan = layoutPanel();
    paint(texNav, itemsNav, hov.nav); paint(texPan, itemsPan, hov.pan);
    nav$.style.cssText = `width:${bw}px;height:${navH}px`; pan$.style.cssText = `width:${bw}px;height:${panelH}px`;
    buildDom(nav$, itemsNav, "nav"); buildDom(pan$, itemsPan, "pan");

    const R = rng(77), mk = (idx, isNav) => {
      const mat = glassMat(.55, true);
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      const text = new THREE.Mesh(new THREE.BufferGeometry(), isNav ? texNav.textMat : texPan.textMat);
      text.renderOrder = 2;
      const group = new THREE.Group(); group.add(mesh); group.add(text); block.add(group);
      const ax = new THREE.Vector3(R() - .5, R() - .5, R() - .5); if (ax.lengthSq() < .01) ax.set(1, 0, 0); ax.normalize();
      const p = { idx, isNav, mat, mesh, text, group, base: new THREE.Vector3(), hw: 10, hh: 10,
        z: 0, vz: 0, rx: 0, vrx: 0, ry: 0, vry: 0, h: 0, q: 1, axis: ax, ang: (2 + R() * 1.6) * (R() < .5 ? -1 : 1), D: new THREE.Vector3(), rd: R(), rd2: R(), rd3: R() };
      pieces.push(p); return p;
    };
    mk(0, true); for (let i = 0; i < CELLS.length; i++) mk(i + 1, false);
    const diag = Math.hypot(W, H);
    pieces.forEach(p => p.D.set(0, 0, (420 + p.rd * 380) * Sg));
    buildNavGeo(); rebuildCells(performance.now() / 1000); setFlightVectors(diag);
    buildSliver();
    backBtn.style.left = sliverCx + "px"; backBtn.style.top = sliverCy + "px";
    scene.updateMatrixWorld(true);
  }
  function setFlightVectors(diag) {
    pieces.forEach(p => {
      let dx = p.base.x, dy = p.base.y * .8;
      let l = Math.hypot(dx, dy); if (l < 1) { dx = p.rd - .5; dy = p.rd2 - .5; l = Math.hypot(dx, dy) || 1; }
      dx /= l; dy /= l;
      const out = (.55 + p.rd * .35) * diag;
      p.D.x = dx * out; p.D.y = dy * out * .6 - (220 + p.rd2 * 260) * Sg;
    });
  }

  function setPieceGeo(p, polyPx, top, texW, texH) {
    const ins = insetPoly(polyPx, g / 2);
    let cx = 0, cy = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    ins.forEach(q => { cx += q.x; cy += q.y; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
    cx /= ins.length; cy /= ins.length;
    const loc = ins.map(q => ({ x: q.x - cx, y: -(q.y - cy) }));
    const shape = roundedShape(THREE, loc, radius);
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3, curveSegments: 5, steps: 1 });
    geo.translate(0, 0, -depth / 2);
    const sg = new THREE.ShapeGeometry(shape, 5);
    const pos = sg.attributes.position, uv = sg.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + cx) / texW, 1 - (-pos.getY(i) + cy) / texH);
    p.mesh.geometry.dispose(); p.text.geometry.dispose();
    p.mesh.geometry = geo; p.text.geometry = sg;
    p.text.position.z = depth / 2 + bevel + .4;
    p.base.set(cx - bw / 2, bh / 2 - (top + cy), 0);
    p.hw = (x1 - x0) / 2; p.hh = (y1 - y0) / 2;
  }
  function buildNavGeo() {
    const p = pieces[0];
    setPieceGeo(p, [{ x: 0, y: 0 }, { x: bw, y: 0 }, { x: bw, y: navH }, { x: 0, y: navH }], 0, bw, navH);
  }
  const cursorPx = { x: -1e4, y: -1e4 };
  function rebuildCells(t) {
    const pw = bw, ph = panelH, u = Math.min(pw, ph), P = {};
    const mx = cursorPx.x, my = cursorPx.y, f = ptr.fade;
    for (const k in PT) {
      let [x, y, kind] = PT[k]; const d = drift[k];
      if (kind !== "f") { x += .03 * Math.sin(TAU * t / d.px + d.fx); if (kind === "j") y += .05 * Math.sin(TAU * t / d.py + d.fy); }
      let X = portrait ? y * pw : x * pw, Y = portrait ? x * ph : y * ph;
      if (kind !== "f" && f > .001) {
        const dx = X - mx, dy = Y - my, dist = Math.hypot(dx, dy), R = .6 * u;
        if (dist < R) {
          const q = 1 - dist / R, push = .05 * u * q * q * f, nx = dist > 1e-3 ? dx / dist : 1, ny = dist > 1e-3 ? dy / dist : 0;
          if (kind === "j") { X += nx * push; Y += ny * push; }
          else if (portrait) Y += ny * push; else X += nx * push;
        }
      }
      P[k] = { x: X, y: Y };
    }
    CELLS.forEach((c, i) => setPieceGeo(pieces[i + 1], c.map(n => P[n]), panelTop, pw, ph));
  }

  /* ---------- back sliver ---------- */
  function buildSliver() {
    const k = portrait ? .56 : W / 1918, RW = 1918, RH = 1080;
    const pts = [[.147, .243], [.252, .169], [.287, .277], [.151, .258]].map(p => ({ x: p[0] * RW * k, y: p[1] * RH * k }));
    let cx = 0, cy = 0; pts.forEach(p => { cx += p.x; cy += p.y; }); cx /= 4; cy /= 4;
    const loc = pts.map(p => ({ x: p.x - cx, y: -(p.y - cy) }));
    const shape = roundedShape(THREE, loc, 9 * k);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 11 * k, bevelEnabled: true, bevelThickness: 3 * k, bevelSize: 3 * k, bevelOffset: -3 * k, bevelSegments: 3, curveSegments: 5 });
    geo.translate(0, 0, -5.5 * k);
    const mat = glassMat(.35, false); mat.envMapIntensity = .42 * 1.6;
    const mesh = new THREE.Mesh(geo, mat); mesh.visible = false; sliverScene.add(mesh);
    sliverCx = portrait ? Math.max(.219 * W, 90) : .219 * W; sliverCy = portrait ? 58 : .238 * H;
    mesh.position.set(sliverCx - W / 2, H / 2 - sliverCy, 0);
    sliver = { mesh, mat, rx: 0, vrx: 0, ry: 0, vry: 0 };
  }

  /* ---------- interaction ---------- */
  const rc = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pickPiece() {
    if (!ptr.in) return null;
    ndc.set(ptr.x / W * 2 - 1, -(ptr.y / H) * 2 + 1); rc.setFromCamera(ndc, camera);
    if (hovered && rc.intersectObject(hovered.mesh, false).length) return hovered;
    const hit = rc.intersectObjects(pieces.map(p => p.mesh), false)[0];
    return hit ? pieces.find(p => p.mesh === hit.object) : null;
  }
  function setPtr(e) {
    const r = hero.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
    ptr.in = ptr.x >= 0 && ptr.y >= 0 && ptr.x <= r.width && ptr.y <= r.height;
  }
  hero.addEventListener("pointermove", e => { setPtr(e); ptr.moved = true; }, { passive: true });
  hero.addEventListener("pointerdown", e => { setPtr(e); ptr.moved = true; }, { passive: true });
  hero.addEventListener("pointerleave", () => { ptr.in = false; });
  hero.addEventListener("pointerup", e => { if (e.pointerType === "touch") ptr.in = false; });
  document.documentElement.addEventListener("mouseleave", () => { ptr.in = false; });
  backBtn.addEventListener("pointerenter", () => { backHover = true; });
  backBtn.addEventListener("pointerleave", () => { backHover = false; });
  backBtn.addEventListener("click", goBack);
  addEventListener("keydown", e => { if (e.key === "Escape" && state === "defs") goBack(); });

  const now$ = () => performance.now() / 1000;
  function shatter() {
    if (state !== "page") return;
    state = "out"; t0 = now$(); hovered = null; hov.pan = null; fromBack = false;
    sl = { from: sl.cur, to: 1, t0, delay: .3, dur: .55, cur: sl.cur };
    veil.visible = true; defs.dataset.armed = "0";
  }
  function goBack() {
    if (state !== "defs") return;
    state = "in"; t0 = now$(); fromBack = true;
    defs.classList.remove("on"); defs.setAttribute("aria-hidden", "true"); backBtn.classList.remove("on", "ready");
    sl = { from: sl.cur, to: 0, t0, delay: 0, dur: .3, cur: sl.cur };
    block.visible = true; veil.visible = true; rebuildCells(t0);
  }

  /* ---------- frame ---------- */
  const tmpQ1 = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = new THREE.Vector3();
  const FLY = .72, STAG_OUT = .045, STAG_IN = .03;

  function update(now, dt) {
    const ek = 1 - Math.exp(-dt / .3);
    const tx = ptr.in ? (ptr.x / W - .5) * 2 : 0, ty = ptr.in ? (ptr.y / H - .5) * 2 : 0;
    tilt.x += (tx - tilt.x) * ek; tilt.y += (ty - tilt.y) * ek;
    block.rotation.y = THREE.MathUtils.degToRad(tilt.x * 7 - 1.2);
    block.rotation.x = THREE.MathUtils.degToRad(tilt.y * 5.5 - .8);
    ptr.fade += ((ptr.in && state === "page" ? 1 : 0) - ptr.fade) * (1 - Math.exp(-dt / .22));
    U.uGlow.value = ptr.fade; U.uPtr.value.set(ptr.x - W / 2, H / 2 - ptr.y, 0);
    cursorPx.x = ptr.x - (W - bw) / 2; cursorPx.y = ptr.y - (H - bh) / 2 - panelTop;

    /* timeline */
    const el = now - t0; let allDone = true;
    pieces.forEach((p, i) => {
      if (state === "out") { const s = clamp((el - i * STAG_OUT) / FLY, 0, 1); p.q = easeInCubic(s); if (s < 1) allDone = false; }
      else if (state === "in") { const s = clamp((el - i * STAG_IN) / FLY, 0, 1); let q = 1 - easeOutBack(s, 1.2); if (q < 0) q *= .35; p.q = q; if (s < 1) allDone = false; }
      else p.q = state === "defs" ? 1 : 0;
    });
    let vv = 0;
    if (state === "out") {
      vv = smooth(clamp((el - .28) / .4, 0, 1));
      if (el >= .28 && defs.dataset.armed === "0") { defs.dataset.armed = "1"; defs.classList.add("on"); defs.setAttribute("aria-hidden", "false"); backBtn.classList.add("on"); }
      if (allDone && vv >= 1) { state = "defs"; block.visible = false; backBtn.classList.add("ready"); backBtn.focus({ preventScroll: true }); }
    } else if (state === "in") {
      vv = fromBack ? 1 - smooth(clamp(el / .25, 0, 1)) : 0;
      if (allDone) { state = "page"; veil.visible = false; if (fromBack) pan$.querySelector("button.gl-t")?.focus({ preventScroll: true }); }
    } else if (state === "defs") vv = 1;
    veil.material.opacity = vv; if (state !== "defs" && state !== "out") veil.visible = vv > .001;

    /* pieces */
    if (block.visible) {
      acc += dt;
      if (acc >= 1 / 45) { acc = 0; rebuildCells(now); }
      block.updateMatrixWorld(true);
      const pick = state === "page" ? pickPiece() : null;
      hovered = pick;
      const world = tmpV;
      pieces.forEach(p => {
        const on = p === pick; let tz = 0, trx = 0, try_ = 0;
        if (on) {
          tz = (p.isNav ? 32 : 50) * Sg;
          world.copy(p.base); block.localToWorld(world);
          trx = clamp((world.y - (H / 2 - ptr.y)) / Math.max(p.hh, 1), -1, 1) * .24;
          try_ = clamp(((ptr.x - W / 2) - world.x) / Math.max(p.hw, 1), -1, 1) * .24;
        }
        const n = Math.max(1, Math.ceil(dt / .008)), h = dt / n;
        for (let s = 0; s < n; s++) {
          p.vz += (-170 * (p.z - tz) - 19 * p.vz) * h; p.z += p.vz * h;
          p.vrx += (-170 * (p.rx - trx) - 19 * p.vrx) * h; p.rx += p.vrx * h;
          p.vry += (-170 * (p.ry - try_) - 19 * p.vry) * h; p.ry += p.vry * h;
        }
        p.h += ((on ? 1 : 0) - p.h) * (1 - Math.exp(-dt / .12));
        p.mat.iridescence = lerp(.55, 1, p.h); p.mat.envMapIntensity = .42 * lerp(1, 1.9, p.h);
        const q = p.q, G = 380 * Sg;
        p.group.position.set(p.base.x + p.D.x * q, p.base.y + p.D.y * q - G * q * Math.abs(q), p.z + p.D.z * q);
        tmpQ1.setFromEuler(tmpE.set(p.rx, p.ry, 0)); tmpQ2.setFromAxisAngle(p.axis, p.ang * q);
        p.group.quaternion.copy(tmpQ2).multiply(tmpQ1);
      });
    }

    /* printed-text DOM layers follow the slab */
    const show = state === "page";
    nav$.classList.toggle("show", show); pan$.classList.toggle("show", show);
    if (show) {
      block.updateMatrixWorld(true);
      const zt = depth / 2 + bevel + .4;
      const proj = (x, y) => { tmpV.set(x, y, zt).applyMatrix4(block.matrixWorld).project(camera); return [(tmpV.x + 1) / 2 * W, (1 - tmpV.y) / 2 * H]; };
      const quad = (top, h) => [...proj(-bw / 2, bh / 2 - top), ...proj(bw / 2, bh / 2 - top), ...proj(bw / 2, bh / 2 - top - h), ...proj(-bw / 2, bh / 2 - top - h)];
      nav$.style.transform = homography(quad(0, navH), bw, navH);
      pan$.style.transform = homography(quad(panelTop, panelH), bw, panelH);
    }

    /* sliver */
    if (sliver) {
      const u = clamp((now - sl.t0 - sl.delay) / sl.dur, 0, 1);
      sl.cur = sl.to > sl.from ? lerp(sl.from, sl.to, easeOutBack(u, 1.7)) : lerp(sl.from, sl.to, easeInCubic(u));
      sliver.mesh.visible = sl.cur > .002; sliver.mesh.scale.setScalar(Math.max(sl.cur, .0001));
      let trx = 0, try_ = 0;
      if (backHover && ptr.in) {
        trx = clamp(((H / 2 - ptr.y) - (H / 2 - sliverCy)) / 50, -1, 1) * .14;
        try_ = clamp((ptr.x - sliverCx) / 90, -1, 1) * .14;
      }
      const n = Math.max(1, Math.ceil(dt / .008)), h = dt / n;
      for (let s = 0; s < n; s++) {
        sliver.vrx += (-170 * (sliver.rx - trx) - 19 * sliver.vrx) * h; sliver.rx += sliver.vrx * h;
        sliver.vry += (-170 * (sliver.ry - try_) - 19 * sliver.vry) * h; sliver.ry += sliver.vry * h;
      }
      sliver.mesh.rotation.set(-.08 + sliver.rx + .035 * Math.sin(now * TAU * .95), -.16 + sliver.ry + .03 * Math.sin(now * TAU * 1.05 + 1.3), 0);
    }
  }
  function render() {
    renderer.clear();
    renderer.render(scene, camera);
    if (sliver && sliver.mesh.visible) { renderer.clearDepth(); renderer.render(sliverScene, camera); }
  }
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!visible) { last = ts / 1000; return; }
    const now = ts / 1000, dt = clamp(now - (last || now), 0, .05); last = now;
    update(now, dt); render();
  }

  /* ---------- go ---------- */
  try { await Promise.race([Promise.all(["400 16px Inter", "500 16px Inter", "600 16px Inter"].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch { }
  layout();
  state = "in"; fromBack = false; t0 = now$() + .08; defs.dataset.armed = "0";
  root.classList.add("gl-ready");
  document.fonts?.ready?.then(() => { if (texPan) { itemsNav = layoutNav(); itemsPan = layoutPanel(); repaint("nav"); repaint("pan"); buildDom(nav$, itemsNav, "nav"); buildDom(pan$, itemsPan, "pan"); } });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  let rt = 0, lw = W, lh = H;
  new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (Math.abs(hero.clientWidth - lw) < 2 && Math.abs(hero.clientHeight - lh) < 2) return;
      lw = hero.clientWidth; lh = hero.clientHeight;
      const keep = state; layout(); state = keep === "out" ? "defs" : keep === "in" ? "page" : keep;
      if (state === "defs") { block.visible = false; pieces.forEach(p => p.q = 1); veil.visible = true; }
      raf = requestAnimationFrame(frame);
    }, 140);
  }).observe(hero);
  raf = requestAnimationFrame(frame);
}
