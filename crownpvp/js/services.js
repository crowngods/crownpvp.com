/* CrownPVP /service: web development services, sample projects, pricing. Orders go through a support ticket. */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
try { const p = location.pathname.replace(/\.html$/, ""); if (p !== location.pathname) history.replaceState(null, "", p + location.search + location.hash); } catch {}
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const T = item => `tickets.html?new=1&topic=${encodeURIComponent("Website services")}&item=${encodeURIComponent(item)}`;

const SAMPLES = [
  { id: "lexora", url: "lexora.law", name: "Lexora Law Firm", desc: "A trust-first legal services website with practice areas, testimonials and a consultation booking button.", code: ["<header class=\"hero\">", "  <h1>Justice. Professionalism.</h1>", "  <a href=\"#book\">Get Consultation</a>", "</header>"] },
  { id: "gamevortex", url: "gamevortex.gg", name: "GameVortex", desc: "A gaming platform with a high-energy hero, community links and a store built for fast checkout.", code: ["const hero = new Scene('vortex');", "hero.glow('#7c3aed');", "store.enable('instant-delivery');", "hero.play();"] },
  { id: "agrinova", url: "agrinova.farm", name: "AgriNova", desc: "An agriculture solutions site with a calm green identity, clear services and a strong call to action.", code: ["@media (min-width: 900px) {", "  .hero { display: grid; }", "}", ".cta { background: #3f9b2f; }"] },
  { id: "shopnest", url: "shopnest.store", name: "ShopNest", desc: "A full e-commerce store with product pages, cart, secure payments and a sale banner that converts.", code: ["POST /api/checkout", "stripe.paymentIntents.create({", "  amount: cart.total,", "});"] },
  { id: "travelora", url: "travelora.travel", name: "Travelora", desc: "A travel and tourism site with destination packages, deals and a trip planner.", code: ["SELECT * FROM packages", "WHERE destination = 'amalfi'", "ORDER BY rating DESC", "LIMIT 6;"] }
];
const imgs = () => SAMPLES.map((s, i) => `<img src="assets/sample-${s.id}.webp" alt="${i ? "" : ""}${esc(s.name)} website concept" width="488" height="342" ${i ? 'loading="lazy"' : ""}>`).join("");

/* shared rotating browser stage */
function stage(view, urlEl, opts) {
  view.innerHTML = imgs();
  const im = $$("img", view); let cur = -1, timer;
  const go = i => {
    i = (i + SAMPLES.length) % SAMPLES.length; if (i === cur) return;
    im.forEach((x, k) => x.classList.toggle("on", k === i)); cur = i;
    view.classList.remove("sweep"); void view.offsetWidth; view.classList.add("sweep");
    urlEl.textContent = SAMPLES[i].url; opts.onChange?.(i, SAMPLES[i]);
    clearTimeout(timer); if (!RM) timer = setTimeout(() => go(i + 1), opts.ms);
  };
  go(0); return { go, stop: () => clearTimeout(timer), next: () => go(cur + 1) };
}

/* hero: images + typed code */
const code = $("#hero-code"); let typing = 0;
const type = lines => {
  const id = ++typing; let l = 0, c = 0; code.textContent = "";
  const tick = () => { if (id !== typing) return;
    if (l >= lines.length) return;
    c++; code.textContent = lines.slice(0, l).join("\n") + (l ? "\n" : "") + lines[l].slice(0, c);
    if (c >= lines[l].length) { l++; c = 0; setTimeout(tick, 220); } else setTimeout(tick, RM ? 0 : 28); };
  RM ? code.textContent = lines.join("\n") : tick();
};
stage($("#hero-view"), $("#hero-url"), { ms: 5200, onChange: (i, s) => type(s.code) });

/* 3D tilt on the hero stage */
const hs = $("#hero-show"), hf = $(".sv-frame", hs);
if (!RM && matchMedia("(hover:hover)").matches) {
  hs.addEventListener("pointermove", e => { const r = hs.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; hf.style.transform = `rotateY(${-7 + x * 14}deg) rotateX(${3 - y * 10}deg)`; });
  hs.addEventListener("pointerleave", () => hf.style.transform = "");
}

/* showcase with tabs + progress */
const ws = $("#work-show"), wt = $("#work-tabs");
wt.innerHTML = SAMPLES.map((s, i) => `<button type="button" role="tab" data-i="${i}"><b>${esc(s.name)}</b><small>${esc(s.url)}</small></button>`).join("");
const tabs = $$("button", wt); ws.style.setProperty("--dur", "6s");
const W = stage($("#work-view"), $("#work-url"), { ms: 6000, onChange: (i, s) => {
  tabs.forEach((b, k) => { b.classList.remove("on"); if (k === i) { void b.offsetWidth; b.classList.add("on"); } b.setAttribute("aria-selected", k === i); });
  $("#work-name").textContent = s.name; $("#work-desc").textContent = s.desc; $("#work-cta").href = T("Custom website like " + s.name);
} });
wt.addEventListener("click", e => { const b = e.target.closest("button"); if (b) W.go(+b.dataset.i); });
ws.addEventListener("pointerenter", () => { ws.classList.add("pause"); W.stop(); });
ws.addEventListener("pointerleave", () => { ws.classList.remove("pause"); W.next(); });

