/* CrownPVP feature layer. Every feature here works in the browser with no backend. */
(() => {
const CP = window.CP, C = window.CROWN; if (!CP || !C) return;
const { $, $$, esc, fmt, toast } = CP, page = document.body.dataset.page;
const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } } };

/* ---------- scroll progress + back to top ---------- */
{
  const bar = document.createElement("div"); bar.id = "scroll-bar"; bar.setAttribute("aria-hidden", "true");
  const up = document.createElement("button"); up.id = "to-top"; up.type = "button"; up.setAttribute("aria-label", "Back to top"); up.textContent = "↑";
  document.body.append(bar, up);
  let tick = false;
  const update = () => { tick = false; const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; up.classList.toggle("on", scrollY > 700); };
  addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true }); update();
  up.onclick = () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

/* ---------- reveal on scroll ---------- */
if ("IntersectionObserver" in window && !reduce) {
  const targets = $$(".section-head, .mode-card, .feature, .tool, .link-grid a, .server-panel, .play-grid > *, .gold-calc, .steps3 > div, .rules-intro, .acc details");
  document.documentElement.classList.add("rv-on");
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .08, rootMargin: "0px 0px -40px 0px" });
  targets.forEach((t, i) => { t.classList.add("rv"); t.style.transitionDelay = Math.min(i % 4, 3) * 70 + "ms"; io.observe(t); });
  setTimeout(() => targets.forEach(t => t.classList.add("in")), 6000);
}

/* ---------- live server status (refreshes every minute) ---------- */
const state = { data: null, ping: null, at: 0 };
const listeners = [];
async function loadStatus() {
  if (!C.statusApi) return;
  const t0 = performance.now();
  try {
    const r = await fetch(C.statusApi, { cache: "no-store" }); const d = await r.json();
    state.data = d; state.ping = Math.round(performance.now() - t0); state.at = Date.now();
  } catch { state.data = null; state.ping = null; }
  paintStatus();
}
function paintStatus() {
  const d = state.data, dot = $("#hdot"); if (dot) dot.classList.toggle("on", !!d?.online);
  const st = $("#status");
  if (st) {
    st.innerHTML = !d ? "Live status is currently unavailable." : d.online ? `<i class="live-dot"></i> <b>${fmt(d.players?.online ?? 0)}</b> of ${fmt(d.players?.max ?? 0)} players online` : "Server status: offline";
    let chips = $(".status-chips", st.parentElement);
    if (!chips) { chips = document.createElement("div"); chips.className = "status-chips"; st.after(chips); }
    chips.innerHTML = d?.online ? `${d.version ? `<span>Version <b>${esc(String(d.version).replace(/^[^\d]*/, "") || d.version)}</b></span>` : ""}<span>Updated <b>${new Date(state.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b></span><span>Auto-refresh <b>60s</b></span>` : "";
  }
  $$("[data-online]").forEach(e => { e.textContent = !d ? "n/a" : d.online ? fmt(d.players?.online ?? 0) : "Offline"; });
  listeners.forEach(f => f());
}
CP.status.then(d => { state.data = d; state.at = Date.now(); paintStatus(); });
setInterval(() => { if (!document.hidden) loadStatus(); }, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - state.at > 60000) loadStatus(); });

