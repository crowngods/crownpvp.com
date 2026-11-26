(() => {
  const C = window.CROWN;
  if (!C || document.body.dataset.page !== "store") return;
  const $ = (s, r=document) => r.querySelector(s);
  const app = $("#gold-store-app");
  if (!app) return;

  const packages = C.gold.map((p,i) => ({
    key:p[0], name:p[1], price:p[2], gold:Math.round(p[2]*250),
    column:[0,1,2,0,1,2,0,1,2,1][i], scale:[1,1,1,1.1,1.1,1.15,1.2,1.2,1.25,1.4][i]
  }));
  const descriptions=[
    "A compact beginning for players ready to strengthen their faction.",
    "A dependable purse for upgrades, rivals and growing ambitions.",
    "A refined satchel for sharper raids and smarter trades.",
    "A legendary chest of Gold for a serious competitive advantage.",
    "An ornate coffer built for faction leaders and major investments.",
    "A substantial trove for bold territory, gear and influence.",
    "A heavyweight hoard for sustained war and lasting prosperity.",
    "A royal vault of Gold for dominant factions and elite builds.",
    "A treasury fit for rulers shaping the CrownPVP economy.",
    "The ultimate royal treasury: unmatched Gold for an unmatched legacy."
  ];
  const tier=["STARTER","PREMIUM","ELITE"];
  const fmt=n=>n.toLocaleString("en-US");
  const money=n=>"$"+n.toLocaleString("en-US",{minimumFractionDigits:n%1?2:0});

  function art(i, uid="") {
    const gold="#d4af37", light="#f8df82", dark="#79601e";
    let shape="";
    if(i<3) shape=`<path d="M58 38c18-18 66-18 84 0l10 29-10 94H58L48 67z" fill="url(#g${uid})" stroke="${light}" stroke-width="3"/><path d="M48 67h104l-10 94H58z" fill="#9b7729" opacity=".55"/><rect x="57" y="56" width="86" height="18" rx="9" fill="${dark}"/><path d="M86 57c0-22 28-22 28 0" fill="none" stroke="${light}" stroke-width="7"/><circle cx="100" cy="94" r="26" fill="#c49a32" stroke="${light}" stroke-width="3"/><path d="M100 73v42M79 94h42" stroke="#f2cf67" stroke-width="5" opacity=".55"/>`;
    else if(i<6) shape=`<path d="M42 76q58-38 116 0l-8 82H50z" fill="url(#g${uid})" stroke="${light}" stroke-width="3"/><path d="M50 158h100l18 24H32z" fill="${dark}" stroke="${light}" stroke-width="3"/><rect x="38" y="68" width="124" height="20" rx="5" fill="#b88e2d"/><path d="M100 68V42M74 55q26-28 52 0" fill="none" stroke="${light}" stroke-width="8"/><circle cx="100" cy="112" r="24" fill="${dark}" stroke="${light}" stroke-width="4"/><path d="M100 95l8 17-8 17-8-17z" fill="${light}"/>`;
    else if(i<9) shape=`<ellipse cx="100" cy="159" rx="72" ry="22" fill="#3d3117"/><path d="M38 145v-62l62-32 62 32v62z" fill="url(#g${uid})" stroke="${light}" stroke-width="3"/><path d="M38 83l62 34 62-34M100 117v42" fill="none" stroke="${light}" stroke-width="4"/><circle cx="100" cy="123" r="20" fill="${dark}" stroke="${light}" stroke-width="4"/><circle cx="60" cy="132" r="12" fill="${gold}" stroke="${light}"/><circle cx="141" cy="132" r="12" fill="${gold}" stroke="${light}"/><path d="M54 48h92l-10 35H64z" fill="#a67d29" stroke="${light}" stroke-width="3"/>`;
    else shape=`<ellipse cx="100" cy="160" rx="78" ry="24" fill="#3d3117"/><path d="M32 73l68-34 68 34v82H32z" fill="url(#g${uid})" stroke="${light}" stroke-width="4"/><path d="M32 73l68 34 68-34M100 107v48" fill="none" stroke="${light}" stroke-width="5"/><circle cx="100" cy="125" r="29" fill="${dark}" stroke="${light}" stroke-width="5"/><path d="M100 94l12 20 23 3-17 16 4 23-22-11-22 11 4-23-17-16 23-3z" fill="${gold}" stroke="${light}"/><path d="M64 38l36-24 36 24-36 18z" fill="#b98e31" stroke="${light}" stroke-width="3"/><circle cx="55" cy="146" r="13" fill="${gold}"/><circle cx="145" cy="146" r="13" fill="${gold}"/>`;
    return `<svg viewBox="0 0 200 200" role="img" aria-label="${packages[i].name} Gold package"><defs><linearGradient id="g${uid}" x1="0" x2="1"><stop stop-color="#80601f"/><stop offset=".42" stop-color="${light}"/><stop offset=".68" stop-color="${gold}"/><stop offset="1" stop-color="#745719"/></linearGradient></defs>${shape}</svg>`;
  }

  app.innerHTML=`<div class="gs-grain"></div>
  <section class="gs-hero" id="gs-hero"><div class="gs-stage">
    <canvas class="gs-disc" aria-hidden="true"></canvas><canvas class="gs-ring" aria-label="Rotating Gold package ring"></canvas><div class="gs-items"></div>
    <div class="gs-copy"><div class="gs-index"><span id="gs-index">01 —— 10</span><i></i></div><h1 id="gs-title"></h1><div class="gs-kicker">GOLD PACKAGE · PREMIUM CURRENCY</div><p class="gs-desc" id="gs-desc"></p><div class="gs-chips" id="gs-chips"></div><div class="gs-buy"><div class="gs-price" id="gs-price"></div><button class="gs-view" id="gs-view">VIEW PACKAGE →</button></div></div>
    <div class="gs-amount-mark" id="gs-amount"></div><div class="gs-pager"></div><div class="gs-hint">⟷ SCROLL OR DRAG TO EXPLORE GOLD</div>
  </div></section>
  <section class="gs-vault"><div class="gs-vault-copy"><div class="gs-eyebrow">THE GOLD VAULT</div><h2>CHOOSE YOUR<br>GOLD. BUILD YOUR<br>LEGACY.</h2><p>Every great journey begins with the right resources. Explore our premium Gold packages and unlock more possibilities in the CrownPVP economy.</p><div class="gs-stats"><div class="gs-stat"><b>250 Gold</b><span>PER $1</span></div><div class="gs-stat"><b>10</b><span>GOLD PACKAGES</span></div><div class="gs-stat"><b>Staff</b><span>VERIFIED DELIVERY</span></div></div></div>
    <div class="gs-vault-wheel">${vaultSvg()}<div class="gs-vault-readout">CROWNPVP GOLD · THE PREMIUM CURRENCY</div></div></section>
  <section class="gs-collection" id="gold-collection"><div class="gs-collection-head"><div><div class="gs-eyebrow">THE GOLD COLLECTION</div><h2>CHOOSE YOUR<br>GOLD PACKAGE</h2></div></div><div class="gs-columns"></div></section>
  <section class="gs-how"><div><div class="gs-eyebrow">HOW IT WORKS</div><h2>YOUR GOLD.<br>YOUR JOURNEY.</h2></div><div class="gs-steps">${howStep(1,"Choose your Gold package","Select the amount that fits your goals and add it to your cart.")}${howStep(2,"Enter your Minecraft username","We validate the name so Gold is prepared for the right player.")}${howStep(3,"Complete payment","Use PayPal or the configured Tebex checkout, then follow staff delivery instructions.")}</div></section>
  <section class="gs-footer"><div class="gs-wordmark">CROWNPVP</div><div class="gs-footer-row"><span>© ${new Date().getFullYear()} CrownPVP. Staff-verified Gold delivery.</span><div><a href="${C.supportChannel||C.discord}" target="_blank">SUPPORT</a><a href="${C.discord}" target="_blank">DISCORD</a></div></div></section>
  <div class="gs-drawer-scrim"></div><aside class="gs-drawer" aria-hidden="true"></aside><div class="gs-flash"></div><div class="gs-toast"></div>`;

  function vaultSvg(){
    let blades="",ticks="";
    for(let i=0;i<48;i++){const a=i*7.5*Math.PI/180;ticks+=`<line x1="${210+155*Math.cos(a)}" y1="${210+155*Math.sin(a)}" x2="${210+165*Math.cos(a)}" y2="${210+165*Math.sin(a)}" stroke="#d4af37" stroke-width="${i%4?'1':'2'}"/>`}
    for(let i=0;i<9;i++){const a=i*40*Math.PI/180,r1=55,r2=145;blades+=`<path d="M210 210 L${210+r1*Math.cos(a-.22)} ${210+r1*Math.sin(a-.22)} A145 145 0 0 1 ${210+r2*Math.cos(a)} ${210+r2*Math.sin(a)} Z" fill="${i%2?'#9d7829':'#c79b34'}" stroke="#f5d76e" stroke-width="2" transform="rotate(${i*40} 210 210)"/>`}
    return `<svg viewBox="0 0 420 420"><defs><radialGradient id="vg"><stop stop-color="#f5d76e"/><stop offset=".18" stop-color="#d4af37"/><stop offset=".7" stop-color="#66501c"/><stop offset="1" stop-color="#17150f"/></radialGradient></defs><circle cx="210" cy="210" r="178" fill="#101114" stroke="#d4af37" stroke-width="5"/>${ticks}<g>${blades}</g><circle cx="210" cy="210" r="58" fill="url(#vg)" stroke="#f5d76e" stroke-width="4"/><circle cx="210" cy="210" r="28" fill="#151411" stroke="#d4af37" stroke-width="5"/></svg>`;
  }
  function howStep(n,title,text){return `<article class="gs-step"><i>0${n}</i><b>${title}</b><p>${text}</p></article>`}

  const columns=$(".gs-columns");
  ["STARTER","PREMIUM","ELITE"].forEach((label,column)=>{
    const columnPackages=packages.map((p,i)=>({p,i})).filter(x=>x.p.column===column);
    columns.insertAdjacentHTML("beforeend",`<div class="gs-column"><h3>${label}</h3>${columnPackages.map(({p,i})=>`<button class="gs-package" data-package-index="${i}"><span class="gs-thumb">${art(i,"c"+i)}</span><span class="gs-package-name"><b>${p.name}</b><span>${fmt(p.gold)} GOLD · ${label}</span></span><span class="gs-package-price">${money(p.price)}</span></button>`).join("")}</div>`);
  });
  app.addEventListener("click",e=>{
    const row=e.target.closest("[data-package-index]");
    if(row)openDrawer(+row.dataset.packageIndex);
  });

  let active=0,wheelGoal=0,dragging=false,startX=0,startIndex=0;
  const hero=$(".gs-hero"),stage=$(".gs-stage"),items=$(".gs-items"),ring=$(".gs-ring"),disc=$(".gs-disc");
  function setCopy(){
    const p=packages[active];
    $("#gs-index").textContent=String(active+1).padStart(2,"0")+" —— 10";
    $("#gs-title").textContent=p.name;
    $("#gs-desc").textContent=descriptions[active];
    $("#gs-chips").innerHTML=`<span class="gs-chip">${fmt(p.gold)} Gold</span><span class="gs-chip">${tier[p.column]} tier</span><span class="gs-chip">250 Gold / $1</span>`;
    $("#gs-price").textContent=money(p.price);$("#gs-amount").textContent=fmt(p.gold)+" GOLD";
  }
  function renderItems(){
    items.innerHTML=packages.map((p,i)=>`<button class="gs-item ${i===active?"active":"near"}" data-index="${i}" aria-label="View ${p.name}">${""}</button>`).join("");
  }
  function layout(){
    const rect=stage.getBoundingRect?.(); // no-op guard
    const w=stage.clientWidth,h=stage.clientHeight;
    const cx=w*.73, cy=h*1.10, radius=Math.min(w*.48,h*.76);
    $$(".gs-item").forEach(el=>{
      const i=+el.dataset.index, delta=i-active;
      if(Math.abs(delta)>1.9){el.style.display="none";return} el.style.display="";
      const a=(delta*.34)+Math.PI*.5;
      const x=cx+Math.cos(a)*radius*.62,y=cy-Math.sin(a)*radius*.43;
      el.style.left=x+"px";el.style.top=(y-110)+"px";el.style.opacity=Math.abs(delta)>1.55?".35":1;
      el.style.transform=`translate(-50%,0) rotate(${delta*8}deg) scale(${pScale(i)*(.88-Math.abs(delta)*.05)})`;
      el.className="gs-item "+(i===active?"active":"near");
      el.innerHTML=`<div class="gs-art">${art(i,"h"+i)}</div>`;
    });
  }
  function pScale(i){return packages[i].scale}
  function pager(){$(".gs-pager").innerHTML=packages.map((p,i)=>`<button class="gs-dot ${i===active?"active":""}" data-dot="${i}" aria-label="Package ${i+1}"></button>`).join("")}
  function go(i){active=Math.max(0,Math.min(packages.length-1,Math.round(i)));setCopy();pager();renderItems();layout();drawRing()}

  function resize(){
    const dpr=Math.min(window.devicePixelRatio||1,2),w=stage.clientWidth,h=stage.clientHeight;
    [ring,disc].forEach(c=>{c.width=w*dpr;c.height=h*dpr;c.style.width=w+"px";c.style.height=h+"px";const x=c.getContext("2d");x.setTransform(dpr,0,0,dpr,0,0)});
    drawDisc();drawRing();layout();
  }
  function drawDisc(){
    const c=disc.getContext("2d"),w=c.canvas.clientWidth,h=c.canvas.clientHeight,cx=w*.73,cy=h*1.10,r=Math.min(w*.48,h*.76);
    c.clearRect(0,0,w,h);const g=c.createRadialGradient(cx,cy-r*.15,0,cx,cy,r);g.addColorStop(0,"#1a1710");g.addColorStop(.7,"#111216");g.addColorStop(1,"#08090b");c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,Math.PI*.72,Math.PI*.28,true);c.fill();
    c.save();c.beginPath();c.arc(cx,cy,r,Math.PI*.72,Math.PI*.28,true);c.clip();c.strokeStyle="rgba(212,175,55,.11)";
    for(let y=cy-r*.75;y<cy;y+=4.5){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}c.restore();
  }
  function drawRing(){
    const c=ring.getContext("2d"),w=c.canvas.clientWidth,h=c.canvas.clientHeight,cx=w*.73,cy=h*1.10,r=Math.min(w*.48,h*.76)*.64;
    c.clearRect(0,0,w,h);c.save();c.translate(cx,cy);c.rotate(active*.34);c.lineWidth=22;
    const g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,"#5e4718");g.addColorStop(.25,"#d4af37");g.addColorStop(.5,"#f5d76e");g.addColorStop(.75,"#80601f");g.addColorStop(1,"#d4af37");c.strokeStyle=g;c.beginPath();c.arc(0,0,r,Math.PI*.72,Math.PI*.28,true);c.stroke();
    c.lineWidth=1;c.strokeStyle="rgba(245,215,110,.7)";
    for(let i=0;i<80;i++){const a=i/80*Math.PI*2;c.beginPath();c.moveTo(Math.cos(a)*(r-14),Math.sin(a)*(r-14));c.lineTo(Math.cos(a)*(r+14),Math.sin(a)*(r+14));c.stroke()}
    c.restore();
  }

  let wheelLocked=false;
  hero.addEventListener("wheel",e=>{e.preventDefault();if(wheelLocked)return;wheelLocked=true;go(active+(e.deltaY>0?1:-1));$(".gs-hint").classList.add("off");setTimeout(()=>wheelLocked=false,520)},{passive:false});
  ring.addEventListener("pointerdown",e=>{dragging=true;startX=e.clientX;startIndex=active;ring.setPointerCapture(e.pointerId)});
  ring.addEventListener("pointermove",e=>{if(dragging)go(startIndex+(startX-e.clientX)/220)});
  ring.addEventListener("pointerup",()=>{dragging=false;go(active)});
  document.addEventListener("click",e=>{
    const dot=e.target.closest("[data-dot]");if(dot)return go(+dot.dataset.dot);
    const item=e.target.closest(".gs-item");if(item){const i=+item.dataset.index;if(i===active)openDrawer(i);else go(i);$(".gs-hint").classList.add("off")}
  });
  $("#gs-view").onclick=()=>openDrawer(active);
  document.addEventListener("keydown",e=>{if($(".gs-drawer.open")){if(e.key==="Escape")closeDrawer();return}if(e.key==="ArrowRight")go(active+1);if(e.key==="ArrowLeft")go(active-1);if(e.key==="Enter")openDrawer(active)});

  function openDrawer(i){
    const p=packages[i],d=$(".gs-drawer");
    d.innerHTML=`<div class="gs-drawer-head"><span>PACKAGE ${String(i+1).padStart(2,"0")} / 10 · GOLD</span><button class="gs-close" aria-label="Close">×</button></div><div class="gs-plate">${art(i,"d")}</div><div class="gs-drawer-body"><h2>${p.name}</h2><p class="gs-drawer-desc">${descriptions[i]}</p><div class="gs-drawer-amount"><div><b>${fmt(p.gold)} GOLD</b><br><span>PACKAGE QUANTITY</span></div><b>$${p.price}</b></div><div class="gs-benefits"><span>250 GOLD PER $1</span><span>${tier[p.column]} PACKAGE</span><span>STAFF VERIFIED DELIVERY</span><span>SECURE PAYMENT</span></div><div class="gs-username"><label>MINECRAFT USERNAME</label><div class="gs-username-row"><img id="gs-avatar" src="https://mc-heads.net/avatar/Steve/32" alt=""><input id="gs-username" maxlength="16" autocomplete="off" placeholder="Your in-game name"></div></div></div><div class="gs-drawer-footer"><button class="gs-add" data-package="${p.key}">ADD TO CART · $${p.price}</button></div>`;
    d.classList.add("open");$(".gs-drawer-scrim").classList.add("open");d.setAttribute("aria-hidden","false");document.body.classList.add("lock");
  }
  function closeDrawer(){const d=$(".gs-drawer");d.classList.remove("open");$(".gs-drawer-scrim").classList.remove("open");d.setAttribute("aria-hidden","true");document.body.classList.remove("lock")}
  $(".gs-drawer-scrim").onclick=closeDrawer;
  app.addEventListener("click",e=>{
    if(e.target.closest(".gs-close"))closeDrawer();
    const add=e.target.closest(".gs-add");if(!add)return;
    const input=$("#gs-username"),name=input?.value.trim()||"";if(!/^\w{3,16}$/.test(name)){input.style.border="1px solid #e34b55";input.focus();return}
    try{localStorage.setItem("crown_user",name)}catch{}
    window.CP?.cart.add(add.dataset.package);animateAdd(add);
  });
  app.addEventListener("input",e=>{if(e.target.id==="gs-username"&&/^\w{3,16}$/.test(e.target.value.trim()))$("#gs-avatar").src="https://mc-heads.net/avatar/"+encodeURIComponent(e.target.value.trim())+"/32"});
  function animateAdd(button){
    $(".gs-flash").classList.add("on");setTimeout(()=>$(".gs-flash").classList.remove("on"),430);button.textContent="ADDED TO CART ✓";
    $("#cart-n").classList.add("gs-cart-bump");setTimeout(()=>$("#cart-n").classList.remove("gs-cart-bump"),600);
    const p=packages[active],toast=$(".gs-toast");toast.innerHTML=`${art(active,"t")}<div><b>${p.name} added</b><span>${fmt(p.gold)} Gold · $${p.price}</span></div>`;toast.classList.add("on");
    setTimeout(()=>{toast.classList.remove("on");closeDrawer()},900);
  }

  const ro=new ResizeObserver(resize);ro.observe(stage);resize();go(0);
  if(new URLSearchParams(location.search).has("paid")) window.CP?.cart.clear();
  window.addEventListener("scroll",()=>$(".aq-top")?.classList.toggle("scrolled",scrollY>40),{passive:true});
})();
