(() => {
const C = window.CROWN, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const page = document.body.dataset.page;
/* Show clean addresses: /store instead of /store.html, and / instead of /index.html. The .html pages still work. */
try { const clean = location.pathname.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, ""); if (clean !== location.pathname) history.replaceState(null, "", clean + location.search + location.hash); } catch { /* ignore */ }
const fmt = n => n.toLocaleString("en-US");
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nav = [["index.html","Home","home"],["client.html","Client","client"],["store.html","Store","store"],["merch.html","Merch","merch"],["vote.html","Vote","vote"],["staff.html","Staff","staff"],["rules.html","Rules","rules"],["punishments.html","Punishments","punishments"],["player.html","Players","player"],["tickets.html","Support","tickets"]];
const MS = "";
const CART_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="18" cy="20.5" r="1.2"/></svg>`;

/* ---------- shared helpers for every page ---------- */
const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("on"), 2600); };
const api = async (p, o = {}) => {
  const r = await fetch("/api" + p, { method: o.method || "GET", credentials: "same-origin",
    headers: o.body ? { "content-type": "application/json", "x-requested-with": "crown" } : { "x-requested-with": "crown" }, body: o.body ? JSON.stringify(o.body) : undefined });
  let d = null; try { d = await r.json(); } catch { /* not json */ }
  if (!r.ok || d === null) throw Object.assign(new Error(d?.error || "The server is not reachable right now."), { status: r.status, data: d });
  return d;
};
const date = ms => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(ms).map(x => [x.type, x.value]));
  return `${p.month} ${p.day}, ${p.year}, ${p.hour}:${p.minute}`;
};
const ago = ms => { const s = Math.max(1, (Date.now() - ms) / 1000), u = [[31536000,"y"],[2592000,"mo"],[86400,"d"],[3600,"h"],[60,"m"]]; for (const [n, l] of u) if (s >= n) return Math.floor(s / n) + l + " ago"; return "just now"; };
const clean = s => String(s || "").replace(/[&§][0-9a-fk-orA-FK-OR]/g, "").trim();
const head = (id, size = 32) => `https://mc-heads.net/avatar/${encodeURIComponent(id)}/${size}`;
const ready = Promise.resolve({ user: null, login: false, checkout: false, up: false });
const loginUrl = () => "";
const pill = p => p.status === "none" ? "" : `<span class="pill ${p.status === "active" && p.permanent ? "perm" : p.status}">${p.status === "active" ? (p.permanent ? "Permanent" : "Active") : p.status === "removed" ? "Removed" : "Expired"}</span>`;
const expires = p => p.permanent ? (p.status === "none" ? "&mdash;" : "Never") : date(p.until);
const CP = window.CP = { $, $$, esc, fmt, toast, api, date, ago, clean, head, ready, loginUrl, MS, pill, expires };

/* ---------- Accounts + alerts (only when Supabase is configured in config.js) ---------- */
CP.authReady = new Promise(r => { CP._authResolve = r; });
if (C.supabaseUrl && C.supabaseKey) {
  const lib = document.createElement("script");
  lib.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  lib.onload = () => { const a = document.createElement("script"); a.src = "js/auth.js"; a.onerror = () => CP._authResolve(null); document.head.append(a); };
  lib.onerror = () => CP._authResolve(null);
  document.head.append(lib);
} else CP._authResolve(null);

/* ---------- Layout ---------- */
$("#site-header").outerHTML = `<div class="partner-bar"><div class="wrap"><span><i></i> OPEN FOR PARTNERSHIP</span><a href="tickets.html?new=1&amp;topic=Partnership&amp;title=Partnership%20request">Discuss a partnership <b>↗</b></a></div></div>
<header><div class="wrap"><a class="logo" href="index.html" aria-label="CrownPVP home"><img src="assets/logo.svg" alt=""><b>CrownPVP</b></a>
<nav id="nav" aria-label="Main">${nav.map(n => `<a href="${n[0]}"${n[2] === page ? ' class="on" aria-current="page"' : ""}>${n[1]}</a>`).join("")}</nav>
<div class="hr"><button class="ippill" data-copy aria-label="Copy server IP"><i class="dot" id="hdot"></i><code>${C.ip}</code></button><span id="acct-slot"></span><button id="cart-btn" class="ib" aria-label="Open cart">${CART_ICON}<span id="cart-n" class="bd" hidden>0</span></button><button id="burger" aria-label="Open menu" aria-expanded="false">&#9776;</button></div></div></header>
<div id="scrim"></div>
<aside id="cart" class="drawer" aria-hidden="true" aria-label="Shopping cart"><div class="dh"><h3>Your cart</h3><button class="ib" data-cart-close aria-label="Close cart">&times;</button></div><div class="db" id="cart-items"></div><div class="df" id="cart-foot"></div></aside>`;
$("#site-footer").outerHTML = `<footer><div class="wrap"><div class="fg"><div><a class="logo" href="index.html"><img src="assets/logo.svg" alt=""><b>CrownPVP</b></a>
<p style="margin-top:12px">Semi-OP Factions. Build your base, back your team and fight for the top.</p>
<div class="ip" style="margin:16px 0 0"><code>${C.ip}</code><button data-copy>Copy IP</button></div></div>
<div><h3>Explore</h3>${nav.map(n => `<a href="${n[0]}">${n[1]}</a>`).join("")}</div>
<div><h3>Community</h3><a href="${C.discord}" target="_blank" rel="noopener">Join Discord</a><a href="store.html">Gold Store</a><a href="support.html">Report a player</a><a href="appeals.html">Appeal a punishment</a><a href="player.html">Player lookup</a><a href="faq.html">FAQ</a><a href="staff.html#apply">Staff applications</a><a href="${esc(C.supportChannel || C.discord)}" target="_blank" rel="noopener">Store &amp; community support</a></div></div>
<div class="copy"><span>&copy; ${new Date().getFullYear()} CrownPVP. All rights reserved. <small class="ver">${esc(C.siteVersion || "")}</small></span><span>Developed by <b>Raizukennn</b> · We are not affiliated with Mojang Studios or Microsoft.</span></div></div></footer><div id="toast" role="status"></div>`;
$("#burger").onclick = e => { const o = $("#nav").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", o); };
document.addEventListener("click", async e => {
  const joinCopy = e.target.closest("[data-copy-server]");
  if (joinCopy) {
    e.preventDefault();
    try { await navigator.clipboard.writeText(C.ip); toast("Copied " + C.ip); }
    catch { const i = document.createElement("input"); i.value = C.ip; document.body.append(i); i.select(); document.execCommand("copy"); i.remove(); toast("Copied " + C.ip); }
    return;
  }
  if (!e.target.closest("[data-copy]")) return;
  e.preventDefault();
  try { await navigator.clipboard.writeText(C.ip); toast("Copied " + C.ip); }
  catch { const i = document.createElement("input"); i.value = C.ip; document.body.append(i); i.select(); document.execCommand("copy"); i.remove(); toast("Copied " + C.ip); }
});
$$("[data-discord]").forEach(a => { a.href = C.discord; a.target = "_blank"; a.rel = "noopener"; });
$$("[data-ip]").forEach(e => e.textContent = C.ip);
const serverAddressInput = $("[data-server-address]"); if (serverAddressInput) serverAddressInput.value = C.ip;

/* Account linking is intentionally disabled. No external account sign-in is used on this website. */
/* ---------- Animated realm background ---------- */
{
  const bg = document.createElement("div"); bg.id = "bg"; bg.setAttribute("aria-hidden", "true");
  bg.innerHTML = '<i class="aur a1"></i><i class="aur a2"></i><i class="aur a3"></i><i class="grid"></i><i class="spot"></i><i class="vig"></i>';
  document.body.prepend(bg);
  if (!matchMedia("(prefers-reduced-motion:reduce)").matches) {
    addEventListener("pointermove", e => { bg.style.setProperty("--mx", e.clientX + "px"); bg.style.setProperty("--my", e.clientY + "px"); }, { passive: true });
    const cv = document.createElement("canvas"); cv.id = "embers"; document.body.prepend(cv);
    const x = cv.getContext("2d"); let w, h, sy = 0; const rs = () => { w = cv.width = innerWidth; h = cv.height = innerHeight; }; rs(); addEventListener("resize", rs);
    addEventListener("scroll", () => { sy = scrollY; }, { passive: true });
    const R = Math.random, stars = Array.from({ length: 90 }, () => ({ x: R(), y: R(), r: R() * 1.1 + .3, s: R() * 6, z: R() * .6 + .1 }));
    const em = Array.from({ length: 60 }, () => ({ x: R() * 2400, y: R() * 1400, r: R() * 2.2 + .6, v: R() * .55 + .15, a: R() * .5 + .2, s: R() * 6, c: R() < .65 ? "245,215,110" : "184,154,255" }));
    (function f(t) {
      x.clearRect(0, 0, w, h);
      stars.forEach(o => { const yy = ((o.y * h - sy * o.z * .15) % h + h) % h, k = .25 + .55 * Math.abs(Math.sin(t / 1400 + o.s)); x.fillStyle = `rgba(225,210,255,${k})`; x.fillRect(o.x * w, yy, o.r, o.r); });
      em.forEach(o => { o.y -= o.v; o.x += Math.sin(o.y / 55 + o.s) * .35; if (o.y < -10) { o.y = h + 10; o.x = R() * w; }
        const px = o.x % w, k = o.a * (.65 + .35 * Math.sin(t / 700 + o.s)), g = x.createRadialGradient(px, o.y, 0, px, o.y, o.r * 5);
        g.addColorStop(0, `rgba(${o.c},${k})`); g.addColorStop(.35, `rgba(${o.c},${k * .4})`); g.addColorStop(1, `rgba(${o.c},0)`);
        x.fillStyle = g; x.beginPath(); x.arc(px, o.y, o.r * 5, 0, 7); x.fill(); });
      requestAnimationFrame(f);
    })(0);
  }
}

/* ---------- Live status (real API only, fetched once and shared) ---------- */
CP.status = C.statusApi ? fetch(C.statusApi).then(r => r.json()).catch(() => null) : Promise.resolve(null);
CP.status.then(d => {
  const dot = $("#hdot"); if (dot) dot.classList.toggle("on", !!d?.online);
  const st = $("#status");
  if (st) st.innerHTML = !d ? "Live status is currently unavailable." : d.online ? `<i class="live-dot"></i> <b>${fmt(d.players?.online ?? 0)}</b> of ${fmt(d.players?.max ?? 0)} players online` : "Server status: offline";
  $$("[data-online]").forEach(e => e.textContent = !d ? "n/a" : d.online ? fmt(d.players?.online ?? 0) : "Offline");
});

/* ---------- Accordion data ---------- */
const P = t => `<span class="ph">${t}</span>`;
const acc = (el, items) => { el.innerHTML = items.map((i, n) => `<details${n === 0 && el.dataset.open ? " open" : ""}><summary>${i[0]}</summary><div>${i[1]}</div></details>`).join(""); };
const rules = [
 ["General Rules", `<ul><li>Respect every player and staff member.</li><li>Do not impersonate staff or other players.</li><li>Do not advertise other servers or stores.</li><li>Staff decisions can be appealed on our <a href="appeals.html">Appeals page</a>.</li></ul>${P("Final wording pending administrator approval.")}`],
 ["Chat Rules", `<ul><li>No harassment, hate speech or targeted abuse.</li><li>No spamming or excessive caps.</li><li>No sharing personal information.</li></ul>${P("Final wording pending administrator approval.")}`],
 ["Gameplay Rules", `<ul><li>Play fairly and compete on skill and effort.</li><li>No scamming players outside of approved server mechanics.</li></ul>${P("Additional rules to be added by administrators.")}`],
 ["Factions Rules", `<ul><li>Faction names and descriptions must follow the chat rules.</li><li>Claims must be placed using normal server mechanics.</li></ul>${P("Team size limits, alliance limits and claim rules: to be confirmed.")}`],
 ["Raiding Rules", `<ul><li>Raiding and TNT cannoning are core gameplay and allowed within the rules.</li></ul>${P("Offline raiding, cannon and glitch rules: to be confirmed.")}`],
 ["Exploits and Cheating", `<ul><li>No hacked clients, x-ray or unfair modifications.</li><li>Report bugs to staff instead of abusing them.</li></ul>${P("Allowed client modifications list: to be confirmed.")}`],
 ["Punishments and Appeals", `<p>Punishments depend on the severity of the offense. Every ban, mute, kick and warning is listed publicly on the <a href="punishments.html">Punishments page</a>. ${P("Official punishment durations: to be announced by administrators.")}</p><p style="margin-top:10px">To appeal a ban or mute, contact staff through our <a href="appeals.html">Appeals page</a>.</p>`]
];
const faq = [
 ["What is CrownPVP?","A competitive Semi-OP Factions server built around raiding, base building, grinding, economy, PvP and faction competition."],
 ["What is the server IP?",`<b>${C.ip}</b>. <a href="#" data-copy>Copy it</a> and add it in Minecraft Multiplayer.`],
 ["How do I join?",`Open Minecraft, choose Multiplayer, add the server with the IP ${C.ip}, and join. Our <a href="${C.discord}" target="_blank" rel="noopener">Discord</a> has the latest version info.`],
 ["Is CrownPVP pay-to-win?","No. CrownPVP is built on competitive gameplay and fair progression. Gold Coins are the in-game currency you can also earn by playing."],
 ["How do I buy Gold Coins?","Open the <a href='store.html'>Store</a>, add packages to your cart, enter your Minecraft username and pay with PayPal. Put the order code in the payment note and share it in store support on Discord. Staff deliver your Gold after confirming the payment."],
 ["Can I link an account here?","No external account sign-in is used on this website."],
 ["How do I appeal a ban or mute?","Contact staff through the <a href='appeals.html'>Appeals page</a> and include your username and punishment details."],
 ["How do FTop rewards work?","Factions compete for the top spots on the Factions Top leaderboard. Weekly, monthly and yearly winners receive the rewards listed on the <a href='index.html#ftop'>homepage</a>."],
 ["Where can I get support?",`Join our <a href="${C.discord}" target="_blank" rel="noopener">Discord</a> and ask in the support channels.`],
 ["How do I report a player?","Report in Discord with the player name, what happened, the time, and screenshots or video as proof."],
 ["Will CrownPVP add other game modes?","CrownPVP is starting with OP Factions. SMP and other community-requested game modes may be introduced in the future."]
];
$$("[data-acc]").forEach(el => acc(el, el.dataset.acc === "rules" ? rules : el.dataset.acc === "faq" ? faq : faq.slice(0, 5)));
document.addEventListener("click", e => { const a = e.target.closest("a[data-copy]"); if (a) e.preventDefault(); });

/* ---------- Catalog and cart ---------- */
const cats = [["gold","Gold Coins"]];
const PPNAME = (() => { const n = String(C.paypalMe || "").trim().replace(/^(https?:\/\/)?(www\.)?(paypal\.me\/|paypal\.com\/paypalme\/)/i, "").split(/[/?#]/)[0]; return /^[A-Za-z0-9._-]{1,60}$/.test(n) ? n : ""; })();
const PAY = !C.tebexToken && !!PPNAME;
const pkgId = k => { const u = C.tebex[k]; if (typeof u === "number") return String(u); const m = typeof u === "string" && (u.match(/\/package\/(\d+)/) || u.match(/^(\d+)$/)); return m ? m[1] : (PAY ? k : null); };
const pkgUrl = k => { const u = C.tebex[k]; return typeof u === "string" && /^https:\/\//.test(u) ? u : null; };
const catalog = {};
cats.forEach(([c]) => (C[c] || []).forEach(p => { catalog[p[0]] = { key: p[0], cat: c, name: p[1], price: p[2], gold: c === "gold" ? Math.round(p[2] * 250) : 0, id: pkgId(p[0]), url: pkgUrl(p[0]) }; }));
const itemName = i => i.gold ? `${fmt(i.gold)} Gold Coins` : i.name;
const KEY = "crown_cart";
let cart = {};
try { const o = JSON.parse(localStorage.getItem(KEY) || "{}"); if (o && typeof o === "object") cart = o; } catch { /* storage blocked */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* storage blocked */ } };
const lines = () => Object.entries(cart).filter(([k, q]) => catalog[k]?.id && q > 0).map(([k, q]) => ({ ...catalog[k], qty: Math.min(10, q) }));
const money = n => C.currency + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0 });
const setQty = (k, q) => { q = Math.max(0, Math.min(10, q)); if (q) cart[k] = q; else delete cart[k]; persist(); renderCart(); };
const openCart = (o = true) => { const d = $("#cart"); d.classList.toggle("open", o); d.setAttribute("aria-hidden", !o); $("#scrim").classList.toggle("on", o); document.body.classList.toggle("lock", o); if (o) $("[data-cart-close]", d).focus(); };
CP.cart = { add: k => { if (!catalog[k]?.id) return toast("That package is not available yet."); setQty(k, (cart[k] || 0) + 1); toast(`Added ${itemName(catalog[k])} to your cart`); }, open: openCart, clear: () => { cart = {}; persist(); renderCart(); } };
$("#cart-btn").onclick = () => openCart(true);
$("#scrim").onclick = () => openCart(false);
document.addEventListener("keydown", e => { if (e.key === "Escape") openCart(false); });
document.addEventListener("click", e => {
  const add = e.target.closest("[data-add]"); if (add) return CP.cart.add(add.dataset.add);
  if (e.target.closest("[data-cart-close]")) return openCart(false);
  const q = e.target.closest("[data-q]"); if (q) { const [k, d] = q.dataset.q.split(":"); return setQty(k, (cart[k] || 0) + Number(d)); }
  const rm = e.target.closest("[data-rm]"); if (rm) return setQty(rm.dataset.rm, 0);
  if (e.target.closest("[data-checkout]")) return checkout();
});
function renderCart() {
  const ls = lines(), n = ls.reduce((a, l) => a + l.qty, 0), total = ls.reduce((a, l) => a + l.qty * l.price, 0), gold = ls.reduce((a, l) => a + l.qty * l.gold, 0);
  const b = $("#cart-n"); b.hidden = !n; b.textContent = n;
  $("#cart-items").innerHTML = ls.length ? ls.map(l => `<div class="ci"><div class="coin sm" aria-hidden="true"></div><div class="cn"><b>${esc(itemName(l))}</b><small>${l.gold ? esc(l.name) + " · " : ""}${money(l.price)} each</small><div class="qty"><button data-q="${l.key}:-1" aria-label="Fewer">&minus;</button><span>${l.qty}</span><button data-q="${l.key}:1" aria-label="More" ${l.qty >= 10 ? "disabled" : ""}>+</button><button class="rm" data-rm="${l.key}">Remove</button></div></div><div class="cp">${money(l.price * l.qty)}</div></div>`).join("") : `<div class="empty"><h3>Your cart is empty</h3><p style="margin-top:8px">Pick a package in the <a href="store.html">Store</a>.</p></div>`;
  if (!ls.length) { $("#cart-foot").innerHTML = ""; return; }
  const links = ls.filter(l => l.url).map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(itemName(l))}</a>`).join(" · ");
  const live = !!C.tebexToken || PAY, saved = (() => { try { return localStorage.getItem("crown_user") || ""; } catch { return ""; } })();
  $("#cart-foot").innerHTML = `${gold ? `<div class="tl"><span>Total Gold</span><b>${fmt(gold)}</b></div>` : ""}<div class="tl big"><span>Total</span><b>${money(total)}</b></div>
  ${live ? `<label class="cu" for="cart-user">Minecraft username</label><div class="cuw"><img id="cart-head" src="${head(saved || "Steve", 32)}" alt="" width="32" height="32"><input id="cart-user" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Your in-game name" value="${esc(saved)}"></div><button class="btn wide" data-checkout>${PAY ? "Pay with PayPal" : "Checkout with Tebex"}</button><p class="cm" id="cart-msg" aria-live="polite"></p>`
  : links ? `<p class="cs">Open each package on the official Tebex store and enter your Minecraft username there.</p><div class="cart-links">${links}</div>` : `<p class="cm">Store checkout is not configured yet. The cart is ready, but purchases are currently unavailable.</p>`}
  ${PAY ? `<p class="cs">Pay with PayPal, then include your order code in the payment note. Staff deliver your Gold after they confirm the payment.</p>` : `<p class="cs">Payments are handled securely by Tebex. Gold is delivered after payment is confirmed.</p>`}`;
}
document.addEventListener("input", e => {
  if (e.target.id !== "cart-user") return;
  const v = e.target.value.trim(), h = $("#cart-head");
  if (h && /^\w{3,16}$/.test(v)) h.src = head(v, 32);
});
async function checkout() {
  const ls = lines(), msg = $("#cart-msg"), say = t => { if (msg) msg.textContent = t; else toast(t); };
  if (!ls.length) return say("Your cart is empty.");
  if (PAY) return payPal(ls, say);
  if (!C.tebexToken) { if (ls.length === 1 && ls[0].url) window.open(ls[0].url, "_blank", "noopener"); else say("Choose a package link in your cart to continue."); return; }
  const name = ($("#cart-user")?.value || "").trim();
  if (!/^\w{3,16}$/.test(name)) return say("Enter your Minecraft username (3-16 letters, numbers or _).");
  try { localStorage.setItem("crown_user", name); } catch { /* storage blocked */ }
  const btn = $("[data-checkout]"); btn.disabled = true; btn.textContent = "Creating your basket...";
  const T = "https://headless.tebex.io/api", J = { "content-type": "application/json", accept: "application/json" };
  try {
    const here = location.origin + location.pathname.replace(/[^/]*$/, "");
    let r = await fetch(`${T}/accounts/${encodeURIComponent(C.tebexToken)}/baskets`, { method: "POST", headers: J,
      body: JSON.stringify({ username: name, complete_url: here + "store.html?paid=1", cancel_url: here + "store.html", complete_auto_redirect: true }) });
    const readTebex = async response => { const raw = await response.text(); let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { /* upstream returned an empty or non-JSON response */ } return { data, raw }; };
    let parsed = await readTebex(r); const basket = parsed.data?.data;
    if (!r.ok || !basket?.ident) throw new Error(parsed.data?.error || "Tebex returned an invalid response. Check the Headless token and store configuration.");
    for (const l of ls) {
      r = await fetch(`${T}/baskets/${encodeURIComponent(basket.ident)}/packages`, { method: "POST", headers: J, body: JSON.stringify({ package_id: Number(l.id), quantity: l.qty }) });
      parsed = await readTebex(r);
      if (!r.ok || (parsed.data && parsed.data.status === "error")) throw new Error(parsed.data?.error || `Tebex could not add ${itemName(l)}. Check its package ID in js/config.js.`);
    }
    const url = basket.links?.checkout;
    if (!/^https:\/\//.test(url || "")) throw new Error("Tebex did not return a checkout link.");
    location.href = url;
  } catch (e) {
    btn.disabled = false; btn.textContent = "Checkout with Tebex";
    say(e.message || "Checkout failed. Please try again or ask on Discord.");
  }
}

/* PayPal.Me checkout: opens PayPal for the exact total and shows an order code the player puts in the payment note.
   There is no automatic confirmation: staff check PayPal, then give the Gold. */
function payPal(ls, say) {
  const name = ($("#cart-user")?.value || "").trim();
  if (!/^\w{3,16}$/.test(name)) return say("Enter your Minecraft username (3-16 letters, numbers or _).");
  try { localStorage.setItem("crown_user", name); } catch { /* storage blocked */ }
  const total = Math.round(ls.reduce((a, l) => a + l.qty * l.price, 0) * 100) / 100;
  const gold = ls.reduce((a, l) => a + l.qty * l.gold, 0);
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", code = "CPVP-" + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => A[b % 32]).join("");
  const cur = /^[A-Z]{3}$/.test(C.paypalCurrency || "") ? C.paypalCurrency : "USD";
  const url = `https://www.paypal.com/paypalme/${PPNAME}/${total}${cur}`;
  const items = ls.map(l => `${l.qty} x ${itemName(l)}`).join(", ");
  const details = `Order: ${code}\nMinecraft username: ${name}\nItems: ${items} (${fmt(gold)} Gold)\nTotal: ${money(total)} ${cur}`;
  window.open(url, "_blank", "noopener");
  $("#cart-foot").innerHTML = `<div class="ppbox">
    <small>YOUR ORDER CODE</small><code>${code}</code>
    <div class="ppsum"><span>${esc(name)}</span><span>${fmt(gold)} Gold</span><b>${money(total)}</b></div>
  </div>
  <ol class="ppsteps">
    <li><b>Pay on PayPal.</b> A new tab opened with the exact amount. <a href="${esc(url)}" target="_blank" rel="noopener">Open PayPal again</a></li>
    <li><b>Add a note</b> with <b>${esc(name)}</b> and <b>${code}</b>.</li>
    <li><b>Tell staff.</b> Copy your order details and send them with a screenshot in <a href="${esc(C.supportChannel)}" target="_blank" rel="noopener">store support on Discord</a>.</li>
  </ol>
  <button class="btn wide" data-pp-copy="${esc(details)}">Copy order details</button>
  <button class="btn ghost wide" data-pp-done style="margin-top:8px">I have paid, clear my cart</button>
  <button class="btn ghost wide" data-pp-back style="margin-top:8px">Back to cart</button>
  <p class="cs">Staff deliver your Gold after they confirm the payment. Keep your order code until it arrives.</p>`;
}
document.addEventListener("click", e => {
  const c = e.target.closest("[data-pp-copy]");
  if (c) { const ok = () => toast("Order details copied"); (navigator.clipboard ? navigator.clipboard.writeText(c.dataset.ppCopy).then(ok, () => toast("Could not copy. Select the text instead.")) : toast("Could not copy. Select the text instead.")); }
  if (e.target.closest("[data-pp-done]")) CP.cart.clear();
  if (e.target.closest("[data-pp-back]")) renderCart();
});

renderCart();

/* ---------- Store (Gold Coins only) ---------- */
const store = $("#store");
if (store) {
  const list = C.gold || [], best = list.length - 1;
  $("#pk").innerHTML = list.map((p, i) => {
    const it = catalog[p[0]];
    return `<article class="card pk${i === best ? " top" : ""}${i === 3 ? " pop" : ""}"><div class="coins" aria-hidden="true">${"<i></i>".repeat(Math.min(5, 1 + Math.floor(i / 2)))}</div>
    <div class="amt">${fmt(it.gold)}<small>GOLD COINS</small></div><h3>${esc(p[1])}</h3>
    <div class="pr">${money(p[2])}</div>
    ${it.id ? `<button class="btn" data-add="${esc(p[0])}">Add to cart</button>` : `<span class="btn" aria-disabled="true" title="Package link not configured">Currently unavailable</span>`}</article>`;
  }).join("");
  if (new URLSearchParams(location.search).has("paid")) { CP.cart.clear(); $("#paid").hidden = false; }
}

/* ---------- Home: gold teaser ---------- */
const gt = $("#gold-teaser");
if (gt) gt.innerHTML = (C.gold || []).slice(0, 4).map((p, i) => `<a class="card pk${i === 3 ? " pop" : ""}" href="store.html"><div class="coins" aria-hidden="true">${"<i></i>".repeat(1 + i)}</div><div class="amt">${fmt(Math.round(p[2] * 250))}<small>GOLD COINS</small></div><div class="pr">${money(p[2])}</div></a>`).join("");

/* ---------- Skin viewer ---------- */
const sk = $("#skin");
if (sk) {
  const inp = $("#sk-name"), cv = $("#sk-canvas"), fb = $("#sk-fb"); let v, mode = "walk";
  const anim = m => { if (!v) return; mode = m; $$("[data-a]").forEach(b => b.classList.toggle("on", b.dataset.a === m));
    if (m === "idle") v.animation = new skinview3d.IdleAnimation(); else if (m === "walk") v.animation = new skinview3d.WalkingAnimation(); else if (m === "run") v.animation = new skinview3d.RunningAnimation(); else v.animation = null; };
  const load = name => {
    name = (name || "").trim();
    if (!/^\w{3,16}$/.test(name)) return toast("Enter a valid Minecraft username (3-16 characters).");
    const enc = encodeURIComponent(name), url = `https://mc-heads.net/skin/${enc}`;
    inp.value = name; $("#sk-title").textContent = name;
    try { const u = new URL(location.href); u.searchParams.set("player", name); history.replaceState({}, "", u.pathname + u.search + u.hash); } catch { /* optional */ }
    $("#sk-dl").href = url; $("#sk-dl").download = name + ".png";
    $("#sk-head").src = `https://mc-heads.net/head/${enc}/96`; $("#sk-avatar").src = `https://mc-heads.net/avatar/${enc}/96`;
    fb.querySelector("img").src = `https://mc-heads.net/body/${enc}/340`; fb.hidden = false; cv.hidden = true;
    if (!window.skinview3d) return;
    try {
      if (!v) { v = new skinview3d.SkinViewer({canvas: cv, width: 320, height: 420}); v.autoRotate = true; v.autoRotateSpeed = .5; v.zoom = .85; v.fov = 40; anim("walk"); }
      v.loadSkin(url).then(() => { cv.hidden = false; fb.hidden = true; }).catch(() => { cv.hidden = true; fb.hidden = false; });
    } catch { cv.hidden = true; fb.hidden = false; }
  };
  const searchForm = $("#stats-search");
  if (searchForm) searchForm.addEventListener("submit", e => { e.preventDefault(); load(inp.value); });
  else $("#sk-go").onclick = () => load(inp.value);
  inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); load(inp.value); } };
  $$("[data-a]").forEach(b => b.onclick = () => anim(b.dataset.a));
  $("#sk-rot").onclick = e => { if (!v) return; v.autoRotate = !v.autoRotate; e.target.classList.toggle("on", v.autoRotate); };
  const initialName = new URLSearchParams(location.search).get("player") || "";
  if (initialName) { inp.value = initialName; load(initialName); }
}
})();
