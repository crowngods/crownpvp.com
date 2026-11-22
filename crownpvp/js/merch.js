/* CrownPVP merchandise page. The list comes from js/config.js (merch). Orders go through a support ticket. */
(() => {
const { $, esc } = CP, C = window.CROWN;
$("#merch-grid").innerHTML = (C.merch || []).map(m => `<article class="merch-card"><div class="merch-ic" aria-hidden="true">${esc(m.icon)}</div><span class="merch-tag">${esc(m.tag)}</span><h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p><a class="btn gold" href="tickets.html?new=1&topic=${encodeURIComponent("Buy merchandise")}&item=${encodeURIComponent(m.name)}">Order via ticket <span aria-hidden="true">↗</span></a></article>`).join("");
})();
