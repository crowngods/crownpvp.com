/* CrownPVP merchandise v2: pricing, recent projects, add-ons. Orders go through a support ticket. */
(() => {
const { $, esc } = CP;
const T = (item) => `tickets.html?new=1&topic=${encodeURIComponent("Buy merchandise")}&item=${encodeURIComponent(item)}`;
const DELIVERY = "Delivered in 1 week 2 days";

const PACKAGES = [
  { name: "Game Store Theme", desc: "A custom Tebex store that matches your server and sells more.", price: 79, was: 129, pop: false, items: ["Custom Tebex store theme", "Matches your server branding", "Category & package pages styled", "Optimised for mobile buyers", "2 revision rounds"] },
  { name: "Landing Page", desc: "One powerful page to present your product, launch or service.", price: 129, was: 199, pop: false, items: ["Custom one-page design", "Fully responsive (mobile & desktop)", "Contact form", "SEO basics & social preview", "2 revision rounds"] },
  { name: "Business Website", desc: "A complete, professional website for your business or server.", price: 249, was: 399, pop: true, items: ["Up to 5 custom pages", "Unique design in your brand style", "Contact form & Google Maps", "SEO setup: titles, meta tags, sitemap", "3 revision rounds"] },
  { name: "Webshop", desc: "An online store built to sell, from product page to checkout.", price: 499, was: 799, pop: false, items: ["WooCommerce or custom-built shop", "Product, cart & checkout pages", "PayPal, card & iDEAL setup", "Up to 25 products added for you", "3 revision rounds"] }
];

$("#price-grid").innerHTML = PACKAGES.map(p => `
<article class="pcard${p.pop ? " pop" : ""}">${p.pop ? '<span class="pbadge">★ Most popular</span>' : ""}
<h3>${esc(p.name)}</h3><p class="pd">${esc(p.desc)}</p>
<div class="pr"><small>from</small><strong>$${p.price}</strong><small>one-time</small><span class="was">$${p.was}</span></div>
<span class="save">Save $${p.was - p.price}</span>
<a class="btn gold" href="${T(p.name)}">Choose this package <span aria-hidden="true">→</span></a>
<ul><li class="dl">${DELIVERY}</li>${p.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></article>`).join("");

const mk = (cls, url, brand, links, h, sub, cta, hero) => `<div class="bw"><div class="bw-bar"><i></i><i></i><i></i></div><div class="scr ${cls}"><div class="nv"><b>${brand}</b><em>${links.map(l => `<span>${l}</span>`).join("")}</em></div>${hero || `<div class="hero"><h4>${h}</h4><p>${sub}</p><span class="cta">${cta}</span></div>`}<div class="tiles"><s></s><s></s><s></s><s></s></div></div></div>`;

const PROJECTS = [
  { cat: "Gaming", name: "NovaLoot Gaming Store", desc: "Instant-delivery game keys and gift cards with live stock, wishlists and a neon dark UI.", chips: ["Webshop", "Live stock", "Crypto & card"], time: "1w 2d", shot: mk("t-game", "novaloot.gg", "NOVALOOT", ["Games", "Gift cards", "Deals"], "Level up for less", "Instant keys. Best prices. Zero waiting.", "Shop now") },
  { cat: "Law", name: "Hartwell & Associates", desc: "Trust-first attorney website with practice areas, attorney profiles and a free consultation form.", chips: ["Business site", "Booking form", "SEO"], time: "1w 2d", shot: mk("t-law", "hartwell-law.com", "HARTWELL & CO.", ["Practice", "Team", "Contact"], "Justice, Done Right.", "Over 20 years defending what matters most.", "Free consultation") },
  { cat: "Fashion", name: "Velour Atelier", desc: "Minimal clothing brand store with lookbook, size guide, quick-add cart and Apple Pay.", chips: ["Webshop", "Lookbook", "Apple Pay"], time: "1w 2d", shot: mk("t-cloth", "velouratelier.co", "VELOUR", ["Women", "Men", "Sale"], "", "", "", `<div class="hero"><div><h4>The Winter<br>Collection</h4><p>Timeless pieces, made to last.</p><span class="cta">Shop now</span></div><s></s></div>`) },
  { cat: "Minecraft", name: "SkyRealm Network", desc: "Full server website: Tebex store, vote page, staff apps, live player count and Discord card.", chips: ["Tebex theme", "Vote page", "Live status"], time: "1w 2d", shot: mk("t-mc", "play.skyrealm.net", "SKYREALM", ["Store", "Vote", "Staff"], "Join 2,400 players", "Skyblock · Factions · Survival", "Play now") },
  { cat: "Food", name: "Ember Grill House", desc: "Restaurant site with online menu, table reservations and Google Maps directions.", chips: ["Business site", "Reservations", "Maps"], time: "1w 2d", shot: mk("t-food", "embergrill.co", "EMBER GRILL", ["Menu", "Reserve", "Visit"], "Fire. Flavor. Fresh.", "Wood-fired steaks and burgers in the city.", "Book a table") },
  { cat: "Business", name: "IronPeak Fitness", desc: "High-energy gym landing page with class schedule, membership tiers and trial sign-up.", chips: ["Landing page", "Memberships", "Schedule"], time: "1w 2d", shot: mk("t-gym", "ironpeakfit.com", "IRONPEAK", ["Classes", "Plans", "Join"], "Train harder.", "First week free. No contract.", "Start free trial") },
  { cat: "Business", name: "Lumen Dental Clinic", desc: "Clean, calming clinic website with treatments, patient reviews and online appointment booking.", chips: ["Business site", "Booking", "Reviews"], time: "1w 2d", shot: mk("t-dental", "lumendental.com", "LUMEN DENTAL", ["Care", "Team", "Book"], "Smile with confidence", "Gentle, modern dental care for the whole family.", "Book a visit") },
  { cat: "Business", name: "Northgate Realty", desc: "Property listings site with search filters, listing pages and an agent contact form.", chips: ["Business site", "Listings", "Filters"], time: "1w 2d", shot: mk("t-estate", "northgaterealty.com", "NORTHGATE", ["Buy", "Rent", "Agents"], "Find your next home", "Hand-picked properties in the best areas.", "Browse homes") }
];

const cats = ["All", ...new Set(PROJECTS.map(p => p.cat))];
$("#pf-tabs").innerHTML = cats.map((c, i) => `<button type="button" data-c="${c}" class="${i ? "" : "on"}">${c}</button>`).join("");
$("#pf-grid").innerHTML = PROJECTS.map(p => `<article class="pf-card" data-c="${p.cat}"><div class="pf-shot">${p.shot}</div><div class="pf-info"><div class="pf-meta"><span class="pf-cat">${esc(p.cat)}</span><span class="pf-tag">Concept design</span></div><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><div class="pf-chips">${p.chips.map(c => `<span>${esc(c)}</span>`).join("")}</div><div class="pf-foot"><span>⚡ Built in <b>${p.time}</b></span><a href="${T("Custom website like " + p.name)}">Get one like this →</a></div></div></article>`).join("");
$("#pf-tabs").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  document.querySelectorAll("#pf-tabs button").forEach(x => x.classList.toggle("on", x === b));
  document.querySelectorAll("#pf-grid .pf-card").forEach(c => c.classList.toggle("hide", b.dataset.c !== "All" && c.dataset.c !== b.dataset.c));
});

const subLinks = [...document.querySelectorAll(".msub-in a[href^='#']")];
const secs = subLinks.map(a => document.querySelector(a.getAttribute("href"))).filter(Boolean);
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) subLinks.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id)); }), { rootMargin: "-35% 0px -55% 0px" });
  secs.forEach(x => io.observe(x));
}

const ADDONS = (window.CROWN.merch || []).map((m, i) => ({ ...m, price: [9, 29, 39, 199, 0][i] }));
$("#addon-grid").innerHTML = ADDONS.map(m => `<article class="acard"><div class="ai" aria-hidden="true">${esc(m.icon)}</div><h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p><div class="ap"><div>${m.price ? `<small>from</small><b>$${m.price}</b>` : `<b>Quote</b>`}</div><a href="${T(m.name)}">Order via ticket ↗</a></div></article>`).join("");
})();
