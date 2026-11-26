const $ = (selector, root = document) => root.querySelector(selector);
let THREE, RoomEnvironment;
const canvas = $("#facet-canvas");
const dom = $("#facet-dom");
const fallback = $("#fallback");
const definitions = $("#definitions");
const backButton = $("#back-button");
const dialog = $("#studio-dialog");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const random = (min, max) => min + Math.random() * (max - min);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInCubic = t => t * t * t;
const easeOutBack = t => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const cellNames = [
  ["TL", "tAB", "J0", "bAD", "BL"],
  ["tAB", "tBC", "J1", "J0"],
  ["tBC", "tCE", "J2", "J1"],
  ["J0", "J1", "J2", "bDE", "bAD"],
  ["tCE", "TR", "BR", "bDE", "J2"]
];
const basePoints = {
  TL: [0, 0], tAB: [.22, 0], tBC: [.515, 0], tCE: [.84, 0], TR: [1, 0],
  J0: [.385, .72], J1: [.48, .62], J2: [.716, .49],
  BL: [0, 1], bAD: [.34, 1], bDE: [.865, 1], BR: [1, 1]
};

let renderer, scene, camera, pmrem, world, sliverWorld, navPiece, pieces = [];
let pageCanvas, pageTexture, navCanvas, navTexture, backCanvas, backTexture;
let panelW = 0, panelH = 0, navH = 0, blockW = 0, blockH = 0, gap = 0, scale = 1;
let panelY = 0, navY = 0, time = 0, lastFrame = 0, lastBuild = 0;
let animationState = "loading", animationStart = 0, sliver = null;
let pointerInside = false, pointerClient = { x: -1, y: -1 }, pointerLocal, pointerWorld, glow = 0, activePiece = null;
let canvasHover = { open: false, paper: false, nav: "" };
let pageRayPlane, raycaster, pointerNdc;
const tileByMesh = new Map();
let tmpVector, tmpVector2, tmpQuat, tmpAxis;
const navOverlay = $("#nav-plane"), panelOverlay = $("#panel-plane");

function hashNumber(value) {
  let h = 2166136261;
  for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

function makeCanvas(width, height, paint) {
  const dpr = Math.max(1.5, Math.min(window.devicePixelRatio || 1, 2));
  const el = document.createElement("canvas");
  el.width = Math.max(1, Math.round(width * dpr));
  el.height = Math.max(1, Math.round(height * dpr));
  const ctx = el.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paint(ctx, width, height);
  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { canvas: el, texture };
}

function drawPanel(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  const textScale = window.innerWidth <= 700 ? Math.max(scale, .7) : Math.max(scale, .9);
  const eyebrow = Math.max(8, 11 * textScale);
  const title = window.innerWidth <= 700
    ? Math.min(Math.max(width * .078, 42), height * .20)
    : Math.min(width * .078, height * .20);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `500 ${eyebrow}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,.38)";
  ctx.letterSpacing = `${.2 * eyebrow}px`;
  ctx.fillText("REAL-TIME MATERIAL STUDIO", width * .095, height * .135);
  ctx.letterSpacing = "0px";
  ctx.font = `500 ${title}px Inter, sans-serif`;
  ctx.letterSpacing = `${-.045 * title}px`;
  const heading = ctx.createLinearGradient(0, height * .29, 0, height * .47);
  heading.addColorStop(0, "#dcdce0");
  heading.addColorStop(1, "#bdbdc3");
  ctx.fillStyle = heading;
  ctx.fillText("Designed", width * .095, height * .34);
  ctx.fillText("in glass.", width * .095, height * .34 + title * .97);
  ctx.letterSpacing = "0px";
  const bodySize = Math.max(10, 15 * textScale);
  ctx.font = `400 ${bodySize}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.fillText("Author dispersion, transmission, and refraction in the browser.", width * .097, height * .605);
  ctx.fillText("Live previews, real materials.", width * .097, height * .605 + bodySize * 1.8);
  const pillW = window.innerWidth <= 700 ? Math.max(116 * scale, 104) : 116 * scale;
  const pillH = window.innerWidth <= 700 ? Math.max(40 * scale, 38) : 40 * scale;
  const pillX = width * .095, pillY = height * .74;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 6 * scale);
  ctx.fillStyle = canvasHover.open ? "#36d67e" : "#e6e6e8";
  ctx.fill();
  ctx.font = `500 ${Math.max(10, 13 * textScale)}px Inter, sans-serif`;
  ctx.fillStyle = "#141416";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Open studio", pillX + pillW / 2, pillY + pillH / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const readX = pillX + pillW + 32 * scale;
  ctx.font = `500 ${Math.max(10, 13 * textScale)}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,.78)";
  const readText = "Read paper →";
  ctx.fillText(readText, readX, pillY + pillH * .64);
  if (canvasHover.paper) {
    const underline = ctx.measureText(readText).width;
    ctx.fillRect(readX, pillY + pillH * .78, underline, Math.max(1, scale));
  }
  ctx.font = `400 ${Math.max(8, 11 * textScale)}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,.34)";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("© Facet Lab", width * .095, height * .937);
  ctx.textAlign = "right";
  ctx.fillText("KHR_materials_dispersion", width * .905, height * .937);
  ctx.textAlign = "left";
}