/* ---------- home: interactive "Play on CrownPVP" card ---------- */
const card = $("#play-card");
if (card) {
  const list = $("#mc-list"), join = $("#mc-join"), input = $("#join-address"), done = $("#play-done");
  let added = false, selected = false;
  const motd = () => { const m = state.data?.motd?.clean; return (Array.isArray(m) && m[0]) || "Semi-OP Factions · Raid · Build · Rule"; };
  const meta = () => { const d = state.data; if (!d) return `<span class="mc-meta">Status unavailable</span>`; if (!d.online) return `<span class="mc-meta" style="color:#f55">Can't connect<i class="mc-bars off"><i></i><i></i><i></i><i></i><i></i></i></span>`;
    return `<span class="mc-meta">${fmt(d.players?.online ?? 0)}/${fmt(d.players?.max ?? 0)}<i class="mc-bars"><i></i><i></i><i></i><i></i><i></i></i></span>`; };
  const row = () => `<div class="mc-server${selected ? " sel" : ""}" id="mc-row" tabindex="0" role="button" aria-label="CrownPVP server"><img src="assets/icon-192.png" alt="" width="56" height="56"><div><b>CrownPVP</b><span>${esc(motd())}</span><span>${esc(C.ip)}</span></div>${meta()}</div>`;
  const paint = () => { if (!added) return; list.innerHTML = row(); };
  listeners.push(paint);
  const select = on => { selected = on; join.disabled = !on; $("#mc-row")?.classList.toggle("sel", on); };
  const addServer = () => {
    if (!added) { added = true; list.innerHTML = row(); select(true); }
    else select(true);
  };
  list.addEventListener("click", e => { if (e.target.closest("#mc-row")) select(!selected); });
  list.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.id === "mc-row") { e.preventDefault(); select(!selected); } });
  done.addEventListener("click", () => {
    addServer(); const old = done.textContent; done.classList.add("done"); done.textContent = "Copied! Server added →";
    setTimeout(() => { done.classList.remove("done"); done.textContent = old; }, 2200);
    if (matchMedia("(max-width:860px)").matches) $("#mc-window").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#mc-add").addEventListener("click", () => { addServer(); input.focus(); toast("Server added. Now press Join Server."); });
  $("#mc-direct").addEventListener("click", async () => { try { await navigator.clipboard.writeText(C.ip); } catch { /* clipboard blocked */ } toast("Direct Connection: paste " + C.ip); });
  join.addEventListener("click", async () => { try { await navigator.clipboard.writeText(C.ip); } catch { /* clipboard blocked */ } toast("Open Minecraft → Multiplayer → join " + C.ip); });
  /* type the address in once when the card scrolls into view */
  if (!reduce && "IntersectionObserver" in window) {
    const full = C.ip; input.value = "";
    const io = new IntersectionObserver(es => { if (!es[0].isIntersecting) return; io.disconnect(); let i = 0; const t = setInterval(() => { input.value = full.slice(0, ++i); if (i >= full.length) clearInterval(t); }, 55); }, { threshold: .5 });
    io.observe(card); setTimeout(() => { if (input.value.length < full.length && !card.dataset.t) { input.value = full; } }, 9000);
  }
}

/* ---------- store: gold calculator ---------- */
const storeEl = $("#store");
if (storeEl && $("#pk")) {
  const RATE = 250, packs = (C.gold || []).map(p => ({ key: p[0], name: p[1], usd: p[2], gold: Math.round(p[2] * RATE) }));
  const box = document.createElement("div"); box.className = "gold-calc";
  box.innerHTML = `<h2>Gold calculator</h2><p>Work out how much Gold your budget buys, or how much you need to spend for a target. Rate: ${RATE} Gold per $1.</p>
  <div class="gc-row"><label>Amount in ${esc(C.currency)}<input id="gc-usd" inputmode="decimal" autocomplete="off" placeholder="25"></label><span class="gc-eq" aria-hidden="true">⇄</span><label>Gold coins<input id="gc-gold" inputmode="numeric" autocomplete="off" placeholder="6,250"></label></div>
  <div class="gc-chips" role="group" aria-label="Quick amounts">${[10, 25, 50, 100, 250, 500].map(v => `<button type="button" data-gc="${v}">${esc(C.currency)}${v}</button>`).join("")}</div>
  <div class="gc-result" id="gc-result" aria-live="polite">Enter an amount to see the closest pack.</div>`;
  $("#pk").after(box);
  const usd = $("#gc-usd"), gold = $("#gc-gold"), res = $("#gc-result");
  const num = s => Number(String(s).replace(/[^0-9.]/g, "")) || 0;
  const show = (u, from) => {
    u = Math.max(0, Math.min(100000, u));
    if (from !== "usd") usd.value = u ? String(Math.round(u * 100) / 100) : "";
    if (from !== "gold") gold.value = u ? fmt(Math.round(u * RATE)) : "";
    if (!u) { res.textContent = "Enter an amount to see the closest pack."; return; }
    const g = Math.round(u * RATE), best = packs.reduce((a, p) => Math.abs(p.gold - g) < Math.abs(a.gold - g) ? p : a, packs[0]);
    const exact = best && best.gold === g;
    res.innerHTML = `<span><b>${fmt(g)} Gold</b> for <b>${esc(C.currency)}${Math.round(u * 100) / 100}</b></span>${best ? `<span>${exact ? "Exact pack" : "Closest pack"}: <b>${esc(best.name)}</b> · ${fmt(best.gold)} Gold · ${esc(C.currency)}${best.usd}</span><button type="button" class="btn ghost" data-gc-add="${esc(best.key)}" style="padding:8px 16px;font-size:.8rem">Add ${esc(best.name)} to cart</button>` : ""}`;
  };
  usd.addEventListener("input", () => show(num(usd.value), "usd"));
  gold.addEventListener("input", () => { const g = num(gold.value); show(g / RATE, "gold"); });
  box.addEventListener("click", e => {
    const c = e.target.closest("[data-gc]"); if (c) return show(Number(c.dataset.gc));
    const a = e.target.closest("[data-gc-add]"); if (a) CP.cart.add(a.dataset.gcAdd);
  });
}

/* ---------- FAQ: search + expand/collapse ---------- */
if (page === "faq") {
  const acc = $(".acc[data-acc]");
  if (acc) {
    const bar = document.createElement("div"); bar.className = "search-bar";
    bar.innerHTML = `<input type="search" id="faq-q" placeholder="Search questions… (try “gold”, “appeal”, “IP”)" aria-label="Search questions" autocomplete="off"><button type="button" id="faq-ex">Expand all</button><button type="button" id="faq-co">Collapse all</button>`;
    acc.before(bar);
    const none = document.createElement("div"); none.className = "no-match"; none.hidden = true; none.textContent = "No questions match your search. Ask in our Discord and we will help."; acc.after(none);
    const items = () => $$("details", acc);
    $("#faq-q").addEventListener("input", e => {
      const q = e.target.value.trim().toLowerCase(); let n = 0;
      items().forEach(d => { const hit = !q || d.textContent.toLowerCase().includes(q); d.hidden = !hit; if (hit) n++; if (q && hit) d.open = true; });
      none.hidden = n > 0;
    });
    $("#faq-ex").onclick = () => items().forEach(d => { if (!d.hidden) d.open = true; });
    $("#faq-co").onclick = () => items().forEach(d => { d.open = false; });
  }
}

/* ---------- stats: recent searches ---------- */
if (page === "stats") {
  const form = $("#stats-search"), input = $("#sk-name");
  if (form && input) {
    const KEY = "crown_recent"; let names = []; try { names = JSON.parse(store.get(KEY) || "[]").filter(n => /^\w{3,16}$/.test(n)); } catch { names = []; }
    const wrap = document.createElement("div"); wrap.className = "recent-chips"; form.after(wrap);
    const paint = () => { wrap.hidden = !names.length; wrap.innerHTML = names.length ? `<small>RECENT</small>${names.map(n => `<button type="button" data-n="${esc(n)}"><img src="${CP.head(n, 20)}" alt="" width="20" height="20">${esc(n)}</button>`).join("")}<button type="button" data-clear aria-label="Clear recent searches">Clear</button>` : ""; };
    const remember = n => { n = (n || "").trim(); if (!/^\w{3,16}$/.test(n)) return; names = [n, ...names.filter(x => x.toLowerCase() !== n.toLowerCase())].slice(0, 6); store.set(KEY, JSON.stringify(names)); paint(); };
    form.addEventListener("submit", () => remember(input.value));
    wrap.addEventListener("click", e => {
      if (e.target.closest("[data-clear]")) { names = []; store.set(KEY, "[]"); return paint(); }
      const b = e.target.closest("[data-n]"); if (b) { input.value = b.dataset.n; form.requestSubmit(); }
    });
    paint();
    const initial = new URLSearchParams(location.search).get("player"); if (initial) remember(initial);
  }
}

/* ---------- staff: live openings count + deep link ---------- */
if (location.hash === "#apply") setTimeout(() => $("#apply")?.scrollIntoView({ behavior: "smooth" }), 300);
/* ---------- cursor spotlight on cards ---------- */
if (!matchMedia("(prefers-reduced-motion: reduce)").matches && matchMedia("(hover: hover)").matches) {
  document.querySelectorAll(".mode-card,.cta-card,.tool,.feature,.merch-card,.vote-row,.lcard,.devcard,.link-grid a,.dc-card").forEach(c => {
    if (getComputedStyle(c).position === "static") c.style.position = "relative";
    const g = document.createElement("i"); g.className = "spot-glow"; g.setAttribute("aria-hidden", "true"); c.append(g);
    c.addEventListener("pointermove", e => { const r = c.getBoundingClientRect(); g.style.setProperty("--mx", (e.clientX - r.left) + "px"); g.style.setProperty("--my", (e.clientY - r.top) + "px"); }, { passive: true });
  });
}
/* ---------- Minecraft-style welcome advancement (once per visit) ---------- */
try {
  if (!sessionStorage.getItem("crown_adv")) {
    sessionStorage.setItem("crown_adv", "1");
    setTimeout(() => { const t = document.createElement("div"); t.className = "adv"; t.setAttribute("role", "status"); t.innerHTML = '<img src="assets/favicon-48.png" alt=""><div><b>Advancement Made!</b><span>Welcome to the CrownPVP realm</span></div>'; document.body.append(t); setTimeout(() => t.remove(), 6000); }, 1400);
  }
} catch { /* storage blocked */ }
/* ---------- conversion helpers: follow-along join bar, final call to action, copy toast ---------- */
(() => {
  const C = window.CROWN, esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const adv = (a, b) => { document.querySelector(".adv")?.remove(); const t = document.createElement("div"); t.className = "adv"; t.setAttribute("role", "status"); t.innerHTML = `<img src="assets/favicon-48.png" alt=""><div><b>${esc(a)}</b><span>${esc(b)}</span></div>`; document.body.append(t); setTimeout(() => t.remove(), 6000); };
  document.addEventListener("click", e => { if (e.target.closest("[data-copy],[data-copy-server]")) setTimeout(() => adv("Advancement Made!", "Server IP copied: " + C.ip), 120); });
  const foot = document.querySelector("footer");
  if (foot && document.body.dataset.page !== "tickets") {
    const s = document.createElement("section"); s.className = "final-cta";
    s.innerHTML = `<div class="wrap"><div class="eyebrow">YOUR LEGACY STARTS HERE</div><h2>Claim the <span class="gold-t">crown</span></h2><p>Join CrownPVP on Java 1.8+ to 26+ and start building your base today.</p><div class="ip big"><code>${esc(C.ip)}</code><button type="button" data-copy>Copy IP</button></div><div class="row"><a class="btn gold" href="${esc(C.discord)}" target="_blank" rel="noopener">Join Discord</a><a class="btn ghost" href="vote.html">Vote</a><a class="btn ghost" href="merch.html">Merch</a></div></div>`;
    foot.before(s);
  }
  const bar = document.createElement("div"); bar.className = "joinbar"; bar.innerHTML = `<span>Play now</span><code>${esc(C.ip)}</code><button type="button" class="btn gold sm" data-copy>Copy IP</button>`; document.body.append(bar);
  const upd = () => bar.classList.toggle("show", scrollY > 700 && scrollY + innerHeight < document.body.scrollHeight - 160); addEventListener("scroll", upd, { passive: true }); upd();
})();
})();
