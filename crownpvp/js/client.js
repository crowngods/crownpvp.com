/* CrownClient release state. Controlled only by CROWN.client in js/config.js.
   "coming_soon" (default): COMING SOON everywhere, no download buttons. "released": a button appears only for each real https link you set. */
(() => {
const C = window.CROWN, cfg = C.client || {}, $ = s => document.querySelector(s);
const ok = u => typeof u === "string" && /^https:\/\/\S+$/.test(u);
const released = cfg.status === "released" && (ok(cfg.freeDownload) || ok(cfg.premiumUrl));
if (released) {
  $("#cc-status").classList.add("live"); $("#cc-status-t").textContent = "NOW AVAILABLE";
  $("#cc-note").textContent = "CrownClient is available. Download it from the link below.";
  const a = (u, t) => `<a class="btn gold" href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`;
  if (ok(cfg.freeDownload)) $("#cc-free-cta").innerHTML = a(cfg.freeDownload, "Download CrownClient");
  else $("#cc-free-cta").innerHTML = `<span class="soon">COMING SOON</span>`;
  if (ok(cfg.premiumUrl)) $("#cc-prem-cta").innerHTML = a(cfg.premiumUrl, "Get Premium");
  else $("#cc-prem-cta").innerHTML = `<span class="soon">COMING SOON</span>`;
}
document.querySelectorAll("[data-discord]").forEach(a => { a.href = C.discord; a.target = "_blank"; a.rel = "noopener"; });
})();