/* content */
const CARDS = [
  [`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`, "Frontend & UI Development", "Turning designs into fast, responsive, and accessible user interfaces that work seamlessly on every screen size."],
  [`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5M3 17.5 12 22l9-4.5"/></svg>`, "Full-Stack Web Applications", "Building complete, scalable web apps from the front-end interface to back-end APIs and database architecture."],
  [`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/></svg>`, "API & Payment Integration", "Connecting your website with third-party tools, payment processors, and custom APIs to automate workflows."],
  [`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>`, "Speed Optimization & Maintenance", "Fixing bugs, improving load speeds, and keeping your website secure, updated, and running smoothly."]
];
const CORE = [
  ["Custom Website Development", "Fast, modern websites built from scratch for your brand and goals."],
  ["Responsive & Mobile-First Design", "Sites that look and work smoothly on desktops, tablets, and smartphones."],
  ["Landing Page Creation", "High-converting single-page sites for launches, campaigns, or portfolios."],
  ["Website Redesign & Modernization", "Outdated sites updated with cleaner layouts, better UX, and modern code."],
  ["Performance & Speed Optimization", "Faster page loads, better Core Web Vitals, and a more responsive site."],
  ["Website Maintenance & Bug Fixing", "Ongoing updates, security patches, broken link fixes, and technical support."]
];
const FULL = [
  ["Full-Stack Web Application Development", "End-to-end custom web apps covering the interface, server logic, and database."],
  ["API Development & Third-Party Integrations", "Custom REST or GraphQL APIs, plus Stripe, PayPal, email tools, and maps."],
  ["Database Design & Management", "Structured, optimized PostgreSQL, MySQL, or MongoDB databases for reliable storage."],
  ["User Authentication & Role Management", "Secure sign-ups, logins, password resets, and permission levels."],
  ["Admin Dashboards & CMS Integration", "Control panels or headless CMS setups so you can manage your own content."],
  ["Deployment & Hosting Setup", "Launch on Vercel, Netlify, AWS, or DigitalOcean with a custom domain and SSL."]
];
const rv = (h, i) => h.replace("<", `<`).replace(/^<(\w+)/, `<$1 style="--i:${i}"`);
$("#svc-cards").innerHTML = CARDS.map((c, i) => `<article class="sv-card rv" style="--i:${i}"><div class="ic" aria-hidden="true">${c[0]}</div><h3>${esc(c[1])}</h3><p>${esc(c[2])}</p></article>`).join("");
const li = (a) => a.map((x, i) => `<li class="rv" style="--i:${i}"><b>${esc(x[0])}</b>${esc(x[1])}</li>`).join("");
$("#core-list").innerHTML = li(CORE); $("#full-list").innerHTML = li(FULL);
const TECH = ["REST", "GRAPHQL", "STRIPE", "PAYPAL", "POSTGRESQL", "MYSQL", "MONGODB", "VERCEL", "NETLIFY", "AWS", "DIGITALOCEAN", "SSL"];
$("#ticker").innerHTML = [...TECH, ...TECH].map(t => `<span>${t}</span>`).join("");

const PACKAGES = [
  { name: "Game Store Theme", desc: "A custom Tebex store that matches your server and sells more.", price: 79, was: 129, items: ["Custom Tebex store theme", "Matches your server branding", "Category & package pages styled", "Optimised for mobile buyers", "2 revision rounds"] },
  { name: "Landing Page", desc: "One powerful page to present your product, launch or service.", price: 129, was: 199, items: ["Custom one-page design", "Fully responsive (mobile & desktop)", "Contact form", "SEO basics & social preview", "2 revision rounds"] },
  { name: "Business Website", desc: "A complete, professional website for your business or server.", price: 249, was: 399, pop: 1, items: ["Up to 5 custom pages", "Unique design in your brand style", "Contact form & Google Maps", "SEO setup: titles, meta tags, sitemap", "3 revision rounds"] },
  { name: "Webshop", desc: "An online store built to sell, from product page to checkout.", price: 499, was: 799, items: ["WooCommerce or custom-built shop", "Product, cart & checkout pages", "PayPal, card & iDEAL setup", "Up to 25 products added for you", "3 revision rounds"] }
];
$("#price-grid").innerHTML = PACKAGES.map((p, i) => `<article class="sv-p rv${p.pop ? " pop" : ""}" style="--i:${i}">${p.pop ? '<span class="bd">★ Most popular</span>' : ""}<h3>${esc(p.name)}</h3><p class="pd">${esc(p.desc)}</p><div class="pr"><small>from</small><strong>$<span data-n="${p.price}">0</span></strong><small>one-time</small><s>$${p.was}</s></div><span class="sv-save">Save $${p.was - p.price}</span><a class="btn gold" href="${T(p.name)}">Choose this package</a><ul><li><b>Delivered in 1 week 2 days</b></li>${p.items.map(x => `<li>${esc(x)}</li>`).join("")}</ul></article>`).join("");
$("#addon-grid").innerHTML = (window.CROWN.merch || []).map((m, i) => `<article class="sv-a rv" style="--i:${i}"><div class="ic" aria-hidden="true">${esc(m.icon)}</div><h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p><div class="row"><span>${[9, 29, 39, 199, 0][i] ? `from <b>$${[9, 29, 39, 199, 0][i]}</b>` : "<b>Quote</b>"}</span><a href="${T(m.name)}">Order via ticket</a></div></article>`).join("");