function drawNav(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  const textScale = window.innerWidth <= 700 ? Math.max(scale, .7) : Math.max(scale, .9);
  const mark = Math.max(14, 20 * textScale), x = width * .045, y = (height - mark) / 2;
  ctx.save();
  ctx.translate(x + mark / 2, y + mark / 2);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = "rgba(255,255,255,.78)";
  ctx.lineWidth = Math.max(.8, scale);
  ctx.strokeRect(-mark / 2, -mark / 2, mark, mark);
  ctx.restore();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `600 ${Math.max(12, 17 * textScale)}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.fillText("Facet", x + mark + 10 * scale, height / 2);
  const links = ["Studio", "Materials", "Pricing"], widths = links.map(t => ctx.measureText(t).width);
  const gap = Math.max(24, Math.min(62, window.innerWidth * .032));
  const groupWidth = widths.reduce((a, b) => a + b, 0) + gap * 2;
  let lx = (width - groupWidth) / 2;
  links.forEach((text, i) => {
    ctx.font = `400 ${Math.max(10, 14 * textScale)}px Inter, sans-serif`;
    ctx.fillStyle = canvasHover.nav === text ? "rgba(255,255,255,.98)" : "rgba(255,255,255,.6)";
    ctx.fillText(text, lx, height / 2);
    lx += ctx.measureText(text).width + gap;
  });
  ctx.textAlign = "right";
  ctx.font = `400 ${Math.max(10, 14 * textScale)}px Inter, sans-serif`;
  ctx.fillStyle = canvasHover.nav === "Sign in" ? "#fff" : "rgba(255,255,255,.76)";
  ctx.fillText("Sign in", width * .955, height / 2);
  ctx.textAlign = "left";
}

function getCenter(points) {
  let area = 0, x = 0, y = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    x += (a.x + b.x) * cross;
    y += (a.y + b.y) * cross;
  }
  if (Math.abs(area) < 1e-8) return points.reduce((c, p) => ({ x: c.x + p.x / points.length, y: c.y + p.y / points.length }), { x: 0, y: 0 });
  return { x: x / (3 * area), y: y / (3 * area) };
}

function insetConvexPolygon(points, distance) {
  const area = points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length];
    return sum + p.x * next.y - next.x * p.y;
  }, 0);
  const direction = area >= 0 ? 1 : -1;
  const lines = points.map((a, i) => {
    const b = points[(i + 1) % points.length], dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: a.x - direction * dy / length * distance, y: a.y + direction * dx / length * distance, dx, dy };
  });
  return points.map((_, i) => {
    const a = lines[(i + points.length - 1) % points.length], b = lines[i];
    const den = a.dx * b.dy - a.dy * b.dx;
    if (Math.abs(den) < 1e-7) return { x: b.x, y: b.y };
    const t = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / den;
    return { x: a.x + t * a.dx, y: a.y + t * a.dy };
  });
}

function roundedPolygon(points, radius) {
  const path = new THREE.Shape();
  const starts = [], ends = [];
  points.forEach((point, i) => {
    const previous = points[(i + points.length - 1) % points.length];
    const next = points[(i + 1) % points.length];
    const beforeLength = Math.hypot(point.x - previous.x, point.y - previous.y) || 1;
    const afterLength = Math.hypot(next.x - point.x, next.y - point.y) || 1;
    const r = Math.min(radius, beforeLength * .42, afterLength * .42);
    starts.push({ x: point.x + (previous.x - point.x) * r / beforeLength, y: point.y + (previous.y - point.y) * r / beforeLength });
    ends.push({ x: point.x + (next.x - point.x) * r / afterLength, y: point.y + (next.y - point.y) * r / afterLength });
  });
  path.moveTo(starts[0].x, -starts[0].y);
  for (let i = 0; i < points.length; i++) {
    path.quadraticCurveTo(points[i].x, -points[i].y, ends[i].x, -ends[i].y);
    const next = starts[(i + 1) % points.length];
    path.lineTo(next.x, -next.y);
  }
  path.closePath();
  return path;
}

function mappedUv(geometry, center, canvasWidth, canvasHeight) {
  const positions = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < positions.count; i++) {
    const x = center.x + positions.getX(i);
    const y = center.y - positions.getY(i);
    uv.setXY(i, clamp(x / canvasWidth, 0, 1), clamp(1 - y / canvasHeight, 0, 1));
  }
  uv.needsUpdate = true;
  return geometry;
}

function addGlow(material) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uFacetCursor = { value: pointerWorld };
    shader.uniforms.uFacetScale = { value: scale };
    shader.uniforms.uFacetGlow = { value: glow };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vFacetWorldPosition;");
    shader.vertexShader = shader.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvFacetWorldPosition = worldPosition.xyz;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uFacetCursor;\nuniform float uFacetScale;\nuniform float uFacetGlow;\nvarying vec3 vFacetWorldPosition;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      float facetDistance = distance(vFacetWorldPosition, uFacetCursor);
      totalEmissiveRadiance += vec3(.42,.37,.62) * .16 * exp(-1.6 * pow(facetDistance / (300.0 * uFacetScale), 2.0)) * uFacetGlow;`);
    material.userData.facetShader = shader;
  };
  material.customProgramCacheKey = () => "facet-soft-pointer-glow-v1";
}

function glassMaterial(iridescence = .55) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x17171b,
    roughness: .36,
    metalness: .08,
    clearcoat: .7,
    clearcoatRoughness: .12,
    specularIntensity: .7,
    iridescence,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [250, 650],
    envMapIntensity: 1,
    side: THREE.DoubleSide
  });
  addGlow(material);
  return material;
}

