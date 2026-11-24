/* Crown Client concept-preview animation (demo values only, labelled as a concept in the UI) */
(() => {
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const q = s => document.querySelectorAll(s), r = (a, b) => a + Math.floor(Math.random() * b);
  setInterval(() => {
    q("[data-fps]").forEach(e => e.textContent = r(236, 28));
    q("[data-cps]").forEach(e => e.textContent = r(9, 6));
    q(".hud .keys b").forEach(b => b.classList.toggle("on", Math.random() < .28));
  }, 900);
})();
