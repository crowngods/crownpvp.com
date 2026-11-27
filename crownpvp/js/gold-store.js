(() => {
  const C = window.CROWN;
  if (!C || document.body.dataset.page !== "store") return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const app = $("#gold-store-app");
  if (!app) return;

  const tiers = ["STARTER", "PREMIUM", "ELITE"];
  const packageArt = ["pouch", "purse", "satchel", "chest", "coffer", "trove", "hoard", "vault", "treasury", "royal-treasury"];
  const descriptions = [
    "A first reserve of Gold for building your faction and getting started.",
    "A reliable purse for upgrades, trades and the next push for power.",
    "A well-stocked satchel for players ready to move up in the economy.",
    "A solid chest of Gold for bigger builds and bolder plans.",
    "An ornate coffer for faction leaders investing in their next advantage.",
    "A deep trove for gear, territory and long campaigns.",
    "A heavyweight reserve of Gold for ambitious factions.",
    "A fortified vault for players shaping the server economy.",
    "A full treasury for leaders planning on a larger scale.",
    "The largest CrownPVP Gold reserve, made for a legacy-sized plan."
  ];
  const packages = (C.gold || []).map((item, index) => ({
    key: item[0],
    name: item[1],
    price: item[2],
    gold: Math.round(item[2] * 250),
    tier: [0, 1, 2, 0, 1, 2, 0, 1, 2, 1][index] || 0,
    scale: [1, 1, 1, 1.08, 1.08, 1.12, 1.16, 1.16, 1.2, 1.28][index] || 1
  }));
  const maxIndex = packages.length - 1;
  const fmt = value => value.toLocaleString("en-US");
  const money = value => "$" + value.toLocaleString("en-US", { minimumFractionDigits: value % 1 ? 2 : 0 });
  const art = index => `<img src="assets/gold-${packageArt[index]}.svg" alt="${packages[index].name} Gold package">`;

  app.innerHTML = `
    <div class="gs-grain" aria-hidden="true"></div>
    <section class="gs-hero" id="gs-hero" aria-label="Explore Gold packages">
      <div class="gs-stage">
        <canvas class="gs-disc" aria-hidden="true"></canvas>
        <canvas class="gs-ring" aria-hidden="true"></canvas>
        <div class="gs-items" aria-label="Gold packages on the vault ring"></div>
        <div class="gs-left-shade" aria-hidden="true"></div>
        <div class="gs-copy">
          <div class="gs-index"><span id="gs-index"></span><span class="gs-index-track"><i id="gs-index-progress"></i></span></div>
          <div class="gs-title-mask"><h1 id="gs-title"></h1></div>
          <div class="gs-kicker">CROWNPVP GOLD · PREMIUM SERVER CURRENCY</div>
          <p class="gs-desc" id="gs-desc"></p>
          <div class="gs-chips" id="gs-chips"></div>
          <div class="gs-buy"><div class="gs-price" id="gs-price"></div><button class="gs-view" id="gs-view">VIEW GOLD →</button></div>
        </div>
        <div class="gs-amount-mark"><i></i><span id="gs-amount"></span></div>
        <div class="gs-pager" aria-label="Choose a Gold package"></div>
        <div class="gs-hint">SCROLL OR DRAG TO TURN THE VAULT</div>
      </div>
    </section>

    <section class="gs-vault gs-reveal" id="gold-vault">
      <div class="gs-vault-copy">
        <div class="gs-eyebrow">THE GOLD VAULT</div>
        <h2>BUILT FOR<br>THE NEXT<br>BIG MOVE.</h2>
        <p>Every package delivers CrownPVP Gold at the same clear rate. Choose your reserve, add your Minecraft username, and continue through the configured checkout.</p>
        <div class="gs-stats">
          <div class="gs-stat"><b data-count="250">0</b><span>GOLD PER $1</span></div>
          <div class="gs-stat"><b data-count="10">0</b><span>GOLD PACKAGES</span></div>
          <div class="gs-stat"><b data-count="125000">0</b><span>GOLD IN THE ROYAL TREASURY</span></div>
        </div>
      </div>
      <div class="gs-vault-visual">
        <div class="gs-iris-glow"></div>
        <div class="gs-vault-wheel">${vaultSvg()}</div>
        <div class="gs-vault-readout"><span>250 GOLD · PER $1</span><span>· CROWN PVP CURRENCY</span></div>
      </div>
    </section>

    <section class="gs-collection gs-reveal" id="gold-collection">
      <div class="gs-collection-head">
        <div><div class="gs-eyebrow">THE GOLD COLLECTION</div><h2>EVERYTHING<br>IN THE VAULT.</h2></div>
        <p>Ten reserves. One simple rate.<br>Choose the Gold package that fits your next move.</p>
      </div>
      <div class="gs-columns"></div>
    </section>

    <section class="gs-process gs-reveal" id="gold-process">
      <div class="gs-process-copy">
        <div class="gs-eyebrow">GET YOUR GOLD</div>
        <h2>YOUR GOLD.<br>YOUR NEXT<br>MOVE.</h2>
        <p>Choose an amount and use the Minecraft username where your Gold should be delivered. Checkout and delivery details are shown in your cart.</p>
        <div class="gs-process-note"><span class="gs-note-icon">✦</span><span>Gold is delivered after payment is confirmed. Keep your order details until staff complete delivery.</span></div>
      </div>
      <form class="gs-order-card" id="gs-quick-order" novalidate>
        <div class="gs-card-top"><span>QUICK PACKAGE LOOKUP</span><i>01 — 03</i></div>
        <label for="gs-quick-username">MINECRAFT USERNAME</label>
        <div class="gs-input-row"><img id="gs-quick-avatar" src="https://mc-heads.net/avatar/Steve/32" alt=""><input id="gs-quick-username" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Your in-game name"></div>
        <label for="gs-quick-package">GOLD PACKAGE</label>
        <select id="gs-quick-package"></select>
        <p class="gs-form-message" id="gs-form-message" aria-live="polite"></p>
        <button class="gs-order-submit" type="submit">REVIEW PACKAGE <span>→</span></button>
        <small>Your username is needed to prepare Gold delivery.</small>
      </form>
    </section>

    <footer class="gs-footer">
      <div class="gs-wordmark">CROWNPVP</div>
      <div class="gs-footer-row"><span>© ${new Date().getFullYear()} CrownPVP · GOLD COINS</span><div><a href="${C.supportChannel || C.discord}" target="_blank" rel="noopener">STORE SUPPORT</a><a href="${C.discord}" target="_blank" rel="noopener">DISCORD</a></div></div>
    </footer>

    <div class="gs-drawer-scrim"></div>
    <aside class="gs-drawer" role="dialog" aria-modal="true" aria-hidden="true" aria-label="Gold package details"></aside>
    <div class="gs-flash" aria-hidden="true"></div>
    <div class="gs-toast" role="status" aria-live="polite"></div>`;

  document.body.append($(".gs-drawer-scrim"), $(".gs-drawer"));

  function vaultSvg() {
    let ticks = "";
    let blades = "";
    for (let index = 0; index < 48; index++) {
      const angle = index * 7.5 * Math.PI / 180;
      const inner = index % 4 ? 160 : 151;
      ticks += `<line x1="${210 + inner * Math.cos(angle)}" y1="${210 + inner * Math.sin(angle)}" x2="${210 + 170 * Math.cos(angle)}" y2="${210 + 170 * Math.sin(angle)}" stroke="#e6bf58" stroke-width="${index % 4 ? 1 : 2}"/>`;
    }
    for (let index = 0; index < 9; index++) {
      const angle = index * 40 * Math.PI / 180;
      blades += `<path class="gs-iris-blade" style="--blade-angle:${index * 40}deg" d="M210 210 L${210 + 39 * Math.cos(angle - .32)} ${210 + 39 * Math.sin(angle - .32)} A132 132 0 0 1 ${210 + 132 * Math.cos(angle + .18)} ${210 + 132 * Math.sin(angle + .18)} Z" fill="${index % 2 ? "#9b6b21" : "#c99a35"}" stroke="#f4d879" stroke-width="2"/>`;
    }
    return `<svg class="gs-iris" viewBox="0 0 420 420" aria-hidden="true">
      <defs><radialGradient id="gs-iris-core"><stop stop-color="#fff0a0"/><stop offset=".18" stop-color="#e3b94e"/><stop offset=".72" stop-color="#795019"/><stop offset="1" stop-color="#17150f"/></radialGradient></defs>
      <circle cx="210" cy="210" r="180" fill="#121317" stroke="#987128" stroke-width="4"/>
      <circle cx="210" cy="210" r="174" fill="none" stroke="#edd17c" stroke-width="1" opacity=".6"/>
      ${ticks}<g class="gs-iris-blades">${blades}</g>
      <circle cx="210" cy="210" r="51" fill="url(#gs-iris-core)" stroke="#ffdf77" stroke-width="4"/>
      <circle cx="210" cy="210" r="22" fill="#15130e" stroke="#e7c55e" stroke-width="4"/>
      <path d="M210 197v26m-13-13h26" stroke="#ffe898" stroke-width="3" opacity=".8"/>
    </svg>`;
  }

  function configureHeader() {
    const brand = $(".aq-brand");
    if (brand) {
      brand.setAttribute("aria-label", "CrownPVP Gold Store");
      if (!$(".gs-brand-tag", brand)) brand.insertAdjacentHTML("beforeend", `<small class="gs-brand-tag">GOLD · OP FACTIONS</small>`);
    }
    const nav = $("#nav");
    if (nav) nav.innerHTML = `<a href="#gold-vault">THE VAULT</a><a href="#gold-collection">GOLD CATALOG</a><a href="#gold-process">HOW TO BUY</a>`;
    const cartButton = $("#cart-btn");
    if (cartButton && !$(".gs-header-cta")) cartButton.insertAdjacentHTML("beforebegin", `<a class="gs-header-cta" href="#gold-process">GET GOLD</a>`);
  }

  function renderCatalog() {
    const columns = $(".gs-columns");
    tiers.forEach((label, tierIndex) => {
      const entries = packages.map((item, index) => ({ item, index })).filter(entry => entry.item.tier === tierIndex);
      columns.insertAdjacentHTML("beforeend", `<div class="gs-column"><h3>${label}<span> · ${entries.length} PACKAGES</span></h3>${entries.map(({ item, index }) => `
        <button class="gs-package" data-package-index="${index}" aria-label="View ${item.name}, ${fmt(item.gold)} Gold, ${money(item.price)}">
          <span class="gs-thumb">${art(index)}</span>
          <span class="gs-package-name"><b>${item.name}</b><span>${fmt(item.gold)} GOLD · ${label}</span></span>
          <span class="gs-package-price">${money(item.price)}</span>
        </button>`).join("")}</div>`);
    });
  }

  function buildHeroItems() {
    const items = $(".gs-items");
    items.innerHTML = packages.map((item, index) => `<button class="gs-item" data-index="${index}" aria-label="View ${item.name}, ${fmt(item.gold)} Gold">
      <span class="gs-reticle" aria-hidden="true"></span><span class="gs-art">${art(index)}</span>
      <span class="gs-orbit gs-orbit-one" aria-hidden="true">✦</span><span class="gs-orbit gs-orbit-two" aria-hidden="true">●</span><span class="gs-orbit gs-orbit-three" aria-hidden="true">✧</span>
      <span class="gs-hover-tag">◉ VIEW GOLD</span></button>`).join("");
    $(".gs-pager").innerHTML = packages.map((item, index) => `<button class="gs-dot" data-dot="${index}" aria-label="Package ${index + 1}: ${item.name}"></button>`).join("");
  }

  configureHeader();
  renderCatalog();
  buildHeroItems();
  const quickSelect = $("#gs-quick-package");
  quickSelect.innerHTML = packages.map((item, index) => `<option value="${index}">${item.name} · ${fmt(item.gold)} Gold · ${money(item.price)}</option>`).join("");

  const hero = $("#gs-hero");
  const stage = $(".gs-stage");
  const copy = $(".gs-copy");
  const ring = $(".gs-ring");
  const disc = $(".gs-disc");
  const items = $$(".gs-item");
  const drawer = $(".gs-drawer");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let geometry;
  let heroTop = 0;
  let heroBottom = 0;
  let segment = 1;
  let targetPosition = 0;
  let position = 0;
  let activeIndex = -1;
  let lastRingPosition = Number.NaN;
  let frameId = 0;
  let previousFrame = 0;
  let snapping = false;
  let snapTimer = 0;
  let textTimer = 0;
  let drawerPackageIndex = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartPosition = 0;
  let hoveredItem = -1;

  function setCopy(index, initial = false) {
    if (index === activeIndex && !initial) return;
    activeIndex = index;
    const fill = () => {
      const item = packages[index];
      $("#gs-index").textContent = `${String(index + 1).padStart(2, "0")} —— ${String(packages.length).padStart(2, "0")}`;
      $("#gs-title").textContent = item.name;
      $("#gs-desc").textContent = descriptions[index];
      $("#gs-chips").innerHTML = `<span class="gs-chip">${fmt(item.gold)} GOLD</span><span class="gs-chip">${tiers[item.tier]} RESERVE</span><span class="gs-chip">250 GOLD / $1</span>`;
      $("#gs-price").textContent = money(item.price);
      $("#gs-amount").textContent = `${fmt(item.gold)} GOLD`;
      $("#gs-index-progress").style.width = `${((index + 1) / packages.length) * 100}%`;
      $$(".gs-dot").forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === index));
    };
    window.clearTimeout(textTimer);
    if (initial || reducedMotion) {
      fill();
      copy.classList.remove("is-outgoing", "is-incoming");
      return;
    }
    copy.classList.remove("is-incoming");
    copy.classList.add("is-outgoing");
    textTimer = window.setTimeout(() => {
      fill();
      copy.classList.remove("is-outgoing");
      copy.classList.add("is-incoming");
      requestAnimationFrame(() => copy.classList.remove("is-incoming"));
    }, 250);
  }

  function drawDisc() {
    if (!geometry) return;
    const context = disc.getContext("2d");
    const { width, height, cx, cy, radius } = geometry;
    context.clearRect(0, 0, width, height);
    const gradient = context.createRadialGradient(cx, cy - radius * .12, radius * .12, cx, cy, radius * 1.08);
    gradient.addColorStop(0, "#242018");
    gradient.addColorStop(.58, "#15161a");
    gradient.addColorStop(1, "#08090b");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.clip();
    context.strokeStyle = "rgba(228,186,77,.035)";
    context.lineWidth = 1;
    for (let groove = radius - 22; groove > radius * .64; groove -= 4.5) {
      context.beginPath();
      context.arc(cx, cy, groove, 0, Math.PI * 2);
      context.stroke();
    }
    const glow = context.createRadialGradient(cx, cy - radius * .76, 0, cx, cy - radius * .76, radius * .72);
    glow.addColorStop(0, "rgba(223,177,64,.18)");
    glow.addColorStop(1, "rgba(223,177,64,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  function drawArcText(context, text, radius, alpha, fontSize) {
    const chars = [...text];
    const start = Math.PI + .16;
    const end = Math.PI * 2 - .16;
    context.save();
    context.font = `600 ${fontSize}px "Barlow Condensed", sans-serif`;
    context.fillStyle = `rgba(255,229,157,${alpha})`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    chars.forEach((char, index) => {
      const angle = start + (end - start) * index / Math.max(1, chars.length - 1);
      context.save();
      context.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
      context.rotate(angle + Math.PI / 2);
      context.fillText(char, 0, 0);
      context.restore();
    });
    context.restore();
  }

  function drawRing(nextPosition) {
    if (!geometry || Math.abs(nextPosition - lastRingPosition) < .001) return;
    const context = ring.getContext("2d");
    const { width, height, cx, cy, radius, delta } = geometry;
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(cx, cy);
    context.rotate(-nextPosition * delta);
    const metal = context.createLinearGradient(-radius, -radius, radius, radius);
    metal.addColorStop(0, "#08090b");
    metal.addColorStop(.2, "#292a2d");
    metal.addColorStop(.42, "#101114");
    metal.addColorStop(.62, "#343435");
    metal.addColorStop(.82, "#111216");
    metal.addColorStop(1, "#08090b");
    context.lineWidth = 48;
    context.strokeStyle = metal;
    context.beginPath();
    context.arc(0, 0, radius, Math.PI, Math.PI * 2);
    context.stroke();

    context.lineWidth = 1;
    context.strokeStyle = "rgba(240,209,122,.48)";
    context.beginPath();
    context.arc(0, 0, radius - 25, Math.PI, Math.PI * 2);
    context.stroke();
    context.strokeStyle = "rgba(255,255,255,.16)";
    context.beginPath();
    context.arc(0, 0, radius + 24, Math.PI, Math.PI * 2);
    context.stroke();

    context.lineWidth = 1;
    context.strokeStyle = "rgba(240,209,122,.42)";
    for (let degree = 180; degree <= 360; degree += 1) {
      const angle = degree * Math.PI / 180;
      const longTick = degree % 5 === 0;
      context.beginPath();
      context.moveTo(Math.cos(angle) * (radius - 21), Math.sin(angle) * (radius - 21));
      context.lineTo(Math.cos(angle) * (radius - (longTick ? 36 : 28)), Math.sin(angle) * (radius - (longTick ? 36 : 28)));
      context.stroke();
    }
    context.strokeStyle = "rgba(105,107,111,.68)";
    const knurlStep = 5 / radius;
    for (let angle = Math.PI; angle < Math.PI * 2; angle += knurlStep) {
      context.beginPath();
      context.moveTo(Math.cos(angle) * (radius + 1), Math.sin(angle) * (radius + 1));
      context.lineTo(Math.cos(angle) * (radius - 13), Math.sin(angle) * (radius - 13));
      context.stroke();
    }
    drawArcText(context, "CROWNPVP · GOLD COINS · 250 GOLD PER DOLLAR · ", radius - 49, .43, Math.max(13, geometry.width * .012));
    drawArcText(context, "2,500 · 5,000 · 8,750 · 12,500 · 20,000 · 27,500 · 37,500 · 50,000 · 62,500 · 125,000 ", radius - 87, .3, Math.max(9, geometry.width * .008));
    context.restore();
    lastRingPosition = nextPosition;
  }

  function layoutItems(nextPosition, velocity = 0) {
    if (!geometry) return;
    const { cx, cy, itemRadius, delta, itemWidth } = geometry;
    items.forEach((element, index) => {
      const distance = index - nextPosition;
      const absoluteDistance = Math.abs(distance);
      if (absoluteDistance > 1.95) {
        element.style.visibility = "hidden";
        element.style.pointerEvents = "none";
        return;
      }
      element.style.visibility = "visible";
      element.style.pointerEvents = "auto";
      const angle = -Math.PI / 2 + distance * delta;
      const x = cx + Math.cos(angle) * itemRadius;
      const y = cy + Math.sin(angle) * itemRadius;
      const opacity = 1 - Math.min(.62, absoluteDistance * .5);
      const blur = Math.round(Math.min(7, Math.abs(velocity) * 2.6) * 2) / 2;
      const hoverScale = hoveredItem === index && absoluteDistance < .5 ? 1.035 : 1;
      const scale = packages[index].scale * Math.max(.74, 1 - absoluteDistance * .1) * hoverScale;
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.opacity = `${opacity}`;
      element.style.zIndex = `${100 - Math.round(absoluteDistance * 10)}`;
      element.style.filter = `blur(${blur}px) brightness(${1 - Math.min(.55, absoluteDistance * .28)})`;
      element.style.transform = `translate(-50%,-50%) rotate(${angle + Math.PI / 2}rad) scale(${scale})`;
      element.classList.toggle("active", absoluteDistance < .5);
    });
  }

  function animate(now) {
    frameId = 0;
    const elapsed = previousFrame ? Math.min(.05, (now - previousFrame) / 1000) : 1 / 60;
    previousFrame = now;
    const before = position;
    const blend = reducedMotion ? 1 : 1 - Math.exp(-elapsed * 11);
    position += (targetPosition - position) * blend;
    if (Math.abs(targetPosition - position) < .0005) position = targetPosition;
    const velocity = elapsed ? (position - before) / elapsed : 0;
    layoutItems(position, velocity);
    drawRing(position);
    const nextActive = clamp(Math.round(position), 0, maxIndex);
    if (nextActive !== activeIndex) setCopy(nextActive);
    if (dragging || Math.abs(targetPosition - position) > .0005) frameId = requestAnimationFrame(animate);
    else previousFrame = 0;
  }

  function requestFrame() {
    if (!frameId) frameId = requestAnimationFrame(animate);
  }

  function isHeroVisible() {
    const scrollY = window.scrollY;
    return scrollY < heroBottom && scrollY + window.innerHeight > heroTop;
  }

  function syncScroll() {
    const scrollY = window.scrollY;
    targetPosition = clamp((scrollY - heroTop) / segment, 0, maxIndex);
    $(".aq-top")?.classList.toggle("scrolled", scrollY > 40);
    requestFrame();
    window.clearTimeout(snapTimer);
    if (snapping) return;
    const finalStop = heroTop + maxIndex * segment;
    if (scrollY >= heroTop && scrollY <= finalStop + 12) {
      snapTimer = window.setTimeout(() => {
        if (dragging || snapping || !isHeroVisible()) return;
        const index = clamp(Math.round(targetPosition), 0, maxIndex);
        const destination = heroTop + index * segment;
        if (Math.abs(window.scrollY - destination) < 14) return;
        snapping = true;
        window.scrollTo({ top: destination, behavior: reducedMotion ? "auto" : "smooth" });
        window.setTimeout(() => { snapping = false; syncScroll(); }, reducedMotion ? 0 : 780);
      }, 170);
    }
  }

  function measure() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    segment = Math.max(1, window.innerHeight * .8);
    hero.style.height = `${window.innerHeight + segment * maxIndex}px`;
    heroTop = hero.getBoundingClientRect().top + window.scrollY;
    heroBottom = heroTop + hero.offsetHeight;

    const mobile = width < 860;
    const radius = (mobile ? 1.5 : 1.45) * width;
    const cx = (mobile ? .5 : .6) * width;
    const cy = (mobile ? .5 : .29) * height + radius;
    const itemRadius = radius - (mobile ? .2 : .27) * height;
    const delta = (mobile ? .92 : .47) * width / itemRadius;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    geometry = { width, height, cx, cy, radius, itemRadius, delta, itemWidth: mobile ? Math.min(width * .74, 300) : width * .31 };

    [ring, disc].forEach(canvas => {
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext("2d").setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    });
    drawDisc();
    lastRingPosition = Number.NaN;
    drawRing(position);
    layoutItems(position);
    syncScroll();
  }

  function goToIndex(index) {
    const next = clamp(index, 0, maxIndex);
    $(".gs-hint").classList.add("off");
    window.scrollTo({ top: heroTop + next * segment, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function openDrawer(index, playerName = "") {
    const item = packages[index];
    if (!item) return;
    drawerPackageIndex = index;
    const checkout = C.tebexToken ? "TEBEX CHECKOUT" : C.paypalMe ? "PAYPAL CHECKOUT" : "CHECKOUT NOT CONFIGURED";
    const savedName = playerName || (() => { try { return localStorage.getItem("crown_user") || ""; } catch { return ""; } })();
    drawer.innerHTML = `
      <div class="gs-drawer-head"><span>PACKAGE ${String(index + 1).padStart(2, "0")} / ${String(packages.length).padStart(2, "0")} · ${tiers[item.tier]}</span><button class="gs-close" type="button" aria-label="Close package details">×</button></div>
      <div class="gs-drawer-scroll">
        <div class="gs-plate"><span class="gs-plate-grooves"></span>${art(index)}</div>
        <div class="gs-drawer-body">
          <div class="gs-eyebrow">CROWNPVP GOLD RESERVE</div><h2>${item.name}</h2><p class="gs-drawer-desc">${descriptions[index]}</p>
          <div class="gs-drawer-amount"><div><b>${fmt(item.gold)} GOLD</b><span>PACKAGE QUANTITY</span></div><b>${money(item.price)}</b></div>
          <div class="gs-spec-title">PACKAGE DETAILS</div>
          <div class="gs-specs">
            <div><span>Currency</span><b>CrownPVP Gold</b></div><div><span>Exchange rate</span><b>250 Gold / $1</b></div>
            <div><span>Package tier</span><b>${tiers[item.tier]}</b></div><div><span>Delivery</span><b>After payment confirmation</b></div>
            <div><span>Checkout</span><b>${checkout}</b></div><div><span>Player account</span><b>Minecraft username</b></div>
          </div>
          <div class="gs-spec-title">WHAT TO EXPECT</div>
          <div class="gs-benefits"><span>✓ One-time Gold package</span><span>✓ Clear package value</span><span>✓ Staff-supported delivery</span></div>
          <div class="gs-username"><label for="gs-username">MINECRAFT USERNAME</label><div class="gs-username-row"><img id="gs-avatar" src="https://mc-heads.net/avatar/${encodeURIComponent(savedName || "Steve")}/32" alt=""><input id="gs-username" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Your in-game name" value="${savedName.replace(/[&<>"']/g, "")}"></div><p class="gs-input-error" aria-live="polite"></p></div>
        </div>
      </div>
      <div class="gs-drawer-footer"><div><span>${fmt(item.gold)} GOLD</span><b>${money(item.price)}</b></div><button class="gs-add" type="button" data-package="${item.key}">ADD TO CART <span>→</span></button></div>`;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    $(".gs-drawer-scrim").classList.add("open");
    document.body.classList.add("lock");
    $(".gs-close", drawer).focus({ preventScroll: true });
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    $(".gs-drawer-scrim").classList.remove("open");
    document.body.classList.remove("lock");
  }

  function showToast(index, message) {
    const toast = $(".gs-toast");
    toast.innerHTML = `${art(index)}<div><b>${packages[index].name}</b><span>${message}</span></div>`;
    toast.classList.add("on");
    window.setTimeout(() => toast.classList.remove("on"), 3200);
  }

  function flyToCart(index, source) {
    const cart = $("#cart-btn");
    const image = $("img", source);
    if (!image || !cart || reducedMotion) return;
    const from = image.getBoundingClientRect();
    const to = cart.getBoundingClientRect();
    const flyer = image.cloneNode();
    Object.assign(flyer.style, {
      position: "fixed", zIndex: "1100", left: `${from.left}px`, top: `${from.top}px`,
      width: `${from.width}px`, height: `${from.height}px`, objectFit: "contain",
      pointerEvents: "none", transition: "transform .82s cubic-bezier(.16,1,.3,1), opacity .82s ease",
      transformOrigin: "center center"
    });
    document.body.appendChild(flyer);
    requestAnimationFrame(() => {
      flyer.style.transform = `translate(${to.left + to.width / 2 - from.left - from.width / 2}px,${to.top + to.height / 2 - from.top - from.height / 2}px) scale(.12) rotate(24deg)`;
      flyer.style.opacity = "0";
    });
    window.setTimeout(() => flyer.remove(), 900);
  }

  function addToCart(button) {
    const input = $("#gs-username", drawer);
    const error = $(".gs-input-error", drawer);
    const playerName = input.value.trim();
    if (!/^\w{3,16}$/.test(playerName)) {
      error.textContent = "Enter a Minecraft username (3–16 letters, numbers or underscores).";
      input.focus();
      return;
    }
    if (!window.CP?.cart?.add) {
      error.textContent = "The store cart is unavailable right now. Please try again.";
      return;
    }
    try { localStorage.setItem("crown_user", playerName); } catch { /* Storage may be disabled. */ }
    const packageIndex = drawerPackageIndex;
    const imageSource = $(".gs-plate", drawer);
    window.CP.cart.add(button.dataset.package);
    $(".gs-flash").classList.remove("on");
    void $(".gs-flash").offsetWidth;
    $(".gs-flash").classList.add("on");
    $("#cart-n")?.classList.add("gs-cart-bump");
    window.setTimeout(() => $("#cart-n")?.classList.remove("gs-cart-bump"), 600);
    flyToCart(packageIndex, imageSource);
    button.classList.add("added");
    button.innerHTML = "ADDED TO CART ✓";
    showToast(packageIndex, `${fmt(packages[packageIndex].gold)} Gold · ${money(packages[packageIndex].price)}`);
    window.setTimeout(closeDrawer, 900);
  }

  function revealSections() {
    const reveal = $$(".gs-reveal");
    if (reducedMotion || !("IntersectionObserver" in window)) {
      reveal.forEach(section => section.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
        if (entry.target.id === "gold-vault") countStats();
      });
    }, { threshold: .22 });
    reveal.forEach(section => observer.observe(section));
  }

  function countStats() {
    $$("[data-count]").forEach(node => {
      const target = Number(node.dataset.count);
      const start = performance.now();
      const tick = now => {
        const progress = Math.min(1, (now - start) / 1600);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = fmt(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  const iris = $(".gs-vault-wheel");
  const vaultVisual = $(".gs-vault-visual");
  iris.addEventListener("pointerenter", () => {
    iris.classList.add("is-open");
    vaultVisual.classList.add("is-open");
  });
  iris.addEventListener("pointerleave", () => {
    iris.classList.remove("is-open");
    vaultVisual.classList.remove("is-open");
  });
  revealSections();

  stage.addEventListener("pointermove", event => {
    if (!dragging) return;
    const next = clamp(dragStartPosition - (event.clientX - dragStartX) / (geometry.itemRadius * geometry.delta), 0, maxIndex);
    targetPosition = next;
    window.scrollTo(0, heroTop + next * segment);
    $(".gs-hint").classList.add("off");
  });
  ring.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !geometry) return;
    dragging = true;
    dragStartX = event.clientX;
    dragStartPosition = position;
    ring.setPointerCapture(event.pointerId);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    goToIndex(Math.round(targetPosition));
  };
  ring.addEventListener("pointerup", endDrag);
  ring.addEventListener("pointercancel", endDrag);

  items.forEach((element, index) => {
    element.addEventListener("pointerenter", () => { hoveredItem = index; requestFrame(); });
    element.addEventListener("pointerleave", () => {
      if (hoveredItem === index) hoveredItem = -1;
      requestFrame();
    });
  });
  app.addEventListener("click", event => {
    const dot = event.target.closest("[data-dot]");
    if (dot) return goToIndex(Number(dot.dataset.dot));
    const item = event.target.closest(".gs-item");
    if (item) {
      const index = Number(item.dataset.index);
      if (Math.abs(index - position) < .5) openDrawer(index);
      else goToIndex(index);
      $(".gs-hint").classList.add("off");
      return;
    }
    const packageRow = event.target.closest("[data-package-index]");
    if (packageRow) openDrawer(Number(packageRow.dataset.packageIndex));
    if (event.target.closest(".gs-close")) closeDrawer();
    const addButton = event.target.closest(".gs-add");
    if (addButton) addToCart(addButton);
  });
  $(".gs-drawer-scrim").addEventListener("click", closeDrawer);
  $("#gs-view").addEventListener("click", () => openDrawer(activeIndex < 0 ? 0 : activeIndex));

  drawer.addEventListener("pointermove", event => {
    const plate = event.target.closest(".gs-plate");
    if (!plate) return;
    const rect = plate.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    plate.style.transform = `rotateY(${x * 24}deg) rotateX(${-y * 20}deg)`;
  });
  drawer.addEventListener("pointerleave", () => {
    const plate = $(".gs-plate", drawer);
    if (plate) plate.style.transform = "";
  });

  $("#gs-quick-order").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("#gs-quick-username");
    const message = $("#gs-form-message");
    const name = input.value.trim();
    if (!/^\w{3,16}$/.test(name)) {
      message.textContent = "Enter a valid Minecraft username (3–16 characters).";
      input.focus();
      return;
    }
    message.textContent = "";
    try { localStorage.setItem("crown_user", name); } catch { /* Storage may be disabled. */ }
    openDrawer(Number(quickSelect.value), name);
  });
  $("#gs-quick-username").addEventListener("input", event => {
    const value = event.target.value.trim();
    if (/^\w{3,16}$/.test(value)) $("#gs-quick-avatar").src = `https://mc-heads.net/avatar/${encodeURIComponent(value)}/32`;
  });
  drawer.addEventListener("input", event => {
    if (event.target.id === "gs-username") {
      const value = event.target.value.trim();
      $(".gs-input-error", drawer).textContent = "";
      if (/^\w{3,16}$/.test(value)) $("#gs-avatar", drawer).src = `https://mc-heads.net/avatar/${encodeURIComponent(value)}/32`;
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && drawer.classList.contains("open")) {
      closeDrawer();
      return;
    }
    if (drawer.classList.contains("open") || event.target.closest("input,select,textarea,button,a")) return;
    if (event.key === "ArrowRight" && isHeroVisible()) goToIndex(activeIndex + 1);
    if (event.key === "ArrowLeft" && isHeroVisible()) goToIndex(activeIndex - 1);
    if (event.key === "Enter" && isHeroVisible()) openDrawer(activeIndex < 0 ? 0 : activeIndex);
  });

  window.addEventListener("scroll", syncScroll, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  measure();
  setCopy(0, true);
  targetPosition = clamp((window.scrollY - heroTop) / segment, 0, maxIndex);
  position = targetPosition;
  layoutItems(position);
  drawRing(position);
  requestFrame();
  if (new URLSearchParams(location.search).has("paid")) window.CP?.cart.clear();
})();