function makePiece(name, points, center, material, depth, bevel) {
  const local = points.map(point => ({ x: point.x - center.x, y: point.y - center.y }));
  const shape = roundedPolygon(local, 20 * scale);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6
  });
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  const decalGeometry = mappedUv(new THREE.ShapeGeometry(shape, 8), center, panelW, panelH);
  const decal = new THREE.Mesh(decalGeometry, new THREE.MeshBasicMaterial({
    map: pageTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2
  }));
  decal.position.z = depth + bevel + .12 * scale;
  decal.renderOrder = 2;
  mesh.add(decal);
  const piece = {
    name, mesh, material, center, localPoints: local, rest: new THREE.Vector3(), depth, bevel,
    lift: 0, liftVelocity: 0, targetLift: 0, targetRx: 0, targetRy: 0, rx: 0, ry: 0,
    anim: null, entryQuaternion: new THREE.Quaternion(), restQuaternion: new THREE.Quaternion()
  };
  mesh.userData.piece = piece;
  world.add(mesh);
  tileByMesh.set(mesh, piece);
  updatePieceGeometry(piece, points, center);
  return piece;
}

function updatePieceGeometry(piece, points, center) {
  const local = points.map(point => ({ x: point.x - center.x, y: point.y - center.y }));
  const shape = roundedPolygon(local, 20 * scale);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: piece.depth, bevelEnabled: true, bevelThickness: piece.bevel, bevelSize: piece.bevel, bevelSegments: 3, curveSegments: 6
  });
  geometry.computeVertexNormals();
  piece.mesh.geometry.dispose();
  piece.mesh.geometry = geometry;
  const decal = piece.mesh.children[0];
  decal.geometry.dispose();
  decal.geometry = mappedUv(new THREE.ShapeGeometry(shape, 8), center, panelW, panelH);
  piece.center = center;
  piece.localPoints = local;
  piece.rest.set(center.x - panelW / 2, panelY + panelH / 2 - center.y, 0);
  piece.mesh.position.set(piece.rest.x, piece.rest.y, piece.lift || 0);
}

function updateNavGeometry() {
  if (navPiece) {
    world.remove(navPiece.mesh);
    navPiece.mesh.geometry.dispose();
    navPiece.mesh.children.forEach(child => child.geometry.dispose());
    navPiece.material.dispose();
    tileByMesh.delete(navPiece.mesh);
  }
  navCanvas = makeCanvas(blockW, navH, drawNav);
  navTexture?.dispose();
  navTexture = navCanvas.texture;
  const rectangle = [
    { x: 20 * scale, y: 0 }, { x: blockW - 20 * scale, y: 0 },
    { x: blockW - 20 * scale, y: navH }, { x: 20 * scale, y: navH }
  ];
  const center = { x: blockW / 2, y: navH / 2 };
  const shape = roundedPolygon(rectangle.map(p => ({ x: p.x - center.x, y: p.y - center.y })), 20 * scale);
  const depth = 13 * scale, bevel = 2.6 * scale;
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 });
  const material = glassMaterial(.55);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "navigation-slab";
  mesh.position.set(0, navY, 0);
  const decalGeo = new THREE.ShapeGeometry(shape, 8);
  const uv = decalGeo.getAttribute("uv"), pos = decalGeo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) uv.setXY(i, clamp((pos.getX(i) + blockW / 2) / blockW, 0, 1), clamp(.5 + pos.getY(i) / navH, 0, 1));
  uv.needsUpdate = true;
  const decal = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ map: navTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  decal.position.z = depth + bevel + .12 * scale;
  decal.renderOrder = 2;
  mesh.add(decal);
  navPiece = { name: "nav", mesh, material, rest: mesh.position.clone(), depth, bevel, lift: 0, liftVelocity: 0, targetLift: 0, rx: 0, ry: 0, targetRx: 0, targetRy: 0, entryQuaternion: new THREE.Quaternion(), restQuaternion: new THREE.Quaternion() };
  mesh.userData.piece = navPiece;
  tileByMesh.set(mesh, navPiece);
  world.add(mesh);
}

function patternPoint(name, now) {
  const [x0, y0] = basePoints[name], seed = hashNumber(name);
  const boundary = y0 === 0 || y0 === 1;
  const periodX = 10 + seed * 10, periodY = 11 + (1 - seed) * 9;
  let x = x0 + Math.sin(now * Math.PI * 2 / periodX + seed * 8) * (boundary ? .03 : .03);
  let y = y0;
  if (!boundary) y += Math.sin(now * Math.PI * 2 / periodY + seed * 11) * .05;
  if (pointerInside && animationState === "hero") {
    const px = pointerLocal.x / panelW + .5;
    const py = .5 - (pointerLocal.y - panelY) / panelH;
    const dx = x - px, dy = (y - py) * panelH / panelW;
    const distance = Math.hypot(dx, dy);
    if (distance < .6 && distance > .0001) {
      const push = .05 * (1 - distance / .6);
      x += dx / distance * push;
      if (!boundary) y += dy / distance * push * panelW / panelH;
    }
  }
  return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
}

function rebuildCells(now) {
  const positions = {};
  Object.keys(basePoints).forEach(name => {
    const normalized = patternPoint(name, now);
    positions[name] = { x: normalized.x * panelW, y: normalized.y * panelH };
  });
  cellNames.forEach((names, i) => {
    const points = insetConvexPolygon(names.map(name => positions[name]), 7 * scale);
    const center = getCenter(points);
    updatePieceGeometry(pieces[i], points, center);
  });
}

