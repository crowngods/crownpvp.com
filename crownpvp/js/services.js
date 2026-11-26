/* CrownPVP Services studio: project briefs are handled by the independent service-project intake API. */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
try { const p = location.pathname.replace(/\.html$/, ""); if (p !== location.pathname) history.replaceState(null, "", p + location.search + location.hash); } catch {}
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const T = item => `?project=${encodeURIComponent(item)}#project-intake`;

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
$("#addon-grid").innerHTML = (window.CROWN.merch || []).map((m, i) => {
  const href = `?project=${encodeURIComponent(m.name)}#project-intake`;
  const label = i === 4 ? "Start a conversation" : "Discuss this item";
  return `<article class="sv-a sv-minecraft-card rv" style="--i:${i}">
    <div class="sv-a-art" aria-hidden="true"><span class="sv-a-index">${String(i + 1).padStart(2, "0")}</span><span class="sv-a-glyph">${esc(m.icon)}</span><span class="sv-a-orbit"></span></div>
    <div class="sv-a-content"><div class="sv-a-meta">${esc(m.tag || "CROWNPVP / CUSTOM")}</div>
    <h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p>
    ${i === 0 ? '<span class="sv-version-chip"><i></i> JAVA EDITION · 1.8 — 26.3</span>' : ''}
    <a class="sv-a-link" href="${href}">${label}<span aria-hidden="true">↗</span></a></div>
  </article>`;
}).join("");

/* dedicated service project intake — never sends clients to support tickets or Supabase */
const projectForm = $("#project-form");
if (projectForm) {
  const params = new URLSearchParams(location.search), preset = params.get("project");
  const serviceSelect = $("#project-service");
  if (preset && serviceSelect) {
    const map = { "PvP Resource Packs":"Minecraft resource pack", "Custom Plugins":"Minecraft plugin", "Maps & Builds":"Minecraft map or build", "Website Customization":"Minecraft website", "Something Custom":"Something custom", "Game Store Theme":"Website design & development", "Landing Page":"Website design & development", "Business Website":"Website design & development", "Webshop":"Website design & development" };
    const target = map[preset] || (serviceSelect.querySelector(`option[value="${CSS.escape(preset)}"]`) ? preset : "");
    if (target) serviceSelect.value = target;
    const brief = projectForm.elements.brief;
    if (brief && !brief.value) brief.placeholder = `Tell us what you have in mind for: ${preset}. Include features, goals and references…`;
  }
  projectForm.addEventListener("submit", async e => {
    e.preventDefault();
    const button = $("#project-submit"), status = $("#project-status"), data = Object.fromEntries(new FormData(projectForm).entries());
    button.disabled = true; button.classList.add("is-loading"); button.innerHTML = '<span class="sv-spinner"></span> Sending brief…';
    status.textContent = "Submitting your project request securely…"; status.classList.remove("is-error","is-success");
    try {
      const response = await fetch("/api/service-tickets", { method:"POST", headers:{"content-type":"application/json","x-requested-with":"crown"}, body:JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your request could not be submitted.");
      projectForm.reset();
      status.innerHTML = `Request received. Your project reference is <strong>${esc(result.reference || "received")}</strong>. Keep it for your records.`;
      status.classList.add("is-success");
      button.innerHTML = 'Brief submitted <span>✓</span>';
    } catch (err) {
      status.textContent = err.message || "Something went wrong. Please try again.";
      status.classList.add("is-error");
      button.disabled = false; button.innerHTML = 'Try submitting again <span>↗</span>';
    }
  });
}

/* spotlight glow follows the pointer */
document.addEventListener("pointermove", e => { const c = e.target.closest?.(".sv-card,.sv-p,.sv-a"); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty("--x", e.clientX - r.left + "px"); c.style.setProperty("--y", e.clientY - r.top + "px"); });

/* subtle 3D tilt on cards */
if (!RM && matchMedia("(hover:hover)").matches) {
  $$(".sv-card,.sv-p").forEach(c => { c.addEventListener("pointermove", e => { if (!c.classList.contains("in")) return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transform = `perspective(800px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-3px)`; }); c.addEventListener("pointerleave", () => c.style.transform = ""); });
}

/* count-up numbers */
const count = el => { const n = +el.dataset.n, d = +(el.dataset.d || 0), s = el.dataset.s || "", t0 = performance.now(), D = 1400;
  const f = t => { const k = Math.min(1, (t - t0) / D), v = n * (1 - Math.pow(1 - k, 3)); el.textContent = v.toFixed(d) + s; if (k < 1) requestAnimationFrame(f); };
  RM ? el.textContent = n.toFixed(d) + s : requestAnimationFrame(f); };
$$("[data-n]").filter(e => e.closest(".sv-stats")).forEach(count);

/* one scroll-reveal pass for every section */
const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add("in"); $$("[data-n]", e.target).forEach(count); io.unobserve(e.target); }), { threshold: .15 });
$$(".rv,.sv-steps").forEach(x => io.observe(x));
})();
