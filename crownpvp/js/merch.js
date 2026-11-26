/* CrownPVP marketplace page interactions. No checkout or fake product state is introduced. */
(() => {
  "use strict";
  const products = window.CROWN && Array.isArray(window.CROWN.merch) ? window.CROWN.merch : [];
  const target = document.getElementById("mh-products");
  if (target && products.length) {
    const symbols = ["✧","⌘","⌖","◈","＋"];
    const labels = ["PVP / VISUALS","JAVA / SYSTEMS","MAPS / BUILDS","WEB / BRANDING","MADE TO BRIEF"];
    target.innerHTML = products.map((item, index) => {
      const name = String(item.name || "Custom request");
      const topic = "Merch";
      const href = `tickets.html?new=1&topic=${encodeURIComponent(topic)}&item=${encodeURIComponent(name)}`;
      return `<article class="mh-product${index === products.length - 1 ? " mh-product-custom" : ""}">
        <div class="mh-product-visual"><span>${String(index + 1).padStart(2,"0")} / ${labels[index] || "CUSTOM WORK"}</span><div class="mh-symbol" aria-hidden="true">${symbols[index] || "✧"}</div></div>
        <div class="mh-product-info"><div class="mh-product-meta">${String(item.tag || "CROWNPVP COLLECTION").replace(/[<>]/g,"")}</div>
        <h3>${name.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}</h3>
        <p>${String(item.desc || "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}</p>
        <a href="${href}">${index === products.length - 1 ? "Start a conversation" : "Discuss this item"} <span>↗</span></a></div></article>`;
    }).join("");
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("mh-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.12});
    document.querySelectorAll(".mh-product,.mh-craft,.mh-steps article").forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll(".mh-product,.mh-craft,.mh-steps article").forEach(el => el.classList.add("mh-visible"));
  }
})();