function setOverlayLayout() {
  const textScale = window.innerWidth <= 700 ? Math.max(scale, .7) : Math.max(scale, .9);
  const titleSize = window.innerWidth <= 700
    ? Math.min(Math.max(panelW * .078, 42), panelH * .20)
    : Math.min(panelW * .078, panelH * .20);
  const pillWidth = window.innerWidth <= 700 ? Math.max(116 * scale, 104) : 116 * scale;
  const pillHeight = window.innerWidth <= 700 ? Math.max(40 * scale, 38) : 40 * scale;
  panelOverlay.style.width = `${panelW}px`;
  panelOverlay.style.height = `${panelH}px`;
  panelOverlay.style.left = "0";
  panelOverlay.style.top = "0";
  panelOverlay.style.setProperty("--eyebrow-size", `${Math.max(8, 11 * textScale)}px`);
  panelOverlay.style.setProperty("--title-size", `${titleSize}px`);
  panelOverlay.style.setProperty("--body-size", `${Math.max(10, 15 * textScale)}px`);
  panelOverlay.style.setProperty("--pill-width", `${pillWidth}px`);
  panelOverlay.style.setProperty("--pill-height", `${pillHeight}px`);
  panelOverlay.style.setProperty("--button-size", `${Math.max(10, 13 * textScale)}px`);
  panelOverlay.style.setProperty("--footer-size", `${Math.max(8, 11 * textScale)}px`);
  panelOverlay.style.setProperty("--read-gap", `${32 * scale}px`);
  navOverlay.style.width = `${blockW}px`;
  navOverlay.style.height = `${navH}px`;
  navOverlay.style.left = "0";
  navOverlay.style.top = "0";
}

function resize() {
  if (!renderer) return;
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.position.set(0, 0, h / (2 * Math.tan(THREE.MathUtils.degToRad(15))));
  camera.far = camera.position.z + Math.max(w, h) * 4;
  camera.updateProjectionMatrix();
  blockW = w * .89;
  blockH = w <= 700 ? h - 32 : h * .83;
  scale = blockW / 1730;
  navH = blockH * .108;
  gap = 14 * scale;
  panelW = blockW;
  panelH = blockH - navH - gap;
  navY = blockH / 2 - navH / 2;
  panelY = blockH / 2 - navH - gap - panelH / 2;
  setOverlayLayout();
  navTexture?.dispose();
  navCanvas = makeCanvas(blockW, navH, drawNav);
  navTexture = navCanvas.texture;
  if (navPiece) {
    navPiece.mesh.position.set(0, navY, 0);
    navPiece.rest.copy(navPiece.mesh.position);
    navPiece.mesh.children[0].material.map = navTexture;
    navPiece.mesh.children[0].material.needsUpdate = true;
    navPiece.mesh.geometry.dispose();
    const rect = [{ x: 20 * scale, y: 0 }, { x: blockW - 20 * scale, y: 0 }, { x: blockW - 20 * scale, y: navH }, { x: 20 * scale, y: navH }];
    const center = { x: blockW / 2, y: navH / 2 };
    const shape = roundedPolygon(rect.map(p => ({ x: p.x - center.x, y: p.y - center.y })), 20 * scale);
    navPiece.mesh.geometry = new THREE.ExtrudeGeometry(shape, { depth: navPiece.depth, bevelEnabled: true, bevelThickness: navPiece.bevel, bevelSize: navPiece.bevel, bevelSegments: 3, curveSegments: 6 });
    const decal = navPiece.mesh.children[0];
    decal.geometry.dispose();
    const decalGeometry = new THREE.ShapeGeometry(shape, 8);
    const uv = decalGeometry.getAttribute("uv"), pos = decalGeometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) uv.setXY(i, clamp((pos.getX(i) + blockW / 2) / blockW, 0, 1), clamp(.5 + pos.getY(i) / navH, 0, 1));
    uv.needsUpdate = true;
    decal.geometry = decalGeometry;
    decal.position.z = navPiece.depth + navPiece.bevel + .12 * scale;
  }
  if (pieces.length) {
    pageTexture?.dispose();
    pageCanvas = makeCanvas(panelW, panelH, drawPanel);
    pageTexture = pageCanvas.texture;
    pieces.forEach(piece => {
      piece.mesh.children[0].material.map = pageTexture;
      piece.mesh.children[0].material.needsUpdate = true;
      piece.depth = 13 * scale;
      piece.bevel = 2.6 * scale;
    });
    rebuildCells(time);
  }
  if (sliver) rebuildSliver();
  if (backCanvas) {
    backTexture?.dispose();
    backCanvas = makeCanvas(w, h, drawBack);
    backTexture = backCanvas.texture;
    if (sliver) sliver.mesh.children[0].material.map = backTexture;
  }
}

function createCells() {
  pageCanvas = makeCanvas(panelW, panelH, drawPanel);
  pageTexture = pageCanvas.texture;
  pieces = cellNames.map((names, i) => {
    const points = insetConvexPolygon(names.map(name => ({ x: basePoints[name][0] * panelW, y: basePoints[name][1] * panelH })), 7 * scale);
    return makePiece(`shard-${i + 1}`, points, getCenter(points), glassMaterial(.55), 13 * scale, 2.6 * scale);
  });
  rebuildCells(0);
}

function initFlight(piece) {
  const seed = hashNumber(piece.name + "entry");
  piece.entryOffset = new THREE.Vector3((seed - .5) * 240 * scale, (seed - .45) * 160 * scale, -400 * scale - seed * 300 * scale);
  piece.entryQuaternion.setFromEuler(new THREE.Euler((seed - .5) * .16, (seed - .5) * .22, (seed - .5) * .12));
  piece.mesh.position.copy(piece.rest).add(piece.entryOffset);
  piece.mesh.quaternion.copy(piece.entryQuaternion);
}

