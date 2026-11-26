/* CrownPVP Motion System — lightweight progressive enhancement */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document;
  const body = doc.body;
  if (!body) return;

  // A very short cinematic entrance; never blocks clicks or content.
  const wipe = doc.createElement('div');
  wipe.className = 'motion-page-wipe is-entering';
  wipe.setAttribute('aria-hidden', 'true');
  body.appendChild(wipe);
  requestAnimationFrame(() => body.classList.add('motion-ready'));
  window.setTimeout(() => wipe.classList.remove('is-entering'), reduceMotion ? 0 : 760);

  if (reduceMotion) return;

  // Reveal semantic sections/cards only. Forms and controls remain immediately visible.
  const revealSelector = [
    'main > section', 'main section > .container', 'main section > .content',
    '.feature-card', '.product-card', '.shop-card', '.rank-card', '.game-card',
    '.news-card', '.staff-card', '.vote-card', '.server-card', '.social-card',
    '[data-motion]'
  ].join(',');
  const candidates = [...doc.querySelectorAll(revealSelector)].filter((el) => {
    if (el.closest('header, nav, footer, form, dialog, [role="dialog"]')) return false;
    if (el.hasAttribute('data-motion-reveal')) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  const staggerParents = new Set();
  candidates.forEach((el) => {
    el.setAttribute('data-motion-reveal', el.dataset.motion || 'up');
    const parent = el.parentElement;
    if (parent && candidates.filter((item) => item.parentElement === parent).length > 1) {
      parent.classList.add('motion-stagger');
      staggerParents.add(parent);
    }
  });
  staggerParents.forEach((parent) => {
    [...parent.children].filter((el) => el.hasAttribute('data-motion-reveal'))
      .forEach((el, i) => el.style.setProperty('--motion-index', Math.min(i, 7)));
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('motion-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    candidates.forEach((el) => observer.observe(el));
  } else {
    candidates.forEach((el) => el.classList.add('motion-visible'));
  }

  // Internal page transitions only. Hash links, downloads, external links and forms are untouched.
  let navigating = false;
  doc.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.target || link.hasAttribute('download') || link.getAttribute('rel') === 'external') return;
    let url;
    try { url = new URL(link.href, location.href); } catch (_) { return; }
    if (url.origin !== location.origin || url.pathname === location.pathname && url.search === location.search ||
        url.hash && url.pathname === location.pathname && url.search === location.search) return;
    if (!/^https?:$/.test(url.protocol)) return;
    if (navigating) { event.preventDefault(); return; }
    navigating = true;
    event.preventDefault();
    wipe.classList.remove('is-entering');
    wipe.classList.add('is-leaving');
    window.setTimeout(() => { location.href = url.href; }, 390);
  }, { passive: false });

  // Add a restrained pointer glow to existing cards without changing their markup/layout.
  const glowTargets = doc.querySelectorAll('.card, .product-card, .shop-card, .rank-card, .feature-card, .game-card, .news-card');
  glowTargets.forEach((el) => {
    el.addEventListener('pointermove', (event) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--motion-pointer-x', `${event.clientX - r.left}px`);
      el.style.setProperty('--motion-pointer-y', `${event.clientY - r.top}px`);
    }, { passive: true });
  });
})();
