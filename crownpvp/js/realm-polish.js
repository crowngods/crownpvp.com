/* CrownPVP realm polish: progressive enhancement only; no API/auth/data changes. */
(() => {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bar = document.createElement('div'); bar.className = 'realm-progress'; bar.setAttribute('aria-hidden','true'); document.body.append(bar);
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  addEventListener('scroll', update, {passive:true}); addEventListener('resize', update); update();
  if (reduce || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    });
  }, {threshold:.08, rootMargin:'0px 0px -35px 0px'});
  const watch = root => {
    root.querySelectorAll('main section, .section-head, .phead .wrap, .khero .wrap, .report-card, .application-form, .kaside, .cc-mock').forEach(el => {
      if (!el.classList.contains('reveal-up')) { el.classList.add('reveal-up'); observer.observe(el); }
    });
  };
  watch(document);
  new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches?.('main section,.section-head,.report-card,.application-form,.kaside')) { n.classList.add('reveal-up'); observer.observe(n); } watch(n); } }))).observe(document.body,{childList:true,subtree:true});
})();