function addSliver() {
  if (sliver) return;
  backCanvas = makeCanvas(window.innerWidth, window.innerHeight, drawBack);
  backTexture = backCanvas.texture;
  const k = window.innerWidth / 1918;
  const viewPoints = [[.147, .243], [.252, .169], [.287, .277], [.151, .258]].map(([x, y]) => ({ x: x * window.innerWidth, y: y * window.innerHeight }));
  const center = getCenter(viewPoints);
  const local = viewPoints.map(p => ({ x: p.x - center.x, y: p.y - center.y }));
  const shape = roundedPolygon(local, 20 * k);
  const depth = 11 * k, bevel = 2.1 * k;
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 });
  const material = glassMaterial(.35);
  material.userData.noCursorGlow = true;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(center.x - window.innerWidth / 2, window.innerHeight / 2 - center.y, 0);
  const decalGeometry = new THREE.ShapeGeometry(shape, 8);
  const uv = decalGeometry.getAttribute("uv"), pos = decalGeometry.getAttribute("position");
  for (let i = 0; i < pos.count; i++) uv.setXY(i, clamp((center.x + pos.getX(i)) / window.innerWidth, 0, 1), clamp(1 - (center.y - pos.getY(i)) / window.innerHeight, 0, 1));
  uv.needsUpdate = true;
  const decal = new THREE.Mesh(decalGeometry, new THREE.MeshBasicMaterial({ map: backTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  decal.position.z = depth + bevel + .12 * k;
  decal.renderOrder = 8;
  mesh.add(decal);
  sliver = { name: "back-sliver", mesh, material, rest: mesh.position.clone(), depth, bevel, lift: 0, liftVelocity: 0, targetLift: 0, rx: .08, ry: -.16, targetRx: .08, targetRy: -.16, entryAt: performance.now() + 300, restQuaternion: new THREE.Quaternion() };
  sliverWorld.add(mesh);
  mesh.visible = false;
}

function drawBack(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${.0066 * width}px Inter, sans-serif`;
  ctx.fillStyle = canvasHover.nav === "Back" ? "#b9abff" : "rgba(255,255,255,.92)";
  ctx.fillText("← Back", .219 * width, .238 * height);
  ctx.textAlign = "left";
}

function rebuildSliver() {
  if (!sliver) return;
  sliverWorld.remove(sliver.mesh);
  sliver.mesh.geometry.dispose();
  sliver.mesh.children.forEach(child => child.geometry.dispose());
  sliver.material.dispose();
  tileByMesh.delete(sliver.mesh);
  sliver = null;
  addSliver();
}

function localPointerFromClient() {
  pointerNdc.set(pointerClient.x / window.innerWidth * 2 - 1, -(pointerClient.y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  world.updateMatrixWorld(true);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(world.getWorldQuaternion(new THREE.Quaternion())).normalize();
  const planeCenter = world.getWorldPosition(new THREE.Vector3());
  pageRayPlane.setFromNormalAndCoplanarPoint(normal, planeCenter);
  const hit = raycaster.ray.intersectPlane(pageRayPlane, tmpVector);
  if (hit) {
    pointerWorld.copy(hit);
    world.worldToLocal(pointerLocal.copy(hit));
  }
  const hits = raycaster.intersectObjects([navPiece?.mesh, ...pieces.map(piece => piece.mesh)].filter(Boolean), false);
  let next = hits.length ? tileByMesh.get(hits[0].object) : null;
  if (animationState !== "hero") next = null;
  if (next !== activePiece) {
    if (activePiece) { activePiece.targetLift = 0; activePiece.targetRx = 0; activePiece.targetRy = 0; }
    activePiece = next;
  }
  if (next && hit) {
    const localHit = world.worldToLocal(tmpVector2.copy(hit));
    const dx = clamp((localHit.x - next.rest.x) / (next === navPiece ? blockW / 2 : panelW / 2), -1, 1);
    const dy = clamp((localHit.y - next.rest.y) / (next === navPiece ? navH / 2 : panelH / 2), -1, 1);
    next.targetLift = next === navPiece ? 32 * scale : 50 * scale;
    next.targetRy = -dx * .24;
    next.targetRx = dy * .24;
  }
}

function projectPoint(x, y, z) {
  tmpVector.set(x, y, z).applyMatrix4(world.matrixWorld).project(camera);
  return { x: (tmpVector.x * .5 + .5) * window.innerWidth, y: (-tmpVector.y * .5 + .5) * window.innerHeight };
}

function homographyMatrix(corners, width, height) {
  const [p0, p1, p2, p3] = corners;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  let g = 0, h = 0;
  const den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(dx3) + Math.abs(dy3) > 1e-7 && Math.abs(den) > 1e-7) {
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  const a = p1.x - p0.x + g * p1.x;
  const b = p1.y - p0.y + g * p1.y;
  const c = p3.x - p0.x + h * p3.x;
  const d = p3.y - p0.y + h * p3.y;
  const e = p0.x, f = p0.y;
  return `matrix3d(${a / width},${b / width},0,${g / width},${c / height},${d / height},0,${h / height},0,0,1,0,${e},${f},0,1)`;
}

function updatePlaneOverlay(element, x, y, width, height, z) {
  const corners = [
    projectPoint(x, y, z), projectPoint(x + width, y, z),
    projectPoint(x + width, y - height, z), projectPoint(x, y - height, z)
  ];
  element.style.transform = homographyMatrix(corners, width, height);
}

function updateDomProjection(now) {
  if (animationState === "hero" || animationState === "loading" || animationState === "shattering" || animationState === "reassembling") {
    const navZ = navPiece.depth + navPiece.bevel + .12 * scale + navPiece.lift;
    const panelZ = 13 * scale + 2.6 * scale + .12 * scale;
    updatePlaneOverlay(navOverlay, -blockW / 2, navY + navH / 2, blockW, navH, navZ);
    updatePlaneOverlay(panelOverlay, -panelW / 2, panelY + panelH / 2, panelW, panelH, panelZ);
  }
  if (sliver && backButton) {
      const halfW = window.innerWidth * .07, halfH = window.innerHeight * .054;
    const q = sliver.mesh.quaternion;
    const corners = [
      [-halfW, halfH], [halfW, halfH], [halfW, -halfH], [-halfW, -halfH]
    ].map(([x, y]) => {
      tmpVector.set(x, y, sliver.depth + sliver.bevel + .12).applyQuaternion(q).add(sliver.mesh.position).applyMatrix4(sliverWorld.matrixWorld).project(camera);
      return { x: (tmpVector.x * .5 + .5) * window.innerWidth, y: (-tmpVector.y * .5 + .5) * window.innerHeight };
    });
    backButton.style.left = "0";
    backButton.style.top = "0";
    backButton.style.width = `${halfW * 2}px`;
    backButton.style.height = `${halfH * 2}px`;
    backButton.style.transform = homographyMatrix(corners, halfW * 2, halfH * 2);
    backButton.style.transformOrigin = "0 0";
  }
}

function animateEntry(now) {
  const duration = 720;
  let finished = true;
  [navPiece, ...pieces].forEach((piece, index) => {
    const progress = clamp((now - animationStart - index * 30) / duration, 0, 1);
    if (progress < 1) finished = false;
    const factor = 1 - easeOutBack(progress);
    piece.mesh.position.copy(piece.rest).addScaledVector(piece.entryOffset || new THREE.Vector3(), factor);
    tmpQuat.identity().slerp(piece.entryQuaternion || new THREE.Quaternion(), 1 - progress);
    piece.mesh.quaternion.copy(tmpQuat);
  });
  if (finished) animationState = "hero";
}

function startShatter() {
  if (animationState !== "hero") return;
  animationState = "shattering";
  dom.style.display = "none";
  animationStart = performance.now();
  activePiece = null;
  glow = 0;
  [navPiece, ...pieces].forEach((piece, index) => {
    const center = piece.rest;
    const radial = new THREE.Vector2(center.x, center.y).normalize();
    if (!radial.length()) radial.set(index % 2 ? 1 : -1, .2);
    piece.flight = {
      vx: (radial.x * random(180, 360) + random(-80, 80)) * scale,
      vy: -random(100, 240) * scale,
      gravity: 700 * scale,
      vz: random(420, 800) * scale / .72,
      axis: new THREE.Vector3(random(-1, 1), random(-1, 1), random(-1, 1)).normalize(),
      angle: random(2, 3.6),
      delay: index * 24,
      startPosition: piece.mesh.position.clone(),
      startQuaternion: piece.mesh.quaternion.clone()
    };
  });
  addSliver();
  sliver.entryAt = animationStart + 300;
  window.setTimeout(() => {
    if (animationState !== "shattering") return;
    definitions.classList.add("visible");
    definitions.setAttribute("aria-hidden", "false");
  }, 280);
}

function animateShatter(now) {
  const duration = 720;
  let finished = true;
  [navPiece, ...pieces].forEach(piece => {
    const flight = piece.flight;
    const progress = clamp((now - animationStart - flight.delay) / duration, 0, 1);
    if (progress < 1) finished = false;
    const elapsed = duration * easeInCubic(progress) / 1000;
    piece.mesh.position.set(
      flight.startPosition.x + flight.vx * elapsed,
      flight.startPosition.y + flight.vy * elapsed - .5 * flight.gravity * elapsed * elapsed,
      flight.startPosition.z + flight.vz * elapsed
    );
    tmpAxis.copy(flight.axis);
    tmpQuat.setFromAxisAngle(tmpAxis, flight.angle * easeInCubic(progress));
    piece.mesh.quaternion.copy(flight.startQuaternion).multiply(tmpQuat);
  });
  if (finished) {
    animationState = "paper";
    [navPiece, ...pieces].forEach(piece => { piece.mesh.visible = false; });
  }
}

function startReassembly() {
  if (!renderer) {
    definitions.classList.remove("visible");
    definitions.setAttribute("aria-hidden", "true");
    return;
  }
  if (animationState !== "paper") return;
  definitions.classList.remove("visible");
  definitions.setAttribute("aria-hidden", "true");
  animationState = "reassembling";
  animationStart = performance.now();
  if (sliver) sliver.entryAt = animationStart;
  [navPiece, ...pieces].forEach(piece => { piece.mesh.visible = true; });
}

function animateReassembly(now) {
  const duration = 720;
  let finished = true;
  [navPiece, ...pieces].forEach(piece => {
    const flight = piece.flight;
    if (!flight) {
      piece.mesh.position.copy(piece.rest);
      return;
    }
    const progress = clamp((now - animationStart - flight.delay) / duration, 0, 1);
    if (progress < 1) finished = false;
    const factor = 1 - easeOutBack(progress);
    const elapsed = duration / 1000;
    const dx = flight.vx * elapsed;
    const dy = flight.vy * elapsed - .5 * flight.gravity * elapsed * elapsed;
    const dz = flight.vz * elapsed;
    piece.mesh.position.set(piece.rest.x + dx * factor, piece.rest.y + dy * factor, piece.rest.z + dz * factor);
    tmpQuat.setFromAxisAngle(flight.axis, flight.angle * factor);
    piece.mesh.quaternion.copy(flight.startQuaternion).multiply(tmpQuat);
  });
  if (finished) {
    [navPiece, ...pieces].forEach(piece => {
      piece.mesh.position.copy(piece.rest);
      piece.mesh.quaternion.identity();
      piece.flight = null;
      piece.lift = 0; piece.liftVelocity = 0; piece.targetLift = 0;
      piece.rx = 0; piece.ry = 0;
    });
    if (sliver) {
      sliverWorld.remove(sliver.mesh);
      sliver.mesh.geometry.dispose();
      sliver.mesh.children.forEach(child => child.geometry.dispose());
      sliver.material.dispose();
      sliver = null;
    }
    dom.style.display = "";
    animationState = "hero";
  }
}

function updateHover(piece, dt, now) {
  const stiffness = 170, damping = 19;
  const acceleration = stiffness * (piece.targetLift - piece.lift) - damping * piece.liftVelocity;
  piece.liftVelocity += acceleration * dt;
  piece.lift += piece.liftVelocity * dt;
  piece.rx = THREE.MathUtils.damp(piece.rx, piece.targetRx, 14, dt);
  piece.ry = THREE.MathUtils.damp(piece.ry, piece.targetRy, 14, dt);
  if (piece.name === "back-sliver") {
    const idleX = Math.sin(now * .0011) * .03;
    const idleY = Math.cos(now * .0009) * .04;
    piece.mesh.position.copy(piece.rest);
    piece.mesh.position.z = piece.lift;
    piece.mesh.rotation.set(.08 + idleX + piece.rx, -.16 + idleY + piece.ry, Math.sin(now * .001) * .012);
    if (animationState === "reassembling") piece.mesh.scale.setScalar(clamp(1 - (now - animationStart) / 300, 0, 1));
    return;
  }
  piece.mesh.position.copy(piece.rest);
  piece.mesh.position.z += piece.lift;
  piece.mesh.rotation.set(piece.rx, piece.ry, 0);
  const hover = piece === activePiece ? 1 : 0;
  piece.material.iridescence = THREE.MathUtils.damp(piece.material.iridescence, lerp(.55, 1, hover), 8, dt);
  piece.material.envMapIntensity = THREE.MathUtils.damp(piece.material.envMapIntensity, lerp(1, 1.9, hover), 8, dt);
}

function updateShaderUniforms() {
  [...(navPiece ? [navPiece] : []), ...pieces, ...(sliver ? [sliver] : [])].forEach(piece => {
    const shader = piece.material.userData.facetShader;
    if (!shader) return;
    shader.uniforms.uFacetCursor.value.copy(pointerWorld);
    shader.uniforms.uFacetScale.value = scale;
    shader.uniforms.uFacetGlow.value = piece === sliver ? 0 : glow;
  });
}

function updateCanvasHover() {
  const x = pointerInside ? (pointerLocal.x + panelW / 2) / panelW : -1;
  const y = pointerInside ? (panelY + panelH / 2 - pointerLocal.y) / panelH : -1;
  const pillLeft = .095, pillTop = .74;
  const pillW = (window.innerWidth <= 700 ? Math.max(116 * scale, 104) : 116 * scale) / panelW;
  const pillH = (window.innerWidth <= 700 ? Math.max(40 * scale, 38) : 40 * scale) / panelH;
  const open = pointerInside && animationState === "hero" && x >= pillLeft && x <= pillLeft + pillW && y >= pillTop && y <= pillTop + pillH;
  const readLeft = pillLeft + pillW + 32 * scale / panelW;
  const paper = pointerInside && animationState === "hero" && x >= readLeft && x <= readLeft + 130 * scale / panelW && y >= pillTop - .01 && y <= pillTop + pillH + .02;
  if (open !== canvasHover.open || paper !== canvasHover.paper) {
    canvasHover.open = open;
    canvasHover.paper = paper;
    pageCanvas = makeCanvas(panelW, panelH, drawPanel);
    pageTexture.dispose();
    pageTexture = pageCanvas.texture;
    pieces.forEach(piece => {
      piece.mesh.children[0].material.map = pageTexture;
      piece.mesh.children[0].material.needsUpdate = true;
    });
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.04, Math.max(.001, (now - (lastFrame || now)) / 1000));
  lastFrame = now;
  time += dt;
  if (!pointerInside && activePiece) {
    activePiece.targetLift = 0; activePiece.targetRx = 0; activePiece.targetRy = 0; activePiece = null;
  }
  const pointerX = pointerInside ? (pointerClient.x / window.innerWidth - .5) * 2 : 0;
  const pointerY = pointerInside ? (pointerClient.y / window.innerHeight - .5) * 2 : 0;
  const targetY = pointerInside ? THREE.MathUtils.degToRad(pointerX * 7 - 1.2) : THREE.MathUtils.degToRad(-1.2);
  const targetX = pointerInside ? THREE.MathUtils.degToRad(-pointerY * 5.5 + .8) : THREE.MathUtils.degToRad(.8);
  world.rotation.y = THREE.MathUtils.damp(world.rotation.y, targetY, 1 / .3, dt);
  world.rotation.x = THREE.MathUtils.damp(world.rotation.x, targetX, 1 / .3, dt);
  if (animationState === "loading") animateEntry(now);
  if (animationState === "shattering") animateShatter(now);
  if (animationState === "reassembling") animateReassembly(now);
  if (animationState === "hero") {
    [navPiece, ...pieces].forEach(piece => updateHover(piece, dt, now));
    if (now - lastBuild >= 1000 / 45) {
      rebuildCells(time);
      lastBuild = now;
    }
  }
  if (sliver && (animationState === "paper" || animationState === "shattering")) {
    const elapsed = now - sliver.entryAt;
    sliver.mesh.visible = elapsed >= 0;
    sliver.mesh.scale.setScalar(clamp(elapsed / 220, 0, 1));
    if (animationState === "paper") {
      const over = backButton.matches(":hover");
      sliver.targetLift = over ? 20 * scale : 0;
      sliver.targetRx = over ? -.14 : 0;
      sliver.targetRy = over ? .12 : 0;
      updateHover(sliver, dt, now);
      sliver.material.envMapIntensity = THREE.MathUtils.damp(sliver.material.envMapIntensity, over ? 1.9 : 1, 8, dt);
      sliver.material.iridescence = THREE.MathUtils.damp(sliver.material.iridescence, over ? .9 : .35, 8, dt);
    }
  }
  if (pointerInside) {
    localPointerFromClient();
    glow = THREE.MathUtils.damp(glow, animationState === "hero" ? 1 : 0, 5, dt);
  } else glow = THREE.MathUtils.damp(glow, 0, 5, dt);
  if (sliver && animationState === "reassembling") updateHover(sliver, dt, now);
  updateCanvasHover();
  world.updateMatrixWorld(true);
  updateDomProjection(now);
  updateShaderUniforms();
  renderer.render(scene, camera);
}

function bindInteractions() {
  window.addEventListener("pointermove", event => {
    pointerInside = true;
    pointerClient = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  document.addEventListener("pointerleave", () => { pointerInside = false; }, { passive: true });
  window.addEventListener("blur", () => { pointerInside = false; });
  document.addEventListener("click", event => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "paper") {
      event.preventDefault();
      if (renderer) startShatter();
      else { definitions.classList.add("visible"); definitions.setAttribute("aria-hidden", "false"); }
    }
    if (action === "studio") { event.preventDefault(); if (!dialog.open) dialog.showModal(); }
  });
  backButton.addEventListener("click", startReassembly);
  $("#studio-dialog .dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  $("#studio-form").addEventListener("submit", submitProjectBrief);
  window.addEventListener("resize", resize);
  document.addEventListener("pointerover", event => {
    if (animationState !== "paper") return;
    const target = event.target.closest("#back-button");
    if (target && backCanvas) {
      canvasHover.nav = "Back";
      const next = makeCanvas(window.innerWidth, window.innerHeight, drawBack);
      backTexture.dispose(); backCanvas = next; backTexture = next.texture;
      if (sliver) sliver.mesh.children[0].material.map = backTexture;
    }
  });
  document.addEventListener("pointerout", event => {
    if (event.target.closest("#back-button") && canvasHover.nav === "Back") {
      canvasHover.nav = "";
      const next = makeCanvas(window.innerWidth, window.innerHeight, drawBack);
      backTexture.dispose(); backCanvas = next; backTexture = next.texture;
      if (sliver) sliver.mesh.children[0].material.map = backTexture;
    }
  });
}

async function submitProjectBrief(event) {
  event.preventDefault();
  const form = event.currentTarget, button = $("#form-submit"), status = $("#form-status");
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  data.service = "Something custom";
  data.budget = "Not sure yet";
  data.timeline = "Flexible";
  button.disabled = true;
  button.textContent = "Sending brief…";
  status.classList.remove("success", "error");
  status.textContent = "Submitting your project request securely…";
  try {
    const response = await fetch("/api/service-tickets", {
      method: "POST",
      headers: { "content-type": "application/json", "x-requested-with": "crown" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Your project request could not be submitted.");
    form.reset();
    status.textContent = `Request received. Your project reference is ${result.reference || "received"}. Keep it for your records.`;
    status.classList.add("success");
    button.textContent = "Brief submitted ✓";
  } catch (error) {
    status.textContent = error.message || "Something went wrong. Please try again.";
    status.classList.add("error");
    button.disabled = false;
    button.textContent = "Try submitting again ↗";
  }
}

function showStaticFallback(error) {
  if (error) console.warn("Facet WebGL hero unavailable; showing the static version.", error);
  document.body.classList.remove("webgl-ready");
  fallback.hidden = false;
  $("#facet-canvas").hidden = true;
  bindInteractions();
}

async function start() {
  if (reducedMotion) {
    bindInteractions();
    return;
  }
  try {
    [THREE, { RoomEnvironment }] = await Promise.all([
      import("three"),
      import("three/addons/environments/RoomEnvironment.js")
    ]);
    pointerLocal = new THREE.Vector3();
    pointerWorld = new THREE.Vector3();
    pageRayPlane = new THREE.Plane();
    raycaster = new THREE.Raycaster();
    pointerNdc = new THREE.Vector2();
    tmpVector = new THREE.Vector3();
    tmpVector2 = new THREE.Vector3();
    tmpQuat = new THREE.Quaternion();
    tmpAxis = new THREE.Vector3();
    await document.fonts.ready;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x050507, 1);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507);
    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 10000);
    world = new THREE.Group();
    scene.add(world);
    sliverWorld = new THREE.Group();
    scene.add(sliverWorld);
    pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;
    scene.environmentIntensity = .42;
    const key = new THREE.DirectionalLight(0xe4eaff, 3.2);
    key.position.set(-window.innerWidth * .42, window.innerHeight * .48, 620);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8e82bd, .55);
    fill.position.set(window.innerWidth * .36, -window.innerHeight * .2, 450);
    scene.add(fill);
    resize();
    updateNavGeometry();
    createCells();
    [navPiece, ...pieces].forEach(initFlight);
    animationState = "loading";
    animationStart = performance.now() + 60;
    document.body.classList.add("webgl-ready");
    fallback.hidden = true;
    bindInteractions();
    requestAnimationFrame(frame);
  } catch (error) {
    showStaticFallback(error);
  }
}

start().catch(showStaticFallback);
