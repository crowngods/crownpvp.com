/* CrownPVP staff team page. The team comes from the website database (public_staff function), never from a hard-coded list.
   Developer is not a public rank. Empty slots are shown as open positions linking to the application form. */
(() => {
const { $, esc } = CP, N = CP.net;
const TEAM = [
  { id: "manager",   slots: 2, blurb: "Oversees staff operations, reports and appeals." },
  { id: "admin",     slots: 3, blurb: "Reviews serious cases and keeps enforcement fair and consistent." },
  { id: "moderator", slots: 3, blurb: "Investigates reports, moderates chat and handles rule violations." },
  { id: "helper",    slots: 3, blurb: "Welcomes players, answers questions and supports the community." },
  { id: "media",     slots: 3, blurb: "Creates content and spreads the word about CrownPVP." }
];
let members = null;

function card(m) {
  const r = N.RANKS[m.staff_rank];
  return `<article class="pcard" style="--rc:${r.color}" data-n="${esc(m.username.toLowerCase())}">
    <img class="pface" src="https://mc-heads.net/avatar/${encodeURIComponent(m.username)}/96" alt="${esc(m.username)}'s Minecraft head" width="64" height="64" loading="lazy">
    <div class="pinfo"><h3>${esc(m.username)}</h3>${N.badge(m.staff_rank)}<span class="ptitle">${esc(m.position_title || "") || esc(r.name)}</span>
    <span class="psub">${m.staff_since ? `On the team since ${new Date(m.staff_since).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}</span></div></article>`;
}
function open(rank, n) {
  return `<a class="pcard popen" style="--rc:${N.RANKS[rank].color}" href="#apply" data-apply-role="${rank}"><span class="pface plus" aria-hidden="true">+</span><div class="pinfo"><h3>Open position${n > 1 ? "s" : ""}</h3><span class="ptitle">${n} ${esc(N.RANKS[rank].name)} slot${n > 1 ? "s" : ""} available</span><span class="psub">Apply for this role &rarr;</span></div></a>`;
}
function render() {
  const root = $("#staff");
  if (members === null) { root.innerHTML = `<div class="skel"><i></i><i></i><i></i></div>`; return; }
  if (members === false) { root.innerHTML = `<div class="empty"><h3>The team list is unavailable right now</h3><p style="margin-top:8px">Please try again in a moment.</p></div>`; return; }
  root.innerHTML = `<div class="tiers">${TEAM.map((t, i) => {
    const r = N.RANKS[t.id], list = members.filter(m => m.staff_rank === t.id), free = Math.max(0, t.slots - list.length);
    return `<section class="tier" style="--rc:${r.color}"><div class="tier-h"><div><span class="tno">${String(i + 1).padStart(2, "0")}</span><h2>${esc(r.name)}</h2><p>${esc(t.blurb)}</p></div><span class="tcount">${list.length} / ${t.slots}</span></div>
    <div class="pgrid">${list.map(card).join("")}${free ? open(t.id, free) : ""}</div></section>`;
  }).join("")}</div>`;
  const select = $("#application-role");
  if (select) [...select.options].forEach(o => { if (!o.value) return; const t = TEAM.find(x => x.id === o.value); if (!t) return; const free = Math.max(0, t.slots - members.filter(m => m.staff_rank === t.id).length); o.disabled = free < 1; o.textContent = `${N.RANKS[t.id].name} · ${free} open`; });
  $("#roles").innerHTML = TEAM.map(t => `<article class="role" style="--rc:${N.RANKS[t.id].color}"><b>${esc(N.RANKS[t.id].name)}</b><p>${esc(t.blurb)}</p></article>`).join("");
  document.querySelectorAll("[data-apply-role]").forEach(a => a.addEventListener("click", () => { const s = $("#application-role"); if (s) s.value = a.dataset.applyRole; }));
}

render();
CP.authReady.then(async auth => {
  if (!auth) { members = false; render(); return; }
  try { const { data, error } = await auth.sb.rpc("public_staff"); if (error) throw error; members = (data || []).filter(m => N.RANKS[m.staff_rank] && !["developer","owner","coowner"].includes(m.staff_rank)); }
  catch (e) { console.error("Team list error (did you run network-upgrade.sql?)", e); members = false; }
  render();
});
/* Leadership + developer come from js/config.js so they always show, independent of the database. */
(() => {
  const C = window.CROWN, body = n => `https://mc-heads.net/body/${encodeURIComponent(n)}/240`;
  const person = m => { const r = N.RANKS[m.rank]; return `<article class="lcard" style="--rc:${r.color}"><img class="lbody" src="${body(m.name)}" alt="${esc(m.name)}'s Minecraft skin" width="120" height="240" loading="lazy"><div class="linfo">${N.badge(m.rank)}<h3>${esc(m.name)}</h3><p>${esc(m.blurb)}</p></div></article>`; };
  const L = $("#leadership"), D = $("#developer"), d = C.developer;
  if (L) L.innerHTML = `<div class="lead-grid">${(C.leadership || []).map(person).join("")}</div>`;
  if (D && d) {
    D.innerHTML = `<article class="devcard" style="--rc:${N.RANKS.developer.color}"><img class="lbody" src="${body(d.name)}" alt="${esc(d.name)}'s Minecraft skin" width="120" height="240" loading="lazy"><div class="linfo">${N.badge("developer")}<h3>${esc(d.name)}</h3><p>${esc(d.about)}</p><div class="dev-contact"><span class="dev-chip"><small>DISCORD USERNAME</small><b>${esc(d.discord)}</b></span><button type="button" class="btn ghost sm" data-copy-dev>Copy username</button></div></div></article>`;
    D.querySelector("[data-copy-dev]").addEventListener("click", async e => { try { await navigator.clipboard.writeText(d.discord); CP.toast("Copied " + d.discord); e.target.textContent = "Copied!"; } catch { CP.toast("Discord: " + d.discord); } });
  }
})();
document.querySelectorAll("[data-discord]").forEach(a => { a.href = window.CROWN.discord; a.target = "_blank"; a.rel = "noopener"; });
})();