/* constellation background + cursor light */
const cv = $("#bg"), cx = cv.getContext("2d"); let W2, H2, pts = [];
const fit = () => { const d = Math.min(devicePixelRatio || 1, 2); W2 = cv.width = innerWidth * d; H2 = cv.height = innerHeight * d; pts = Array.from({ length: Math.round(innerWidth / 22) }, () => ({ x: Math.random() * W2, y: Math.random() * H2, vx: (Math.random() - .5) * .35 * d, vy: (Math.random() - .5) * .35 * d })); };
fit(); addEventListener("resize", fit);
const draw = () => { cx.clearRect(0, 0, W2, H2); const L = 150 * (W2 / innerWidth);
  for (const p of pts) { p.x = (p.x + p.vx + W2) % W2; p.y = (p.y + p.vy + H2) % H2; cx.fillStyle = "rgba(196,181,253,.7)"; cx.fillRect(p.x, p.y, 2, 2); }
  for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) { const dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y, d = dx * dx + dy * dy; if (d < L * L) { cx.strokeStyle = `rgba(139,92,246,${.22 * (1 - Math.sqrt(d) / L)})`; cx.beginPath(); cx.moveTo(pts[a].x, pts[a].y); cx.lineTo(pts[b].x, pts[b].y); cx.stroke(); } }
  requestAnimationFrame(draw); };
if (!RM) draw();
if (!RM) addEventListener("pointermove", e => { document.body.style.setProperty("--mx", e.clientX + "px"); document.body.style.setProperty("--my", e.clientY + "px"); });

/* spotlight glow follows the pointer */
document.addEventListener("pointermove", e => { const c = e.target.closest?.(".sv-card,.sv-p,.sv-a"); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty("--x", e.clientX - r.left + "px"); c.style.setProperty("--y", e.clientY - r.top + "px"); });

/* 3D tilt on cards, magnetic buttons */
if (!RM && matchMedia("(hover:hover)").matches) {
  $$(".sv-card,.sv-p").forEach(c => { c.addEventListener("pointermove", e => { if (!c.classList.contains("in")) return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transform = `perspective(800px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateY(-4px)`; }); c.addEventListener("pointerleave", () => c.style.transform = ""); });
  $$(".btn").forEach(b => { b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .2}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; }); b.addEventListener("pointerleave", () => b.style.transform = ""); });
}

/* count-up numbers */
const count = el => { const n = +el.dataset.n, d = +(el.dataset.d || 0), s = el.dataset.s || "", t0 = performance.now(), D = 1400;
  const f = t => { const k = Math.min(1, (t - t0) / D), v = n * (1 - Math.pow(1 - k, 3)); el.textContent = v.toFixed(d) + s; if (k < 1) requestAnimationFrame(f); };
  RM ? el.textContent = n.toFixed(d) + s : requestAnimationFrame(f); };
$$("[data-n]").filter(e => e.closest(".sv-stats")).forEach(count);

/* one scroll-reveal pass for every section */
const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add("in"); $$("[data-n]", e.target).forEach(count); io.unobserve(e.target); }), { threshold: .15 });
$$(".rv,.sv-steps").forEach(x => io.observe(x));

/* decode effect on section headings */
if (!RM) { const sc = el => { const t = el.textContent, ch = "01<>/{}[]#$%"; let f = 0; el.setAttribute("aria-label", t); const id = setInterval(() => { el.textContent = [...t].map((c, i) => c === " " || i < f / 1.2 ? c : ch[Math.random() * ch.length | 0]).join(""); if (++f > t.length * 1.2) { el.textContent = t; clearInterval(id); } }, 28); };
  const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { sc(e.target); io2.unobserve(e.target); } }), { threshold: .6 }); $$(".sv-head h2").forEach(h => io2.observe(h)); }
})();
